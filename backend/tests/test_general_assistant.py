import pytest
import asyncio
from models import ChatRequest
from agents.mock_orchestrator import mock_orchestrate
from agents.tools import search_web

def test_identity_inquiry():
    req = ChatRequest(message="Who are you and what can you do?")
    res = asyncio.run(mock_orchestrate(req))
    assert "ORCA" in res.text_response
    assert "General-Purpose AI" in res.text_response
    assert "Marine" in res.text_response

def test_programming_question_not_refused():
    req = ChatRequest(message="How do I define an async function in Python?")
    res = asyncio.run(mock_orchestrate(req))
    # Must NOT refuse with "beyond my scope" or "marine only"
    assert "beyond my scope" not in res.text_response.lower()
    assert len(res.text_response) > 20

def test_science_question_not_refused():
    req = ChatRequest(message="Explain the difference between ocean currents and surface waves.")
    res = asyncio.run(mock_orchestrate(req))
    assert "beyond my scope" not in res.text_response.lower()
    assert len(res.text_response) > 30

def test_marine_location_query():
    req = ChatRequest(message="What are the wave heights and wind near Kochi?", location="Kochi")
    res = asyncio.run(mock_orchestrate(req))
    assert res.telemetry is not None
    assert "Kochi" in res.telemetry.location or "Coastal" in res.telemetry.location
    assert res.telemetry.alert_level in ["NORMAL", "WARNING", "SEVERE", "UNKNOWN"]

def test_search_web_tool():
    res = asyncio.run(search_web("ISRO Oceansat", days=7))
    assert "source" in res
    assert "status" in res
    assert res["status"] in ["LIVE", "UNAVAILABLE", "ERROR"]
