// Cycle Summary Component - Displays comprehensive cycle information
import { useState, useEffect } from 'react'

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000/api`
  }
  return 'http://localhost:4000/api'
}

const API_BASE_URL = resolveApiBaseUrl()

export const CycleSummaryContent = ({ cycleId, onBack }) => {
  const [cycleData, setCycleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (cycleId) {
      fetchCycleSummary()
    }
  }, [cycleId])

  const fetchCycleSummary = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/monitoring?cycleId=${cycleId}`)
      if (!response.ok) throw new Error('Failed to fetch cycle data')
      const responseData = await response.json()
      
      // Extract data array from response
      const data = Array.isArray(responseData) ? responseData : (responseData.data || [])
      
      // Handle both camelCase and snake_case
      const cycleRecords = data.map(record => ({
        ...record,
        cycle_id: record.cycle_id || record.cycleId,
        cycle_start_date: record.cycle_start_date || record.cycleStartDate,
        cycle_end_date: record.cycle_end_date || record.cycleEndDate,
        water_temperature: record.water_temperature ?? record.waterTemperature,
        dissolved_oxygen: record.dissolved_oxygen ?? record.dissolvedOxygen,
        ph_level: record.ph_level ?? record.phLevel,
        weather_temperature: record.weather_temperature ?? record.weatherTemperature,
        weather_humidity: record.weather_humidity ?? record.weatherHumidity,
        weather_wind_speed: record.weather_wind_speed ?? record.weatherWindSpeed,
        weather_condition: record.weather_condition ?? record.weatherCondition,
        number_of_breeders: record.number_of_breeders ?? record.numberOfBreeders,
        breeder_ratio: record.breeder_ratio ?? record.breederRatio,
        feed_allocation: record.feed_allocation ?? record.feedAllocation,
        total_fry_produced: record.total_fry_produced ?? record.totalFryProduced,
        harvest_date: record.harvest_date ?? record.harvestDate,
        recorded_at: record.recorded_at || record.recordedAt
      }))
      
      if (cycleRecords.length > 0) {
        // Get the first record for cycle info
        const firstRecord = cycleRecords[0]
        const startDate = new Date(firstRecord.cycle_start_date)
        
        setCycleData({
          cycleId: firstRecord.cycle_id,
          cycleStartDate: firstRecord.cycle_start_date,
          cycleEndDate: firstRecord.cycle_end_date || null,
          records: cycleRecords,
          // Calculate averages
          avgWaterTemp: calculateAverage(cycleRecords, 'water_temperature'),
          avgDissolvedOxygen: calculateAverage(cycleRecords, 'dissolved_oxygen'),
          avgPhLevel: calculateAverage(cycleRecords, 'ph_level'),
          avgWeatherTemp: calculateAverage(cycleRecords, 'weather_temperature'),
          avgHumidity: calculateAverage(cycleRecords, 'weather_humidity'),
          avgWindSpeed: calculateAverage(cycleRecords, 'weather_wind_speed'),
          // Scan all records for breeding parameters (they may not be on the first record)
          numberOfBreeders: cycleRecords.find(r => r.number_of_breeders)?.number_of_breeders || null,
          breederRatio: cycleRecords.find(r => r.breeder_ratio)?.breeder_ratio || null,
          feedAllocation: cycleRecords.find(r => r.feed_allocation)?.feed_allocation || null,
          totalFryProduced: cycleRecords.find(r => r.total_fry_produced)?.total_fry_produced || null,
          harvestDate: cycleRecords.find(r => r.harvest_date)?.harvest_date || null,
          // Weather conditions
          weatherConditions: getUniqueValues(cycleRecords, 'weather_condition')
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateAverage = (records, field) => {
    const values = records
      .map(r => r[field])
      .filter(v => v !== null && v !== undefined)
    if (values.length === 0) return null
    const sum = values.reduce((a, b) => a + parseFloat(b), 0)
    return (sum / values.length).toFixed(2)
  }

  const getUniqueValues = (records, field) => {
    const values = records
      .map(r => r[field])
      .filter(v => v !== null && v !== undefined && v !== '')
    return [...new Set(values)]
  }

  const formatDate = (dateInput) => {
    if (!dateInput) return '—'
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  const formatDateShort = (dateInput) => {
    if (!dateInput) return '—'
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <section className="panel">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading cycle summary...</p>
        </div>
      </section>
    )
  }

  if (error || !cycleData) {
    return (
      <section className="panel">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#f44336' }}>Error: {error || 'Cycle data not found'}</p>
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
          <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: '700', color: '#1a202c' }}>
            Cycle Summary
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '1rem' }}>
            Comprehensive overview of breeding cycle: {cycleData.cycleId}
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f1f5f9',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem'
          }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {/* Cycle Information Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1a202c' }}>
          Cycle Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Cycle ID</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.cycleId}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Start Date</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {formatDate(cycleData.cycleStartDate)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>End Date</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.cycleEndDate ? formatDate(cycleData.cycleEndDate) : '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Status</p>
            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '1.25rem',
              fontWeight: '700',
              color: cycleData.cycleEndDate ? '#059669' : '#f59e0b'
            }}>
              {cycleData.cycleEndDate ? 'Completed' : 'Active'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Sensor Readings</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.records.length}
            </p>
          </div>
        </div>
      </div>

      {/* Breeding Parameters */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1a202c' }}>
          Breeding Parameters (Manual Input)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Number of Breeders</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.numberOfBreeders || '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Breeder Ratio</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.breederRatio || '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Feed Allocation</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.feedAllocation ? `${cycleData.feedAllocation} kg` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Automated Water Quality Parameters */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1a202c' }}>
          Automated Water Quality Parameters (Average)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Water Temperature</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.avgWaterTemp ? `${cycleData.avgWaterTemp} °C` : '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Dissolved Oxygen</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.avgDissolvedOxygen ? `${cycleData.avgDissolvedOxygen} mg/L` : '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>pH Level</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.avgPhLevel || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Weather Conditions */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1a202c' }}>
          Weather Conditions (Average)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Temperature</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.avgWeatherTemp ? `${cycleData.avgWeatherTemp} °C` : '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Humidity</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.avgHumidity ? `${cycleData.avgHumidity}%` : '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Wind Speed</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.avgWindSpeed ? `${cycleData.avgWindSpeed} km/h` : '—'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Conditions</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.weatherConditions.length > 0 
                ? cycleData.weatherConditions.join(', ') 
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Production Summary (only for completed cycles) */}
      {cycleData.cycleEndDate && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            borderRadius: '8px',
            border: '2px solid #4CAF50'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
              Production Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Fry Produced</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                  {cycleData.totalFryProduced
                    ? Number(cycleData.totalFryProduced).toLocaleString()
                    : '—'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Harvest Date</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
                  {formatDate(cycleData.harvestDate)}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Sensor Readings</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
                  {cycleData.records.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

