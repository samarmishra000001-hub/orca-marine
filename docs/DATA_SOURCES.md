# ORCA Data Sources Reference

## Overview
ORCA is strictly bound to live, verifiable marine APIs and datasets. No synthetic data is utilized in production.

## 1. Wave & Sea State Data
- **Provider**: Open-Meteo Marine API
- **Endpoint**: `https://marine-api.open-meteo.com/v1/marine`
- **Fields**: `wave_height`, `wave_period`, `swell_wave_height`, `ocean_current_velocity`
- **Update Frequency**: Hourly
- **Status Tags**: `LIVE`, `FORECAST`

## 2. Marine Weather
- **Provider**: Open-Meteo Weather API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Fields**: `wind_speed_10m`, `temperature_2m`, `precipitation`
- **Status Tags**: `LIVE`, `FORECAST`

## 3. Potential Fishing Zones (PFZ) & Warnings
- **Provider**: INCOIS (Indian National Centre for Ocean Information Services) / IMD
- **Mechanism**: Official advisory parsing.
- **Constraints**: If the programmatic feed is inaccessible or out of date, the system explicitly flags the data as `UNAVAILABLE` and provides the official INCOIS web portal link.

## 4. Earth Observation / SST
- **Provider**: Copernicus Marine Service
- **Mechanism**: Satellite-derived Ocean Colour and Sea Surface Temperature (SST) datasets.
- **Constraints**: Utilizes bounding-box querying. Data is cached based on provider update schedules (daily/weekly).

## Environment Variables
The following environment variables are strictly required by the backend to securely authenticate and run:
- `GROQ_API_KEY`: Groq LPU inference key.
- `GEMINI_API_KEY`: Google Gemini inference key.
- `FRONTEND_URL`: Trusted frontend origins for CORS (e.g., `https://orca-marine-alpha.vercel.app`).
- `ENVIRONMENT`: Set to `production` to enforce strict error redaction.
