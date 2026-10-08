import os
import uuid
from typing import List
from pypdf import PdfReader
from rag.vector_store import add_documents

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Splits text into chunks of `chunk_size` characters with `overlap` overlap.
    """
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        if end == text_len:
            break
        start += (chunk_size - overlap)
    return chunks

def ingest_pdf(file_path: str) -> None:
    """
    Extracts text from a PDF file, chunks it, and saves it to the vector store.
    """
    reader = PdfReader(file_path)
    full_text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            full_text += extracted + "\n"
            
    if not full_text.strip():
        raise ValueError("No text could be extracted from the PDF.")
        
    chunks = chunk_text(full_text)
    source_name = os.path.basename(file_path)
    
    documents = []
    for chunk in chunks:
        doc_id = str(uuid.uuid4())
        documents.append({
            "id": doc_id,
            "text": chunk,
            "metadata": {"source": source_name}
        })
        
    add_documents(documents)
