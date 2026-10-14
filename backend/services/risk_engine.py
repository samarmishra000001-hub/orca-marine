from enum import Enum
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

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
    wave_height: float = 0.0,
    wave_period: float = 0.0,
    wind_speed: float = 0.0,
    wind_gusts: float = 0.0,
    visibility: float = 10.0,
    precipitation: float = 0.0,
    current_speed: float = 0.0,
    has_active_warnings: bool = False,
    vessel_type: str = 'fishing'
) -> RiskAssessment:
    """Calculate marine risk from environmental parameters.
    
    Deterministic threshold rules:
    - Wave height:
      - < 1.0m: LOW
      - 1.0-2.0m: MODERATE
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
    
    Vessel adjustments:
    - 'fishing' / 'country_craft': thresholds 20% lower (multiplier 0.8)
    - 'cargo' / 'mechanized_trawler': thresholds 20% higher (multiplier 1.2)
    - 'motorized_boat' / standard: multiplier 1.0
    """
    multiplier = 1.0
    vessel_norm = (vessel_type or 'fishing').lower()
    if vessel_norm in ['fishing', 'country_craft', 'traditional_vallam']:
        multiplier = 0.8
    elif vessel_norm in ['cargo', 'mechanized_trawler', 'trawler']:
        multiplier = 1.2

    factors = []
    
    # Wave Height
    wh_sev = RiskLevel.LOW
    wh_score = 15.0
    if wave_height > 3.5 * multiplier:
        wh_sev = RiskLevel.SEVERE
        wh_score = 95.0
    elif wave_height >= 2.0 * multiplier:
        wh_sev = RiskLevel.HIGH
        wh_score = 75.0
    elif wave_height >= 1.0 * multiplier:
        wh_sev = RiskLevel.MODERATE
        wh_score = 45.0
    factors.append(RiskFactor(
        factor='wave_height',
        value=round(wave_height, 2),
        unit='m',
        threshold=round(2.0 * multiplier, 2),
        severity=wh_sev.value.lower(),
        description=f'Wave height: {wave_height:.2f}m'
    ))

    # Wind Speed
    ws_sev = RiskLevel.LOW
    ws_score = 10.0
    if wind_speed > 60.0 * multiplier:
        ws_sev = RiskLevel.SEVERE
        ws_score = 95.0
    elif wind_speed >= 40.0 * multiplier:
        ws_sev = RiskLevel.HIGH
        ws_score = 70.0
    elif wind_speed >= 20.0 * multiplier:
        ws_sev = RiskLevel.MODERATE
        ws_score = 40.0
    factors.append(RiskFactor(
        factor='wind_speed',
        value=round(wind_speed, 1),
        unit='km/h',
        threshold=round(40.0 * multiplier, 1),
        severity=ws_sev.value.lower(),
        description=f'Wind speed: {wind_speed:.1f} km/h'
    ))

    # Visibility
    vis_sev = RiskLevel.LOW
    vis_score = 10.0
    if visibility < 1.0:
        vis_sev = RiskLevel.SEVERE
        vis_score = 90.0
    elif visibility <= 2.0:
        vis_sev = RiskLevel.HIGH
        vis_score = 70.0
    elif visibility <= 5.0:
        vis_sev = RiskLevel.MODERATE
        vis_score = 40.0
    factors.append(RiskFactor(
        factor='visibility',
        value=round(visibility, 1),
        unit='km',
        threshold=2.0,
        severity=vis_sev.value.lower(),
        description=f'Visibility: {visibility:.1f} km'
    ))

    # Precipitation
    precip_sev = RiskLevel.LOW
    precip_score = 5.0
    if precipitation > 15.0:
        precip_sev = RiskLevel.SEVERE
        precip_score = 85.0
    elif precipitation >= 7.0:
        precip_sev = RiskLevel.HIGH
        precip_score = 65.0
    elif precipitation >= 2.0:
        precip_sev = RiskLevel.MODERATE
        precip_score = 35.0
    factors.append(RiskFactor(
        factor='precipitation',
        value=round(precipitation, 1),
        unit='mm/h',
        threshold=7.0,
        severity=precip_sev.value.lower(),
        description=f'Precipitation: {precipitation:.1f} mm/h'
    ))

    severity_vals = {RiskLevel.LOW: 0, RiskLevel.MODERATE: 1, RiskLevel.HIGH: 2, RiskLevel.SEVERE: 3}
    val_to_sev = {0: RiskLevel.LOW, 1: RiskLevel.MODERATE, 2: RiskLevel.HIGH, 3: RiskLevel.SEVERE}

    max_val = max(severity_vals[wh_sev], severity_vals[ws_sev], severity_vals[vis_sev], severity_vals[precip_sev])
    high_count = sum(1 for sev in [wh_sev, ws_sev, vis_sev, precip_sev] if severity_vals[sev] >= 2)

    # Boost by one level if multiple HIGH factors exist
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
        recs = [
            "STAY ASHORE: Conditions exceed safe limits for maritime transit.",
            "Do not venture into open ocean sectors; secure vessels in port.",
            "Monitor NavTex broadcasts and harbor storm signal advisories."
        ]
    elif overall_risk == RiskLevel.HIGH:
        recs = [
            "CAUTION: High wave energy and wind shear active.",
            "Small craft advisory in effect; only mechanized vessels with radar should proceed.",
            "Maintain mandatory life jackets and active VHF Channel 16 watch."
        ]
    elif overall_risk == RiskLevel.MODERATE:
        recs = [
            "Proceed with vigilance; nearshore chop and tidal swell expected.",
            "Keep distance from exposed headlands and sandbars.",
            "Check afternoon weather window before departing shelf."
        ]
    else:
        recs = [
            "Sea conditions are favorable and within normal parameters.",
            "Ideal operational window for coastal transit and fishing.",
            "Standard navigational awareness applies."
        ]

    return RiskAssessment(
        risk_level=overall_risk,
        score=round(overall_score, 1),
        factors=factors,
        confidence=0.92,
        explanation=f"Evaluated against maritime thresholds for {vessel_norm} vessels.",
        recommendations=recs,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
