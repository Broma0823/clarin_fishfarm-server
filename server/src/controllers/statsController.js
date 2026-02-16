import { query } from '../db/pool.js'

export const getSummary = async (_req, res, next) => {
  try {
    const totals = await query(`
      SELECT
        COUNT(DISTINCT b.id) AS total_beneficiaries,
        COUNT(DISTINCT b.id) FILTER (WHERE b.classification = 'individual') AS individuals,
        COUNT(DISTINCT b.id) FILTER (WHERE b.classification = 'group') AS groups,
        COALESCE(SUM(d.quantity), 0) AS quantity,
        COALESCE(SUM(d.cost), 0) AS cost
      FROM beneficiaries b
      LEFT JOIN beneficiary_distributions d ON d.beneficiary_id = b.id;
    `)

    const gender = await query(`
      SELECT
        gender,
        COUNT(*) AS count
      FROM beneficiaries
      WHERE gender IS NOT NULL
      GROUP BY gender;
    `)

    res.json({
      data: {
        totals: totals.rows[0],
        gender: gender.rows,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getMonthlyProduction = async (_req, res, next) => {
  try {
    // Calculate production from actual beneficiaries data
    const result = await query(`
      SELECT 
        DATE_TRUNC('month', d.date_implemented)::DATE AS snapshot_month,
        COALESCE(SUM(d.quantity), 0) AS fry_count
      FROM beneficiary_distributions d
      WHERE d.date_implemented IS NOT NULL
      GROUP BY DATE_TRUNC('month', d.date_implemented)
      ORDER BY snapshot_month ASC;
    `)

    res.json({
      data: result.rows.map((row) => ({
        month: row.snapshot_month,
        snapshot_month: row.snapshot_month,
        fryCount: Number(row.fry_count),
        fry_count: Number(row.fry_count),
      })),
    })
  } catch (error) {
    next(error)
  }
}

export const getMonthlyYearlyBreakdown = async (_req, res, next) => {
  try {
    const monthly = await query(`
      SELECT
        EXTRACT(YEAR FROM d.date_implemented) AS year,
        EXTRACT(MONTH FROM d.date_implemented) AS month,
        COUNT(*) AS beneficiary_count,
        COALESCE(SUM(d.quantity), 0) AS total_quantity,
        COALESCE(SUM(d.cost), 0) AS total_cost
      FROM beneficiary_distributions d
      WHERE d.date_implemented IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM d.date_implemented), EXTRACT(MONTH FROM d.date_implemented)
      ORDER BY year ASC, month ASC;
    `)

    const yearly = await query(`
      SELECT
        EXTRACT(YEAR FROM d.date_implemented) AS year,
        COUNT(*) AS beneficiary_count,
        COALESCE(SUM(d.quantity), 0) AS total_quantity,
        COALESCE(SUM(d.cost), 0) AS total_cost
      FROM beneficiary_distributions d
      WHERE d.date_implemented IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM d.date_implemented)
      ORDER BY year ASC;
    `)

    res.json({
      data: {
        monthly: monthly.rows.map((row) => ({
          year: Number(row.year),
          month: Number(row.month),
          beneficiaryCount: Number(row.beneficiary_count),
          totalQuantity: Number(row.total_quantity),
          totalCost: Number(row.total_cost),
        })),
        yearly: yearly.rows.map((row) => ({
          year: Number(row.year),
          beneficiaryCount: Number(row.beneficiary_count),
          totalQuantity: Number(row.total_quantity),
          totalCost: Number(row.total_cost),
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}


