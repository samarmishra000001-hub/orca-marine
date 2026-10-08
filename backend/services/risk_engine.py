from enum import Enum
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class RiskLevel(str, Enum):
    LOW = 'LOW'
    MODERATE = 'MODERATE'
    HIGH = 'HIGH'
    SEVERE = 'SEVERE'

class RiskFactor(BaseModel):
    factor: str
    value: float
    unit: str
    threshold: float
    severity: str  # 'low', 'moderate', 'high', 'severe'
    description: str

class RiskAssessment(BaseModel):
    risk_level: RiskLevel
    score: float  # 0-100
    factors: List[RiskFactor]
    confidence: float  # 0-1
    explanation: str
    recommendations: List[str]
    disclaimer: str = 'This is an informational assessment. Always follow official marine safety warnings and local authority guidance.'
    timestamp: str
    source: str = 'Marine Risk Engine v1.0'

def calculate_marine_risk(
    wave_height: float = 0,
    wave_period: float = 0,
    wind_speed: float = 0,
    wind_gusts: float = 0,
    visibility: float = 10,
    precipitation: float = 0,
    current_speed: float = 0,
    has_active_warnings: bool = False,
    vessel_type: str = 'fishing'
) -> RiskAssessment:
    """Calculate marine risk from environmental parameters.
    
    Rules (deterministic, NOT LLM-generated):
    - Wave height:
      - < 1.0m: LOW
      - 1.0-2.0m: MODERATE for small vessels
      - 2.0-3.5m: HIGH
      - > 3.5m: SEVERE
    - Wind speed:
      - < 20 km/h: LOW
      - 20-40 km/h: MODERATE
      - 40-60 km/h: HIGH  
      - > 60 km/h: SEVERE
    - Visibility:
      - > 5 km: LOW
      - 2-5 km: MODERATE
      - 1-2 km: HIGH
      - < 1 km: SEVERE
    - Precipitation:
      - < 2 mm/h: LOW
      - 2-7 mm/h: MODERATE
      - 7-15 mm/h: HIGH
      - > 15 mm/h: SEVERE
    
    Overall risk = max of all individual factor severities,
    boosted by one level if multiple HIGH factors exist.
    
    Vessel type adjustments:
    - 'fishing' (small): thresholds are 20% lower
    - 'cargo' (large): thresholds are 20% higher
    - 'naval': standard thresholds
    
    If has_active_warnings: minimum risk is MODERATE.
    """
    multiplier = 1.0
    if vessel_type == 'fishing':
        multiplier = 0.8
    elif vessel_type == 'cargo':
        multiplier = 1.2

    factors = []
    
    # Wave Height
    wh_sev = RiskLevel.LOW
    wh_score = 0.0
    if wave_height > 3.5 * multiplier:
        wh_sev = RiskLevel.SEVERE
        wh_score = 100
    elif wave_height >= 2.0 * multiplier:
        wh_sev = RiskLevel.HIGH
        wh_score = 70
    elif wave_height >= 1.0 * multiplier:
        wh_sev = RiskLevel.MODERATE
        wh_score = 40
    factors.append(RiskFactor(factor='wave_height', value=wave_height, unit='m', threshold=2.0*multiplier, severity=wh_sev.value, description=f'Wave height: {wave_height}m'))

    # Wind Speed
    ws_sev = RiskLevel.LOW
    ws_score = 0.0
    if wind_speed > 60 * multiplier:
        ws_sev = RiskLevel.SEVERE
        ws_score = 100
    elif wind_speed >= 40 * multiplier:
        ws_sev = RiskLevel.HIGH
        ws_score = 70
    elif wind_speed >= 20 * multiplier:
        ws_sev = RiskLevel.MODERATE
        ws_score = 40
    factors.append(RiskFactor(factor='wind_speed', value=wind_speed, unit='km/h', threshold=40*multiplier, severity=ws_sev.value, description=f'Wind speed: {wind_speed}km/h'))

    # Visibility
    vis_sev = RiskLevel.LOW
    vis_score = 0.0
    if visibility < 1:
        vis_sev = RiskLevel.SEVERE
        vis_score = 100
    elif visibility <= 2:
        vis_sev = RiskLevel.HIGH
        vis_score = 70
    elif visibility <= 5:
        vis_sev = RiskLevel.MODERATE
        vis_score = 40
    factors.append(RiskFactor(factor='visibility', value=visibility, unit='km', threshold=2.0, severity=vis_sev.value, description=f'Visibility: {visibility}km'))

    # Precipitation
    precip_sev = RiskLevel.LOW
    precip_score = 0.0
    if precipitation > 15:
        precip_sev = RiskLevel.SEVERE
        precip_score = 100
    elif precipitation >= 7:
        precip_sev = RiskLevel.HIGH
        precip_score = 70
    elif precipitation >= 2:
        precip_sev = RiskLevel.MODERATE
        precip_score = 40
    factors.append(RiskFactor(factor='precipitation', value=precipitation, unit='mm/h', threshold=7.0, severity=precip_sev.value, description=f'Precipitation: {precipitation}mm/h'))

    severity_vals = {RiskLevel.LOW: 0, RiskLevel.MODERATE: 1, RiskLevel.HIGH: 2, RiskLevel.SEVERE: 3}
    val_to_sev = {0: RiskLevel.LOW, 1: RiskLevel.MODERATE, 2: RiskLevel.HIGH, 3: RiskLevel.SEVERE, 4: RiskLevel.SEVERE}

    max_val = max(severity_vals[wh_sev], severity_vals[ws_sev], severity_vals[vis_sev], severity_vals[precip_sev])
    high_count = sum(1 for sev in [wh_sev, ws_sev, vis_sev, precip_sev] if severity_vals[sev] >= 2)

    if high_count > 1 and max_val < 3:
        max_val += 1

    if has_active_warnings and max_val < 1:
        max_val = 1

    overall_risk = val_to_sev[max_val]
    overall_score = max(wh_score, ws_score, vis_score, precip_score)
    if has_active_warnings:
        overall_score = max(overall_score, 50.0)

    recs = []
    if overall_risk == RiskLevel.SEVERE:
        recs = ["Do not go out to sea.", "Seek immediate shelter."]
    elif overall_risk == RiskLevel.HIGH:
        recs = ["Exercise extreme caution.", "Only experienced operators should proceed."]
    elif overall_risk == RiskLevel.MODERATE:
        recs = ["Proceed with caution.", "Monitor weather updates."]
    else:
        recs = ["Conditions are generally safe.", "Maintain standard awareness."]

    return RiskAssessment(
        risk_level=overall_risk,
        score=overall_score,
        factors=factors,
        confidence=0.9,
        explanation=f"Based on rules for {vessel_type} vessels.",
        recommendations=recs,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
