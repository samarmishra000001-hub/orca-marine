import logging
from typing import Dict, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

def generate_chart(data: Dict[str, Any], chart_type: str, title: str, x_label: str = '', y_label: str = '') -> Dict[str, Any]:
    """Generate structured chart JSON for frontend rendering.
    
    chart_type: 'line', 'bar', 'area', 'gauge', 'comparison'
    
    Returns: {
        'chart_type': str,
        'title': str,
        'x_axis': {'label': str, 'values': list},
        'y_axis': {'label': str, 'unit': str},
        'series': [{'name': str, 'data': list, 'color': str}],
        'source': str,
        'timestamp': str
    }"""
    
    x_values = data.get('x_values', [])
    series = data.get('series', [])
    unit = data.get('unit', '')
    source = data.get('source', 'System Generated')
    
    return {
        'chart_type': chart_type,
        'title': title,
        'x_axis': {
            'label': x_label,
            'values': x_values
        },
        'y_axis': {
            'label': y_label,
            'unit': unit
        },
        'series': series,
        'source': source,
        'timestamp': datetime.now().isoformat()
    }

def generate_forecast_chart(forecast_data: Dict[str, Any], parameter: str, title: str) -> Dict[str, Any]:
    """Generate a time-series chart from forecast data.
    Extracts hourly timestamps and values for the specified parameter."""
    
    hourly_data = forecast_data.get('hourly', [])
    
    times = []
    values = []
    
    for entry in hourly_data:
        times.append(entry.get('time', ''))
        values.append(entry.get(parameter, 0))
        
    series = [
        {
            'name': parameter.replace('_', ' ').title(),
            'data': values,
            'color': '#3498db'
        }
    ]
    
    chart_data = {
        'x_values': times,
        'series': series,
        'unit': forecast_data.get('units', {}).get(parameter, ''),
        'source': forecast_data.get('source', 'Forecast Model')
    }
    
    return generate_chart(
        data=chart_data,
        chart_type='line',
        title=title,
        x_label='Time',
        y_label=parameter.replace('_', ' ').title()
    )

def generate_comparison_chart(data_a: Dict[str, Any], data_b: Dict[str, Any], parameter: str, labels: Tuple[str, str]) -> Dict[str, Any]:
    """Generate a comparison chart between two locations or time periods."""
    
    hourly_a = data_a.get('hourly', [])
    hourly_b = data_b.get('hourly', [])
    
    times = []
    values_a = []
    values_b = []
    
    for entry in hourly_a:
        times.append(entry.get('time', ''))
        values_a.append(entry.get(parameter, 0))
        
    for entry in hourly_b:
        values_b.append(entry.get(parameter, 0))
        
    series = [
        {
            'name': labels[0],
            'data': values_a,
            'color': '#3498db'
        },
        {
            'name': labels[1],
            'data': values_b,
            'color': '#e74c3c'
        }
    ]
    
    chart_data = {
        'x_values': times,
        'series': series,
        'unit': data_a.get('units', {}).get(parameter, ''),
        'source': f"Comparison: {data_a.get('source', 'A')} vs {data_b.get('source', 'B')}"
    }
    
    return generate_chart(
        data=chart_data,
        chart_type='comparison',
        title=f"{parameter.replace('_', ' ').title()} Comparison",
        x_label='Time',
        y_label=parameter.replace('_', ' ').title()
    )
