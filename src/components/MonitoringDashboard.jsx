// This file contains the monitoring dashboard component
// It will be integrated into App.jsx
import { useState, useEffect } from 'react'

// Helper function to check parameter status
const getParameterStatus = (value, min, max) => {
  if (value === null || value === undefined) return {
    status: 'No Data',
    color: '#9e9e9e',
    message: 'Waiting for device reading...'
  }
  if (value >= min && value <= max) return {
    status: 'Normal',
    color: '#4CAF50',
    message: 'Within optimal range for tilapia'
  }
  if (value < min) return {
    status: 'Low',
    color: '#ff9800',
    message: 'Below optimal range - action may be needed'
  }
  return {
    status: 'High',
    color: '#f44336',
    message: 'Above optimal range - action may be needed'
  }
}

// Info Icon Component
const InfoIcon = ({ tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#e3f2fd',
          color: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
          fontSize: '0.75rem',
          fontWeight: '700',
          marginLeft: '0.5rem'
        }}
      >
        ?
      </div>
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '0.5rem',
          padding: '0.75rem',
          background: '#1a202c',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.75rem',
          width: '200px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a202c'
          }}></div>
        </div>
      )}
    </div>
  )
}

// Gauge Component
const ParameterGauge = ({ label, value, unit, min, max, optimalMin, optimalMax, color, description, tooltip }) => {
  const hasValue = value !== null && value !== undefined
  const safeSpan = max - min || 1
  const normalized = hasValue
    ? Math.max(0, Math.min(100, ((value - min) / safeSpan) * 100))
    : 0
  const optimalStart = Math.max(0, Math.min(100, ((optimalMin - min) / safeSpan) * 100))
  const optimalEnd = Math.max(0, Math.min(100, ((optimalMax - min) / safeSpan) * 100))

  const statusInfo = getParameterStatus(value, optimalMin, optimalMax)
  const statusTone = {
    Normal: { bg: '#ecfdf3', border: '#22c55e33', text: '#15803d' },
    Low: { bg: '#fff7ed', border: '#f9731633', text: '#c2410c' },
    High: { bg: '#fef2f2', border: '#ef444433', text: '#b91c1c' },
    'No Data': { bg: '#f8fafc', border: '#94a3b833', text: '#475569' },
  }[statusInfo.status] || { bg: '#f8fafc', border: '#94a3b833', text: '#475569' }

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #f7fafc 100%)',
        borderRadius: '16px',
        padding: '1.25rem',
        border: `1px solid ${statusTone.border}`,
        boxShadow: '0 10px 22px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#1f3b57',
              fontWeight: '700',
            }}
          >
            {label}
          </p>
          {tooltip && <InfoIcon tooltip={tooltip} />}
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            padding: '0.25rem 0.55rem',
            borderRadius: '999px',
            background: statusTone.bg,
            color: statusTone.text,
            border: `1px solid ${statusTone.border}`,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {statusInfo.status}
        </span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span
          style={{
            fontSize: '2.25rem',
            fontWeight: '800',
            color: '#0f2942',
            fontFamily: 'monospace',
            letterSpacing: '-0.03em',
          }}
        >
          {hasValue ? value.toFixed(value < 10 ? 2 : 1) : '—'}
        </span>
        {unit && (
          <span style={{ marginLeft: '0.35rem', fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{ marginBottom: '0.8rem' }}>
        <div
          style={{
            position: 'relative',
            height: '20px',
            borderRadius: '999px',
            background: '#e2e8f0',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${optimalStart}%`,
              width: `${Math.max(0, optimalEnd - optimalStart)}%`,
              top: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, #86efac 0%, #4ade80 100%)',
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${normalized}%`,
              background: `linear-gradient(90deg, ${color}aa 0%, ${color} 100%)`,
              transition: 'width 0.45s ease',
            }}
          />
          {hasValue && (
            <div
              style={{
                position: 'absolute',
                left: `${normalized}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '16px',
                borderRadius: '999px',
                border: '2px solid white',
                background: statusInfo.color,
                boxShadow: `0 0 0 3px ${statusInfo.color}33`,
              }}
            />
          )}
        </div>
        <div
          style={{
            marginTop: '0.45rem',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b',
            fontWeight: '600',
          }}
        >
          <span>{min}{unit}</span>
          <span style={{ color: '#15803d' }}>
            Optimal {optimalMin}-{optimalMax}{unit}
          </span>
          <span>{max}{unit}</span>
        </div>
      </div>

      <div
        style={{
          background: statusTone.bg,
          borderRadius: '10px',
          padding: '0.65rem 0.75rem',
          border: `1px solid ${statusTone.border}`,
        }}
      >
        <p style={{ margin: 0, fontSize: '0.8rem', color: statusTone.text, fontWeight: '700' }}>
          {statusInfo.message}
        </p>
        {hasValue && !['Normal', 'No Data'].includes(statusInfo.status) && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#475569' }}>
            {value < optimalMin
              ? `Needs +${(optimalMin - value).toFixed(1)}${unit} to reach optimal range.`
              : `Needs -${(value - optimalMax).toFixed(1)}${unit} to return to optimal range.`}
          </p>
        )}
      </div>

      {description && (
        <p style={{ margin: '0.7rem 0 0', fontSize: '0.73rem', color: '#64748b', lineHeight: 1.45 }}>
          {description}
        </p>
      )}
    </div>
  )
}

export const MonitoringDashboardContent = ({
  monitoringParameters,
  loadingMonitoring,
  weatherData,
  loadingWeather,
  showMonitoringModal,
  setShowMonitoringModal,
  newMonitoringRecord,
  setNewMonitoringRecord,
  editingMonitoring,
  setEditingMonitoring,
  handleAddMonitoringRecord,
  handleUpdateMonitoringRecord,
  handleDeleteMonitoringRecord,
  handleEditMonitoringRecord,
  isSubmitting,
  currentCycleId,
  setCurrentCycleId,
  formatDate,
  deviceReadings,
  loadingDeviceReadings,
  onViewCycleSummary,
  lastDeviceReadingTime,
}) => {
  const [currentTimeState, setCurrentTimeState] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeState(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const now = currentTimeState
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })

  // ESP32 is considered offline if no reading exists or last reading is older than 90 seconds.
  // Device upload interval is currently 60 seconds, so this allows normal jitter/network delay.
  const ESP32_TIMEOUT_MS = 90000
  const esp32Connected = (() => {
    if (!lastDeviceReadingTime || !deviceReadings) return false
    const ageMs = now.getTime() - new Date(lastDeviceReadingTime).getTime()
    return ageMs < ESP32_TIMEOUT_MS
  })()

  const timeSinceLastReading = (() => {
    if (!lastDeviceReadingTime) return null
    const ageMs = now.getTime() - new Date(lastDeviceReadingTime).getTime()
    if (ageMs < 60000) return `${Math.floor(ageMs / 1000)}s ago`
    if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)}m ago`
    return `${Math.floor(ageMs / 3600000)}h ago`
  })()

  const nextCollection = esp32Connected ? new Date(now.getTime() + 10000) : null
  const nextTime = nextCollection ? nextCollection.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'
  const nextDate = nextCollection ? nextCollection.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''

  // Filter parameters by cycle ID
  const filteredParameters = currentCycleId
    ? monitoringParameters.filter(p => p.cycle_id === currentCycleId)
    : monitoringParameters

  const storedSensorRows = filteredParameters
    .filter((p) =>
      p.waterTemperature !== null && p.waterTemperature !== undefined &&
      p.phLevel !== null && p.phLevel !== undefined &&
      p.dissolvedOxygen !== null && p.dissolvedOxygen !== undefined
    )
    .slice(0, 15)

  return (
    <section className="panel">
      <header className="panel-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
            Monitoring Dashboard
          </h2>
        </div>
        <div className="panel-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="add-record-button"
            onClick={() => {
              setNewMonitoringRecord({
                cycleId: currentCycleId || '',
                cycleStartDate: '',
                cycleEndDate: '',
                waterTemperature: '',
                dissolvedOxygen: '',
                phLevel: '',
                numberOfBreeders: '',
                breederRatio: '',
                feedAllocation: '',
                notes: '',
              })
              setShowMonitoringModal(true)
            }}
            style={{
              background: 'linear-gradient(135deg, #1A3D64 0%, #2d5a87 100%)',
              boxShadow: '0 4px 12px rgba(26, 61, 100, 0.3)'
            }}
          >
            + Enter Production Parameters
          </button>
          {onViewCycleSummary && (
            <button
              onClick={() => {
                onViewCycleSummary('all')
              }}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
              </svg>
              View Cycles
            </button>
          )}
        </div>
      </header>

      {/* System Status Bar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Time
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {currentTime}
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              {currentDate}
            </p>
          </div>
          <div style={{ width: '1px', height: '40px', background: '#e5e7eb' }}></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Next Reading
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {nextTime}
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              {nextDate}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* ESP32 Connection Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            background: esp32Connected
              ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)'
              : 'linear-gradient(135deg, #fde8e8 0%, #fecaca 100%)',
            borderRadius: '10px',
            border: `1px solid ${esp32Connected ? '#28a745' : '#ef4444'}40`,
            boxShadow: `0 2px 4px ${esp32Connected ? '#28a745' : '#ef4444'}20`
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: esp32Connected ? '#28a745' : '#ef4444',
              boxShadow: `0 0 12px ${esp32Connected ? '#28a745' : '#ef4444'}80`,
              animation: esp32Connected ? 'pulse 1.5s ease-in-out infinite' : 'none'
            }}></div>
            <div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: esp32Connected ? '#155724' : '#991b1b',
                display: 'block'
              }}>
                {esp32Connected ? 'ESP32 Connected' : 'ESP32 Disconnected'}
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: esp32Connected ? '#155724' : '#991b1b',
                opacity: 0.8
              }}>
                {esp32Connected
                  ? `Last reading: ${timeSinceLastReading}`
                  : timeSinceLastReading
                    ? `Last seen: ${timeSinceLastReading}`
                    : 'No data received'}
              </span>
            </div>
          </div>

          {/* System Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            background: loadingDeviceReadings
              ? 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)'
              : 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            borderRadius: '10px',
            border: `1px solid ${loadingDeviceReadings ? '#ffc107' : '#0284c7'}40`
          }}>
            <div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: loadingDeviceReadings ? '#856404' : '#0c4a6e',
                display: 'block'
              }}>
                {loadingDeviceReadings ? 'Updating...' : 'System Active'}
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: loadingDeviceReadings ? '#856404' : '#0c4a6e',
                opacity: 0.8
              }}>
                {loadingDeviceReadings ? 'Polling sensor data' : 'Monitoring in progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Water Quality Parameters - Auto-collected with Visual Gauges */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1a202c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              Water Quality Parameters
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: esp32Connected ? '#4CAF50' : '#ef4444',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {esp32Connected ? 'Auto-Collected' : 'Sensor Offline'}
              </span>
            </h3>
            {deviceReadings?.timestamp ? (
              <p style={{
                margin: '0.5rem 0 0 0',
                fontSize: '0.875rem',
                color: esp32Connected ? '#64748b' : '#ef4444'
              }}>
                Last updated: {new Date(deviceReadings.timestamp).toLocaleString()}
                {!esp32Connected && ` (${timeSinceLastReading})`}
              </p>
            ) : (
              <p style={{
                margin: '0.5rem 0 0 0',
                fontSize: '0.875rem',
                color: '#ef4444'
              }}>
                No sensor data received — connect and power on the ESP32
              </p>
            )}
          </div>
        </div>

        {/* Offline banner */}
        {!esp32Connected && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fde8e8 100%)',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#991b1b' }}>
                ESP32 sensor device is not connected
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#b91c1c' }}>
                Ensure the ESP32 is powered on, connected to WiFi, and sending data to the server.
                {deviceReadings && ' Showing last known readings below.'}
              </p>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          opacity: esp32Connected ? 1 : 0.6
        }}>
          {/* Water Temperature Gauge */}
          <ParameterGauge
            label="Water Temperature"
            value={deviceReadings?.waterTemperature ?? null}
            unit="°C"
            min={20}
            max={35}
            optimalMin={26}
            optimalMax={30}
            color="#ef4444"
            description="Temperature of pond water"
            tooltip="Water temperature affects fish metabolism, growth rate, and oxygen consumption. Tilapia thrive best between 26-30°C. Too cold slows growth, too hot reduces oxygen levels."
          />
          {/* pH Level Gauge */}
          <ParameterGauge
            label="pH Level"
            value={deviceReadings?.phLevel ?? null}
            unit=""
            min={4}
            max={10}
            optimalMin={6.5}
            optimalMax={8.5}
            color="#8b5cf6"
            description="Acidity/alkalinity of pond water"
            tooltip="pH measures how acidic or alkaline the water is. Tilapia thrive in pH 6.5–8.5. Low pH stresses fish and reduces appetite; high pH can cause ammonia toxicity."
          />
          {/* Dissolved Oxygen Gauge */}
          <ParameterGauge
            label="Dissolved Oxygen"
            value={deviceReadings?.dissolvedOxygen ?? null}
            unit="mg/L"
            min={0}
            max={20}
            optimalMin={5}
            optimalMax={9}
            color="#06b6d4"
            description="Calibrated dissolved oxygen concentration in water"
            tooltip="Dissolved oxygen concentration from the calibrated probe in mg/L. For tilapia, values below 5 mg/L can stress fish."
          />
        </div>
      </div>

      {/* Weather Information */}
      {weatherData && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Current Weather Conditions
              <InfoIcon tooltip="Weather conditions can affect pond water temperature and oxygen levels. Monitor these alongside water quality parameters." />
            </h3>
            <p style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              External environmental factors that may influence pond conditions
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>
                Temperature
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#78350f' }}>
                {weatherData.temperature?.toFixed(1) || '—'}°C
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>
                Humidity
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#1e3a8a' }}>
                {weatherData.humidity || '—'}%
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#3730a3', fontWeight: '600', textTransform: 'uppercase' }}>
                Condition
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#312e81' }}>
                {weatherData.condition || '—'}
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b21a8', fontWeight: '600', textTransform: 'uppercase' }}>
                Wind Speed
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#581c87' }}>
                {weatherData.windSpeed?.toFixed(1) || '—'} km/h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stored Sensor Data Table (PostgreSQL) */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1a202c'
          }}>
            Stored Sensor Data (PostgreSQL)
          </h3>
          <p style={{
            margin: '0.4rem 0 0 0',
            fontSize: '0.85rem',
            color: '#64748b'
          }}>
            Latest stored readings with timestamps for documentation and validation.
          </p>
        </div>

        {storedSensorRows.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            No stored sensor readings found yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ width: '34%', textAlign: 'left', padding: '0.65rem', fontSize: '0.8rem', color: '#475569' }}>Timestamp</th>
                  <th style={{ width: '18%', textAlign: 'left', padding: '0.65rem', fontSize: '0.8rem', color: '#475569' }}>Cycle ID</th>
                  <th style={{ width: '18%', textAlign: 'right', padding: '0.65rem', fontSize: '0.8rem', color: '#475569' }}>Temperature (°C)</th>
                  <th style={{ width: '12%', textAlign: 'right', padding: '0.65rem', fontSize: '0.8rem', color: '#475569' }}>pH</th>
                  <th style={{ width: '18%', textAlign: 'right', padding: '0.65rem', fontSize: '0.8rem', color: '#475569' }}>DO (mg/L)</th>
                </tr>
              </thead>
              <tbody>
                {storedSensorRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem 0.65rem', fontSize: '0.82rem', color: '#1f2937' }}>
                      {row.recordedAt ? new Date(row.recordedAt).toLocaleString() : '—'}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem 0.65rem',
                        fontSize: '0.82rem',
                        color: '#1f2937',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={row.cycleId || '—'}
                    >
                      {row.cycleId || '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', fontSize: '0.82rem', color: '#1f2937' }}>
                      {Number(row.waterTemperature).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', fontSize: '0.82rem', color: '#1f2937' }}>
                      {Number(row.phLevel).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', fontSize: '0.82rem', color: '#1f2937' }}>
                      {Number(row.dissolvedOxygen).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Latest User-Inputted Parameters Display */}
      {(() => {
        const breedingRecord = monitoringParameters.find(p => p.numberOfBreeders || p.breederRatio || p.feedAllocation)
        return breedingRecord
      })() && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Latest Breeding Cycle Parameters
              <InfoIcon tooltip="These parameters are entered manually before starting a breeding cycle. They help track breeding setup and feed management." />
            </h3>
            <p style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              Manually entered information for the current breeding cycle
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Number of Breeders
              </p>
              {(() => {
                const br = monitoringParameters.find(p => p.numberOfBreeders || p.breederRatio || p.feedAllocation)
                return (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                    {br?.numberOfBreeders || '—'}
                  </p>
                )
              })()}
            </div>
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Breeder Ratio
              </p>
              {(() => {
                const br = monitoringParameters.find(p => p.numberOfBreeders || p.breederRatio || p.feedAllocation)
                return (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                    {br?.breederRatio || '—'}
                  </p>
                )
              })()}
            </div>
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Feed Allocation
              </p>
              {(() => {
                const br = monitoringParameters.find(p => p.numberOfBreeders || p.breederRatio || p.feedAllocation)
                return (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                    {br?.feedAllocation ? `${Number(br.feedAllocation).toFixed(2)}` : '—'} kg
                  </p>
                )
              })()}
            </div>
          </div>
        </div>
      )}


      {/* Add/Edit Modal */}
      {showMonitoringModal && (
        <div className="modal-overlay" onClick={() => {
          if (!isSubmitting) {
            setShowMonitoringModal(false)
            setEditingMonitoring(null)
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingMonitoring ? 'Edit Monitoring Record' : 'Enter Production Parameters'}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  if (!isSubmitting) {
                    setShowMonitoringModal(false)
                    setEditingMonitoring(null)
                  }
                }}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            <form onSubmit={editingMonitoring ? handleUpdateMonitoringRecord : handleAddMonitoringRecord} className="add-record-form">
              <div className="form-row">
                <label className="field">
                  <span>Cycle ID *</span>
                  <input
                    type="text"
                    value={newMonitoringRecord.cycleId}
                    onChange={(e) => setNewMonitoringRecord({ ...newMonitoringRecord, cycleId: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="e.g., CYCLE-2025-001"
                  />
                </label>
                <label className="field">
                  <span>Cycle Start Date *</span>
                  <input
                    type="date"
                    value={newMonitoringRecord.cycleStartDate}
                    onChange={(e) => setNewMonitoringRecord({ ...newMonitoringRecord, cycleStartDate: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </label>
              </div>

              {/* Auto-collected Water Quality Parameters - Display Only */}
              {deviceReadings && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #f0f9f0 0%, #e8f5e9 100%)',
                  borderRadius: '12px',
                  border: '2px solid #4CAF50'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#2e7d32', fontWeight: '600' }}>
                      Water Quality Parameters (Auto-collected from Device)
                    </h4>
                    <span style={{
                      fontSize: '0.7rem',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      FROM DEVICE
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase' }}>
                        Water Temperature
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
                        {deviceReadings.waterTemperature?.toFixed(1)}°C
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase' }}>
                        Dissolved Oxygen
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
                        {deviceReadings.dissolvedOxygen?.toFixed(2)} mg/L
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase' }}>
                        pH Level
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
                        {deviceReadings.phLevel?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {loadingDeviceReadings && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                      Updating readings...
                    </p>
                  )}
                </div>
              )}

              <div className="form-row">
                <label className="field">
                  <span>Number of Breeders *</span>
                  <input
                    type="number"
                    min="0"
                    value={newMonitoringRecord.numberOfBreeders}
                    onChange={(e) => setNewMonitoringRecord({ ...newMonitoringRecord, numberOfBreeders: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="e.g., 50"
                  />
                </label>
                <label className="field">
                  <span>Breeder Ratio *</span>
                  <input
                    type="text"
                    value={newMonitoringRecord.breederRatio}
                    onChange={(e) => setNewMonitoringRecord({ ...newMonitoringRecord, breederRatio: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="e.g., 1:1 or 2:1"
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>Feed Allocation (kg) *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMonitoringRecord.feedAllocation}
                    onChange={(e) => setNewMonitoringRecord({ ...newMonitoringRecord, feedAllocation: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="e.g., 25.5"
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>Notes</span>
                  <textarea
                    value={newMonitoringRecord.notes}
                    onChange={(e) => setNewMonitoringRecord({ ...newMonitoringRecord, notes: e.target.value })}
                    disabled={isSubmitting}
                    rows="3"
                    placeholder="Additional notes or observations..."
                  />
                </label>
              </div>

              {weatherData && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Weather data will be automatically included:</p>
                  <p style={{ margin: 0 }}>
                    Temp: {weatherData.temperature?.toFixed(1)}°C | Humidity: {weatherData.humidity}% | Condition: {weatherData.condition} | Wind: {weatherData.windSpeed?.toFixed(1)} km/h
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowMonitoringModal(false)
                    setEditingMonitoring(null)
                    setNewMonitoringRecord({
                      cycleId: '',
                      cycleStartDate: '',
                      waterTemperature: '',
                      dissolvedOxygen: '',
                      phLevel: '',
                      numberOfBreeders: '',
                      breederRatio: '',
                      feedAllocation: '',
                      notes: '',
                    })
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingMonitoring ? 'Update Record' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </section>
  )
}
