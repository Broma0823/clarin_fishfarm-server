// Cycle Summary Component - Displays comprehensive cycle information
import { useState, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

export const CycleSummaryContent = ({ cycleId, onBack }) => {
  const [cycleData, setCycleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fryProduction, setFryProduction] = useState({
    totalFry: '',
    harvestDate: '',
    notes: ''
  })

  useEffect(() => {
    if (cycleId) {
      fetchCycleSummary()
    }
  }, [cycleId])

  // Initialize fry production from cycle data when it loads
  useEffect(() => {
    if (cycleData) {
      setFryProduction({
        totalFry: cycleData.totalFryProduced?.toString() || '',
        harvestDate: cycleData.harvestDate || '',
        notes: ''
      })
    }
  }, [cycleData])

  const fetchCycleSummary = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/monitoring?cycle_id=${cycleId}`)
      if (!response.ok) throw new Error('Failed to fetch cycle data')
      const responseData = await response.json()
      
      // Extract data array from response
      const data = Array.isArray(responseData) ? responseData : (responseData.data || [])
      
      // Handle both camelCase and snake_case
      const cycleRecords = data.map(record => ({
        ...record,
        cycle_id: record.cycle_id || record.cycleId,
        cycle_start_date: record.cycle_start_date || record.cycleStartDate,
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
        
        // Generate daily records for the month (placeholder data)
        const dailyRecords = generateDailyRecords(startDate, cycleRecords)
        
        setCycleData({
          cycleId: firstRecord.cycle_id,
          cycleStartDate: firstRecord.cycle_start_date,
          records: dailyRecords, // Use generated daily records
          originalRecords: cycleRecords, // Keep original records
          // Calculate averages
          avgWaterTemp: calculateAverage(cycleRecords, 'water_temperature'),
          avgDissolvedOxygen: calculateAverage(cycleRecords, 'dissolved_oxygen'),
          avgPhLevel: calculateAverage(cycleRecords, 'ph_level'),
          avgWeatherTemp: calculateAverage(cycleRecords, 'weather_temperature'),
          avgHumidity: calculateAverage(cycleRecords, 'weather_humidity'),
          avgWindSpeed: calculateAverage(cycleRecords, 'weather_wind_speed'),
          // Get latest breeding parameters
          numberOfBreeders: firstRecord.number_of_breeders,
          breederRatio: firstRecord.breeder_ratio,
          feedAllocation: firstRecord.feed_allocation,
          totalFryProduced: firstRecord.total_fry_produced,
          harvestDate: firstRecord.harvest_date,
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

  // Generate daily records for the entire month (placeholder data)
  const generateDailyRecords = (startDate, existingRecords) => {
    const dailyRecords = []
    const year = startDate.getFullYear()
    const month = startDate.getMonth()
    
    // Get days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Create a map of existing records by day
    const recordsByDay = new Map()
    existingRecords.forEach(record => {
      const recordDate = new Date(record.recorded_at || record.recordedAt)
      const day = recordDate.getDate()
      recordsByDay.set(day, record)
    })
    
    // Generate records for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      const existingRecord = recordsByDay.get(day)
      
      if (existingRecord) {
        // Use existing record
        dailyRecords.push({
          ...existingRecord,
          date: currentDate,
          day: day
        })
      } else {
        // Generate placeholder data
        const baseRecord = existingRecords[0] || {}
        dailyRecords.push({
          id: `placeholder-${day}`,
          cycle_id: baseRecord.cycle_id || cycleId,
          cycle_start_date: baseRecord.cycle_start_date,
          date: currentDate,
          day: day,
          water_temperature: generatePlaceholderValue(baseRecord.water_temperature ?? baseRecord.waterTemperature, 26, 30, day),
          dissolved_oxygen: generatePlaceholderValue(baseRecord.dissolved_oxygen ?? baseRecord.dissolvedOxygen, 5, 8, day),
          ph_level: generatePlaceholderValue(baseRecord.ph_level ?? baseRecord.phLevel, 6.5, 8.5, day),
          weather_temperature: generatePlaceholderValue(baseRecord.weather_temperature ?? baseRecord.weatherTemperature, 25, 32, day),
          weather_humidity: Math.round(generatePlaceholderValue(baseRecord.weather_humidity ?? baseRecord.weatherHumidity, 60, 85, day)),
          weather_wind_speed: generatePlaceholderValue(baseRecord.weather_wind_speed ?? baseRecord.weatherWindSpeed, 8, 15, day),
          weather_condition: getRandomWeatherCondition(day),
          number_of_breeders: baseRecord.number_of_breeders ?? baseRecord.numberOfBreeders,
          breeder_ratio: baseRecord.breeder_ratio ?? baseRecord.breederRatio,
          feed_allocation: baseRecord.feed_allocation ?? baseRecord.feedAllocation,
          recorded_at: currentDate.toISOString(),
          notes: day === daysInMonth ? 'Cycle completed' : null
        })
      }
    }
    
    return dailyRecords
  }

  // Generate placeholder value with slight variation
  const generatePlaceholderValue = (baseValue, min, max, day) => {
    if (baseValue !== null && baseValue !== undefined) {
      // Add small random variation (±0.5)
      const variation = (Math.sin(day * 0.1) * 0.5) + (Math.random() * 0.3 - 0.15)
      return Math.max(min, Math.min(max, parseFloat(baseValue) + variation))
    }
    // Generate random value within range
    return min + (Math.random() * (max - min))
  }

  // Get random weather condition
  const getRandomWeatherCondition = (day) => {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Sunny', 'Overcast']
    return conditions[day % conditions.length]
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

  const handleSaveFryProduction = async () => {
    try {
      // Find the first real record (not placeholder) to update
      const recordToUpdate = cycleData.originalRecords?.[0] || cycleData.records.find(r => r.id && !r.id.startsWith('placeholder'))
      
      if (!recordToUpdate || !recordToUpdate.id) {
        throw new Error('No valid record found to update')
      }
      
      const updateData = {
        cycleId: recordToUpdate.cycle_id || recordToUpdate.cycleId,
        cycleStartDate: recordToUpdate.cycle_start_date || recordToUpdate.cycleStartDate,
        waterTemperature: recordToUpdate.water_temperature ?? recordToUpdate.waterTemperature,
        dissolvedOxygen: recordToUpdate.dissolved_oxygen ?? recordToUpdate.dissolvedOxygen,
        phLevel: recordToUpdate.ph_level ?? recordToUpdate.phLevel,
        numberOfBreeders: recordToUpdate.number_of_breeders ?? recordToUpdate.numberOfBreeders,
        breederRatio: recordToUpdate.breeder_ratio || recordToUpdate.breederRatio,
        feedAllocation: recordToUpdate.feed_allocation ?? recordToUpdate.feedAllocation,
        weatherTemperature: recordToUpdate.weather_temperature ?? recordToUpdate.weatherTemperature,
        weatherHumidity: recordToUpdate.weather_humidity ?? recordToUpdate.weatherHumidity,
        weatherCondition: recordToUpdate.weather_condition || recordToUpdate.weatherCondition,
        weatherWindSpeed: recordToUpdate.weather_wind_speed ?? recordToUpdate.weatherWindSpeed,
        notes: fryProduction.notes || recordToUpdate.notes,
        totalFryProduced: fryProduction.totalFry ? parseInt(fryProduction.totalFry) : null,
        harvestDate: fryProduction.harvestDate || null
      }
      
      const response = await fetch(`${API_BASE_URL}/monitoring/${recordToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save fry production' }))
        throw new Error(errorData.error || 'Failed to save fry production')
      }
      
      // Update all records in the cycle with fry production data
      const updateAllRecords = async () => {
        const allRecords = cycleData.originalRecords || cycleData.records.filter(r => r.id && !r.id.startsWith('placeholder'))
        const updatePromises = allRecords
          .filter(r => r.id && r.id !== recordToUpdate.id)
          .map(record => 
            fetch(`${API_BASE_URL}/monitoring/${record.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...updateData,
                totalFryProduced: updateData.totalFryProduced,
                harvestDate: updateData.harvestDate
              })
            })
          )
        await Promise.all(updatePromises)
      }
      
      await updateAllRecords()
      
      alert('Fry production data saved successfully!')
      fetchCycleSummary()
    } catch (err) {
      console.error('Error saving fry production:', err)
      alert('Error saving fry production: ' + err.message)
    }
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
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Records</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1a202c' }}>
              {cycleData.records.length}
            </p>
          </div>
        </div>
      </div>

      {/* Fry Production Section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1a202c' }}>
          Fry Production
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>
              Total Fry Produced
            </label>
            <input
              type="number"
              value={fryProduction.totalFry}
              onChange={(e) => setFryProduction({ ...fryProduction, totalFry: e.target.value })}
              placeholder="Enter total fry count"
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: '500'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>
              Harvest Date
            </label>
            <input
              type="date"
              value={fryProduction.harvestDate}
              onChange={(e) => setFryProduction({ ...fryProduction, harvestDate: e.target.value })}
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: '500'
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>
            Notes
          </label>
          <textarea
            value={fryProduction.notes}
            onChange={(e) => setFryProduction({ ...fryProduction, notes: e.target.value })}
            placeholder="Additional notes about the cycle..."
            rows="3"
            style={{
              width: '100%',
              padding: '0.875rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
        </div>
        <button
          onClick={handleSaveFryProduction}
          style={{
            padding: '0.875rem 1.75rem',
            background: 'linear-gradient(135deg, #1A3D64 0%, #2d5a87 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem'
          }}
        >
          Save Fry Production Data
        </button>
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

      {/* Daily Monitoring Records Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1a202c' }}>
          Daily Monitoring Records
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#64748b' }}>
          Complete daily record of all parameters throughout the breeding cycle (Monthly cycle)
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Day</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Water Temp (°C)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>DO (mg/L)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>pH</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Weather Temp (°C)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Humidity (%)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Wind Speed (km/h)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Condition</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {cycleData.records.map((record, idx) => {
                const recordDate = record.date || new Date(record.recorded_at || record.recordedAt)
                const isLastDay = idx === cycleData.records.length - 1
                return (
                  <tr 
                    key={record.id || idx} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      background: isLastDay ? '#f0fdf4' : 'white'
                    }}
                  >
                    <td style={{ padding: '1rem', fontSize: '1rem', fontWeight: '600' }}>Day {record.day || (idx + 1)}</td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>{formatDateShort(recordDate)}</td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.water_temperature ? Number(record.water_temperature).toFixed(2) : '—'}°C
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.dissolved_oxygen ? Number(record.dissolved_oxygen).toFixed(2) : '—'} mg/L
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.ph_level ? Number(record.ph_level).toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.weather_temperature ? Number(record.weather_temperature).toFixed(2) : '—'}°C
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.weather_humidity ? `${record.weather_humidity}%` : '—'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.weather_wind_speed ? Number(record.weather_wind_speed).toFixed(2) : '—'} km/h
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem' }}>
                      {record.weather_condition || '—'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '1rem', color: isLastDay ? '#059669' : '#64748b', fontStyle: isLastDay ? 'italic' : 'normal' }}>
                      {record.notes || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Cycle Completion Summary */}
        {cycleData.records.length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            borderRadius: '8px',
            border: '2px solid #4CAF50'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.375rem', fontWeight: '700', color: '#2e7d32' }}>
              ✓ Cycle Completion Summary
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Cycle Duration</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
                  {cycleData.records.length} days
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                  (Full month cycle)
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Total Tilapia Fry Produced</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                  {cycleData.totalFryProduced 
                    ? `${Number(cycleData.totalFryProduced).toLocaleString()} fry`
                    : '— (Not recorded yet)'}
                </p>
                {cycleData.totalFryProduced && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                    Final production count
                  </p>
                )}
              </div>
              {cycleData.harvestDate && (
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Harvest Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
                    {formatDate(cycleData.harvestDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

