import os
import json
import asyncio
from groq import AsyncGroq
from models import ChatRequest, ChatResponse, AgentStep, GeoJSONLayer, LayerStyle
from agents.tools import (
    discover_ocean_data,
    assess_safety_risk,
    find_potential_fishing_zones,
    compute_safe_route,
    get_tide_and_weather_forecast,
    get_severe_weather_alerts,
    analyze_fishery_decline,
    audit_restricted_zones,
    search_web
)
from agents.prompts import SYSTEM_PROMPT
from agents.mock_orchestrator import mock_orchestrate

def _to_geojson_layers(raw_layers: list) -> list[GeoJSONLayer]:
    """Convert raw dict layers into validated GeoJSONLayer Pydantic objects."""
    result = []
    for l in raw_layers:
        if isinstance(l, GeoJSONLayer):
            result.append(l)
            continue
        style = l.get("style", {}) if isinstance(l, dict) else {}
        result.append(GeoJSONLayer(
            id=str(l.get("id", "layer")),
            type=l.get("type", "line"),
            label=str(l.get("label", "Map Layer")),
            data=l.get("data", {}),
            style=LayerStyle(
                color=style.get("color", "#00d4ff"),
                opacity=float(style.get("opacity", 0.6)),
                width=float(style.get("width", 2.0)),
            )
        ))
    return result

TOOL_MAP = {
    "discover_ocean_data": discover_ocean_data,
    "assess_safety_risk": assess_safety_risk,
    "find_potential_fishing_zones": find_potential_fishing_zones,
    "compute_safe_route": compute_safe_route,
    "get_tide_and_weather_forecast": get_tide_and_weather_forecast,
    "get_severe_weather_alerts": get_severe_weather_alerts,
    "analyze_fishery_decline": analyze_fishery_decline,
    "audit_restricted_zones": audit_restricted_zones,
    "search_web": search_web
}

GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "discover_ocean_data",
            "description": "Retrieves real-time waves, wind, atmospheric weather, and ocean conditions for specified latitude and longitude coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude of target location"},
                    "lon": {"type": "number", "description": "Longitude of target location"},
                    "radius_km": {"type": "number", "description": "Search radius in kilometers", "default": 60}
                },
                "required": ["lat", "lon"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assess_safety_risk",
            "description": "Calculates evidence-based marine risk level based on wave heights, wind velocity, and vessel type.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude of target location"},
                    "lon": {"type": "number", "description": "Longitude of target location"},
                    "vessel_type": {"type": "string", "description": "Vessel category: motorized_boat, country_craft, mechanized_trawler", "default": "motorized_boat"}
                },
                "required": ["lat", "lon"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compute_safe_route",
            "description": "Computes safe navigational waypoints and checks for geodesic intersection with known marine hazard zones.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_lat": {"type": "number"},
                    "start_lon": {"type": "number"},
                    "end_lat": {"type": "number"},
                    "end_lon": {"type": "number"},
                    "vessel_type": {"type": "string", "default": "motorized_boat"}
                },
                "required": ["start_lat", "start_lon", "end_lat", "end_lon"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_potential_fishing_zones",
            "description": "Identifies Potential Fishing Zones (PFZs) and target pelagic fish species based on thermal fronts and chlorophyll plumes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat_min": {"type": "number"},
                    "lon_min": {"type": "number"},
                    "lat_max": {"type": "number"},
                    "lon_max": {"type": "number"}
                },
                "required": ["lat_min", "lon_min", "lat_max", "lon_max"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_severe_weather_alerts",
            "description": "Checks for official IMD and INCOIS severe weather warnings, cyclone alerts, or squall warnings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lon": {"type": "number"}
                },
                "required": ["lat", "lon"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Searches the web for time-sensitive queries, current events, recent developments, or external factual citations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "days": {"type": "number", "description": "Recency filter in days", "default": 7}
                },
                "required": ["query"]
            }
        }
    }
]

async def run_groq_agent(request: ChatRequest) -> ChatResponse:
    """Ultra-fast Groq inference using llama-3.1-8b-instant with real tool execution and conversation memory."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return await mock_orchestrate(request)

    try:
        client = AsyncGroq(api_key=api_key)
        
        # Build message history with bounded context
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if request.conversation_history:
            for item in request.conversation_history[-6:]:
                role = item.get("role")
                content = item.get("content")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": str(content)[:1000]})
                    
        messages.append({"role": "user", "content": request.message})

        # Call Groq with tool definitions
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=GROQ_TOOLS,
            tool_choice="auto",
            temperature=0.3,
            max_tokens=900
        )

        response_message = completion.choices[0].message
        tool_calls = response_message.tool_calls

        steps = []
        layers_raw = []

        if tool_calls:
            messages.append(response_message)
            for tool_call in tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments)

                if func_name in TOOL_MAP:
                    if func_name == "search_web":
                        tool_res = await TOOL_MAP[func_name](**func_args)
                    else:
                        tool_res = TOOL_MAP[func_name].invoke(func_args)
                        
                    if isinstance(tool_res, dict):
                        layers_raw.extend(tool_res.get("geojson_layers", []))

                    steps.append(AgentStep(
                        agent_name=func_name.replace("_", " ").title(),
                        action=func_name,
                        result_summary=f"Executed {func_name} with params {func_args}"
                    ))

                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": func_name,
                        "content": json.dumps(tool_res)
                    })

            # Final response synthesis
            final_completion = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.3,
                max_tokens=800
            )
            final_text = final_completion.choices[0].message.content
        else:
            final_text = response_message.content

        # Deduplicate layers
        unique_raw = list({l["id"]: l for l in layers_raw if isinstance(l, dict) and "id" in l}.values())

        return ChatResponse(
            text_response=final_text,
            agent_reasoning=steps,
            geojson_layers=_to_geojson_layers(unique_raw)
        )
    except Exception as e:
        print(f"[Groq Agent Fallback]: {e}")
        return await mock_orchestrate(request)
