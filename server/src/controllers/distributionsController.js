import { query } from '../db/pool.js'

const buildFilters = (params) => {
  const clauses = []
  const values = []

  const push = (sql, value) => {
    values.push(value)
    clauses.push(sql.replace(/\$(\d+)/g, () => `$${values.length}`))
  }

  if (params.classification) {
    push('b.classification = $1', params.classification)
  }

  if (params.municipality) {
    push('LOWER(b.municipality) LIKE $1', `%${params.municipality.toLowerCase()}%`)
  }

  if (params.barangay) {
    push('LOWER(b.barangay) LIKE $1', `%${params.barangay.toLowerCase()}%`)
  }

  if (params.year) {
    push('EXTRACT(YEAR FROM d.date_implemented) = $1', Number(params.year))
  }

  if (params.month) {
    push('EXTRACT(MONTH FROM d.date_implemented) = $1', Number(params.month))
  }

  return { clauses, values }
}

export const listDistributions = async (req, res, next) => {
  try {
    const {
      classification = 'individual',
      municipality,
      barangay,
      year,
      month,
      limit: limitParam,
    } = req.query

    const { clauses, values } = buildFilters({ classification, municipality, barangay, year, month })
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    // No default LIMIT: the admin UI needs the full filtered set (e.g. all months in a year).
    // Pass ?limit=500 to cap results; max 50_000 to avoid accidental huge responses.
    let limitSql = ''
    if (limitParam !== undefined && limitParam !== '') {
      const n = Number(limitParam)
      const limitValue = Math.min(Math.max(1, Number.isFinite(n) ? n : 500), 50000)
      limitSql = `LIMIT ${limitValue}`
    }

    const sql = `
      SELECT
        d.id,
        d.excel_id,
        d.species,
        d.quantity,
        d.cost,
        d.implementation_type,
        d.satisfaction,
        d.date_implemented,
        b.id AS beneficiary_id,
        b.classification,
        b.name,
        b.gender,
        b.barangay,
        b.municipality,
        b.contact
      FROM beneficiary_distributions d
      JOIN beneficiaries b ON b.id = d.beneficiary_id
      ${where}
      ORDER BY d.date_implemented ASC NULLS LAST, d.id ASC
      ${limitSql};
    `

    const result = await query(sql, values)
    res.json({ data: result.rows })
  } catch (error) {
    next(error)
  }
}

export const createDistribution = async (req, res, next) => {
  try {
    const {
      beneficiaryId,
      excelId,
      species,
      quantity,
      cost,
      implementationType,
      satisfaction,
      dateImplemented,
    } = req.body

    if (!beneficiaryId) {
      return res.status(400).json({ error: 'beneficiaryId is required' })
    }

    const insertSql = `
      INSERT INTO beneficiary_distributions (
        beneficiary_id, excel_id, species, quantity, cost, implementation_type, satisfaction, date_implemented
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING *;
    `

    const insertResult = await query(insertSql, [
      beneficiaryId,
      excelId || null,
      species || null,
      quantity !== undefined && quantity !== null ? Number(quantity) : null,
      cost !== undefined && cost !== null ? Number(cost) : null,
      implementationType || null,
      satisfaction || null,
      dateImplemented || null,
    ])

    const distribution = insertResult.rows[0]

    // Return joined data for convenience
    const joined = await query(
      `
      SELECT
        d.id,
        d.excel_id,
        d.species,
        d.quantity,
        d.cost,
        d.implementation_type,
        d.satisfaction,
        d.date_implemented,
        b.id AS beneficiary_id,
        b.classification,
        b.name,
        b.gender,
        b.barangay,
        b.municipality
      FROM beneficiary_distributions d
      JOIN beneficiaries b ON b.id = d.beneficiary_id
      WHERE d.id = $1
      `,
      [distribution.id]
    )

    res.status(201).json({ data: joined.rows[0] })
  } catch (error) {
    next(error)
  }
}

export const updateDistribution = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'Distribution ID is required' })

    const {
      species,
      quantity,
      cost,
      implementationType,
      satisfaction,
      dateImplemented,
    } = req.body

    const sql = `
      UPDATE beneficiary_distributions
      SET
        species = COALESCE($1, species),
        quantity = COALESCE($2, quantity),
        cost = COALESCE($3, cost),
        implementation_type = COALESCE($4, implementation_type),
        satisfaction = COALESCE($5, satisfaction),
        date_implemented = COALESCE($6, date_implemented)
      WHERE id = $7
      RETURNING *;
    `

    const result = await query(sql, [
      species || null,
      quantity !== undefined && quantity !== null ? Number(quantity) : null,
      cost !== undefined && cost !== null ? Number(cost) : null,
      implementationType || null,
      satisfaction || null,
      dateImplemented || null,
      id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution not found' })
    }

    const joined = await query(
      `
      SELECT
        d.id,
        d.excel_id,
        d.species,
        d.quantity,
        d.cost,
        d.implementation_type,
        d.satisfaction,
        d.date_implemented,
        b.id AS beneficiary_id,
        b.classification,
        b.name,
        b.gender,
        b.barangay,
        b.municipality
      FROM beneficiary_distributions d
      JOIN beneficiaries b ON b.id = d.beneficiary_id
      WHERE d.id = $1
      `,
      [id]
    )

    res.json({ data: joined.rows[0], message: 'Distribution updated successfully' })
  } catch (error) {
    next(error)
  }
}

export const deleteDistribution = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'Distribution ID is required' })

    const result = await query(
      'DELETE FROM beneficiary_distributions WHERE id = $1 RETURNING id;',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution not found' })
    }

    res.json({ data: result.rows[0], message: 'Distribution deleted successfully' })
  } catch (error) {
    next(error)
  }
}

