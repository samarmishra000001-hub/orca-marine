# ORCA Marine Intelligence - QA & Audit Report

## Audit Scope
1.  **Frontend**: UI/UX, Map integrations, Error states.
2.  **Backend/API**: Routing, LLM Agent Graph, Caching, Error handling.
3.  **Chatbot**: Prompt scope, Location/Time resolution, Integration with Map Context.
4.  **Realtime Data**: Open-Meteo & NOAA ERDDAP pipelines.
5.  **Security**: API handling, Prompt injection resistance.

## Test Matrix & Failures Found

| FEATURE | INPUT | EXPECTED RESULT | ACTUAL RESULT | BUG FOUND | FIX IMPLEMENTED | RETEST RESULT |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Data Integrity** | Fetch safety risk with network disconnected from ERDDAP/Meteo | System reports data unavailable and refuses to declare "Safe" | Tool catches exception and defaults to safe mock values (wave_ht=1.4, wind=18) | **CRITICAL BUG**: Faked safety data. | Modified `tools.py` to raise/return error when critical data fails. | Pending |
| **Scientific Integrity** | Request PFZ | Show real satellite analysis or explicitly state it's a simulation | LLM returns "Productive ocean fronts detected" on random mock data | **BUG**: False claim of live data. | Updated PFZ tool to clearly label data as estimated/historical model. | Pending |
| **API Architecture** | Multiple concurrent requests to Meteo | Connection pooling handles it smoothly | `httpx.AsyncClient` is recreated on every single function call | **PERF ISSUE**: No connection pooling. | Pending | Pending |
| **Map Context** | Select PFZ and ask "Why is this one better?" | Chatbot knows the selected PFZ | Context is lost or not sent properly | Pending check | Pending | Pending |
| **Scope Restriction** | "Write Python code" | Politely decline | Need to verify prompt | Pending check | Pending | Pending |
