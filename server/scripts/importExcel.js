#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { fileURLToPath } from 'url'
import { query } from '../src/db/pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MONTH_KEYWORDS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
]

const MONTH_SET = new Set(MONTH_KEYWORDS)

const parseArgs = () => {
  const args = process.argv.slice(2)
  const fileArg = args.find((arg) => arg.startsWith('--file='))
  const yearArg = args.find((arg) => arg.startsWith('--year='))

  if (!fileArg) {
    console.error('Usage: npm run import -- --file=path/to/beneficiaries.xlsx [--year=2019]')
    console.error('  --file: Path to Excel file (required)')
    console.error('  --year: Year filter and fallback (optional)')
    console.error('         - If sheet has year (e.g., "January 2022"), only imports matching sheets')
    console.error('         - If sheet has no year (e.g., "January"), uses this year for dates')
    console.error('         - Defaults to current year if not specified')
    process.exit(1)
  }

  const filePath = path.resolve(__dirname, '..', fileArg.split('=')[1])
  const year = yearArg ? yearArg.split('=')[1] : null

  return { filePath, year }
}

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

let defaultYear = null

const buildDate = (dayValue, sheetName) => {
  if (!dayValue) return null
  const month = `${sheetName}`.split(' ')[0]
  if (!month) return null
  // Extract year from sheet name (e.g., "January 2020" -> "2020")
  const yearMatch = sheetName.match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : (defaultYear || new Date().getFullYear())
  const date = new Date(`${month} ${dayValue}, ${year}`)
  return Number.isNaN(date.getTime()) ? null : date
}

const insertRows = async (rows) => {
  const sql = `
    WITH upsert_beneficiary AS (
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
      RETURNING id
    )
    INSERT INTO beneficiary_distributions (
      beneficiary_id, excel_id, species, quantity, cost, implementation_type, satisfaction, date_implemented
    ) VALUES (
      (SELECT id FROM upsert_beneficiary),
      $1, $8, $9, $10, $11, $12, $13
    )
    ON CONFLICT (excel_id) DO UPDATE
    SET
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

const extractRows = (sheet) => {
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })
  const headerIndex = matrix.findIndex((row) => row[0] === 'DATE')
  if (headerIndex === -1) return []

  return matrix.slice(headerIndex + 1).filter((row) => row && row[1])
}

const main = async () => {
  const { filePath, year } = parseArgs()

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  if (year) {
    defaultYear = year
    console.log(`📅 Using year: ${year} for sheets without year in name`)
  }

  console.log('📥 Importing Excel file:', filePath)
  const workbook = xlsx.readFile(filePath)

  let totalInserted = 0
  let skippedByYear = 0
  for (const sheetName of workbook.SheetNames) {
    if (!isMonthlySheet(sheetName)) {
      console.log(`⚠️  Skipping sheet "${sheetName}" (not a monthly tab)`)
      continue
    }

    // Filter by year if specified
    if (year && !matchesYear(sheetName, year)) {
      console.log(`⚠️  Skipping sheet "${sheetName}" (year doesn't match ${year})`)
      skippedByYear++
      continue
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = extractRows(sheet)
    const normalized = rows.map((row) => normalizeRow(row, sheetName)).filter(Boolean)

    if (!normalized.length) {
      console.log(`⚠️  Sheet "${sheetName}" did not contain valid rows`)
      continue
    }

    await insertRows(normalized)
    totalInserted += normalized.length
    console.log(`✅ Imported ${normalized.length} rows from sheet "${sheetName}"`)
  }

  if (year && skippedByYear > 0) {
    console.log(`📅 Filtered out ${skippedByYear} sheet(s) that didn't match year ${year}`)
  }

  console.log(`🎯 Finished import. ${totalInserted} rows inserted/updated.`)
  process.exit(0)
}

main().catch((error) => {
  console.error('Import failed:', error)
  process.exit(1)
})


