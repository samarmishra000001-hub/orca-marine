import logging

logger = logging.getLogger(__name__)

def fetch_sst_data(bbox: tuple = None) -> dict:
    """
    Fetches Sea Surface Temperature (SST) from MOSDAC (INSAT-3D / Oceansat-3).
    """
    logger.info("Fetching SST data from MOSDAC...")
    return {"type": "FeatureCollection", "features": []}

def fetch_aws_stations() -> dict:
    """
    Fetches Automatic Weather Station (AWS) telemetry.
    """
    logger.info("Fetching AWS station data from MOSDAC...")
    return {"type": "FeatureCollection", "features": []}
