"""
PostGIS Spatial Table Models
These are only activated when DATABASE_URL is configured.
Imports are lazy to avoid crashing on environments without PostGIS.
"""

def get_models():
    """Returns model classes only if SQLAlchemy and GeoAlchemy2 are available."""
    try:
        from sqlalchemy import Column, Integer, String, Float, DateTime
        from geoalchemy2 import Geometry
        from sqlalchemy.orm import declarative_base

        Base = declarative_base()

        class SSTReading(Base):
            __tablename__ = "sst_readings"
            id = Column(Integer, primary_key=True, index=True)
            source = Column(String, index=True)
            temp_c = Column(Float)
            timestamp = Column(DateTime, index=True)
            geom = Column(Geometry('POINT', srid=4326))

        class ChlorophyllReading(Base):
            __tablename__ = "chlorophyll_readings"
            id = Column(Integer, primary_key=True, index=True)
            source = Column(String, index=True)
            concentration_mg_m3 = Column(Float)
            timestamp = Column(DateTime, index=True)
            geom = Column(Geometry('POINT', srid=4326))

        class PFZZone(Base):
            __tablename__ = "pfz_zones"
            id = Column(Integer, primary_key=True, index=True)
            source = Column(String, index=True)
            confidence_score = Column(Float)
            timestamp = Column(DateTime, index=True)
            geom = Column(Geometry('POLYGON', srid=4326))

        class WeatherStation(Base):
            __tablename__ = "weather_stations"
            id = Column(Integer, primary_key=True, index=True)
            station_id = Column(String, unique=True, index=True)
            source = Column(String, index=True)
            wind_speed_kmh = Column(Float, nullable=True)
            wave_height_m = Column(Float, nullable=True)
            timestamp = Column(DateTime, index=True)
            geom = Column(Geometry('POINT', srid=4326))

        return Base, SSTReading, ChlorophyllReading, PFZZone, WeatherStation

    except ImportError as e:
        import logging
        logging.getLogger(__name__).warning(f"PostGIS models not available: {e}")
        return None, None, None, None, None
