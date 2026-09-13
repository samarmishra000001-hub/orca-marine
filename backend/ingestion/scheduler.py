import logging
import os

logger = logging.getLogger(__name__)

def ingest_pfz_job():
    try:
        logger.info("Starting scheduled PFZ ingestion...")
        from ingestion.isro import bhuvan
        gdf = bhuvan.fetch_pfz_data()
        logger.info(f"Ingested {len(gdf.get('features', []))} PFZ records.")
    except Exception as e:
        logger.error(f"Failed to ingest PFZ data: {e}")

def ingest_sst_job():
    try:
        logger.info("Starting scheduled SST ingestion...")
        from ingestion.isro import mosdac
        gdf = mosdac.fetch_sst_data()
        logger.info(f"Ingested {len(gdf.get('features', []))} SST records.")
    except Exception as e:
        logger.error(f"Failed to ingest SST data: {e}")

def start_scheduler():
    # Only run if not in mock mode
    if os.getenv("ORCA_DATA_MODE", "mock").lower() == "mock":
        logger.info("ORCA_DATA_MODE=mock — ISRO ingestion scheduler bypassed.")
        return None

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        # Run PFZ ingest daily at 02:00
        scheduler.add_job(ingest_pfz_job, 'cron', hour=2, minute=0)
        # Run SST ingest every 6 hours
        scheduler.add_job(ingest_sst_job, 'interval', hours=6)
        scheduler.start()
        logger.info("ISRO Data Ingestion Scheduler started.")
        return scheduler
    except Exception as e:
        logger.warning(f"Scheduler could not start: {e}")
        return None
