"""Three-level conversational memory and context management service.
Implements:
1. Conversation Memory (retaining geographic coordinates, active time range, recent topics, and previous query).
2. User Preferences (user role, preferred units, preferred language).
3. Session Context (selected coordinates, active map layers, previous tool results).
"""

import time
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class SessionMemory(BaseModel):
    session_id: str
    created_at: float = Field(default_factory=time.time)
    last_accessed: float = Field(default_factory=time.time)
    
    # Geographic Context
    current_location_name: Optional[str] = "Chennai"
    latitude: Optional[float] = 13.08
    longitude: Optional[float] = 80.27
    basin: Optional[str] = "Bay of Bengal"
    state: Optional[str] = "Tamil Nadu"
    
    # Temporal Context
    time_horizon: str = "current"  # 'current', 'tomorrow', '48h_forecast'
    
    # Context History
    last_topic: Optional[str] = "general"  # 'weather', 'waves', 'pfz', 'imbl', 'route', 'sst'
    last_query: Optional[str] = None
    last_response_summary: Optional[str] = None
    
    # User Profile
    user_role: str = "general"
    preferred_language: str = "en"
    preferred_units: str = "metric"
    
    # Active Map Layers
    active_layers: list[str] = []

class MemoryStore:
    def __init__(self, ttl_seconds: int = 7200):
        self._sessions: Dict[str, SessionMemory] = {}
        self.ttl_seconds = ttl_seconds

    def get_or_create_session(self, session_id: Optional[str]) -> SessionMemory:
        now = time.time()
        # Clean expired sessions if collection grows
        if len(self._sessions) > 500:
            expired = [sid for sid, s in self._sessions.items() if now - s.last_accessed > self.ttl_seconds]
            for sid in expired:
                del self._sessions[sid]

        if not session_id or session_id not in self._sessions:
            sid = session_id or f"session_{int(now * 1000)}"
            mem = SessionMemory(session_id=sid)
            self._sessions[sid] = mem
            return mem

        mem = self._sessions[session_id]
        mem.last_accessed = now
        return mem

    def update_location(self, session_id: str, name: str, lat: float, lon: float, basin: Optional[str] = None, state: Optional[str] = None):
        mem = self.get_or_create_session(session_id)
        mem.current_location_name = name
        mem.latitude = lat
        mem.longitude = lon
        if basin:
            mem.basin = basin
        if state:
            mem.state = state

    def update_temporal(self, session_id: str, time_horizon: str):
        mem = self.get_or_create_session(session_id)
        mem.time_horizon = time_horizon

    def update_topic(self, session_id: str, topic: str, query: str):
        mem = self.get_or_create_session(session_id)
        mem.last_topic = topic
        mem.last_query = query

    def resolve_contextual_query(self, session_id: str, incoming_message: str) -> tuple[str, SessionMemory]:
        """Resolves pronouns ('here', 'tomorrow', 'and what about the wind?') using previous session memory."""
        mem = self.get_or_create_session(session_id)
        msg_lower = incoming_message.lower().strip()

        # Check for temporal shifts
        if "tomorrow" in msg_lower:
            mem.time_horizon = "tomorrow"
        elif "today" in msg_lower or "now" in msg_lower or "current" in msg_lower:
            mem.time_horizon = "current"

        # Check if user asks an implicit follow-up without specifying location
        has_pronoun_reference = any(w in msg_lower for w in ["here", "this area", "near me", "there", "what about", "and the", "and wind", "and waves", "how about"])

        resolved_message = incoming_message
        if has_pronoun_reference and mem.current_location_name:
            if not any(k in msg_lower for k in ["mumbai", "kochi", "chennai", "goa", "vizag", "rameswaram", "porbandar", "kanyakumari"]):
                resolved_message = f"{incoming_message} (Context: Location {mem.current_location_name}, Time: {mem.time_horizon})"

        return resolved_message, mem

# Global singleton memory store
memory_store = MemoryStore()
