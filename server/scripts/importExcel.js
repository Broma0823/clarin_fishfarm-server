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

  if (!fileArg) {
    console.error('Usage: npm run import -- --file=path/to/beneficiaries.xlsx')
    process.exit(1)
  }

  return path.resolve(__dirname, '..', fileArg.split('=')[1])
}

const isMonthlySheet = (name = '') => {
  const normalized = name.trim().toLowerCase()
  if (!normalized || normalized.includes('group')) return false
  if (MONTH_SET.has(normalized)) return true

  return MONTH_KEYWORDS.some((keyword) =>
    normalized.replace(/\s+/g, ' ').split(' ').includes(keyword)
  )
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

const buildDate = (dayValue, sheetName) => {
  if (!dayValue) return null
  const month = `${sheetName}`.split(' ')[0]
  if (!month) return null
  const date = new Date(`${month} ${dayValue}, ${sheetName.match(/\\d{4}/)?.[0] ?? '2019'}`)
  return Number.isNaN(date.getTime()) ? null : date
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

const extractRows = (sheet) => {
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })
  const headerIndex = matrix.findIndex((row) => row[0] === 'DATE')
  if (headerIndex === -1) return []

  return matrix.slice(headerIndex + 1).filter((row) => row && row[1])
}

const main = async () => {
  const filePath = parseArgs()

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  console.log('📥 Importing Excel file:', filePath)
  const workbook = xlsx.readFile(filePath)

  let totalInserted = 0
  for (const sheetName of workbook.SheetNames) {
    if (!isMonthlySheet(sheetName)) {
      console.log(`⚠️  Skipping sheet "${sheetName}" (not a monthly tab)`)
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

  console.log(`🎯 Finished import. ${totalInserted} rows inserted/updated.`)
  process.exit(0)
}

main().catch((error) => {
  console.error('Import failed:', error)
  process.exit(1)
})


