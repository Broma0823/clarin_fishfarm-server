import { query } from '../db/pool.js'

const sanitizeLike = (value) => value.replace(/%/g, '').replace(/_/g, '')

export const listBeneficiaries = async (req, res, next) => {
  try {
    const {
      classification = 'individual',
      municipality,
      barangay,
      year,
      month,
      limit = 200,
    } = req.query

    const clauses = ['classification = $1']
    const params = [classification]

    if (municipality) {
      params.push(`%${sanitizeLike(municipality.toLowerCase())}%`)
      clauses.push(`LOWER(municipality) LIKE $${params.length}`)
    }

    if (barangay) {
      params.push(`%${sanitizeLike(barangay.toLowerCase())}%`)
      clauses.push(`LOWER(barangay) LIKE $${params.length}`)
    }

    if (year) {
      params.push(Number(year))
      clauses.push(`EXTRACT(YEAR FROM date_implemented) = $${params.length}`)
    }

    if (month) {
      params.push(Number(month))
      clauses.push(`EXTRACT(MONTH FROM date_implemented) = $${params.length}`)
    }

    const limitValue = Math.min(Number(limit) || 200, 1000)

    const sql = `
      SELECT id, excel_id, classification, name, gender, barangay, municipality,
             species, quantity, cost, implementation_type, satisfaction, date_implemented
      FROM beneficiaries
      WHERE ${clauses.join(' AND ')}
      ORDER BY date_implemented ASC NULLS LAST
      LIMIT ${limitValue};
    `

    const result = await query(sql, params)

    res.json({ data: result.rows })
  } catch (error) {
    next(error)
  }
}

export const createBeneficiary = async (req, res, next) => {
  try {
    const {
      excelId,
      classification,
      name,
      gender,
      barangay,
      municipality,
      contact,
      species,
      quantity,
      cost,
      implementationType,
      satisfaction,
      dateImplemented,
    } = req.body

    const sql = `
      INSERT INTO beneficiaries (
        excel_id, classification, name, gender, barangay, municipality, contact,
        species, quantity, cost, implementation_type, satisfaction, date_implemented
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
      ON CONFLICT (excel_id) DO UPDATE
      SET
        classification = EXCLUDED.classification,
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        barangay = EXCLUDED.barangay,
        municipality = EXCLUDED.municipality,
        contact = EXCLUDED.contact,
        species = EXCLUDED.species,
        quantity = EXCLUDED.quantity,
        cost = EXCLUDED.cost,
        implementation_type = EXCLUDED.implementation_type,
        satisfaction = EXCLUDED.satisfaction,
        date_implemented = EXCLUDED.date_implemented
      RETURNING *;
    `

    const result = await query(sql, [
      excelId,
      classification,
      name,
      gender,
      barangay,
      municipality,
      contact,
      species,
      quantity,
      cost,
      implementationType,
      satisfaction,
      dateImplemented,
    ])

    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    next(error)
  }
}


