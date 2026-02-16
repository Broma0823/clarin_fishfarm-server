import { query } from '../db/pool.js'

export const listMonitoringParameters = async (req, res, next) => {
  try {
    const { cycleId, startDate, endDate } = req.query
    
    let sql = `
      SELECT *
      FROM monitoring_parameters
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1
    
    if (cycleId) {
      sql += ` AND cycle_id = $${paramIndex}`
      params.push(cycleId)
      paramIndex++
    }
    
    if (startDate) {
      sql += ` AND recorded_at >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }
    
    if (endDate) {
      sql += ` AND recorded_at <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }
    
    sql += ` ORDER BY recorded_at DESC`
    
    const result = await query(sql, params)
    
    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        cycleId: row.cycle_id,
        cycleStartDate: row.cycle_start_date,
        waterTemperature: row.water_temperature ? Number(row.water_temperature) : null,
        dissolvedOxygen: row.dissolved_oxygen ? Number(row.dissolved_oxygen) : null,
        phLevel: row.ph_level ? Number(row.ph_level) : null,
        numberOfBreeders: row.number_of_breeders,
        breederRatio: row.breeder_ratio,
        feedAllocation: row.feed_allocation ? Number(row.feed_allocation) : null,
        weatherTemperature: row.weather_temperature ? Number(row.weather_temperature) : null,
        weatherHumidity: row.weather_humidity,
        weatherCondition: row.weather_condition,
        weatherWindSpeed: row.weather_wind_speed ? Number(row.weather_wind_speed) : null,
        totalFryProduced: row.total_fry_produced,
        harvestDate: row.harvest_date,
        recordedAt: row.recorded_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    })
  } catch (error) {
    next(error)
  }
}

export const getMonitoringParameter = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM monitoring_parameters WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monitoring parameter not found' })
    }
    
    const row = result.rows[0]
    res.json({
      data: {
        id: row.id,
        cycleId: row.cycle_id,
        cycleStartDate: row.cycle_start_date,
        waterTemperature: row.water_temperature ? Number(row.water_temperature) : null,
        dissolvedOxygen: row.dissolved_oxygen ? Number(row.dissolved_oxygen) : null,
        phLevel: row.ph_level ? Number(row.ph_level) : null,
        numberOfBreeders: row.number_of_breeders,
        breederRatio: row.breeder_ratio,
        feedAllocation: row.feed_allocation ? Number(row.feed_allocation) : null,
        weatherTemperature: row.weather_temperature ? Number(row.weather_temperature) : null,
        weatherHumidity: row.weather_humidity,
        weatherCondition: row.weather_condition,
        weatherWindSpeed: row.weather_wind_speed ? Number(row.weather_wind_speed) : null,
        recordedAt: row.recorded_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const createMonitoringParameter = async (req, res, next) => {
  try {
    const {
      cycleId,
      cycleStartDate,
      waterTemperature,
      dissolvedOxygen,
      phLevel,
      numberOfBreeders,
      breederRatio,
      feedAllocation,
      weatherTemperature,
      weatherHumidity,
      weatherCondition,
      weatherWindSpeed,
      notes,
    } = req.body
    
    const sql = `
      INSERT INTO monitoring_parameters (
        cycle_id, cycle_start_date,
        water_temperature, dissolved_oxygen, ph_level,
        number_of_breeders, breeder_ratio, feed_allocation,
        weather_temperature, weather_humidity, weather_condition, weather_wind_speed,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING *
    `
    
    const result = await query(sql, [
      cycleId,
      cycleStartDate,
      waterTemperature || null,
      dissolvedOxygen || null,
      phLevel || null,
      numberOfBreeders || null,
      breederRatio || null,
      feedAllocation || null,
      weatherTemperature || null,
      weatherHumidity || null,
      weatherCondition || null,
      weatherWindSpeed || null,
      notes || null,
    ])
    
    const row = result.rows[0]
    res.status(201).json({
      data: {
        id: row.id,
        cycleId: row.cycle_id,
        cycleStartDate: row.cycle_start_date,
        waterTemperature: row.water_temperature ? Number(row.water_temperature) : null,
        dissolvedOxygen: row.dissolved_oxygen ? Number(row.dissolved_oxygen) : null,
        phLevel: row.ph_level ? Number(row.ph_level) : null,
        numberOfBreeders: row.number_of_breeders,
        breederRatio: row.breeder_ratio,
        feedAllocation: row.feed_allocation ? Number(row.feed_allocation) : null,
        weatherTemperature: row.weather_temperature ? Number(row.weather_temperature) : null,
        weatherHumidity: row.weather_humidity,
        weatherCondition: row.weather_condition,
        weatherWindSpeed: row.weather_wind_speed ? Number(row.weather_wind_speed) : null,
        recordedAt: row.recorded_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateMonitoringParameter = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      cycleId,
      cycleStartDate,
      waterTemperature,
      dissolvedOxygen,
      phLevel,
      numberOfBreeders,
      breederRatio,
      feedAllocation,
      weatherTemperature,
      weatherHumidity,
      weatherCondition,
      weatherWindSpeed,
      notes,
      totalFryProduced,
      total_fry_produced,
      harvestDate,
      harvest_date,
    } = req.body
    
    const sql = `
      UPDATE monitoring_parameters
      SET
        cycle_id = COALESCE($1, cycle_id),
        cycle_start_date = COALESCE($2, cycle_start_date),
        water_temperature = $3,
        dissolved_oxygen = $4,
        ph_level = $5,
        number_of_breeders = $6,
        breeder_ratio = $7,
        feed_allocation = $8,
        weather_temperature = $9,
        weather_humidity = $10,
        weather_condition = $11,
        weather_wind_speed = $12,
        notes = $13,
        total_fry_produced = COALESCE($14, total_fry_produced),
        harvest_date = COALESCE($15, harvest_date),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `
    
    const totalFry = totalFryProduced !== undefined ? totalFryProduced : total_fry_produced
    const harvest = harvestDate || harvest_date
    
    const result = await query(sql, [
      cycleId || null,
      cycleStartDate || null,
      waterTemperature !== undefined ? waterTemperature : null,
      dissolvedOxygen !== undefined ? dissolvedOxygen : null,
      phLevel !== undefined ? phLevel : null,
      numberOfBreeders !== undefined ? numberOfBreeders : null,
      breederRatio || null,
      feedAllocation !== undefined ? feedAllocation : null,
      weatherTemperature !== undefined ? weatherTemperature : null,
      weatherHumidity !== undefined ? weatherHumidity : null,
      weatherCondition || null,
      weatherWindSpeed !== undefined ? weatherWindSpeed : null,
      notes || null,
      totalFry !== undefined && totalFry !== '' ? parseInt(totalFry) : null,
      harvest || null,
      id,
    ])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monitoring parameter not found' })
    }
    
    const row = result.rows[0]
    res.json({
      data: {
        id: row.id,
        cycleId: row.cycle_id,
        cycleStartDate: row.cycle_start_date,
        waterTemperature: row.water_temperature ? Number(row.water_temperature) : null,
        dissolvedOxygen: row.dissolved_oxygen ? Number(row.dissolved_oxygen) : null,
        phLevel: row.ph_level ? Number(row.ph_level) : null,
        numberOfBreeders: row.number_of_breeders,
        breederRatio: row.breeder_ratio,
        feedAllocation: row.feed_allocation ? Number(row.feed_allocation) : null,
        weatherTemperature: row.weather_temperature ? Number(row.weather_temperature) : null,
        weatherHumidity: row.weather_humidity,
        weatherCondition: row.weather_condition,
        weatherWindSpeed: row.weather_wind_speed ? Number(row.weather_wind_speed) : null,
        recordedAt: row.recorded_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const deleteMonitoringParameter = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await query('DELETE FROM monitoring_parameters WHERE id = $1 RETURNING id', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monitoring parameter not found' })
    }
    
    res.json({ message: 'Monitoring parameter deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const getLatestParameters = async (req, res, next) => {
  try {
    const { cycleId } = req.query
    
    let sql = `
      SELECT *
      FROM monitoring_parameters
      WHERE 1=1
    `
    const params = []
    
    if (cycleId) {
      sql += ` AND cycle_id = $1`
      params.push(cycleId)
    }
    
    sql += ` ORDER BY recorded_at DESC LIMIT 1`
    
    const result = await query(sql, params)
    
    if (result.rows.length === 0) {
      return res.json({ data: null })
    }
    
    const row = result.rows[0]
    res.json({
      data: {
        id: row.id,
        cycleId: row.cycle_id,
        cycleStartDate: row.cycle_start_date,
        waterTemperature: row.water_temperature ? Number(row.water_temperature) : null,
        dissolvedOxygen: row.dissolved_oxygen ? Number(row.dissolved_oxygen) : null,
        phLevel: row.ph_level ? Number(row.ph_level) : null,
        numberOfBreeders: row.number_of_breeders,
        breederRatio: row.breeder_ratio,
        feedAllocation: row.feed_allocation ? Number(row.feed_allocation) : null,
        weatherTemperature: row.weather_temperature ? Number(row.weather_temperature) : null,
        weatherHumidity: row.weather_humidity,
        weatherCondition: row.weather_condition,
        weatherWindSpeed: row.weather_wind_speed ? Number(row.weather_wind_speed) : null,
        recordedAt: row.recorded_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    })
  } catch (error) {
    next(error)
  }
}

