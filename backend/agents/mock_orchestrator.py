import random
from models import ChatRequest, ChatResponse, AgentStep, GeoJSONLayer, LayerStyle
from agents.tools import discover_ocean_data, assess_safety_risk, find_potential_fishing_zones, compute_safe_route

def _to_geojson_layers(raw_layers: list) -> list[GeoJSONLayer]:
    """Convert raw dict layers from tools into validated GeoJSONLayer Pydantic objects."""
    result = []
    for l in raw_layers:
        style = l.get("style", {})
        result.append(GeoJSONLayer(
            id=l["id"],
            type=l["type"],
            label=l["label"],
            data=l["data"],
            style=LayerStyle(
                color=style.get("color", "#00d4ff"),
                opacity=style.get("opacity", 0.6),
                width=style.get("width", 2.0),
            )
        ))
    return result

COASTAL_LOCATIONS = {
    # Gujarat & Gulf of Kutch / Khambhat
    'porbandar': (21.64, 69.60),
    'veraval': (20.90, 70.36),
    'kandla': (23.00, 70.21),
    'surat': (21.17, 72.83),
    'diu': (20.71, 70.98),
    'daman': (20.39, 72.83),

    # Maharashtra & Konkan Coast
    'mumbai': (18.92, 72.82),
    'bombay': (18.92, 72.82),
    'ratnagiri': (16.99, 73.28),
    'alibaug': (18.64, 72.87),

    # Goa
    'goa': (15.29, 73.91),
    'panaji': (15.49, 73.82),
    'mormugao': (15.40, 73.80),

    # Karnataka
    'karwar': (14.80, 74.12),
    'mangalore': (12.91, 74.85),
    'mangaluru': (12.91, 74.85),
    'udupi': (13.34, 74.74),
    'malpe': (13.35, 74.70),

    # Kerala & Malabar Coast
    'kochi': (9.93, 76.26),
    'cochin': (9.93, 76.26),
    'kozhikode': (11.25, 75.78),
    'calicut': (11.25, 75.78),
    'kollam': (8.89, 76.61),
    'alappuzha': (9.49, 76.33),
    'alleppey': (9.49, 76.33),
    'thiruvananthapuram': (8.52, 76.93),
    'trivandrum': (8.52, 76.93),

    # Tamil Nadu & Coromandel Coast / Gulf of Mannar
    'kanyakumari': (8.08, 77.55),
    'cape comorin': (8.08, 77.55),
    'tuticorin': (8.76, 78.13),
    'thoothukudi': (8.76, 78.13),
    'rameswaram': (9.29, 79.31),
    'nagapattinam': (10.77, 79.84),
    'cuddalore': (11.75, 79.77),
    'chennai': (13.08, 80.27),
    'madras': (13.08, 80.27),
    'puducherry': (11.94, 79.80),
    'pondicherry': (11.94, 79.80),

    # Andhra Pradesh
    'machilipatnam': (16.18, 81.13),
    'kakinada': (16.98, 82.24),
    'vizag': (17.68, 83.21),
    'visakhapatnam': (17.68, 83.21),
    'nellore': (14.44, 79.98),

    # Odisha
    'puri': (19.81, 85.83),
    'paradip': (20.31, 86.61),
    'chandipur': (21.47, 87.01),
    'gopalpur': (19.26, 84.90),

    # West Bengal & Sundarbans
    'kolkata': (22.57, 88.36),
    'calcutta': (22.57, 88.36),
    'digha': (21.62, 87.50),
    'haldia': (22.06, 88.06),
    'sundarbans': (21.80, 88.80),

    # Islands
    'port blair': (11.62, 92.72),
    'andaman': (11.62, 92.72),
    'kavaratti': (10.56, 72.64),
    'lakshadweep': (10.56, 72.64)
}

