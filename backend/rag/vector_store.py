import os
from typing import List, Dict

# Determine the absolute path for chroma db
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "chroma_db"))

_collection = None

def _get_collection():
    global _collection
    if _collection is None:
        try:
            import chromadb
            _client = chromadb.PersistentClient(path=DB_DIR)
            _collection = _client.get_or_create_collection(name="marine_knowledge")
        except Exception as e:
            return None
    return _collection

def add_documents(documents: List[Dict]) -> None:
    """
    Adds a list of documents to the ChromaDB vector store.
    documents format: [{"id": "doc1", "text": "content", "metadata": {"source": "file.pdf"}}, ...]
    """
    if not documents:
        return
        
    collection = _get_collection()
    if not collection:
        return

    ids = [doc["id"] for doc in documents]
    texts = [doc["text"] for doc in documents]
    metadatas = [doc.get("metadata", {}) for doc in documents]
    
    collection.add(
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )

def query_documents(query: str, n_results: int = 3) -> List[Dict]:
    """
    Queries the vector store for the top n_results closest to the query.
    Returns a list of dicts with 'text' and 'metadata'.
    """
    collection = _get_collection()
    if not collection:
        return []

    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    
    output = []
    if results and results.get("documents") and len(results["documents"][0]) > 0:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
        
        for doc, meta in zip(docs, metas):
            output.append({
                "text": doc,
                "metadata": meta
            })
    return output
