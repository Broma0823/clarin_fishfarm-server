// Cycles List Component - Displays all breeding cycles with summary data
import { useState, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

export const CyclesListContent = ({ onBack, onViewCycle, refreshTrigger }) => {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAllCycles()
  }, [refreshTrigger]) // Refresh when refreshTrigger changes

  // Also refresh when component mounts or becomes visible
  useEffect(() => {
    fetchAllCycles()
  }, []) // Run once on mount

  // Add error boundary
  if (error) {
    console.error('CyclesList Error:', error)
  }

  const fetchAllCycles = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching cycles from:', `${API_BASE_URL}/monitoring`)
      const response = await fetch(`${API_BASE_URL}/monitoring`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Failed to fetch cycles data: ${response.status} ${errorText}`)
      }
      const responseData = await response.json()
      console.log('Fetched cycles data:', responseData)
      
      // Extract data array from response (API returns { data: [...] })
      const data = Array.isArray(responseData) ? responseData : (responseData.data || [])
      console.log('Extracted data array:', data)
      
      // Group records by cycle_id
      const cyclesMap = new Map()
      
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(record => {
          // Handle both camelCase (from API) and snake_case (from database)
          const cycleId = record.cycleId || record.cycle_id
          if (!cycleId) return
          
          if (!cyclesMap.has(cycleId)) {
            cyclesMap.set(cycleId, {
              cycleId: cycleId,
              cycleStartDate: record.cycleStartDate || record.cycle_start_date,
              records: [],
              totalFryProduced: record.totalFryProduced || record.total_fry_produced || null,
              harvestDate: record.harvestDate || record.harvest_date || null,
              numberOfBreeders: record.numberOfBreeders || record.number_of_breeders,
              breederRatio: record.breederRatio || record.breeder_ratio,
              feedAllocation: record.feedAllocation || record.feed_allocation
            })
          }
          
          cyclesMap.get(cycleId).records.push(record)
        })
      }
      
      // Calculate averages and process each cycle
      const cyclesArray = Array.from(cyclesMap.values()).map(cycle => {
        const records = cycle.records
        
        // Calculate averages (handle both camelCase and snake_case)
        const avgWaterTemp = calculateAverage(records, 'waterTemperature', 'water_temperature')
        const avgDissolvedOxygen = calculateAverage(records, 'dissolvedOxygen', 'dissolved_oxygen')
        const avgPhLevel = calculateAverage(records, 'phLevel', 'ph_level')
        const avgWeatherTemp = calculateAverage(records, 'weatherTemperature', 'weather_temperature')
        const avgHumidity = calculateAverage(records, 'weatherHumidity', 'weather_humidity')
        const avgWindSpeed = calculateAverage(records, 'weatherWindSpeed', 'weather_wind_speed')
        
        // Get latest values
        const latestRecord = records[records.length - 1]
        
        return {
          ...cycle,
          totalRecords: records.length,
          avgWaterTemp,
          avgDissolvedOxygen,
          avgPhLevel,
          avgWeatherTemp,
          avgHumidity,
          avgWindSpeed,
          latestRecordDate: latestRecord?.recordedAt || latestRecord?.recorded_at
        }
      })
      
      // Sort by start date (newest first)
      cyclesArray.sort((a, b) => {
        const dateA = new Date(a.cycleStartDate)
        const dateB = new Date(b.cycleStartDate)
        return dateB - dateA
      })
      
      setCycles(cyclesArray)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateAverage = (records, fieldCamel, fieldSnake) => {
    const values = records
      .map(r => r[fieldCamel] || r[fieldSnake])
      .filter(v => v !== null && v !== undefined)
    if (values.length === 0) return null
    const sum = values.reduce((a, b) => a + parseFloat(b), 0)
    return (sum / values.length).toFixed(2)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '—'
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (loading) {
    return (
      <section className="panel">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading cycles...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#f44336' }}>Error: {error}</p>
          <button onClick={onBack} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Go Back
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
            All Breeding Cycles
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Comprehensive overview of all breeding cycles and their production data
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '0.625rem 1.25rem',
            background: '#f1f5f9',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {cycles.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            opacity: 0.3
          }}>
            🐟
          </div>
          <p style={{ 
            color: '#1a202c', 
            fontSize: '1.25rem', 
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>
            No cycle yet
          </p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Start by entering production parameters for a new cycle.
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #1A3D64 0%, #2d5a87 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              boxShadow: '0 2px 8px rgba(26, 61, 100, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {cycles.map((cycle, index) => (
            <div
              key={cycle.cycleId}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
                e.currentTarget.style.borderColor = '#1A3D64'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
              onClick={() => onViewCycle && onViewCycle(cycle.cycleId)}
            >
              {/* Cycle Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #f1f5f9'
              }}>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#1a202c',
                    marginBottom: '0.25rem'
                  }}>
                    {cycle.cycleId}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#64748b'
                  }}>
                    Started: {formatDate(cycle.cycleStartDate)} • {cycle.totalRecords} records
                  </p>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: cycle.totalFryProduced ? '#e8f5e9' : '#f1f5f9',
                  borderRadius: '8px',
                  textAlign: 'right'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    Total Fry Produced
                  </p>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: cycle.totalFryProduced ? '#059669' : '#94a3b8'
                  }}>
                    {formatNumber(cycle.totalFryProduced)} {cycle.totalFryProduced ? 'fry' : '—'}
                  </p>
                </div>
              </div>

              {/* Parameters Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* Breeding Parameters */}
                <div style={{
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                  }}>
                    Breeding Parameters
                  </p>
                  <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '1.8' }}>
                    <div><strong>Breeders:</strong> {cycle.numberOfBreeders || '—'}</div>
                    <div><strong>Ratio:</strong> {cycle.breederRatio || '—'}</div>
                    <div><strong>Feed:</strong> {cycle.feedAllocation ? `${cycle.feedAllocation} kg` : '—'}</div>
                  </div>
                </div>

                {/* Water Quality */}
                <div style={{
                  padding: '1rem',
                  background: '#f0f9ff',
                  borderRadius: '8px'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                  }}>
                    Water Quality (Avg)
                  </p>
                  <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '1.8' }}>
                    <div><strong>Temp:</strong> {cycle.avgWaterTemp ? `${cycle.avgWaterTemp}°C` : '—'}</div>
                    <div><strong>DO:</strong> {cycle.avgDissolvedOxygen ? `${cycle.avgDissolvedOxygen} mg/L` : '—'}</div>
                    <div><strong>pH:</strong> {cycle.avgPhLevel || '—'}</div>
                  </div>
                </div>

                {/* Weather */}
                <div style={{
                  padding: '1rem',
                  background: '#fefce8',
                  borderRadius: '8px'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                  }}>
                    Weather (Avg)
                  </p>
                  <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '1.8' }}>
                    <div><strong>Temp:</strong> {cycle.avgWeatherTemp ? `${cycle.avgWeatherTemp}°C` : '—'}</div>
                    <div><strong>Humidity:</strong> {cycle.avgHumidity ? `${cycle.avgHumidity}%` : '—'}</div>
                    <div><strong>Wind:</strong> {cycle.avgWindSpeed ? `${cycle.avgWindSpeed} km/h` : '—'}</div>
                  </div>
                </div>

                {/* Harvest Info */}
                {cycle.harvestDate && (
                  <div style={{
                    padding: '1rem',
                    background: '#f0fdf4',
                    borderRadius: '8px'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.75rem',
                      color: '#64748b',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem'
                    }}>
                      Harvest Information
                    </p>
                    <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '1.8' }}>
                      <div><strong>Date:</strong> {formatDate(cycle.harvestDate)}</div>
                      <div><strong>Total Fry:</strong> {formatNumber(cycle.totalFryProduced)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* View Details Link */}
              <div style={{
                textAlign: 'right',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onViewCycle) {
                      onViewCycle(cycle.cycleId)
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#1A3D64',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    padding: '0.25rem 0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  View Full Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

