import { query } from '../db/pool.js'
import { normalizeName, findBestMatch, findSimilarNames } from '../utils/nameNormalizer.js'

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
    } = req.body

    // Normalize the name to prevent duplicates
    let normalizedName = normalizeName(name)
    
    // Check for similar existing names to prevent duplicates
    if (normalizedName) {
      const existingNamesQuery = `
        SELECT DISTINCT name 
        FROM beneficiaries 
        WHERE classification = $1
        AND name IS NOT NULL
        AND name != ''
      `
      const existingResult = await query(existingNamesQuery, [classification])
      const existingNames = existingResult.rows.map(row => row.name)
      
      // Find best match (threshold: 0.85 = 85% similarity)
      const bestMatch = findBestMatch(normalizedName, existingNames, 0.85)
      
      if (bestMatch) {
        normalizedName = bestMatch.original
      }
    }

    const sql = `
      INSERT INTO beneficiaries (
        excel_id, classification, name, gender, barangay, municipality, contact
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7
      )
      ON CONFLICT (excel_id) DO UPDATE
      SET
        classification = EXCLUDED.classification,
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        barangay = EXCLUDED.barangay,
        municipality = EXCLUDED.municipality,
        contact = EXCLUDED.contact
      RETURNING *;
    `

    const result = await query(sql, [
      excelId,
      classification,
      normalizedName, // Use normalized name
      gender,
      barangay,
      municipality,
      contact,
    ])

    res.status(201).json({ 
      data: result.rows[0],
      normalized: normalizedName !== name ? { original: name, normalized: normalizedName } : null
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Search for similar names to help prevent duplicates
 */
export const searchSimilarNames = async (req, res, next) => {
  try {
    const { name, classification } = req.query
    
    if (!name || name.trim().length < 2) {
      return res.json({ data: [] })
    }

    // Get all existing beneficiaries for the classification with their info
    const sql = `
      SELECT DISTINCT ON (name) 
        id, name, gender, barangay, municipality, contact
      FROM beneficiaries 
      WHERE classification = $1
      AND name IS NOT NULL
      AND name != ''
      ORDER BY name, date_implemented DESC
    `
    const result = await query(sql, [classification || 'individual'])
    const existingNames = result.rows.map(row => row.name)
    const beneficiariesMap = {}
    result.rows.forEach(row => {
      if (!beneficiariesMap[row.name]) {
        beneficiariesMap[row.name] = {
          id: row.id,
          name: row.name,
          gender: row.gender,
          barangay: row.barangay,
          municipality: row.municipality,
          contact: row.contact
        }
      }
    })
    
    const queryName = name.trim()
    const similarNames = findSimilarNames(queryName, existingNames, 0.65)

    const matchesWithInfo = similarNames.slice(0, 10).map((match) => ({
      ...match,
      name: match.original,
      beneficiary: beneficiariesMap[match.original] || null,
    }))
    
    res.json({ 
      data: matchesWithInfo
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get beneficiary information by name (for auto-filling forms)
 */
export const getBeneficiaryByName = async (req, res, next) => {
  try {
    const { name, classification } = req.query
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const cls = classification || 'individual'
    const trimmed = name.trim()

    const sql = `
      SELECT id, name, gender, barangay, municipality, contact
      FROM beneficiaries 
      WHERE classification = $1
      AND LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE($2, '\\s+', ' ', 'g')))
      ORDER BY date_implemented DESC NULLS LAST, created_at DESC
      LIMIT 1
    `
    let result = await query(sql, [cls, trimmed])

    if (result.rows.length === 0) {
      const allSql = `
        SELECT DISTINCT ON (name) id, name, gender, barangay, municipality, contact
        FROM beneficiaries 
        WHERE classification = $1
        AND name IS NOT NULL
        AND name != ''
        ORDER BY name, date_implemented DESC NULLS LAST, created_at DESC
      `
      const allRows = await query(allSql, [cls])
      const existingNames = allRows.rows.map((r) => r.name)
      const best = findBestMatch(trimmed, existingNames, 0.72)
      if (best) {
        const row = allRows.rows.find((r) => r.name === best.original)
        if (row) {
          return res.json({ data: row })
        }
      }
      return res.status(404).json({ error: 'Beneficiary not found' })
    }

    res.json({ data: result.rows[0] })
  } catch (error) {
    next(error)
  }
}

export const updateBeneficiary = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      name,
      gender,
      barangay,
      municipality,
      contact,
    } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Record ID is required' })
    }

    const sql = `
      UPDATE beneficiaries
      SET
        name = COALESCE($1, name),
        gender = COALESCE($2, gender),
        barangay = COALESCE($3, barangay),
        municipality = COALESCE($4, municipality),
        contact = COALESCE($5, contact)
      WHERE id = $6
      RETURNING *;
    `

    const result = await query(sql, [
      name,
      gender,
      barangay,
      municipality,
      id,
      contact,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' })
    }

    res.json({ data: result.rows[0], message: 'Record updated successfully' })
  } catch (error) {
    next(error)
  }
}

export const deleteBeneficiary = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'Record ID is required' })
    }

    const sql = 'DELETE FROM beneficiaries WHERE id = $1 RETURNING *;'
    const result = await query(sql, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' })
    }

    res.json({ data: result.rows[0], message: 'Record deleted successfully' })
  } catch (error) {
    next(error)
  }
}