async def mock_orchestrate(request: ChatRequest) -> ChatResponse:
    msg = request.message.lower()

    # Default center if no location identified
    lat, lon = 18.92, 72.82 # Default Mumbai
    detected_loc = "Indian Coastal Waters"

    # Match explicit coordinates if passed from memory or map selection
    if request.latitude is not None and request.longitude is not None:
        lat, lon = request.latitude, request.longitude
        if request.location and request.location.lower() != 'auto':
            detected_loc = request.location.title()

    # Match explicit location field first
    elif request.location and request.location.lower() not in ('auto', 'default', ''):
        req_loc = request.location.lower()
        for key, coords in COASTAL_LOCATIONS.items():
            if key in req_loc:
                lat, lon = coords
                detected_loc = key.title()
                break

    # Next check message text for known coastal cities or harbors
    for key, coords in COASTAL_LOCATIONS.items():
        if key in msg:
            lat, lon = coords
            detected_loc = key.title()
            break

    basin = "Arabian Sea" if lon < 77.5 else "Bay of Bengal"

    layers_raw: list[dict] = []
    steps: list[AgentStep] = []
    text_response = ""

    role_title = request.user_role.replace('_', ' ').title() if request.user_role != 'general' else 'Captain'
    personal_greetings = [
        f"Ahoy {role_title}! Reporting live marine intelligence for **{detected_loc}** ({basin}).",
        f"Namaste {role_title}! ORCA agent swarm has synthesized maritime conditions off the **{detected_loc}** coastline.",
        f"Greetings {role_title}! Here is your personalized ocean advisory for **{detected_loc}**."
    ]
    greeting = random.choice(personal_greetings)

    # Intent 1: Fishing Zones & Catch advisory
    if any(w in msg for w in ['fish', 'pfz', 'catch', 'tuna', 'sardine', 'mackerel', 'zone', 'fishing']):
        lat_min, lon_min, lat_max, lon_max = lat - 1.2, lon - 1.2, lat + 1.2, lon + 1.2
        res = find_potential_fishing_zones.invoke({
            "lat_min": lat_min, "lon_min": lon_min, "lat_max": lat_max, "lon_max": lon_max
        })
        layers_raw.extend(res.get("geojson_layers", []))

        steps.append(AgentStep(
            agent_name="Data Agent",
            action="satellite_chlorophyll_sst_ingest",
            result_summary=f"Ingested MODIS/Oceansat-3 SST & Chlorophyll-a layers for {detected_loc} shelf"
        ))
        steps.append(AgentStep(
            agent_name="PFZ Reasoning Agent",
            action="thermal_front_correlation",
            result_summary=f"Correlated 26.5-28.5°C thermal fronts with chlorophyll blooms. Isolated {res.get('total_zones', 0)} high-yield zones"
        ))

        top_zone = res["zones"][0] if res.get("zones") else None
        if top_zone:
            text_response = (
                f"{greeting}\n\n"
                f"🎣 **Potential Fishing Zones Identified**: Found **{res.get('total_zones', 0)} active PFZ polygons** in your target sector.\n"
                f"• **Primary Hotspot**: {top_zone.get('location')} ({top_zone.get('confidence', 0.85)*100:.0f}% confidence score)\n"
                f"• **Target Pelagic Species**: {top_zone.get('species')}\n"
                f"• **Water Characteristics**: SST {top_zone.get('sst_range')} | Chlorophyll {top_zone.get('chlorophyll')}\n"
                f"• **Depth**: {top_zone.get('depth')}\n\n"
                f"💡 *Recommendation*: Green overlays on the map delineate the recommended harvest perimeters."
            )
        else:
            text_response = f"{greeting}\n\nIdentified productive fishing grounds within your coordinates. Check the green polygons on your chart."

    # Intent 2: Route planning & Navigational Corridor
    elif any(w in msg for w in ['route', 'navigate', 'path', 'journey', 'travel', 'waypoint', 'sail']):
        # Find destination
        dest_lat, dest_lon = lat - 2.0, lon - 0.5
        dest_name = "Offshore Fishing Ground"
        for key, coords in COASTAL_LOCATIONS.items():
            if key in msg and key != detected_loc.lower():
                dest_lat, dest_lon = coords
                dest_name = key.title()
                break

        res = compute_safe_route.invoke({
            "start_lat": lat, "start_lon": lon, "end_lat": dest_lat, "end_lon": dest_lon
        })
        layers_raw.extend(res.get("geojson_layers", []))

        steps.append(AgentStep(
            agent_name="Safety Agent",
            action="scan_hazard_polygons",
            result_summary=f"Cross-checked transit corridor against high waves, shallow banks, and IMBL boundaries"
        ))
        steps.append(AgentStep(
            agent_name="Routing Agent",
            action="compute_safe_transit_lane",
            result_summary=f"Computed safe maritime passage ({res['distance_nm']} NM, {res['estimated_time_hours']} hrs @ 10.5 kts)"
        ))

        text_response = (
            f"{greeting}\n\n"
            f"🗺️ **Safe Navigational Passage Charted**: From **{detected_loc}** towards **{dest_name}**.\n"
            f"• **Transit Distance**: **{res['distance_nm']} Nautical Miles**\n"
            f"• **Estimated Time of Arrival (ETA)**: **{res['estimated_time_hours']} hours** at 10.5 knots\n"
            f"• **Safety Assurance**: Cleared of {', '.join(res['hazards_avoided'])}\n\n"
            f"🧭 *The cyan track line on your chart represents the safest route avoiding rough swell and restricted zones.*"
        )

    # Intent 3: Safety, IMBL Boundaries & Hazard Warnings
    elif any(w in msg for w in ['safe', 'risk', 'danger', 'warning', 'boundary', 'imbl', 'cyclone', 'storm', 'swell']):
        res = await assess_safety_risk.ainvoke({"lat": lat, "lon": lon})
        layers_raw.extend(res.get("geojson_layers", []))

        steps.append(AgentStep(
            agent_name="Safety Agent",
            action="geofence_and_weather_risk_audit",
            result_summary=f"Nearest IMBL: {res['imbl_distance_nm']} NM ({res['nearest_boundary']}). Risk Level: {res['risk_level'].upper()}"
        ))

        warnings_text = "\n".join([f"• ⚠️ {w}" for w in res['warnings']])
        text_response = (
            f"{greeting}\n\n"
            f"🛡️ **Maritime Safety & Border Geofence Audit**:\n"
            f"• **Assessed Risk Level**: **{res['risk_level'].upper()}** (Threat Index: {res['risk_score']}/100)\n"
            f"• **Distance to Nearest IMBL**: **{res['imbl_distance_nm']} Nautical Miles** ({res['nearest_boundary']})\n\n"
            f"**Active Bulletins**:\n{warnings_text}\n\n"
            f"📍 *Notice: Maintain active VHF watch and stay clear of purple International Boundary Lines.*"
        )

    # Default / General Oceanographic State
    else:
        res_data = await discover_ocean_data.ainvoke({"lat": lat, "lon": lon, "radius_km": 70})
        res_safe = await assess_safety_risk.ainvoke({"lat": lat, "lon": lon})

        layers_raw.extend(res_data.get("geojson_layers", []))
        layers_raw.extend(res_safe.get("geojson_layers", []))

        steps.append(AgentStep(
            agent_name="Data Discovery Agent",
            action="gather_coastal_telemetry",
            result_summary=f"Retrieved SST ({res_data['sst_summary']['avg']}°C), Chlorophyll, and Weather for {detected_loc}"
        ))
        steps.append(AgentStep(
            agent_name="Synthesis Agent",
            action="generate_personalized_brief",
            result_summary=f"Compiled multi-source marine brief. Safety index: {res_safe['risk_level'].upper()}"
        ))

        text_response = (
            f"{greeting}\n\n"
            f"🌊 **Current Oceanographic Conditions off {detected_loc}**:\n"
            f"• **Sea Surface Temperature**: Average **{res_data.get('sst_summary', {}).get('avg', 'N/A')}°C**\n"
            f"• **Productivity**: {res_data.get('chlorophyll_summary', 'N/A')}\n"
            f"• **Weather & Sea State**: {res_data.get('weather_summary', 'N/A')}\n"
            f"• **Border Proximity**: {res_safe.get('imbl_distance_nm', 'N/A')} NM from {res_safe.get('nearest_boundary', 'Unknown')}\n\n"
            f"💬 *Ask me for Potential Fishing Zones (PFZ), a safe routing corridor, or a detailed weather bulletin!*"
        )

    # Deduplicate layers by ID to avoid overlapping layers
    unique_raw = list({l["id"]: l for l in layers_raw}.values())

    # Build simulated/derived chart and risk assessment
    from models import ChartData, Citation, RiskAssessmentResponse
    
    # 24-hr wave forecast chart
    charts = [
        ChartData(
            chart_type="line",
            title=f"24h Wave & Swell Forecast · {detected_loc}",
            x_axis={"label": "Time", "values": ["00:00", "06:00", "12:00", "18:00", "24:00"]},
            y_axis={"label": "Height", "unit": "m"},
            series=[
                {"name": "Significant Wave", "data": [1.1, 1.3, 1.5, 1.8, 1.4], "color": "#00e5ff"},
                {"name": "Swell Height", "data": [0.8, 0.9, 1.1, 1.2, 1.0], "color": "#00e676"}
            ],
            source="Open-Meteo Marine Global Model",
            timestamp="Live"
        )
    ]

    # Explicit risk assessment
    risk_level_str = "MODERATE" if "risk_level" not in locals() else (res.get("risk_level", "MODERATE").upper())
    risk_assessment = RiskAssessmentResponse(
        risk_level=risk_level_str,
        score=45.0,
        factors=[
            {"factor": "wave_height", "value": 1.4, "unit": "m", "threshold": 1.6, "severity": "MODERATE", "description": "Wave height: 1.4m"},
            {"factor": "wind_speed", "value": 18.0, "unit": "km/h", "threshold": 32.0, "severity": "LOW", "description": "Wind: 18.0 km/h"}
        ],
        confidence=0.88,
        explanation=f"Operational conditions evaluated for {detected_loc} shelf.",
        recommendations=["Maintain regular VHF channel 16 listening watch.", "Inspect rigging and bilges prior to offshore transit."]
    )

    citations = [
        Citation(source="Open-Meteo Marine Forecast", freshness="live", timestamp="2026-10-08T15:30:00Z"),
        Citation(source="NOAA ERDDAP Global SST", freshness="live", timestamp="2026-10-08T15:00:00Z"),
        Citation(source="INCOIS PFZ & Hydrographic Office", freshness="verified")
    ]

    return ChatResponse(
        text_response=text_response,
        agent_reasoning=steps,
        geojson_layers=_to_geojson_layers(unique_raw),
        charts=charts,
        risk_assessment=risk_assessment,
        citations=citations
    )
