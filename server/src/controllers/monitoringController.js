import { query } from '../db/pool.js'

const mapRow = (row) => ({
  id: row.id,
  cycleId: row.cycle_id,
  cycleStartDate: row.cycle_start_date,
  cycleEndDate: row.cycle_end_date,
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
})

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
      data: result.rows.map(mapRow),
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
      data: mapRow(row),
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
      cycleEndDate,
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
    
    const isSensorData = !numberOfBreeders && !breederRatio && !feedAllocation
    let resolvedCycleId = cycleId
    let resolvedStartDate = cycleStartDate
    let resolvedEndDate = cycleEndDate || null

    if (isSensorData) {
      // ESP32 sensor reading: attach to the current active manually-created cycle
      const activeCycle = await query(
        `SELECT cycle_id, cycle_start_date, cycle_end_date
         FROM monitoring_parameters
         WHERE (number_of_breeders IS NOT NULL OR breeder_ratio IS NOT NULL OR feed_allocation IS NOT NULL)
           AND cycle_end_date IS NULL
         ORDER BY created_at DESC
         LIMIT 1`
      )
      if (activeCycle.rows.length > 0) {
        resolvedCycleId = activeCycle.rows[0].cycle_id
        resolvedStartDate = activeCycle.rows[0].cycle_start_date
      } else {
        // No active cycle: still store sensor readings as uncategorized rows.
        // cycle_id / cycle_start_date / cycle_end_date stay NULL.
        resolvedCycleId = null
        resolvedStartDate = null
        resolvedEndDate = null
      }
    }

    // If this cycle was already ended, carry over the end date
    if (resolvedCycleId && !resolvedEndDate) {
      const existing = await query(
        `SELECT cycle_end_date FROM monitoring_parameters
         WHERE cycle_id = $1 AND cycle_end_date IS NOT NULL
         LIMIT 1`,
        [resolvedCycleId]
      )
      if (existing.rows.length > 0) {
        resolvedEndDate = existing.rows[0].cycle_end_date
      }
    }

    const sql = `
      INSERT INTO monitoring_parameters (
        cycle_id, cycle_start_date, cycle_end_date,
        water_temperature, dissolved_oxygen, ph_level,
        number_of_breeders, breeder_ratio, feed_allocation,
        weather_temperature, weather_humidity, weather_condition, weather_wind_speed,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `
    
    const result = await query(sql, [
      resolvedCycleId,
      resolvedStartDate,
      resolvedEndDate,
      waterTemperature ?? null,
      dissolvedOxygen ?? null,
      phLevel ?? null,
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
      data: mapRow(row),
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
      cycleEndDate,
      cycle_end_date,
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
        cycle_end_date = COALESCE($3, cycle_end_date),
        water_temperature = $4,
        dissolved_oxygen = $5,
        ph_level = $6,
        number_of_breeders = $7,
        breeder_ratio = $8,
        feed_allocation = $9,
        weather_temperature = $10,
        weather_humidity = $11,
        weather_condition = $12,
        weather_wind_speed = $13,
        notes = $14,
        total_fry_produced = COALESCE($15, total_fry_produced),
        harvest_date = COALESCE($16, harvest_date),
        updated_at = NOW()
      WHERE id = $17
      RETURNING *
    `
    
    const totalFry = totalFryProduced !== undefined ? totalFryProduced : total_fry_produced
    const harvest = harvestDate || harvest_date
    const endDate = cycleEndDate || cycle_end_date
    
    const result = await query(sql, [
      cycleId || null,
      cycleStartDate || null,
      endDate || null,
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
      data: mapRow(row),
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

export const deleteCycle = async (req, res, next) => {
  try {
    const { cycleId } = req.params
    if (!cycleId) {
      return res.status(400).json({ error: 'cycleId is required' })
    }

    const result = await query(
      `DELETE FROM monitoring_parameters
       WHERE cycle_id = $1
       RETURNING id`,
      [cycleId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Cycle ${cycleId} not found` })
    }

    res.json({
      message: `Cycle ${cycleId} deleted successfully`,
      deletedRecords: result.rowCount,
    })
  } catch (error) {
    next(error)
  }
}

export const endCycle = async (req, res, next) => {
  try {
    const { cycleId, totalFryProduced, notes } = req.body
    if (!cycleId) {
      return res.status(400).json({ error: 'cycleId is required' })
    }

    const today = new Date().toISOString().split('T')[0]

    const sql = `
      UPDATE monitoring_parameters
      SET
        cycle_end_date = $1,
        total_fry_produced = COALESCE($2, total_fry_produced),
        harvest_date = $1,
        notes = COALESCE($3, notes),
        updated_at = NOW()
      WHERE cycle_id = $4 AND cycle_end_date IS NULL
      RETURNING *
    `

    const result = await query(sql, [
      today,
      totalFryProduced ? parseInt(totalFryProduced) : null,
      notes || null,
      cycleId,
    ])

    res.json({
      message: `Ended cycle ${cycleId}, updated ${result.rowCount} records`,
      data: result.rows.map(mapRow),
    })
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
      data: mapRow(row),
    })
  } catch (error) {
    next(error)
  }
}

const csvColumns = [
  { key: 'id', label: 'id' },
  { key: 'cycle_id', label: 'cycle_id' },
  { key: 'recorded_at', label: 'recorded_timestamp' },
  { key: 'recorded_date', label: 'recorded_date' },
  { key: 'recorded_time', label: 'recorded_time' },
  { key: 'cycle_start_date', label: 'cycle_start_date' },
  { key: 'cycle_end_date', label: 'cycle_end_date' },
  { key: 'water_temperature', label: 'water_temperature' },
  { key: 'dissolved_oxygen', label: 'dissolved_oxygen' },
  { key: 'ph_level', label: 'ph_level' },
  { key: 'number_of_breeders', label: 'number_of_breeders' },
  { key: 'breeder_ratio', label: 'breeder_ratio' },
  { key: 'feed_allocation', label: 'feed_allocation' },
  { key: 'weather_temperature', label: 'weather_temperature' },
  { key: 'weather_humidity', label: 'weather_humidity' },
  { key: 'weather_condition', label: 'weather_condition' },
  { key: 'weather_wind_speed', label: 'weather_wind_speed' },
  { key: 'total_fry_produced', label: 'total_fry_produced' },
  { key: 'harvest_date', label: 'harvest_date' },
  { key: 'notes', label: 'notes' },
  { key: 'created_at', label: 'created_at' },
  { key: 'updated_at', label: 'updated_at' },
]

const toCsvCell = (value) => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

export const exportMonitoringCsv = async (req, res, next) => {
  try {
    const { cycleId, startDate, endDate } = req.query

    let sql = `
      SELECT
        *,
        TO_CHAR(recorded_at, 'YYYY-MM-DD') AS recorded_date,
        TO_CHAR(recorded_at, 'HH24:MI:SS') AS recorded_time
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
    const header = csvColumns.map((col) => col.label).join(',')
    const rows = result.rows.map((row) =>
      csvColumns.map((col) => toCsvCell(row[col.key])).join(',')
    )
    const csv = [header, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="monitoring-data.csv"')
    res.status(200).send(csv)
  } catch (error) {
    next(error)
  }
}

