import os
import json
import asyncio
from groq import AsyncGroq
from models import ChatRequest, ChatResponse, AgentStep, GeoJSONLayer
from agents.tools import discover_ocean_data, assess_safety_risk, find_potential_fishing_zones, compute_safe_route, search_web
from agents.prompts import SYSTEM_PROMPT
from agents.mock_orchestrator import mock_orchestrate

# Tool mapping dictionary
TOOL_MAP = {
    "discover_ocean_data": discover_ocean_data,
    "assess_safety_risk": assess_safety_risk,
    "find_potential_fishing_zones": find_potential_fishing_zones,
    "compute_safe_route": compute_safe_route,
    "search_web": search_web
}

GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "discover_ocean_data",
            "description": "Calculates bounding box around target coordinates and returns SST, Chlorophyll, and Weather summaries with GeoJSON layers.",
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
            "description": "Assesses safety risk based on wave heights, wind, and distance to International Maritime Boundary Lines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude of target location"},
                    "lon": {"type": "number", "description": "Longitude of target location"},
                    "vessel_type": {"type": "string", "description": "Vessel category", "default": "fishing"}
                },
                "required": ["lat", "lon"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_potential_fishing_zones",
            "description": "Finds Potential Fishing Zones (PFZs) with SST (26-28C) & Chlorophyll overlap and high confidence scores.",
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
            "name": "compute_safe_route",
            "description": "Computes an optimized safe navigational passage between coastal waypoints avoiding rough weather and boundaries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_lat": {"type": "number"},
                    "start_lon": {"type": "number"},
                    "end_lat": {"type": "number"},
                    "end_lon": {"type": "number"}
                },
                "required": ["start_lat", "start_lon", "end_lat", "end_lon"]
            }
        }
    }
,
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Searches the web for current information, news, and time-sensitive queries using Tavily.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "days": {"type": "number", "description": "Number of days back to search", "default": 7}
                },
                "required": ["query"]
            }
        }
    }
]

async def run_groq_agent(request: ChatRequest) -> ChatResponse:
    """Ultra-fast Groq LPU inference using llama-3.1-8b-instant (<150ms response)."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return await mock_orchestrate(request)

    try:
        client = AsyncGroq(api_key=api_key)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.message}
        ]

        # Call Groq LPU with tool definitions
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=GROQ_TOOLS,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=800
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
                        result_summary=f"Groq LPU executed {func_name} with params {func_args}"
                    ))

                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": func_name,
                        "content": json.dumps(tool_res)
                    })

            # Final response synthesis from Groq
            final_completion = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.3,
                max_tokens=600
            )
            final_text = final_completion.choices[0].message.content
        else:
            final_text = response_message.content

        # Deduplicate layers
        from agents.mock_orchestrator import _to_geojson_layers
        unique_raw = list({l["id"]: l for l in layers_raw}.values())

        return ChatResponse(
            text_response=final_text,
            agent_reasoning=steps,
            geojson_layers=_to_geojson_layers(unique_raw)
        )
    except Exception as e:
        print(f"[Groq Agent Fallback]: {e}")
        return await mock_orchestrate(request)
