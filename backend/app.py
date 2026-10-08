import os
import sys
import re
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path so submodules can be imported when run as backend.app
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Configure UTF-8 for Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
try:
    import edge_tts
except ImportError:
    edge_tts = None

from middleware.translation import TranslationMiddleware
from api.chat import router as chat_router, VOICE_MAP
from api.marine import router as marine_router
from api.users import router as users_router
from api.knowledge import router as knowledge_router

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if mock_mode or not api_key:
        print("[ORCA] Backend operational in MOCK/FALLBACK & COASTAL INTEL mode with Neural TTS.")
    else:
        print("[ORCA] Backend operational in LLM mode with Gemini 2.0 & Live Marine Telemetry.")
    yield

app = FastAPI(
    title='Marine Intelligence Assistant API',
    description='Production-grade multi-agent maritime decision support platform with real atmospheric & oceanographic data',
    version='2.0.0',
    lifespan=lifespan
)

# Configure CORS securely
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://orca-marine-alpha.vercel.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def vercel_path_rewrite_middleware(request, call_next):
    # If rewritten with query parameter ?path=:path*, reconstruct the full API path
    subpath = request.query_params.get("path")
    if subpath:
        subpath = subpath.lstrip("/")
        request.scope["path"] = f"/api/{subpath}"
    elif request.url.path in ("/backend/app.py", "/backend/app.py/"):
        request.scope["path"] = "/api/health"
    response = await call_next(request)
    return response

translator = TranslationMiddleware()

# Include modular routers
app.include_router(chat_router)
app.include_router(marine_router)
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(knowledge_router)

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
    api_key = os.getenv("GOOGLE_API_KEY", "")
    mode = 'mock' if mock_mode or not api_key else 'llm'
    return {
        "status": "healthy",
        "mode": mode,
        "supported_languages": list(translator.SUPPORTED_LANGUAGES.keys()),
        "neural_tts_enabled": True,
        "version": "2.0.0",
        "services": {
            "marine_data_api": "active"
        }
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
        raise HTTPException(status_code=500, detail="Text-to-speech service is temporarily unavailable.")

@app.get("/api/tts_debug")
async def get_neural_tts_debug(text: str, language: str = 'en'):
    try:
        if edge_tts is None:
            return {"error": "edge_tts module is not installed"}
        voice = VOICE_MAP.get(language, 'en-IN-NeerjaExpressiveNeural')
        communicate = edge_tts.Communicate(text[:100], voice)
        stream = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                stream.extend(chunk["data"])
        return {"status": "ok", "bytes": len(stream)}
    except Exception as e:
        return {"error": str(e), "type": str(type(e))}
