import os
import sys
import re

# Configure UTF-8 for Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import edge_tts

from models import ChatRequest, ChatResponse
from middleware.translation import TranslationMiddleware
from agents.mock_orchestrator import mock_orchestrate
from agents.graph import run_agent
from agents.groq_agent import run_groq_agent

from api.ocean_routes import router as ocean_router
from ingestion.scheduler import start_scheduler

# Load environment variables
load_dotenv()

app = FastAPI(title='ORCA Marine Intelligence API', version='1.3.0')

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocean_router)

translator = TranslationMiddleware()

@app.get("/download-pdf")
async def download_pdf():
    """Download or view the Layman Project Guide PDF over HTTP."""
    pdf_path = os.path.join(os.path.dirname(__file__), "ORCA_Project_Layman_Guide.pdf")
    if os.path.exists(pdf_path):
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename="ORCA_Project_Layman_Guide.pdf",
            headers={"Content-Disposition": "inline; filename=ORCA_Project_Layman_Guide.pdf"}
        )
    raise HTTPException(status_code=404, detail="PDF file not found")

# High-fidelity Microsoft Neural Indian Regional Voices (100% human sounding)
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

@app.on_event("startup")
async def startup_event():
 main
    start_scheduler()
    
=======
    groq_key = os.getenv("GROQ_API_KEY", "")
    google_key = os.getenv("GOOGLE_API_KEY", "")
main
    mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"

    if groq_key:
        print("[ORCA] Backend active: Groq LPU Ultra-Fast Inference (<150ms) + Neural TTS.")
    elif google_key and not mock_mode:
        print("[ORCA] Backend active: Gemini LLM Mode + Neural TTS.")
    else:
        print("[ORCA] Backend active: High-Speed Coastal Orchestrator + Neural TTS.")

@app.get("/api/health")
async def health_check():
    groq_key = os.getenv("GROQ_API_KEY", "")
    google_key = os.getenv("GOOGLE_API_KEY", "")
    mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"

    engine = "groq_lpu" if groq_key else ("gemini_llm" if (google_key and not mock_mode) else "coastal_intel")

    return {
        "status": "healthy",
        "engine": engine,
        "supported_languages": list(translator.SUPPORTED_LANGUAGES.keys()),
        "neural_tts_enabled": True,
        "version": "1.3.0"
    }

@app.get("/api/tts")
async def get_neural_tts(text: str, language: str = 'en'):
    """Generate realistic, human-like neural speech for regional Indian coastal languages."""
    try:
        clean_text = re.sub(r'[*_#`•]', ' ', text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        if not clean_text:
            raise HTTPException(status_code=400, detail="Empty text provided")

        voice = VOICE_MAP.get(language, 'en-IN-NeerjaExpressiveNeural')
        truncated_text = clean_text[:600]

        communicate = edge_tts.Communicate(truncated_text, voice)
        audio_stream = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.extend(chunk["data"])

        return Response(
            content=bytes(audio_stream),
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        print(f"[TTS Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Step 1: Language Detection & Translation to English
        detected_lang = translator.detect_language(request.message)
        target_lang = request.language if (request.language and request.language != 'en') else detected_lang

        processed_message = request.message
        if detected_lang != 'en':
            processed_message = await translator.translate_to_english(request.message, detected_lang)

        internal_request = ChatRequest(
            message=processed_message,
            location=request.location,
            language=target_lang,
            vessel_type=getattr(request, 'vessel_type', 'motorized'),
            time_horizon=getattr(request, 'time_horizon', 'now'),
            conversation_history=getattr(request, 'conversation_history', [])
        )

        groq_key = os.getenv("GROQ_API_KEY", "")
        google_key = os.getenv("GOOGLE_API_KEY", "")
        mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"

        # Step 2: Route through Groq LPU (Ultra-Fast <150ms) -> Gemini -> Coastal Orchestrator
        if groq_key:
            response = await run_groq_agent(internal_request)
        elif google_key and not mock_mode:
            response = await run_agent(internal_request)
        else:
            response = await mock_orchestrate(internal_request)

        # Step 3: Translate response text to requested Indic language
        if target_lang and target_lang != 'en':
            translated_text = await translator.translate_from_english(response.text_response, target_lang)
            if translated_text:
                response.text_response = translated_text

        return response
    except Exception as e:
        print(f"[Error in /api/chat]: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Static Asset Serving for production
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if not os.path.exists(FRONTEND_DIST):
    alt_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist"))
    if os.path.exists(alt_dist):
        FRONTEND_DIST = alt_dist

@app.get("/")
async def serve_root():
    if os.path.exists(FRONTEND_DIST):
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    return {
        "status": "online",
        "service": "ORCA Marine Intelligence API",
        "health": "/api/health",
        "docs": "/docs",
        "message": "Backend is running!"
    }

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Page not found")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"[ORCA] Starting server on port {port}...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
