import { query } from '../db/pool.js'

export const getSummary = async (_req, res, next) => {
  try {
    const totals = await query(
      `
      SELECT
        COUNT(*) AS total_beneficiaries,
        COUNT(*) FILTER (WHERE classification = 'individual') AS individuals,
        COUNT(*) FILTER (WHERE classification = 'group') AS groups,
        COALESCE(SUM(quantity),0) AS quantity,
        COALESCE(SUM(cost),0) AS cost
      FROM beneficiaries;
    `
    )

    const gender = await query(
      `
      SELECT
        gender,
        COUNT(*) AS count
      FROM beneficiaries
      WHERE gender IS NOT NULL
      GROUP BY gender;
    `
    )

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
    const result = await query(
      `
      SELECT snapshot_month, fry_count
      FROM monthly_production
      ORDER BY snapshot_month ASC;
    `
    )

    res.json({
      data: result.rows.map((row) => ({
        month: row.snapshot_month,
        fryCount: Number(row.fry_count),
      })),
    })
  } catch (error) {
    next(error)
  }
}

export const getMonthlyYearlyBreakdown = async (_req, res, next) => {
  try {
    const monthly = await query(
      `
      SELECT
        EXTRACT(YEAR FROM date_implemented) AS year,
        EXTRACT(MONTH FROM date_implemented) AS month,
        COUNT(*) AS beneficiary_count,
        COALESCE(SUM(quantity), 0) AS total_quantity,
        COALESCE(SUM(cost), 0) AS total_cost
      FROM beneficiaries
      WHERE date_implemented IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_implemented), EXTRACT(MONTH FROM date_implemented)
      ORDER BY year ASC, month ASC;
    `
    )

    const yearly = await query(
      `
      SELECT
        EXTRACT(YEAR FROM date_implemented) AS year,
        COUNT(*) AS beneficiary_count,
        COALESCE(SUM(quantity), 0) AS total_quantity,
        COALESCE(SUM(cost), 0) AS total_cost
      FROM beneficiaries
      WHERE date_implemented IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_implemented)
      ORDER BY year ASC;
    `
    )

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


