import os
import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from models import ChatRequest, ChatResponse
from middleware.translation import TranslationMiddleware
from agents.mock_orchestrator import mock_orchestrate
from agents.graph import run_agent, stream_agent
from services.memory import memory_store

router = APIRouter(prefix="/api", tags=["chat"])
translator = TranslationMiddleware()

VOICE_MAP = {
    'en': 'en-IN-NeerjaExpressiveNeural',
    'hi': 'hi-IN-SwaraNeural',
    'ta': 'ta-IN-PallaviNeural',
    'te': 'te-IN-ShrutiNeural',
    'mr': 'mr-IN-AarohiNeural',
    'gu': 'gu-IN-DhwaniNeural',
    'kn': 'kn-IN-SapnaNeural',
    'ml': 'ml-IN-SobhanaNeural',
    'bn': 'bn-IN-TanishaaNeural',
    'gom': 'mr-IN-AarohiNeural',
    'or': 'hi-IN-SwaraNeural'
}


def _prepare_request(request: ChatRequest):
    """Common context-resolution logic shared by /chat and /chat/stream."""
    session_id = request.session_id or "default_session"
    resolved_message, session_mem = memory_store.resolve_contextual_query(
        session_id=session_id,
        incoming_message=request.message
    )

    if request.latitude is not None and request.longitude is not None:
        session_mem.latitude = request.latitude
        session_mem.longitude = request.longitude
    if request.location and request.location.lower() != 'auto':
        session_mem.current_location_name = request.location
    if request.user_role:
        session_mem.user_role = request.user_role

    detected_lang = translator.detect_language(resolved_message)
    target_lang = request.language if (request.language and request.language != 'en') else detected_lang

    processed_message = resolved_message
    if detected_lang != 'en':
        # Note: translate_to_english is async but we need sync here for shared usage.
        # For the streaming path we skip pre-translation and let the LLM handle it.
        processed_message = resolved_message  # Will be handled inline below

    internal_request = ChatRequest(
        message=processed_message,
        location=session_mem.current_location_name or request.location,
        language=target_lang,
        latitude=session_mem.latitude,
        longitude=session_mem.longitude,
        session_id=session_id,
        user_role=session_mem.user_role,
        selected_layers=request.selected_layers
    )

    return internal_request, session_id, target_lang, detected_lang, resolved_message


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        internal_request, session_id, target_lang, detected_lang, resolved_message = _prepare_request(request)

        # Translate input to English for agent reasoning if in an Indic script
        if detected_lang != 'en':
            translated = await translator.translate_to_english(resolved_message, detected_lang)
            if translated:
                internal_request.message = translated

        mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
        api_key = os.getenv("GOOGLE_API_KEY", "")

        if mock_mode or not api_key:
            response = await mock_orchestrate(internal_request)
        else:
            response = await run_agent(internal_request)

        memory_store.update_topic(session_id, topic="marine_intel", query=request.message)
        response.session_id = session_id

        if target_lang and target_lang != 'en':
            translated_text = await translator.translate_from_english(response.text_response, target_lang)
            if translated_text:
                response.text_response = translated_text

        return response
    except Exception as e:
        print(f"[Error in /api/chat]: {e}")
        raise HTTPException(status_code=500, detail="Marine intelligence service encountered an error. Please try again.")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """SSE streaming endpoint. Returns text/event-stream with token-by-token updates."""
    try:
        internal_request, session_id, target_lang, detected_lang, resolved_message = _prepare_request(request)

        if detected_lang != 'en':
            translated = await translator.translate_to_english(resolved_message, detected_lang)
            if translated:
                internal_request.message = translated

        mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
        api_key = os.getenv("GOOGLE_API_KEY", "")

        if mock_mode or not api_key:
            # Mock mode: no streaming available, return full response as a single SSE event
            response = await mock_orchestrate(internal_request)
            memory_store.update_topic(session_id, topic="marine_intel", query=request.message)
            response.session_id = session_id

            async def mock_sse():
                # Send full text as a single token
                yield f"data: {json.dumps({'type': 'token', 'content': response.text_response})}\n\n"
                # Send reasoning steps
                for step in response.agent_reasoning:
                    yield f"data: {json.dumps({'type': 'step', 'data': step.model_dump()})}\n\n"
                # Send complete payload
                complete_data = {
                    "type": "complete",
                    "data": response.model_dump()
                }
                yield f"data: {json.dumps(complete_data)}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(mock_sse(), media_type="text/event-stream")

        else:
            # Real LLM streaming via LangGraph astream_events
            memory_store.update_topic(session_id, topic="marine_intel", query=request.message)
            return StreamingResponse(
                stream_agent(internal_request),
                media_type="text/event-stream"
            )

    except Exception as e:
        print(f"[Error in /api/chat/stream]: {e}")
        raise HTTPException(status_code=500, detail="Marine intelligence service encountered an error. Please try again.")
