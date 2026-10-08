from langchain_core.tools import tool
from rag.vector_store import query_documents

@tool
def search_marine_knowledge(query: str) -> str:
    """
    Searches the marine knowledge base (RAG) for information to answer queries.
    Useful for retrieving domain-specific knowledge from ingested manuals, regulations, or documents.
    """
    results = query_documents(query, n_results=3)
    
    if not results:
        return "No relevant information found in the knowledge base."
        
    formatted_results = []
    for i, res in enumerate(results):
        source = res.get("metadata", {}).get("source", "Unknown")
        text = res.get("text", "")
        formatted_results.append(f"--- Document {i+1} (Source: {source}) ---\n{text}")
        
    return "\n\n".join(formatted_results)
