import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from rag.ingestion import ingest_pdf

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Uploads a PDF document to be ingested into the RAG vector store.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Save uploaded file to a temporary location
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
            
        # Ingest the PDF
        ingest_pdf(tmp_path)
        
        return {"status": "success", "message": f"Successfully ingested {file.filename}."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
