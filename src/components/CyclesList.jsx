// Cycles List Component - Displays all breeding cycles with summary data
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

export const CyclesListContent = ({ onBack, onViewCycle, refreshTrigger }) => {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [endingCycle, setEndingCycle] = useState(null)
  const [endCycleForm, setEndCycleForm] = useState({ totalFry: '', notes: '' })
  const [isSubmittingEnd, setIsSubmittingEnd] = useState(false)
  const [deletingCycleId, setDeletingCycleId] = useState(null)
  const [cycleDeleteCandidate, setCycleDeleteCandidate] = useState(null)
  const [expandedCycleId, setExpandedCycleId] = useState(null)

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
          const cycleId = record.cycleId || record.cycle_id
          if (!cycleId) return
          
          if (!cyclesMap.has(cycleId)) {
            cyclesMap.set(cycleId, {
              cycleId: cycleId,
              cycleStartDate: record.cycleStartDate || record.cycle_start_date,
              cycleEndDate: record.cycleEndDate || record.cycle_end_date || null,
              records: [],
              totalFryProduced: null,
              harvestDate: null,
              numberOfBreeders: null,
              breederRatio: null,
              feedAllocation: null
            })
          }
          
          const cycle = cyclesMap.get(cycleId)
          cycle.records.push(record)

          // Pick up breeding params / fry data from any record that has them
          const breeders = record.numberOfBreeders || record.number_of_breeders
          const ratio = record.breederRatio || record.breeder_ratio
          const feed = record.feedAllocation || record.feed_allocation
          const fry = record.totalFryProduced || record.total_fry_produced
          const harvest = record.harvestDate || record.harvest_date
          const endDate = record.cycleEndDate || record.cycle_end_date

          if (breeders) cycle.numberOfBreeders = breeders
          if (ratio) cycle.breederRatio = ratio
          if (feed) cycle.feedAllocation = feed
          if (fry) cycle.totalFryProduced = fry
          if (harvest) cycle.harvestDate = harvest
          if (endDate) cycle.cycleEndDate = endDate
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
      
      // Only show cycles that were manually created (have breeding parameters)
      const manualCycles = cyclesArray.filter(c =>
        c.numberOfBreeders || c.breederRatio || c.feedAllocation || c.cycleEndDate
      )

      // Sort by start date (newest first)
      manualCycles.sort((a, b) => {
        const dateA = new Date(a.cycleStartDate)
        const dateB = new Date(b.cycleStartDate)
        return dateB - dateA
      })
      
      setCycles(manualCycles)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEndCycle = async (cycle) => {
    setIsSubmittingEnd(true)
    try {
      const response = await fetch(`${API_BASE_URL}/monitoring/end-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle.cycleId,
          totalFryProduced: endCycleForm.totalFry ? parseInt(endCycleForm.totalFry) : null,
          notes: endCycleForm.notes || null,
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to end cycle: ${response.status} ${errorText}`)
      }

      setEndingCycle(null)
      setEndCycleForm({ totalFry: '', notes: '' })
      fetchAllCycles()
    } catch (err) {
      console.error('Error ending cycle:', err)
      alert('Error ending cycle: ' + err.message)
    } finally {
      setIsSubmittingEnd(false)
    }
  }

  const performDeleteCycle = async (cycle) => {
    setDeletingCycleId(cycle.cycleId)
    try {
      const response = await fetch(`${API_BASE_URL}/monitoring/cycle/${encodeURIComponent(cycle.cycleId)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete cycle: ${response.status} ${errorText}`)
      }

      if (expandedCycleId === cycle.cycleId) {
        setExpandedCycleId(null)
      }

      await fetchAllCycles()
    } catch (err) {
      console.error('Error deleting cycle:', err)
      alert('Error deleting cycle: ' + err.message)
    } finally {
      setDeletingCycleId(null)
    }
  }

  const handleDeleteCycle = (cycle) => {
    setCycleDeleteCandidate(cycle)
  }

  const confirmDeleteCycle = async () => {
    if (!cycleDeleteCandidate) return
    const cycle = cycleDeleteCandidate
    setCycleDeleteCandidate(null)
    await performDeleteCycle(cycle)
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
          <p style={{ color: '#1a202c', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No cycles yet
          </p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Start by entering production parameters for a new cycle.
          </p>
          <button onClick={onBack} style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #1A3D64 0%, #2d5a87 100%)',
            color: 'white', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem'
          }}>
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Active Cycles */}
          {cycles.filter(c => !c.cycleEndDate).length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                Active Cycles
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cycles.filter(c => !c.cycleEndDate).map(cycle => (
                  <div key={cycle.cycleId} style={{
                    background: 'white', borderRadius: '12px', padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #fef3c7'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#1a202c' }}>{cycle.cycleId}</h4>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          Started: {formatDate(cycle.cycleStartDate)} — {cycle.totalRecords} records
                        </p>
                        <span style={{
                          display: 'inline-block', marginTop: '0.35rem', padding: '0.2rem 0.75rem',
                          borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                          background: '#fef3c7', color: '#92400e'
                        }}>Active</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => { setEndingCycle(cycle); setEndCycleForm({ totalFry: '', notes: '' }) }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
                          }}
                        >End Cycle</button>
                        <button
                          onClick={() => handleDeleteCycle(cycle)}
                          disabled={deletingCycleId === cycle.cycleId}
                          style={{
                            padding: '0.5rem 1rem',
                            background: deletingCycleId === cycle.cycleId ? '#94a3b8' : 'white',
                            color: deletingCycleId === cycle.cycleId ? 'white' : '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            cursor: deletingCycleId === cycle.cycleId ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '0.8rem'
                          }}
                        >
                          {deletingCycleId === cycle.cycleId ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.7' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Water Quality (Live Avg)</p>
                        <div><strong>Temp:</strong> {cycle.avgWaterTemp ? `${cycle.avgWaterTemp}°C` : '—'}</div>
                        <div><strong>pH:</strong> {cycle.avgPhLevel || '—'}</div>
                        <div><strong>DO:</strong> {cycle.avgDissolvedOxygen ? `${cycle.avgDissolvedOxygen} V` : '—'}</div>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#fefce8', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.7' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Weather (Avg)</p>
                        <div><strong>Temp:</strong> {cycle.avgWeatherTemp ? `${cycle.avgWeatherTemp}°C` : '—'}</div>
                        <div><strong>Humidity:</strong> {cycle.avgHumidity ? `${cycle.avgHumidity}%` : '—'}</div>
                        <div><strong>Wind:</strong> {cycle.avgWindSpeed ? `${cycle.avgWindSpeed} km/h` : '—'}</div>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.7' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Breeding</p>
                        <div><strong>Breeders:</strong> {cycle.numberOfBreeders || '—'}</div>
                        <div><strong>Ratio:</strong> {cycle.breederRatio || '—'}</div>
                        <div><strong>Feed:</strong> {cycle.feedAllocation ? `${cycle.feedAllocation} kg` : '—'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <button onClick={() => onViewCycle && onViewCycle(cycle.cycleId)} style={{
                        background: 'transparent', border: 'none', color: '#1A3D64',
                        fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer'
                      }}>View Full Details →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cycle History */}
          {cycles.filter(c => c.cycleEndDate).length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Cycle History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cycles.filter(c => c.cycleEndDate).map(cycle => {
                  const isExpanded = expandedCycleId === cycle.cycleId
                  return (
                    <div key={cycle.cycleId} style={{
                      background: 'white', borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      border: isExpanded ? '2px solid #059669' : '1px solid #e5e7eb',
                      overflow: 'hidden', transition: 'all 0.2s ease'
                    }}>
                      {/* Clickable header row */}
                      <div
                        onClick={() => setExpandedCycleId(isExpanded ? null : cycle.cycleId)}
                        style={{
                          padding: '1rem 1.5rem', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: isExpanded ? '#f0fdf4' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1a202c' }}>{cycle.cycleId}</h4>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                              {formatDate(cycle.cycleStartDate)} — {formatDate(cycle.cycleEndDate)}
                            </p>
                          </div>
                          <span style={{
                            padding: '0.15rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem',
                            fontWeight: '600', background: '#dcfce7', color: '#166534'
                          }}>Completed</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Fry</p>
                            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: cycle.totalFryProduced ? '#059669' : '#94a3b8' }}>
                              {cycle.totalFryProduced ? formatNumber(cycle.totalFryProduced) : '—'}
                            </p>
                          </div>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {/* Expandable details */}
                      {isExpanded && (
                        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #e5e7eb' }}>
                          {/* Production Summary */}
                          <div style={{
                            marginTop: '1rem', padding: '1.25rem',
                            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                            borderRadius: '10px', border: '1px solid #4CAF50'
                          }}>
                            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#2e7d32' }}>
                              Production Summary
                            </h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                              <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Fry Produced</p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#059669' }}>
                                  {cycle.totalFryProduced ? `${formatNumber(cycle.totalFryProduced)}` : '—'}
                                </p>
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Harvest Date</p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '1.1rem', fontWeight: '700', color: '#1a202c' }}>
                                  {formatDate(cycle.harvestDate)}
                                </p>
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Records</p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '1.1rem', fontWeight: '700', color: '#1a202c' }}>
                                  {cycle.totalRecords}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Average Parameters */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {/* Water Quality Averages */}
                            <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '10px' }}>
                              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase' }}>
                                Avg Water Quality
                              </p>
                              <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Water Temperature</span>
                                  <strong>{cycle.avgWaterTemp ? `${cycle.avgWaterTemp}°C` : '—'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>pH Level</span>
                                  <strong>{cycle.avgPhLevel || '—'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Dissolved Oxygen</span>
                                  <strong>{cycle.avgDissolvedOxygen ? `${cycle.avgDissolvedOxygen} V` : '—'}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Weather Averages */}
                            <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '10px' }}>
                              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#92400e', textTransform: 'uppercase' }}>
                                Avg External Factors
                              </p>
                              <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Weather Temperature</span>
                                  <strong>{cycle.avgWeatherTemp ? `${cycle.avgWeatherTemp}°C` : '—'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Humidity</span>
                                  <strong>{cycle.avgHumidity ? `${cycle.avgHumidity}%` : '—'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Wind Speed</span>
                                  <strong>{cycle.avgWindSpeed ? `${cycle.avgWindSpeed} km/h` : '—'}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Breeding Parameters */}
                            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '10px' }}>
                              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                                Breeding Parameters
                              </p>
                              <div style={{ fontSize: '0.875rem', color: '#1a202c', lineHeight: '2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Number of Breeders</span>
                                  <strong>{cycle.numberOfBreeders || '—'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Breeder Ratio</span>
                                  <strong>{cycle.breederRatio || '—'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Feed Allocation</span>
                                  <strong>{cycle.feedAllocation ? `${cycle.feedAllocation} kg` : '—'}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* View Full Details button */}
                          <div style={{ textAlign: 'right', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCycle(cycle) }}
                                disabled={deletingCycleId === cycle.cycleId}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #fecaca',
                                  color: deletingCycleId === cycle.cycleId ? '#94a3b8' : '#dc2626',
                                  fontWeight: '600',
                                  fontSize: '0.8rem',
                                  cursor: deletingCycleId === cycle.cycleId ? 'not-allowed' : 'pointer',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.75rem'
                                }}
                              >
                                {deletingCycleId === cycle.cycleId ? 'Deleting...' : 'Delete Cycle'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onViewCycle && onViewCycle(cycle.cycleId) }} style={{
                                background: 'transparent', border: 'none', color: '#1A3D64',
                                fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer'
                              }}>View Full Details →</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* End Cycle Modal */}
      {endingCycle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
          onClick={() => setEndingCycle(null)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              End Cycle: {endingCycle.cycleId}
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
              This will set today as the cycle end date and record the final production data.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Total Fry Produced
              </label>
              <input
                type="number"
                value={endCycleForm.totalFry}
                onChange={(e) => setEndCycleForm({ ...endCycleForm, totalFry: e.target.value })}
                placeholder="Enter total fry count"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Notes (optional)
              </label>
              <textarea
                value={endCycleForm.notes}
                onChange={(e) => setEndCycleForm({ ...endCycleForm, notes: e.target.value })}
                placeholder="Any notes about this cycle..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Preview averages */}
            <div style={{
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                Cycle Averages Preview
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.8rem', color: '#1a202c' }}>
                <div>Water Temp: {endingCycle.avgWaterTemp ? `${endingCycle.avgWaterTemp}°C` : '—'}</div>
                <div>pH: {endingCycle.avgPhLevel || '—'}</div>
                <div>DO: {endingCycle.avgDissolvedOxygen ? `${endingCycle.avgDissolvedOxygen} V` : '—'}</div>
                <div>Weather: {endingCycle.avgWeatherTemp ? `${endingCycle.avgWeatherTemp}°C` : '—'}</div>
                <div>Humidity: {endingCycle.avgHumidity ? `${endingCycle.avgHumidity}%` : '—'}</div>
                <div>Wind: {endingCycle.avgWindSpeed ? `${endingCycle.avgWindSpeed} km/h` : '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEndingCycle(null)}
                disabled={isSubmittingEnd}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f1f5f9',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleEndCycle(endingCycle)}
                disabled={isSubmittingEnd}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isSubmittingEnd
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmittingEnd ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                }}
              >
                {isSubmittingEnd ? 'Ending Cycle...' : 'Confirm End Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cycle Confirmation Modal */}
      {cycleDeleteCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setCycleDeleteCandidate(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '14px',
              width: '90%',
              maxWidth: '480px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1rem 1.25rem', background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: '700' }}>Delete Cycle</h3>
            </div>
            <div style={{ padding: '1.1rem 1.25rem', color: '#1f2937', lineHeight: 1.55 }}>
              <p style={{ margin: 0 }}>
                Delete cycle <strong>{cycleDeleteCandidate.cycleId}</strong> and all its sensor/production records?
              </p>
              <p style={{ margin: '0.55rem 0 0', color: '#b91c1c', fontSize: '0.88rem' }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '0.9rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setCycleDeleteCandidate(null)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCycle}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Delete Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

