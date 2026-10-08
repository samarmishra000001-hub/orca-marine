from enum import Enum

class UserRole(str, Enum):
    FISHERMAN = 'fisherman'
    RESEARCHER = 'researcher'
    COASTAL_AUTHORITY = 'coastal_authority'
    DISASTER_OFFICER = 'disaster_officer'
    MARITIME_OPERATOR = 'maritime_operator'
    STUDENT = 'student'
    GENERAL = 'general'

def get_role_context(role: UserRole) -> str:
    """Return system prompt addition for the given user role.
    Adjusts tone, vocabulary, and emphasis:
    - fisherman: practical, boat-focused, fishing conditions, simple language
    - researcher: scientific, detailed, includes uncertainties, uses technical terms
    - coastal_authority: policy-focused, risk emphasis, population safety
    - disaster_officer: hazard-focused, evacuation implications, severity emphasis  
    - maritime_operator: navigation-focused, vessel operations, routing
    - student: educational, explanatory, includes definitions
    - general: balanced, clear, accessible"""
    contexts = {
        UserRole.FISHERMAN: "Use simple, practical language focusing on fishing conditions, boat safety, and practical advice.",
        UserRole.RESEARCHER: "Use technical, scientific language. Include uncertainties, detailed data points, and standard scientific terminology.",
        UserRole.COASTAL_AUTHORITY: "Focus on policy implications, overall risk assessments, and population safety guidelines.",
        UserRole.DISASTER_OFFICER: "Emphasize hazard severity, potential impact, and evacuation or emergency response implications.",
        UserRole.MARITIME_OPERATOR: "Focus on navigation, commercial vessel operations, and optimal routing decisions.",
        UserRole.STUDENT: "Be educational and explanatory. Provide clear definitions for technical terms.",
        UserRole.GENERAL: "Use balanced, clear, and highly accessible language suitable for the general public."
    }
    return contexts.get(role, contexts[UserRole.GENERAL])

def adapt_units(value: float, unit: str, preferred_system: str = 'metric') -> tuple[float, str]:
    """Convert between metric and imperial units."""
    if preferred_system == 'imperial':
        if unit == 'km/h':
            return round(value * 0.621371, 2), 'mph'
        elif unit == 'm':
            return round(value * 3.28084, 2), 'ft'
        elif unit == 'mm':
            return round(value * 0.0393701, 2), 'in'
        elif unit == 'C':
            return round((value * 9/5) + 32, 2), 'F'
        elif unit == 'km':
            return round(value * 0.621371, 2), 'mi'
    elif preferred_system == 'metric':
        if unit == 'mph':
            return round(value * 1.60934, 2), 'km/h'
        elif unit == 'ft':
            return round(value * 0.3048, 2), 'm'
        elif unit == 'in':
            return round(value * 25.4, 2), 'mm'
        elif unit == 'F':
            return round((value - 32) * 5/9, 2), 'C'
        elif unit == 'mi':
            return round(value * 1.60934, 2), 'km'
            
    return value, unit
