import json
import logging
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from models import ChatRequest, ChatResponse, AgentStep, GeoJSONLayer, LayerStyle
from agents.tools import discover_ocean_data, assess_safety_risk, find_potential_fishing_zones, compute_safe_route, search_marine_knowledge
from agents.prompts import SYSTEM_PROMPT
from agents.mock_orchestrator import mock_orchestrate

logger = logging.getLogger(__name__)

TOOL_AGENT_MAP = {
    "discover_ocean_data": "Ocean & Atmospheric Agent",
    "assess_safety_risk": "Marine Risk & Safety Engine",
    "find_potential_fishing_zones": "PFZ & Fisheries Agent",
    "compute_safe_route": "Navigational Routing Agent",
    "search_marine_knowledge": "Knowledge Base & Document Agent",
}

tools = [discover_ocean_data, assess_safety_risk, find_potential_fishing_zones, compute_safe_route, search_marine_knowledge]

def _to_geojson_layers(raw_layers: list) -> list[GeoJSONLayer]:
    """Convert raw dict layers into validated GeoJSONLayer Pydantic objects."""
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

def _build_graph():
    """Build and compile the LangGraph StateGraph with tool nodes."""
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
    llm_with_tools = llm.bind_tools(tools)

    def agent_node(state: MessagesState):
        messages = state["messages"]
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    workflow = StateGraph(MessagesState)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))

    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
    workflow.add_edge("tools", "agent")

    return workflow.compile()

_graph = None

def _get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph

async def run_agent(request: ChatRequest) -> ChatResponse:
    """Run the LLM-powered LangGraph agent with location context & error fallback."""
    try:
        graph = _get_graph()

        # Build prompt incorporating user location and role context
        from services.personalization import get_role_context, UserRole
        role_ctx = get_role_context(UserRole(request.user_role))
        full_system_prompt = f"{SYSTEM_PROMPT}\n\n[USER ROLE INSTRUCTION]\n{role_ctx}"

        user_prompt = request.message
        if request.location and request.location.lower() != 'auto':
            user_prompt = f"[User Operating Location: {request.location}] {request.message}"

        messages = [
            SystemMessage(content=full_system_prompt),
            HumanMessage(content=user_prompt),
        ]

        final_state = await graph.ainvoke({"messages": messages})

        final_message = final_state["messages"][-1]
        text_response = final_message.content or "Marine intelligence analysis complete. Review map telemetry."

        steps: list[AgentStep] = []
        layers_raw: list[dict] = []

        for msg in final_state["messages"]:
            if isinstance(msg, ToolMessage):
                agent_name = TOOL_AGENT_MAP.get(msg.name, msg.name)
                summary = "Telemetry collected successfully"
                try:
                    res = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                    if isinstance(res, dict):
                        if "geojson_layers" in res:
                            layers_raw.extend(res["geojson_layers"])
                        summary_parts = []
                        for k, v in res.items():
                            if k != "geojson_layers":
                                summary_parts.append(f"{k}: {str(v)[:80]}")
                        if summary_parts:
                            summary = "; ".join(summary_parts[:3])
                except Exception:
                    pass

                steps.append(AgentStep(
                    agent_name=agent_name,
                    action=msg.name,
                    result_summary=summary,
                ))

        steps.append(AgentStep(
            agent_name="Synthesis & Advisory",
            action="generate_response",
            result_summary="Synthesized real-time telemetry, risk factors, and oceanographic data.",
        ))

        unique_raw = list({l["id"]: l for l in layers_raw}.values())

        return ChatResponse(
            text_response=text_response,
            agent_reasoning=steps,
            geojson_layers=_to_geojson_layers(unique_raw),
        )
    except Exception as e:
        logger.warning(f"LLM Agent loop failed: {e}. Falling back to rule-based mock orchestrator.")
        return await mock_orchestrate(request)

async def stream_agent(request: ChatRequest):
    """Run the LLM agent and yield Server-Sent Events for streaming."""
    try:
        graph = _get_graph()

        from services.personalization import get_role_context, UserRole
        role_ctx = get_role_context(UserRole(request.user_role))
        full_system_prompt = f"{SYSTEM_PROMPT}\n\n[USER ROLE INSTRUCTION]\n{role_ctx}"

        user_prompt = request.message
        if request.location and request.location.lower() != 'auto':
            user_prompt = f"[User Operating Location: {request.location}] {request.message}"

        messages = [
            SystemMessage(content=full_system_prompt),
            HumanMessage(content=user_prompt),
        ]

        steps = []
        layers_raw = []

        async for event in graph.astream_events({"messages": messages}, version="v1"):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
            elif kind == "on_tool_end":
                tool_name = event["name"]
                agent_name = TOOL_AGENT_MAP.get(tool_name, tool_name)
                output = event["data"].get("output", "")
                
                summary = "Telemetry collected successfully"
                try:
                    res = json.loads(output) if isinstance(output, str) else output
                    if isinstance(res, dict):
                        if "geojson_layers" in res:
                            layers_raw.extend(res["geojson_layers"])
                        summary_parts = []
                        for k, v in res.items():
                            if k != "geojson_layers":
                                summary_parts.append(f"{k}: {str(v)[:80]}")
                        if summary_parts:
                            summary = "; ".join(summary_parts[:3])
                except Exception:
                    pass
                
                step_data = {
                    "agent_name": agent_name,
                    "action": tool_name,
                    "result_summary": summary
                }
                steps.append(step_data)
                yield f"data: {json.dumps({'type': 'step', 'data': step_data})}\n\n"

        unique_raw = list({l["id"]: l for l in layers_raw}.values())
        final_payload = {
            "type": "complete",
            "data": {
                "geojson_layers": [l.model_dump() for l in _to_geojson_layers(unique_raw)],
                "agent_reasoning": steps,
            }
        }
        yield f"data: {json.dumps(final_payload)}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        logger.warning(f"Streaming failed: {e}.")
        yield f"data: {json.dumps({'type': 'token', 'content': f'\\n\\n[Error]: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"
