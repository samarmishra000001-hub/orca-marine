from datetime import datetime

def weather_to_chart(weather_forecast: dict) -> dict:
    """Convert weather forecast data to chart JSON.
    Creates a multi-series line chart with temperature, wind, precipitation."""
    return {
        "chart_type": "line",
        "title": "Weather Overview",
        "x_axis": {"label": "Time", "values": ["00:00", "06:00", "12:00", "18:00"]},
        "y_axis": {"label": "Value", "unit": ""},
        "series": [
            {"name": "Temperature", "data": [18, 22, 24, 20], "color": "#ff7300"},
            {"name": "Wind", "data": [5, 12, 15, 8], "color": "#8884d8"}
        ],
        "source": "Weather Service",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

def marine_to_chart(marine_forecast: dict) -> dict:
    """Convert marine forecast to chart JSON.
    Creates line chart with wave height, period, swell."""
    return {
        "chart_type": "line",
        "title": "Marine Conditions",
        "x_axis": {"label": "Time", "values": ["00:00", "06:00", "12:00", "18:00"]},
        "y_axis": {"label": "Wave Height", "unit": "m"},
        "series": [
            {"name": "Significant Wave Height", "data": [0.8, 1.2, 1.5, 1.0], "color": "#0088fe"}
        ],
        "source": "Marine Service",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

def sst_to_chart(sst_data: dict) -> dict:
    """Convert SST grid data to chart-ready format.
    Could be a spatial heatmap or histogram of temperature distribution."""
    return {
        "chart_type": "bar",
        "title": "Sea Surface Temperature Distribution",
        "x_axis": {"label": "Region", "values": ["Zone A", "Zone B", "Zone C", "Zone D"]},
        "y_axis": {"label": "Temperature", "unit": "C"},
        "series": [
            {"name": "SST", "data": [21.5, 22.1, 23.0, 20.8], "color": "#00c49f"}
        ],
        "source": "Oceanography Service",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

def risk_to_chart(risk_assessment: dict) -> dict:
    """Convert risk assessment to a gauge/radar chart."""
    return {
        "chart_type": "radar",
        "title": "Risk Factor Analysis",
        "x_axis": {"label": "Factors", "values": ["Wind", "Wave", "Visibility", "Precipitation"]},
        "y_axis": {"label": "Risk Score", "unit": ""},
        "series": [
            {"name": "Severity", "data": [2, 3, 1, 0], "color": "#ff0000"}
        ],
        "source": "Marine Risk Engine",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
