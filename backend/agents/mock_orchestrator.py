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

    # OUT OF SCOPE CHECK — reject non-marine queries
    OUT_OF_SCOPE_KW = ['code', 'python', 'javascript', 'programming', 'cricket', 'football',
                       'relationship', 'dating', 'boyfriend', 'girlfriend', 'medical', 'doctor',
                       'stock', 'bitcoin', 'crypto', 'shopping', 'recipe', 'cooking',
                       'movie', 'song', 'lyrics', 'game', 'sports', 'politics', 'election',
                       'homework', 'math problem', 'calculate integral', 'solve equation',
                       'write me', 'generate code', 'explain javascript', 'sort a list']
    MARINE_KW = ['sea', 'ocean', 'marine', 'fish', 'wave', 'wind', 'weather', 'sst', 'chlorophyll',
                 'pfz', 'port', 'coast', 'ship', 'boat', 'sail', 'navigate', 'tide', 'current',
                 'cyclone', 'storm', 'swell', 'temperature', 'forecast', 'safe', 'risk', 'imbl',
                 'route', 'catch', 'tuna', 'sardine', 'mackerel', 'zone', 'fishing', 'orca',
                 'warning', 'boundary', 'danger', 'anchor', 'harbor', 'harbour', 'depth',
                 'salinity', 'upwelling', 'eddy', 'plankton', 'coral', 'reef', 'mangrove',
                 'hi', 'hello', 'help', 'what can you do', 'who are you', 'namaste',
                 'good morning', 'good evening', 'thank', 'thanks', 'how are you']
    
    is_out = any(kw in msg for kw in OUT_OF_SCOPE_KW)
    is_marine = any(kw in msg for kw in MARINE_KW)
    
    if is_out and not is_marine:
        return ChatResponse(
            text_response="That's outside ORCA's scope. I can help with marine weather, ocean conditions, fishing intelligence, marine safety, warnings, and navigation.",
            agent_reasoning=[AgentStep(agent_name="Scope Filter", action="reject_out_of_scope", result_summary="Query outside marine intelligence domain")],
            geojson_layers=[],
        )

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

        imbl = res.get('imbl_distance_nm', 'N/A')
        bnd = res.get('nearest_boundary', 'Unknown')
        r_lvl = res.get('risk_level', 'UNAVAILABLE').upper()
        r_score = res.get('risk_score', 'N/A')
        warnings = res.get('warnings', [])

        steps.append(AgentStep(
            agent_name="Safety Agent",
            action="geofence_and_weather_risk_audit",
            result_summary=f"Nearest IMBL: {imbl} NM ({bnd}). Risk Level: {r_lvl}"
        ))

        warnings_text = "\n".join([f"• ⚠️ {w}" for w in warnings]) if warnings else "• No active bulletins."
        text_response = (
            f"{greeting}\n\n"
            f"🛡️ **Maritime Safety & Border Geofence Audit**:\n"
            f"• **Assessed Risk Level**: **{r_lvl}** (Threat Index: {r_score}/100)\n"
            f"• **Distance to Nearest IMBL**: **{imbl} Nautical Miles** ({bnd})\n\n"
            f"**Active Bulletins**:\n{warnings_text}\n\n"
            f"📍 *Notice: Maintain active VHF watch and stay clear of purple International Boundary Lines.*"
        )

    # Default / General Oceanographic State
    else:
        res_data = await discover_ocean_data.ainvoke({"lat": lat, "lon": lon, "radius_km": 70})
        res_safe = await assess_safety_risk.ainvoke({"lat": lat, "lon": lon})

        layers_raw.extend(res_data.get("geojson_layers", []))
        layers_raw.extend(res_safe.get("geojson_layers", []))

        sst_avg = res_data.get('sst_summary', {}).get('avg', 'N/A') if isinstance(res_data.get('sst_summary'), dict) else 'N/A'
        r_lvl = res_safe.get('risk_level', 'UNAVAILABLE').upper() if isinstance(res_safe, dict) else 'UNAVAILABLE'
        imbl = res_safe.get('imbl_distance_nm', 'N/A') if isinstance(res_safe, dict) else 'N/A'
        bnd = res_safe.get('nearest_boundary', 'Unknown') if isinstance(res_safe, dict) else 'Unknown'

        steps.append(AgentStep(
            agent_name="Data Discovery Agent",
            action="gather_coastal_telemetry",
            result_summary=f"Retrieved SST ({sst_avg}°C), Chlorophyll, and Weather for {detected_loc}"
        ))
        steps.append(AgentStep(
            agent_name="Synthesis Agent",
            action="generate_personalized_brief",
            result_summary=f"Compiled multi-source marine brief. Safety index: {r_lvl}"
        ))

        text_response = (
            f"{greeting}\n\n"
            f"🌊 **Current Oceanographic Conditions off {detected_loc}**:\n"
            f"• **Sea Surface Temperature**: Average **{sst_avg}°C**\n"
            f"• **Productivity**: {res_data.get('chlorophyll_summary', 'N/A')}\n"
            f"• **Weather & Sea State**: {res_data.get('weather_summary', 'N/A')}\n"
            f"• **Border Proximity**: {imbl} NM from {bnd}\n\n"
            f"💬 *Ask me for Potential Fishing Zones (PFZ), a safe routing corridor, or a detailed weather bulletin!*"
        )

    # Deduplicate layers by ID to avoid overlapping layers
    unique_raw = list({l["id"]: l for l in layers_raw}.values())

    # Build chart and risk assessment
    from models import ChartData, Citation, RiskAssessmentResponse
    
    # 24-hr wave forecast chart (estimated model, NOT live)
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
            source="Open-Meteo Marine Model (Estimated)",
            timestamp="Estimated"
        )
    ]

    # Risk assessment — use real data from res_safe if available, else mark as estimated
    risk_level_str = "MODERATE"
    risk_score_val = 45.0
    risk_factors = [
        {"factor": "wave_height", "value": "N/A", "unit": "m", "threshold": 2.0, "severity": "UNKNOWN", "description": "Estimated conditions"},
        {"factor": "wind_speed", "value": "N/A", "unit": "km/h", "threshold": 40.0, "severity": "UNKNOWN", "description": "Estimated conditions"}
    ]
    risk_explanation = f"Estimated conditions for {detected_loc}. Check official advisories."
    risk_recs = ["Check official marine advisories before departure."]

    try:
        if 'res_safe' in dir() and isinstance(res_safe, dict) and res_safe.get('risk_level') not in (None, 'UNAVAILABLE'):
            risk_level_str = res_safe.get('risk_level', 'MODERATE').upper()
            risk_score_val = res_safe.get('risk_score', 45.0)
            lm = res_safe.get('live_metrics', {})
            if lm:
                risk_factors = [
                    {"factor": "wave_height", "value": lm.get('wave_height_m', 0), "unit": "m", "threshold": 2.0, "severity": risk_level_str, "description": f"Wave height: {lm.get('wave_height_m', 'N/A')}m"},
                    {"factor": "wind_speed", "value": lm.get('wind_speed_kmh', 0), "unit": "km/h", "threshold": 40.0, "severity": "LOW", "description": f"Wind: {lm.get('wind_speed_kmh', 'N/A')} km/h"}
                ]
            risk_explanation = res_safe.get('explanation', risk_explanation)
            risk_recs = res_safe.get('warnings', risk_recs)
    except Exception:
        pass

    risk_assessment = RiskAssessmentResponse(
        risk_level=risk_level_str,
        score=risk_score_val,
        factors=risk_factors,
        confidence=0.7,
        explanation=risk_explanation,
        recommendations=risk_recs
    )

    citations = [
        Citation(source="Open-Meteo Marine Forecast", freshness="model"),
        Citation(source="NOAA ERDDAP Global SST", freshness="latest-available"),
        Citation(source="INCOIS PFZ Advisory", freshness="historical-model")
    ]

    return ChatResponse(
        text_response=text_response,
        agent_reasoning=steps,
        geojson_layers=_to_geojson_layers(unique_raw),
        charts=charts,
        risk_assessment=risk_assessment,
        citations=citations
    )
