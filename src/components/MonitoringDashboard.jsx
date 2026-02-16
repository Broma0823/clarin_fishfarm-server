// This file contains the monitoring dashboard component
// It will be integrated into App.jsx
import { useState } from 'react'

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

// Gauge Component - Matching reference design
const ParameterGauge = ({ label, value, unit, min, max, optimalMin, optimalMax, color, description, tooltip }) => {
  const percentage = value !== null && value !== undefined 
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : 0
  
  const statusInfo = getParameterStatus(value, optimalMin, optimalMax)
  const isNormal = statusInfo.status === 'Normal'
  
  // Calculate marker position (white marker on the bar)
  const markerPosition = value !== null && value !== undefined 
    ? `${100 - percentage}%`
    : '100%'
  
  return (
    <div style={{
      background: '#f0f9f0',
      borderRadius: '12px',
      padding: '1.25rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: `2px solid ${isNormal ? '#4CAF50' : '#e5e7eb'}`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Label */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: '#2d5016',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </p>
        {tooltip && <InfoIcon tooltip={tooltip} />}
      </div>

      {/* Digital Readout - Large and Prominent */}
      <div style={{ 
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '0.5rem',
          background: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <span style={{
            fontSize: '2.75rem',
            fontWeight: '700',
            color: '#1a202c',
            lineHeight: 1,
            fontFamily: 'monospace'
          }}>
            {value !== null && value !== undefined ? value.toFixed(value < 10 ? 2 : 1) : '—'}
          </span>
          {unit && (
            <span style={{
              fontSize: '1rem',
              color: '#64748b',
              fontWeight: '600',
              marginLeft: '0.25rem'
            }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Visual Gauge - Vertical Bar (Full Width) */}
      <div style={{
        position: 'relative',
        height: '220px',
        background: '#ffffff',
        borderRadius: '6px',
        overflow: 'visible',
        border: '2px solid #d1d5db',
        marginBottom: '1rem',
        paddingLeft: '40px',
        paddingRight: '10px',
        paddingTop: '10px',
        paddingBottom: '10px'
      }}>
        {/* Background Grid Lines */}
        <div style={{
          position: 'absolute',
          inset: 0,
          paddingLeft: '40px',
          paddingRight: '10px',
          paddingTop: '10px',
          paddingBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const scaleValue = Math.round(max - (i * (max - min) / 4))
            return (
              <div
                key={i}
                style={{
                  width: '100%',
                  height: '1px',
                  background: i === 2 ? '#9ca3af' : '#e5e7eb',
                  position: 'relative'
                }}
              >
                {/* Scale Labels on Left */}
                <span style={{
                  position: 'absolute',
                  left: '-45px',
                  top: '-8px',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontWeight: '500',
                  fontFamily: 'monospace',
                  background: '#f0f9f0',
                  padding: '0 4px'
                }}>
                  {scaleValue}
                </span>
              </div>
            )
          })}
        </div>

        {/* Optimal Range Highlight - Green Band */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '40px',
          right: '10px',
          top: `${100 - ((optimalMax - min) / (max - min)) * 100}%`,
          background: 'rgba(76, 175, 80, 0.25)',
          borderTop: '2px solid #4CAF50',
          borderBottom: '2px solid #4CAF50',
          pointerEvents: 'none',
          zIndex: 1
        }}>
          {/* SAFE Label */}
          <div style={{
            position: 'absolute',
            right: '-50px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.75rem',
            color: '#4CAF50',
            fontWeight: '700',
            whiteSpace: 'nowrap'
          }}>
            SAFE
          </div>
        </div>

        {/* Current Value Bar - Full Width Fill */}
        {value !== null && value !== undefined && (
          <>
            {/* Filled Bar */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '40px',
              right: '10px',
              height: `${percentage * 0.9}%`,
              background: color,
              transition: 'height 0.5s ease',
              borderRadius: '4px 4px 0 0',
              zIndex: 2
            }}>
              {/* White Rectangular Marker at Top Edge */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70px',
                height: '18px',
                background: 'white',
                borderRadius: '3px',
                border: '2px solid #1a202c',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3
              }}>
                {/* Gray Dot in Center */}
                <div style={{
                  width: '5px',
                  height: '5px',
                  background: '#64748b',
                  borderRadius: '50%'
                }}></div>
              </div>
            </div>
            
            {/* Dark Gray Area Above Marker */}
            <div style={{
              position: 'absolute',
              bottom: `${percentage * 0.9 + 2}%`,
              left: '40px',
              right: '10px',
              top: '10px',
              background: '#374151',
              borderRadius: '0 0 4px 4px',
              zIndex: 1
            }}></div>
          </>
        )}
      </div>

      {/* Status Indicators - Clear Visual Indicators */}
      <div style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        background: isNormal ? '#e8f5e9' : statusInfo.status === 'Low' ? '#fff3e0' : '#ffebee',
        borderRadius: '8px',
        border: `2px solid ${statusInfo.color}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          {/* Large Status Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: statusInfo.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${statusInfo.color}60`
          }}>
            {isNormal ? (
              <span style={{ color: 'white', fontSize: '1.5rem' }}>✓</span>
            ) : statusInfo.status === 'Low' ? (
              <span style={{ color: 'white', fontSize: '1.5rem' }}>↓</span>
            ) : (
              <span style={{ color: 'white', fontSize: '1.5rem' }}>↑</span>
            )}
          </div>
          
          {/* Status Text */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: statusInfo.color,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.25rem'
            }}>
              {statusInfo.status}
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#64748b',
              marginBottom: '0.25rem',
              lineHeight: '1.4'
            }}>
              {statusInfo.message}
            </div>
            {/* Percentage from Optimal */}
            {value !== null && value !== undefined && !isNormal && (
              <div style={{
                fontSize: '0.75rem',
                color: statusInfo.color,
                fontWeight: '600',
                marginTop: '0.25rem'
              }}>
                {value < optimalMin 
                  ? `↓ ${(((optimalMin - value) / optimalMin) * 100).toFixed(1)}% below optimal`
                  : `↑ ${(((value - optimalMax) / optimalMax) * 100).toFixed(1)}% above optimal`
                }
              </div>
            )}
            {value !== null && value !== undefined && isNormal && (
              <div style={{
                fontSize: '0.75rem',
                color: '#4CAF50',
                fontWeight: '600',
                marginTop: '0.25rem'
              }}>
                ✓ Perfect condition
              </div>
            )}
          </div>
        </div>

        {/* Range Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: '#64748b',
          marginTop: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          <span>Min: {min}{unit}</span>
          <span style={{ 
            color: '#4CAF50', 
            fontWeight: '600',
            background: '#e8f5e9',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px'
          }}>
            Optimal: {optimalMin}-{optimalMax}{unit}
          </span>
          <span>Max: {max}{unit}</span>
        </div>

        {/* Current Value Position Indicator with Visual Bar */}
        {value !== null && value !== undefined && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            {/* Current Value Display */}
            <div style={{
              fontSize: '0.85rem',
              textAlign: 'center',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontWeight: '600', color: '#1a202c' }}>Current Reading: </span>
              <span style={{ 
                fontWeight: '700', 
                color: statusInfo.color,
                fontSize: '1rem',
                fontFamily: 'monospace'
              }}>
                {value.toFixed(value < 10 ? 2 : 1)}{unit}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div style={{
              position: 'relative',
              height: '24px',
              background: '#f1f5f9',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              marginBottom: '0.5rem'
            }}>
              {/* Optimal Range Zone */}
              <div style={{
                position: 'absolute',
                left: `${((optimalMin - min) / (max - min)) * 100}%`,
                width: `${((optimalMax - optimalMin) / (max - min)) * 100}%`,
                height: '100%',
                background: '#4CAF50',
                opacity: 0.3
              }}></div>
              
              {/* Current Value Indicator */}
              <div style={{
                position: 'absolute',
                left: `${((value - min) / (max - min)) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '4px',
                height: '100%',
                background: statusInfo.color,
                borderRadius: '2px',
                boxShadow: `0 0 8px ${statusInfo.color}80`,
                zIndex: 2
              }}></div>
              
              {/* Scale Labels */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: '#94a3b8'
              }}>
                <span>{min}{unit}</span>
                <span style={{ color: '#4CAF50', fontWeight: '600' }}>{optimalMin}-{optimalMax}{unit}</span>
                <span>{max}{unit}</span>
              </div>
            </div>

            {/* Status Message */}
            {!isNormal && (
              <div style={{ 
                textAlign: 'center',
                padding: '0.5rem',
                background: `${statusInfo.color}15`,
                borderRadius: '6px',
                marginTop: '0.5rem'
              }}>
                <span style={{ 
                  color: statusInfo.color,
                  fontWeight: '700',
                  fontSize: '0.8rem'
                }}>
                  ⚠ {value < optimalMin 
                    ? `${(optimalMin - value).toFixed(1)}${unit} TOO LOW - Need to increase`
                    : `${(value - optimalMax).toFixed(1)}${unit} TOO HIGH - Need to decrease`
                  }
                </span>
              </div>
            )}
            {isNormal && (
              <div style={{ 
                textAlign: 'center',
                padding: '0.5rem',
                background: '#e8f5e9',
                borderRadius: '6px',
                marginTop: '0.5rem'
              }}>
                <span style={{ 
                  color: '#4CAF50',
                  fontWeight: '700',
                  fontSize: '0.8rem'
                }}>
                  ✓ Within optimal range - Good condition!
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optimal Range Info */}
      {description && (
        <p style={{
          margin: '0.75rem 0 0 0',
          fontSize: '0.7rem',
          color: '#64748b',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
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
}) => {
  // Get current time
  const now = new Date()
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  
  // Calculate next data collection time (every 30 seconds, so next is 30 seconds from now)
  const nextCollection = new Date(now.getTime() + 30000)
  const nextTime = nextCollection.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const nextDate = nextCollection.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })

  // Filter parameters by cycle ID
  const filteredParameters = currentCycleId
    ? monitoringParameters.filter(p => p.cycle_id === currentCycleId)
    : monitoringParameters

  return (
    <section className="panel">
      <header className="panel-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
            Monitoring Dashboard
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Real-time water quality monitoring for tilapia farming
          </p>
        </div>
        <div className="panel-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="add-record-button"
            onClick={() => {
              setNewMonitoringRecord({
                cycleId: currentCycleId || '',
                cycleStartDate: '',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            background: loadingDeviceReadings ? 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)' : 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
            borderRadius: '10px',
            border: `1px solid ${loadingDeviceReadings ? '#ffc107' : '#28a745'}40`,
            boxShadow: `0 2px 4px ${loadingDeviceReadings ? '#ffc107' : '#28a745'}20`
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: loadingDeviceReadings ? '#ffc107' : '#28a745',
              boxShadow: `0 0 12px ${loadingDeviceReadings ? '#ffc107' : '#28a745'}80`,
              animation: loadingDeviceReadings ? 'pulse 1.5s ease-in-out infinite' : 'none'
            }}></div>
            <div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: loadingDeviceReadings ? '#856404' : '#155724',
                display: 'block'
              }}>
                {loadingDeviceReadings ? 'Updating...' : 'System Active'}
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: loadingDeviceReadings ? '#856404' : '#155724',
                opacity: 0.8
              }}>
                {loadingDeviceReadings ? 'Collecting new data' : 'Monitoring in progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Water Quality Parameters - Auto-collected with Visual Gauges */}
      {deviceReadings && (
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
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Auto-Collected
                </span>
              </h3>
              {deviceReadings.timestamp && (
                <p style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}>
                  Last updated: {new Date(deviceReadings.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Water Temperature Gauge */}
            <ParameterGauge
              label="Water Temperature"
              value={deviceReadings.waterTemperature}
              unit="°C"
              min={20}
              max={35}
              optimalMin={26}
              optimalMax={30}
              color="#ef4444"
              description="Temperature of pond water"
              tooltip="Water temperature affects fish metabolism, growth rate, and oxygen consumption. Tilapia thrive best between 26-30°C. Too cold slows growth, too hot reduces oxygen levels."
            />

            {/* Dissolved Oxygen Gauge */}
            <ParameterGauge
              label="Dissolved Oxygen"
              value={deviceReadings.dissolvedOxygen}
              unit="mg/L"
              min={4}
              max={10}
              optimalMin={5}
              optimalMax={8}
              color="#3b82f6"
              description="Amount of oxygen in water"
              tooltip="Dissolved oxygen is essential for fish respiration. Levels below 5 mg/L can stress fish, while 5-8 mg/L is ideal for healthy tilapia growth and activity."
            />

            {/* pH Level Gauge */}
            <ParameterGauge
              label="pH Level"
              value={deviceReadings.phLevel}
              unit=""
              min={5}
              max={9}
              optimalMin={6.5}
              optimalMax={8.5}
              color="#8b5cf6"
              description="Acidity/alkalinity of water"
              tooltip="pH measures how acidic or basic the water is. Tilapia prefer neutral to slightly alkaline water (6.5-8.5). Extreme pH can harm fish health and affect nutrient availability."
            />
          </div>
        </div>
      )}

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

      {/* Latest User-Inputted Parameters Display */}
      {monitoringParameters.length > 0 && (
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
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                {monitoringParameters[0]?.numberOfBreeders || '—'}
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Breeder Ratio
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                {monitoringParameters[0]?.breederRatio || '—'}
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Feed Allocation
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
                {monitoringParameters[0]?.feedAllocation?.toFixed(2) || '—'} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter by Cycle */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#64748b'
        }}>
          <span style={{ minWidth: '120px' }}>Filter by Cycle ID:</span>
          <input
            type="text"
            value={currentCycleId}
            onChange={(e) => setCurrentCycleId(e.target.value)}
            placeholder="Enter cycle ID (e.g., CYCLE-2025-001) or leave empty to see all records"
            style={{
              flex: 1,
              maxWidth: '400px',
              padding: '0.625rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#1A3D64'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          {currentCycleId && (
            <button
              onClick={() => setCurrentCycleId('')}
              style={{
                padding: '0.5rem 1rem',
                background: '#f1f5f9',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Clear Filter
            </button>
          )}
        </label>
      </div>

      {/* Monitoring Parameters Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ 
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Monitoring Parameters History
              <InfoIcon tooltip="View all recorded monitoring data. Water quality parameters are auto-collected from the device, while breeding parameters are manually entered." />
            </h3>
            <p style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              Complete record of all monitoring data collected over time
            </p>
          </div>
        </div>
        {loadingMonitoring ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            Loading monitoring parameters...
          </p>
        ) : monitoringParameters.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cycle ID</th>
                  <th>Cycle Start</th>
                  <th>Water Temp (°C)</th>
                  <th>DO (mg/L)</th>
                  <th>pH</th>
                  <th>Breeders</th>
                  <th>Ratio</th>
                  <th>Feed (kg)</th>
                  <th>Recorded At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monitoringParameters.map((param) => (
                  <tr key={param.id}>
                    <td>{param.cycleId}</td>
                    <td>{param.cycleStartDate ? formatDate(param.cycleStartDate) : '—'}</td>
                    <td>{param.waterTemperature?.toFixed(1) || '—'}</td>
                    <td>{param.dissolvedOxygen?.toFixed(2) || '—'}</td>
                    <td>{param.phLevel?.toFixed(2) || '—'}</td>
                    <td>{param.numberOfBreeders || '—'}</td>
                    <td>{param.breederRatio || '—'}</td>
                    <td>{param.feedAllocation?.toFixed(2) || '—'}</td>
                    <td>{param.recordedAt ? formatDate(param.recordedAt) : '—'}</td>
                    <td>
                      <button
                        className="action-button"
                        onClick={() => handleEditMonitoringRecord(param)}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={() => handleDeleteMonitoringRecord(param.id)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No monitoring parameters recorded yet. Click "Enter Production Parameters" to add your first record.
          </p>
        )}
      </div>

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
