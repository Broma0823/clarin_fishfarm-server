import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { fileURLToPath } from 'url'
import { env } from '../config/env.js'
import { query } from '../db/pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDirectory = path.resolve(__dirname, '../../', env.uploadDir)

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const MONTH_KEYWORDS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
]

const MONTH_SET = new Set(MONTH_KEYWORDS)

const isMonthlySheet = (name = '') => {
  const normalized = name.trim().toLowerCase()
  if (!normalized || normalized.includes('group')) return false
  if (MONTH_SET.has(normalized)) return true
  return MONTH_KEYWORDS.some((keyword) =>
    normalized.replace(/\s+/g, ' ').split(' ').includes(keyword)
  )
}

const matchesYear = (sheetName, targetYear) => {
  if (!targetYear) return true // No filter if year not specified
  const yearMatch = sheetName.match(/\d{4}/)
  if (yearMatch) {
    // Sheet has a year - only include if it matches
    return yearMatch[0] === String(targetYear)
  }
  // Sheet doesn't have a year - include it (will use defaultYear)
  return true
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const cleaned = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(cleaned) ? cleaned : null
}

let defaultYear = null

const buildDate = (dayValue, sheetName) => {
  if (!dayValue) return null
  const month = `${sheetName}`.split(' ')[0]
  if (!month) return null
  // Extract year from sheet name (e.g., "January 2020" -> "2020")
  const yearMatch = sheetName.match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : (defaultYear || '2019')
  const date = new Date(`${month} ${dayValue}, ${year}`)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeRow = (row, sheetName) => {
  const name = row[1]
  const gender = row[2]

  if (!name || !gender) {
    return null
  }

  return {
    excel_id: `${row[1]}-${row[3] ?? ''}-${row[4] ?? ''}`,
    classification: 'individual',
    name,
    gender,
    barangay: row[3] ?? null,
    municipality: row[4] ?? null,
    contact: row[5] ?? null,
    species: row[6] ?? null,
    quantity: toNumber(row[7]),
    cost: toNumber(row[8]) ? toNumber(row[8]) * 1000 : null,
    implementation_type: row[9] ?? null,
    satisfaction: row[10] ?? null,
    date_implemented: buildDate(row[0], sheetName),
  }
}

const extractRows = (sheet) => {
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })
  const headerIndex = matrix.findIndex((row) => row[0] === 'DATE')
  if (headerIndex === -1) return []
  return matrix.slice(headerIndex + 1).filter((row) => row && row[1])
}

const insertRows = async (rows) => {
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
      date_implemented = EXCLUDED.date_implemented;
  `

  for (const row of rows) {
    const values = [
      row.excel_id,
      row.classification,
      row.name,
      row.gender,
      row.barangay,
      row.municipality,
      row.contact,
      row.species,
      row.quantity,
      row.cost,
      row.implementation_type,
      row.satisfaction,
      row.date_implemented,
    ]
    await query(sql, values)
  }
}

export const handleExcelUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing Excel file' })
    }

    // Get year from query parameter or request body (defaults to 2019)
    const yearParam = req.query.year || req.body.year
    if (yearParam) {
      defaultYear = yearParam
      console.log(`📅 Using year: ${defaultYear} for sheets without year in name`)
    }

    const tempPath = req.file.path
    const targetPath = path.join(uploadDirectory, req.file.originalname)
    await fs.promises.rename(tempPath, targetPath)

    // Automatically import the Excel file
    console.log('📥 Importing Excel file:', targetPath)
    const workbook = xlsx.readFile(targetPath)

    let totalInserted = 0
    const sheetResults = []

    for (const sheetName of workbook.SheetNames) {
      if (!isMonthlySheet(sheetName)) {
        sheetResults.push({ sheet: sheetName, rows: 0, skipped: true, reason: 'not_monthly' })
        continue
      }

      // Filter by year if specified
      if (defaultYear && !matchesYear(sheetName, defaultYear)) {
        sheetResults.push({ sheet: sheetName, rows: 0, skipped: true, reason: `year_mismatch_${defaultYear}` })
        console.log(`⚠️  Skipping sheet "${sheetName}" (year doesn't match ${defaultYear})`)
        continue
      }

      const sheet = workbook.Sheets[sheetName]
      const rows = extractRows(sheet)
      const normalized = rows.map((row) => normalizeRow(row, sheetName)).filter(Boolean)

      if (!normalized.length) {
        sheetResults.push({ sheet: sheetName, rows: 0, skipped: false })
        continue
      }

      await insertRows(normalized)
      totalInserted += normalized.length
      sheetResults.push({ sheet: sheetName, rows: normalized.length, skipped: false })
    }

    res.status(201).json({
      message: `Successfully imported ${totalInserted} records from Excel file.`,
      file: {
        name: req.file.originalname,
        storedAt: targetPath,
      },
      import: {
        totalRows: totalInserted,
        sheets: sheetResults,
      },
    })
  } catch (error) {
    console.error('Excel import error:', error)
    next(error)
  }
}


