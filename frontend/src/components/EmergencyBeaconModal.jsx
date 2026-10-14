import React, { useState } from 'react';

function toDMS(coordinate, isLat) {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = isLat
    ? coordinate >= 0 ? "N" : "S"
    : coordinate >= 0 ? "E" : "W";

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export default function EmergencyBeaconModal({ 
  isOpen, 
  onClose, 
  currentCoords = [72.82, 18.92], 
  locationName = "Mumbai Offshore Sector",
  onBroadcastSos
}) {
  const [distressType, setDistressType] = useState('ENGINE_FAILURE_DRIFTING');
  const [vesselName, setVesselName] = useState('IND-MH-04-1882');
  const [crewCount, setCrewCount] = useState(6);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!isOpen) return null;

  const lon = currentCoords[0];
  const lat = currentCoords[1];
  const dmsLat = toDMS(lat, true);
  const dmsLon = toDMS(lon, false);

  // Nearest MRCC
  let nearestMRCC = "MRCC Mumbai (Western Seaboard)";
  if (lon > 82.0 && lat < 14.0) {
    nearestMRCC = "MRCC Port Blair (Andaman & Nicobar)";
  } else if (lon > 78.0) {
    nearestMRCC = "MRCC Chennai (Eastern Seaboard)";
  }

  const handleSendBeacon = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastSent(true);
      if (onBroadcastSos) {
        onBroadcastSos({
          lat, lon, dms: `${dmsLat}, ${dmsLon}`,
          distressType, vesselName, crewCount, nearestMRCC
        });
      }
    }, 1500);
  };

  return (
    <div className="sos-modal-overlay">
      <div className="sos-modal-card ocean-glass">
        {/* Header */}
        <div className="sos-modal-header">
          <div className="sos-title-group">
            <span className="material-symbols-outlined sos-flashing-icon">e911_emergency</span>
            <div>
              <h2 className="sos-modal-title">EMERGENCY SOS MARITIME DISTRESS BEACON</h2>
              <span className="sos-modal-sub">INDIAN COAST GUARD &amp; MRCC SATELLITE DISPATCH (EPIRB 406 MHz)</span>
            </div>
          </div>
          <button type="button" className="sos-close-btn" onClick={onClose} title="Close SOS Dialog">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="sos-modal-body">
          {broadcastSent ? (
            <div className="sos-success-banner">
              <span className="material-symbols-outlined text-4xl text-[#00d4ff]">verified</span>
              <h3>DISTRESS BEACON BROADCAST TRANSMITTED</h3>
              <p>Hex ID acknowledged by <strong>{nearestMRCC}</strong> and NavTex Station.</p>
              <div className="sos-summary-box">
                <div><strong>COORDINATES:</strong> {dmsLat}, {dmsLon}</div>
                <div><strong>VESSEL:</strong> {vesselName} ({crewCount} POB)</div>
                <div><strong>EMERGENCY:</strong> {distressType.replace(/_/g, ' ')}</div>
                <div><strong>FREQ:</strong> VHF Ch 16 &amp; DSC 70 Active (2182 kHz)</div>
              </div>
              <button 
                type="button" 
                className="sos-reset-btn"
                onClick={() => { setBroadcastSent(false); onClose(); }}
              >
                Close &amp; Return to Radar
              </button>
            </div>
          ) : (
            <>
              {/* Telemetry Geolocation Box */}
              <div className="sos-coords-box">
                <div className="sos-coord-row">
                  <span className="sos-coord-label">EXACT GEOGRAPHIC FIX (DMS):</span>
                  <span className="sos-coord-dms">{dmsLat} &nbsp;|&nbsp; {dmsLon}</span>
                </div>
                <div className="sos-coord-row">
                  <span className="sos-coord-label">DECIMAL FIX:</span>
                  <span className="sos-coord-dec">{lat.toFixed(5)}°N, {lon.toFixed(5)}°E ({locationName})</span>
                </div>
                <div className="sos-coord-row">
                  <span className="sos-coord-label">AUTHORITY COMMAND:</span>
                  <span className="sos-coord-val text-[#E6A448]">{nearestMRCC}</span>
                </div>
              </div>

              {/* Form Controls */}
              <div className="sos-form-grid">
                <div className="sos-field-group">
                  <label>Distress Nature</label>
                  <select 
                    value={distressType} 
                    onChange={(e) => setDistressType(e.target.value)}
                    className="sos-select"
                  >
                    <option value="ENGINE_FAILURE_DRIFTING">Engine Breakdown &amp; Vessel Drifting</option>
                    <option value="VESSEL_TAKING_WATER">Vessel Taking On Water / Sinking Risk</option>
                    <option value="MAN_OVERBOARD">Man Overboard (MOB SAR Required)</option>
                    <option value="MEDICAL_EVAC">Critical Medical Emergency Evacuation</option>
                    <option value="FIRE_EXPLOSION">Fire or Explosion Onboard</option>
                    <option value="IMBL_INTERCEPTION_RISK">Inadvertent IMBL Boundary Breach</option>
                  </select>
                </div>

                <div className="sos-field-group">
                  <label>Vessel Registration / MMSI</label>
                  <input 
                    type="text" 
                    value={vesselName} 
                    onChange={(e) => setVesselName(e.target.value)}
                    className="sos-input"
                    placeholder="e.g. IND-KA-02-9912"
                  />
                </div>

                <div className="sos-field-group">
                  <label>Persons on Board (POB)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={crewCount} 
                    onChange={(e) => setCrewCount(parseInt(e.target.value) || 1)}
                    className="sos-input"
                  />
                </div>
              </div>

              {/* Warning Notice */}
              <div className="sos-warning-notice">
                <span className="material-symbols-outlined text-[#E6A448] text-base">warning</span>
                <span>
                  Transmitting synthetic emergency distress telemetry for operational readiness exercise. 
                  Always maintain real VHF Channel 16 watch and carry statutory distress flares.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="sos-action-bar">
                <button type="button" className="sos-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`sos-transmit-btn ${isBroadcasting ? 'loading' : ''}`}
                  onClick={handleSendBeacon}
                  disabled={isBroadcasting}
                >
                  <span className="material-symbols-outlined">cell_tower</span>
                  <span>{isBroadcasting ? "TRANSMITTING BEACON..." : "BROADCAST DISTRESS TO COAST GUARD"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
