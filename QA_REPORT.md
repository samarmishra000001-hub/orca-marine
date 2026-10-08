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
| **Data Integrity** | Fetch safety risk with network disconnected | System reports data unavailable and refuses to declare "Safe" | Tool catches exception and defaults to safe mock values | **CRITICAL BUG**: Faked safety data. | Modified `tools.py` to raise/return error when critical data fails. | **PASS** |
| **Data Integrity** | `mock_orchestrator` fallback | Clearly states it is using mock/estimated data | Hardcoded `timestamp='Live'` and `freshness='live'` | **CRITICAL BUG**: Faked live claims in fallback. | Modified `mock_orchestrator.py` to label data as Estimated. | **PASS** |
| **Scientific Integrity** | Request PFZ | Show real satellite analysis or explicitly state it's a simulation | LLM returns "Productive ocean fronts detected" on random mock data | **BUG**: False claim of live data. | Updated PFZ tool to clearly label data as estimated model. | **PASS** |
| **Map Context** | Click random map coordinate | Chatbot knows the selected coordinate | Coordinates were not passed in `/api/chat/stream` properly | **BUG**: Map-to-chat context lost. | Patched `App.jsx` to pass `lat`, `lon`, and update `currentLocation`. | **PASS** |
| **Scope Restriction** | "Write Python code" / "cricket score" | Politely decline | `mock_orchestrator` returns marine condition text for any unknown input | **BUG**: Broad scope creep | Hardened `mock_orchestrator.py` to check for non-marine queries and reject them. | **PASS** (Tested via script) |
| **API Architecture** | CORS configuration | Restricted to frontend domains | `allow_origins=['*']` allowing any domain | **SECURITY**: Insecure CORS. | Restricted CORS in `app.py` to specific domains. | **PASS** |
| **Error Handling** | Stream error failure | Return graceful JSON error | Returns 500 with full stack trace strings | **SECURITY**: Trace exposure. | Caught exception and generalized error response in `chat.py`. | **PASS** |
| **Health Checks** | Hit `/api/health` | Returns real status of external data systems | Hardcoded to `"online"` for all systems | **BUG**: False live claims. | Adjusted `/api/health` to accurately reflect status. | **PASS** |

