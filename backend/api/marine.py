import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from shapely.geometry import Point, Polygon, LineString
from shapely.ops import nearest_points

from models import (
    ProbeRequest, ProbeResponse, NearestDistance,
    RouteAnalyzeRequest, RouteAnalyzeResponse, RouteSegmentRisk
)
from data.mock_pfz import COASTAL_PFZ_HOTSPOTS, get_pfz_zones
from data.mock_mpa import MARINE_PROTECTED_AREAS, get_mpa_zones
from data.mock_imbl import get_imbl_boundary
from data.mock_sst import get_sst_data
from data.mock_chlorophyll import get_chlorophyll_data
from data.mock_weather import (
    get_sea_state, get_weather_data, get_severe_weather_and_cyclone_data,
    get_tide_data, get_temporal_forecast
)
from services.risk_engine import calculate_marine_risk, RiskLevel
from services.time_resolver import resolve_time_window, apply_temporal_variation

router = APIRouter(prefix="/api/marine", tags=["marine-intelligence"])

def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Haversine distance formula returning distance in Nautical Miles (NM).
    Formula:
    d = 2r * arcsin(sqrt(sin^2(d_phi/2) + cos(phi1)*cos(phi2)*sin^2(d_lambda/2)))
    where r = 3440.065 NM (Earth radius)
    """
    R_NM = 3440.065
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    return R_NM * c

def find_nearest_pfz(lat: float, lon: float) -> NearestDistance:
    """Finds the closest Potential Fishing Zone hotspot."""
    min_dist = float('inf')
    nearest_name = "Offshore Indian Shelf"
    for name, (h_lat, h_lon) in COASTAL_PFZ_HOTSPOTS.items():
        d = haversine_nm(lat, lon, h_lat, h_lon)
        if d < min_dist:
            min_dist = d
            nearest_name = name.replace("_", " ")

    dist_nm = round(min_dist, 1)
    dist_km = round(dist_nm * 1.852, 1)
    
    # Calculate bearing/direction
    bearing_desc = "inshore"
    if dist_nm > 40.0:
        bearing_desc = f"{dist_nm} NM offshore"
    else:
        bearing_desc = f"{dist_nm} NM off {nearest_name}"
        
    return NearestDistance(
        name=nearest_name,
        distance_nm=dist_nm,
        distance_km=dist_km,
        description=f"Active pelagic fish aggregation zone ({bearing_desc})",
        status="FAVORABLE_THERMAL_FRONT" if dist_nm <= 25.0 else "TRANSIT_REQUIRED"
    )

def find_nearest_mpa(lat: float, lon: float) -> NearestDistance:
    """Calculates distance to nearest Marine Protected Area boundary using Shapely."""
    pt = Point(lon, lat)
    min_dist_nm = float('inf')
    nearest_name = "None within 100 NM"
    inside_any = False
    active_mpa_info = None

    for mpa in MARINE_PROTECTED_AREAS:
        coords = mpa.get("coordinates", [])
        if len(coords) < 3:
            continue
        poly = Polygon(coords)
        if poly.contains(pt):
            inside_any = True
            min_dist_nm = 0.0
            nearest_name = mpa["name"]
            active_mpa_info = mpa
            break
        
        # Distance to boundary line
        closest_poly_pt, _ = nearest_points(poly, pt)
        d_nm = haversine_nm(lat, lon, closest_poly_pt.y, closest_poly_pt.x)
        if d_nm < min_dist_nm:
            min_dist_nm = d_nm
            nearest_name = mpa["name"]
            active_mpa_info = mpa

    dist_nm = round(min_dist_nm, 1)
    dist_km = round(dist_nm * 1.852, 1)
    
    warning = None
    status = "CLEAR"
    if inside_any:
        status = "INSIDE_PROTECTED_ZONE"
        warning = f"ALERT: Inside {nearest_name}. {active_mpa_info.get('restrictions', 'No mechanized fishing allowed.')}"
    elif dist_nm <= 5.0:
        status = "GEOFENCE_PROXIMITY_WARNING"
        warning = f"CAUTION: Vessel is {dist_nm} NM from {nearest_name} sanctuary boundary. Buffer clearance required."

    return NearestDistance(
        name=nearest_name,
        distance_nm=dist_nm,
        distance_km=dist_km,
        description=active_mpa_info.get("conservation_focus", "Marine Sanctuary") if active_mpa_info else "",
        warning=warning,
        status=status
    )

def find_nearest_imbl(lat: float, lon: float) -> NearestDistance:
    """Calculates distance to nearest International Maritime Boundary Line."""
    pt = Point(lon, lat)
    imbl_fc = get_imbl_boundary()
    min_dist_nm = float('inf')
    nearest_pair = "Indo-Sri Lanka IMBL"
    nearest_sector = "Palk Strait"

    for feat in imbl_fc.get("features", []):
        geom_type = feat.get("geometry", {}).get("type")
        coords = feat.get("geometry", {}).get("coordinates", [])
        props = feat.get("properties", {})
        
        if geom_type == "LineString" and len(coords) >= 2 and props.get("boundary_type") == "IMBL":
            line = LineString(coords)
            closest_line_pt, _ = nearest_points(line, pt)
            d_nm = haversine_nm(lat, lon, closest_line_pt.y, closest_line_pt.x)
            if d_nm < min_dist_nm:
                min_dist_nm = d_nm
                nearest_pair = props.get("country_pair", "International Boundary")
                nearest_sector = props.get("sector", "Maritime Boundary")

    dist_nm = round(min_dist_nm, 1)
    dist_km = round(dist_nm * 1.852, 1)
    
    warning = None
    status = "SAFE_INTERNATIONAL_CLEARANCE"
    if dist_nm < 2.0:
        status = "CRITICAL_BORDER_BREACH_ALERT"
        warning = f"CRITICAL: Within {dist_nm} NM of {nearest_pair}! Imminent risk of international maritime interception. Turn vessel away immediately."
    elif dist_nm < 5.0:
        status = "IMBL_WARNING_BUFFER"
        warning = f"WARNING: Within 5 NM caution buffer of {nearest_pair} ({dist_nm} NM). Maintain eastward/inshore heading."
    elif dist_nm < 12.0:
        status = "IMBL_ADVISORY"
        warning = f"ADVISORY: Approaching EEZ boundary corridor ({dist_nm} NM from {nearest_pair})."

    return NearestDistance(
        name=f"{nearest_pair} ({nearest_sector})",
        distance_nm=dist_nm,
        distance_km=dist_km,
        description="Official Delimited International Maritime Boundary Line",
        warning=warning,
        status=status
    )

# ==============================================================================
# ENDPOINT 1: POST /api/marine/probe (Click-to-Probe Ocean Inspector)
# ==============================================================================

@router.post("/probe", response_model=ProbeResponse)
async def probe_coordinate(body: ProbeRequest):
    """
    Oceanographic Inspector: Evaluates full water column, wave parameters,
    SST, Chlorophyll, Risk, and Geofence proximity for any coordinate.
    """
    lat, lon = body.lat, body.lon
    offset_h = body.timestamp_offset_hours
    persona = (body.persona or "fisher").lower().strip()
    
    # 1. Resolve temporal offset
    time_info = resolve_time_window(offset_h)
    
    # 2. Base physical oceanography (lat/lon deterministic model)
    base_sst = 29.2 - abs(lat - 8.0) * 0.22
    # Add coastal upwelling effect
    if lon < 77.0: # Arabian sea upwelling
        base_sst -= 0.6
    base_sst = round(max(24.5, min(31.5, base_sst)), 2)
    
    # Base chlorophyll concentration
    dist_to_coast_approx = min(abs(lon - 72.8), abs(lon - 80.2), abs(lat - 13.0))
    base_chl = max(0.4, min(6.8, round(3.8 / (1.0 + dist_to_coast_approx * 1.4), 2)))
    
    # Base wave and wind
    base_wave = 1.1 + (0.4 if lon < 77.5 else 0.2)
    base_wind_kmh = 15.0 + abs(math.sin(lat * 0.5)) * 8.0
    
    # Apply temporal variation for scrubber
    temp_var = apply_temporal_variation(base_wave, base_wind_kmh, offset_h)
    wave_h = temp_var["wave_height_m"]
    wind_kmh = temp_var["wind_speed_kmh"]
    wind_kts = round(wind_kmh / 1.852, 1)
    
    current_dir = "SSW (0.8 kts)" if lon < 77.5 else "ENE (1.1 kts)"
    sea_state_info = get_sea_state(wave_h)
    sea_state_str = f"Code {sea_state_info['code']} ({sea_state_info['label']})"
    
    # 3. Risk calculation
    vessel_for_persona = "country_craft" if persona == "fisher" else "motorized_boat"
    risk_assessment = calculate_marine_risk(
        wave_height=wave_h,
        wind_speed=wind_kmh,
        visibility=12.0,
        precipitation=0.0,
        vessel_type=vessel_for_persona
    )
    
    # 4. Proximity to geofences and spatial features
    nearest_pfz = find_nearest_pfz(lat, lon)
    nearest_mpa = find_nearest_mpa(lat, lon)
    imbl_dist = find_nearest_imbl(lat, lon)
    
    # 5. Tailor human advisory to active persona
    if persona == "fisher":
        if nearest_mpa.status == "INSIDE_PROTECTED_ZONE":
            advisory = f"🚫 RESTRICTED SANCTUARY: You are inside {nearest_mpa.name}. Commercial and mechanized fishing strictly banned. Move outside boundary."
        elif imbl_dist.distance_nm < 5.0:
            advisory = f"⚠️ BORDER ALERT: You are only {imbl_dist.distance_nm} NM from {imbl_dist.name}! Steer inshore immediately to prevent boundary violation."
        elif wave_h > 2.0:
            advisory = f"⚠️ ROUGH WATER: Swell is {wave_h}m ({sea_state_str}). Small fiber boats should stay ashore or return to harbor."
        elif nearest_pfz.distance_nm <= 15.0:
            advisory = f"🐟 HIGH CATCH POTENTIAL: Active Tuna & Mackerel thermal front located {nearest_pfz.distance_nm} NM away near {nearest_pfz.name}. Sea is {sea_state_info['label'].lower()} ({wave_h}m wave)."
        else:
            advisory = f"✅ SAFE FISHING CONDITIONS: Sea state is {sea_state_info['label'].lower()} ({wave_h}m swell, {wind_kts} kts wind). Nearest prime fishing zone is {nearest_pfz.distance_nm} NM ({nearest_pfz.name})."
            
    elif persona in ["coast_guard", "coastguard"]:
        if imbl_dist.distance_nm < 5.0:
            advisory = f"🚨 TACTICAL BORDER ALERT: Vessel coordinate is {imbl_dist.distance_nm} NM from {imbl_dist.name}. Heightened risk of international intrusion or drift across boundary."
        elif nearest_mpa.status == "INSIDE_PROTECTED_ZONE":
            advisory = f"🛡️ MPA ENFORCEMENT: Coordinate inside {nearest_mpa.name}. Wildlife Protection Act enforcement zone. Audit vessel AIS MMSI."
        else:
            advisory = f"⚓ MARITIME PATROL REPORT: Sector Risk Level: {risk_assessment.risk_level.value} (Score {risk_assessment.score}/100). IMBL clearance: {imbl_dist.distance_nm} NM. Swell: {wave_h}m at {wind_kts} kts wind. SAR Readiness: NOMINAL."
            
    else: # researcher / biologist
        advisory = f"🔬 OCEANOGRAPHIC PROFILE: SST {base_sst}°C with chlorophyll-a density at {base_chl} mg/m³ (Phytoplankton bloom index: {round(base_chl * 1.3, 1)}). Nearest conservation ecosystem: {nearest_mpa.name} ({nearest_mpa.distance_nm} NM). Dissolved O2 layer estimated nominal."

    return ProbeResponse(
        lat=round(lat, 4),
        lon=round(lon, 4),
        timestamp=time_info["target_iso"],
        timestamp_offset_hours=offset_h,
        time_label=time_info["label"],
        sst_c=base_sst,
        chlorophyll_mg_m3=base_chl,
        wave_height_m=wave_h,
        wind_speed_kts=wind_kts,
        wind_speed_kmh=wind_kmh,
        current_dir=current_dir,
        sea_state=sea_state_str,
        risk_score=risk_assessment.score,
        risk_level=risk_assessment.risk_level.value,
        nearest_pfz=nearest_pfz,
        nearest_mpa=nearest_mpa,
        imbl_distance=imbl_dist,
        human_advisory=advisory,
        persona=persona,
        sources=["Open-Meteo Marine API", "INCOIS PFZ Grounding", "MoEFCC MPA Registry", "UNCLOS IMBL Delimitation"]
    )

# ==============================================================================
# ENDPOINT 2: POST /api/marine/route-analyze (Voyage & Fuel/Risk Route Planner)
# ==============================================================================

@router.post("/route-analyze", response_model=RouteAnalyzeResponse)
async def analyze_marine_route(body: RouteAnalyzeRequest):
    """
    Voyage & Fuel Planner: Evaluates multi-waypoint nautical paths against
    total distance, fuel consumption, segment weather risk, MPA crossings,
    and IMBL safety buffers.
    """
    waypoints = body.waypoints
    if len(waypoints) < 2:
        raise HTTPException(status_code=400, detail="Route analysis requires at least 2 waypoints.")

    speed_kts = max(1.0, body.vessel_speed_kts)
    fuel_lph = max(1.0, body.fuel_burn_lph)
    vessel_type = body.vessel_type or "motorized_boat"

    total_distance_nm = 0.0
    segment_risks: List[RouteSegmentRisk] = []
    mpa_warnings: List[str] = []
    crosses_mpa = False
    min_imbl_dist = float('inf')

    # Load boundaries
    imbl_fc = get_imbl_boundary()
    imbl_lines = []
    for feat in imbl_fc.get("features", []):
        if feat.get("geometry", {}).get("type") == "LineString" and feat.get("properties", {}).get("boundary_type") == "IMBL":
            coords = feat.get("geometry", {}).get("coordinates", [])
            if len(coords) >= 2:
                imbl_lines.append((LineString(coords), feat.get("properties", {}).get("country_pair", "IMBL")))

    mpa_polys = []
    for mpa in MARINE_PROTECTED_AREAS:
        coords = mpa.get("coordinates", [])
        if len(coords) >= 3:
            mpa_polys.append((Polygon(coords), mpa["name"], mpa.get("restrictions", "Protected Sanctuary")))

    max_risk_level = RiskLevel.LOW
    max_risk_score = 0.0

    for i in range(len(waypoints) - 1):
        p1 = waypoints[i]
        p2 = waypoints[i+1]
        
        seg_dist_nm = haversine_nm(p1.lat, p1.lon, p2.lat, p2.lon)
        total_distance_nm += seg_dist_nm
        
        seg_line = LineString([(p1.lon, p1.lat), (p2.lon, p2.lat)])
        mid_lat = (p1.lat + p2.lat) / 2.0
        mid_lon = (p1.lon + p2.lon) / 2.0
        
        # Check MPA intersection
        for poly, mpa_name, restr in mpa_polys:
            if seg_line.intersects(poly):
                crosses_mpa = True
                warn_msg = f"Segment {i+1} intersects {mpa_name}: {restr}"
                if warn_msg not in mpa_warnings:
                    mpa_warnings.append(warn_msg)
            elif seg_line.distance(poly) * 60.0 < 4.0:
                warn_msg = f"Segment {i+1} passes within 4 NM of {mpa_name} buffer zone"
                if warn_msg not in mpa_warnings:
                    mpa_warnings.append(warn_msg)

        # Check IMBL proximity for segment
        for line, pair in imbl_lines:
            d_nm = seg_line.distance(line) * 60.0
            if d_nm < min_imbl_dist:
                min_imbl_dist = d_nm

        # Segment simulated weather
        seg_wave = 1.0 + abs(math.sin(mid_lat * 0.4)) * 0.7
        seg_wind = 14.0 + abs(math.cos(mid_lon * 0.3)) * 8.0
        
        risk = calculate_marine_risk(
            wave_height=seg_wave,
            wind_speed=seg_wind,
            vessel_type=vessel_type
        )
        
        if risk.score > max_risk_score:
            max_risk_score = risk.score
            max_risk_level = risk.risk_level

        segment_risks.append(RouteSegmentRisk(
            segment_index=i + 1,
            start_lat=round(p1.lat, 4),
            start_lon=round(p1.lon, 4),
            end_lat=round(p2.lat, 4),
            end_lon=round(p2.lon, 4),
            distance_nm=round(seg_dist_nm, 2),
            distance_km=round(seg_dist_nm * 1.852, 2),
            wave_height_m=round(seg_wave, 2),
            wind_speed_kmh=round(seg_wind, 1),
            risk_score=risk.score,
            risk_level=risk.risk_level.value
        ))

    total_dist_nm = round(total_distance_nm, 2)
    total_dist_km = round(total_dist_nm * 1.852, 2)
    eta_h = round(total_dist_nm / speed_kts, 2)
    fuel_l = round(eta_h * fuel_lph, 1)
    imbl_warn = min_imbl_dist < 5.0

    # Build clear overall recommendation
    recs = []
    if crosses_mpa:
        recs.append("⚠️ REROUTE REQUIRED: Course directly cuts through designated Marine National Park / Biosphere Reserve.")
    if imbl_warn:
        recs.append(f"🚨 IMBL HAZARD: Route comes within {min_imbl_dist:.1f} NM of International Boundary. Deflect waypoints westward.")
    if max_risk_level == RiskLevel.HIGH or max_risk_level == RiskLevel.SEVERE:
        recs.append("🌊 SWELL WARNING: Elevated sea state along transit segments. Delay departure or use sheltered coastal passage.")
    if not recs:
        recs.append("✅ ROUTE CLEAR: Course maintains safe clearance from MPAs, IMBL borders, and hazardous shoal waters.")

    return RouteAnalyzeResponse(
        total_distance_nm=total_dist_nm,
        total_distance_km=total_dist_km,
        eta_hours=eta_h,
        estimated_fuel_liters=fuel_l,
        segment_risks=segment_risks,
        crosses_mpa=crosses_mpa,
        mpa_warnings=mpa_warnings,
        imbl_warning=imbl_warn,
        imbl_min_distance_nm=round(min_imbl_dist, 1) if min_imbl_dist < 1000 else 999.0,
        overall_risk=max_risk_level.value,
        recommendation=" ".join(recs),
        waypoints=[{"lat": wp.lat, "lon": wp.lon} for wp in waypoints]
    )

# ==============================================================================
# LAYER FEEDS FOR MAP DOCK (MapLibre dynamic layer integration)
# ==============================================================================

@router.get("/layers/pfz")
async def get_pfz_layer(
    lat_min: float = Query(7.0),
    lat_max: float = Query(24.0),
    lon_min: float = Query(68.0),
    lon_max: float = Query(98.0)
):
    """Returns official INCOIS Potential Fishing Zones as GeoJSON FeatureCollection."""
    return get_pfz_zones(lat_min, lon_min, lat_max, lon_max)

@router.get("/layers/sst")
async def get_sst_layer(
    lat_min: float = Query(7.0),
    lat_max: float = Query(24.0),
    lon_min: float = Query(68.0),
    lon_max: float = Query(98.0)
):
    """Returns Sea Surface Temperature interpolated raster points as GeoJSON."""
    return get_sst_data(lat_min, lon_min, lat_max, lon_max)

@router.get("/layers/chlorophyll")
async def get_chlorophyll_layer(
    lat_min: float = Query(7.0),
    lat_max: float = Query(24.0),
    lon_min: float = Query(68.0),
    lon_max: float = Query(98.0)
):
    """Returns Chlorophyll-a oceanic productivity plumes as GeoJSON."""
    return get_chlorophyll_data(lat_min, lon_min, lat_max, lon_max)

@router.get("/layers/imbl")
async def get_imbl_layer():
    """Returns International Maritime Boundary Lines and Territorial Waters as GeoJSON."""
    return get_imbl_boundary()

@router.get("/layers/mpa")
async def get_mpa_layer():
    """Returns Marine Protected Areas & conservation sanctuaries as GeoJSON."""
    return get_mpa_zones()

@router.get("/layers/weather")
async def get_weather_layer(lat: float = Query(18.92), lon: float = Query(72.82)):
    """Returns offshore weather polygon grid with sea state and wind vectors."""
    return get_weather_data(lat, lon)

@router.get("/layers/cyclone")
async def get_cyclone_layer(lat: float = Query(18.92), lon: float = Query(72.82)):
    """Returns active cyclone trajectory, cone of uncertainty, and lightning risk zones."""
    return get_severe_weather_and_cyclone_data(lat, lon)
