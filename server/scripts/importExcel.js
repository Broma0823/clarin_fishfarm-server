#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { query } from '../src/db/pool.js'
import { normalizeName } from '../src/utils/nameNormalizer.js'

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

  const relativePath = fileArg.replace(/^--file=+/, '').trim()
  if (!relativePath) {
    console.error('Invalid --file: missing path (use --file=../data/file.xlsx)')
    process.exit(1)
  }

  const filePath = path.resolve(__dirname, '..', relativePath)
  const year = yearArg ? yearArg.replace(/^--year=+/, '').trim() : null

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

/** Sheets like "January (Groups)" / "February (Group)" — LGU/association format. */
const isGroupAssociationSheet = (name = '') => {
  const n = name.trim().toLowerCase()
  if (!n.includes('group')) return false
  return MONTH_KEYWORDS.some((kw) => kw.length >= 3 && n.includes(kw))
}

const matchesYear = (sheetName, targetYear) => {
  if (!targetYear) return true
  const yearMatch = sheetName.match(/\d{4}/)
  if (yearMatch) {
    return yearMatch[0] === String(targetYear)
  }
  return true
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const cleaned = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(cleaned) ? cleaned : null
}

/** beneficiary_distributions.quantity is BIGINT — Excel may have decimals (e.g. 31.5 kg). */
const toIntegerQuantity = (value) => {
  const n = toNumber(value)
  if (n === null) return null
  return Math.round(n)
}

const isGenderCell = (value) => {
  if (value === null || value === undefined || value === '') return false
  const s = String(value).trim().toLowerCase()
  return s === 'male' || s === 'female' || s === 'm' || s === 'f'
}

/** Stable key: one beneficiary row per person + location (re-import safe). */
const beneficiaryExcelId = (fullName, barangay, municipality) => {
  const parts = [
    String(fullName ?? '').trim().toLowerCase(),
    String(barangay ?? '').trim().toLowerCase(),
    String(municipality ?? '').trim().toLowerCase(),
  ].join('|')
  const hash = createHash('sha256').update(parts).digest('hex').slice(0, 24)
  return `ben-${hash}`
}

/** Unique per spreadsheet row so each month's distribution is kept (no overwrite). */
const distributionExcelId = (sheetName, rowIndex, dayValue, beneficiaryKey) => {
  const sheet = String(sheetName).replace(/\s+/g, '-')
  const short = createHash('sha256').update(`${sheet}|r${rowIndex}|d${dayValue}|${beneficiaryKey}`).digest('hex').slice(0, 20)
  return `dist-${sheet}-r${rowIndex}-d${dayValue}-${short}`
}

let defaultYear = null

const buildDate = (dayValue, sheetName) => {
  if (dayValue === null || dayValue === undefined || dayValue === '') return null

  if (typeof dayValue === 'number' && dayValue > 20000) {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(epoch.getTime() + dayValue * 86400000)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const month = `${sheetName}`.split(' ')[0]
  if (!month) return null
  const yearMatch = sheetName.match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : (defaultYear || new Date().getFullYear())
  const date = new Date(`${month} ${dayValue}, ${year}`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "First [Middle] Last" — surname last (e.g. Camposo); middle omitted if blank. */
const formatFullName = (last, first, middle) => {
  const l = String(last ?? '').trim()
  const f = String(first ?? '').trim()
  const m = String(middle ?? '').trim()
  const given = [f, m].filter(Boolean).join(' ')
  if (l && given) return `${given} ${l}`.replace(/\s+/g, ' ').trim()
  if (l) return l
  return given
}

/**
 * Layout A: DATE, Full name, Gender, Barangay, … (early 2024 sheets e.g. Jan–Mar)
 * Layout B: DATE, Last, First, Gender, … (gender col D — no middle column)
 * Layout C: DATE, Last, First, Middle (optional), Gender, … (gender col E — e.g. Dec/Nov/Oct 2024)
 *
 * Per-row: try C then B then A (scanned 2024.xlsx uses different layouts by month).
 */
const normalizeRow = (row, sheetName, rowIndex) => {
  let fullName
  let gender
  let barangay
  let municipality
  let contact
  let species
  let quantity
  let cost
  let implementation_type
  let satisfaction

  if (isGenderCell(row[4])) {
    const last = String(row[1] ?? '').trim()
    const first = String(row[2] ?? '').trim()
    fullName = formatFullName(last, first, row[3])
    gender = row[4]
    barangay = row[5] ?? null
    municipality = row[6] ?? null
    contact = row[7] ?? null
    species = row[8] ?? null
    quantity = toIntegerQuantity(row[9])
    cost = toNumber(row[10]) ? toNumber(row[10]) * 1000 : null
    implementation_type = row[11] ?? null
    satisfaction = row[12] ?? null
  } else if (isGenderCell(row[3])) {
    const last = String(row[1] ?? '').trim()
    const first = String(row[2] ?? '').trim()
    fullName = formatFullName(last, first, '')
    gender = row[3]
    barangay = row[4] ?? null
    municipality = row[5] ?? null
    contact = row[6] ?? null
    species = row[7] ?? null
    quantity = toIntegerQuantity(row[8])
    cost = toNumber(row[9]) ? toNumber(row[9]) * 1000 : null
    implementation_type = row[10] ?? null
    satisfaction = row[11] ?? null
  } else if (isGenderCell(row[2])) {
    fullName = String(row[1] ?? '').trim()
    gender = row[2]
    barangay = row[3] ?? null
    municipality = row[4] ?? null
    contact = row[5] ?? null
    species = row[6] ?? null
    quantity = toIntegerQuantity(row[7])
    cost = toNumber(row[8]) ? toNumber(row[8]) * 1000 : null
    implementation_type = row[9] ?? null
    satisfaction = row[10] ?? null
  } else {
    return null
  }

  if (!fullName || !gender) {
    return null
  }

  const nameForDb = normalizeName(String(fullName).trim()) || String(fullName).trim().replace(/\s+/g, ' ')
  const benId = beneficiaryExcelId(nameForDb, barangay, municipality)
  const distId = distributionExcelId(sheetName, rowIndex, row[0], benId)

  return {
    beneficiary_excel_id: benId,
    distribution_excel_id: distId,
    classification: 'individual',
    name: nameForDb,
    gender,
    barangay,
    municipality,
    contact,
    species,
    quantity,
    cost,
    implementation_type,
    satisfaction,
    date_implemented: buildDate(row[0], sheetName),
  }
}

const insertRows = async (rows) => {
  const sql = `
    WITH upsert_beneficiary AS (
      INSERT INTO beneficiaries (
        excel_id, classification, name, gender, barangay, municipality, contact
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
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
      $8, $9, $10, $11, $12, $13, $14
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
      row.beneficiary_excel_id,
      row.classification,
      row.name,
      row.gender,
      row.barangay,
      row.municipality,
      row.contact,
      row.distribution_excel_id,
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

const cellIsDateHeader = (cell) =>
  typeof cell === 'string' && cell.trim().toUpperCase() === 'DATE'

const extractMatrixAfterDateHeader = (sheet) => {
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })
  const headerIndex = matrix.findIndex((row) => row && cellIsDateHeader(row[0]))
  if (headerIndex === -1) return []
  return matrix.slice(headerIndex + 1)
}

const extractRows = (sheet) =>
  extractMatrixAfterDateHeader(sheet).filter((row) => row && (row[1] != null || row[2] != null))

const parseDayCell = (v) => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && v >= 1 && v <= 31) return v
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null
}

const flattenGroupBlock = (cur) => {
  const name = cur.nameParts.join(' ').replace(/\s+/g, ' ').trim()
  const day = cur.day
  let barangay
  let municipality
  let contact
  let rep
  let species
  let quantity
  let cost
  let implementation_type
  let satisfaction
  for (const r of cur.lines) {
    if (r[3]) barangay = String(r[3]).trim() || barangay
    if (r[4]) municipality = String(r[4]).trim() || municipality
    if (r[5]) contact = String(r[5]).trim() || contact
    if (r[6]) rep = String(r[6]).trim() || rep
    if (r[7]) species = String(r[7]).trim() || species
    if (r[8] != null && r[8] !== '') quantity = toIntegerQuantity(r[8]) ?? quantity
    if (r[9] != null && r[9] !== '') cost = toNumber(r[9]) ? toNumber(r[9]) * 1000 : cost
    if (r[10]) implementation_type = String(r[10]).trim() || implementation_type
    if (r[11]) satisfaction = String(r[11]).trim() || satisfaction
  }
  const contactMerged = [contact, rep].filter(Boolean).join(' / ') || null
  return {
    day,
    name,
    barangay: barangay ?? null,
    municipality: municipality ?? null,
    contact: contactMerged,
    species: species ?? null,
    quantity: quantity ?? null,
    cost: cost ?? null,
    implementation_type: implementation_type ?? null,
    satisfaction: satisfaction ?? null,
  }
}

/** Merge continuation rows (split association name / address) into one logical record. */
const mergeGroupAssociations = (rawRows) => {
  const blocks = []
  let cur = null
  const flush = () => {
    if (cur) {
      blocks.push(flattenGroupBlock(cur))
      cur = null
    }
  }

  for (const row of rawRows) {
    if (!row || !row.some((c) => c !== null && c !== '' && String(c).trim())) continue

    const day = parseDayCell(row[0])
    const cell1 = String(row[1] ?? '').trim()
    const upper1 = cell1.toUpperCase()
    if (upper1.includes('SUMMARY') || upper1.includes('PREPARED')) {
      flush()
      break
    }

    if (day !== null && cell1) {
      flush()
      cur = { day, lines: [row], nameParts: [cell1] }
    } else if (cur && cell1 && day === null) {
      cur.nameParts.push(cell1)
      cur.lines.push(row)
    } else if (cur && !cell1 && (row[7] || row[8])) {
      cur.lines.push(row)
    }
  }
  flush()
  return blocks
}

const normalizeGroupFlatRow = (flat, sheetName, rowIndex) => {
  if (!flat.name || flat.day == null) return null
  if (!flat.species && flat.quantity == null) return null

  const nameForDb = normalizeName(String(flat.name).trim()) || String(flat.name).trim().replace(/\s+/g, ' ')
  const benId = beneficiaryExcelId(`group|${nameForDb}`, flat.barangay ?? '', flat.municipality ?? '')
  const distId = distributionExcelId(sheetName, rowIndex, flat.day, benId)

  return {
    beneficiary_excel_id: benId,
    distribution_excel_id: distId,
    classification: 'group',
    name: nameForDb,
    gender: 'N/A',
    barangay: flat.barangay,
    municipality: flat.municipality,
    contact: flat.contact,
    species: flat.species,
    quantity: flat.quantity,
    cost: flat.cost,
    implementation_type: flat.implementation_type,
    satisfaction: flat.satisfaction,
    date_implemented: buildDate(flat.day, sheetName),
  }
}

const main = async () => {
  const { filePath, year } = parseArgs()

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }
  if (!fs.statSync(filePath).isFile()) {
    console.error('Not a file:', filePath)
    process.exit(1)
  }

  if (year) {
    defaultYear = year
    console.log(
      `📅 Using year: ${year} for dates when the sheet name has no year (e.g. "April (Group)" or "November 2020" parsing).`
    )
  }

  console.log('📥 Importing Excel file:', filePath)
  const workbook = xlsx.readFile(filePath)

  let totalInserted = 0
  let skippedByYear = 0
  for (const sheetName of workbook.SheetNames) {
    if (isGroupAssociationSheet(sheetName)) {
      if (year && !matchesYear(sheetName, year)) {
        console.log(`⚠️  Skipping sheet "${sheetName}" (year doesn't match ${year})`)
        skippedByYear++
        continue
      }

      const sheet = workbook.Sheets[sheetName]
      const rawMatrix = extractMatrixAfterDateHeader(sheet)
      const merged = mergeGroupAssociations(rawMatrix)
      const normalized = merged
        .map((flat, idx) => normalizeGroupFlatRow(flat, sheetName, idx))
        .filter(Boolean)

      if (!normalized.length) {
        console.log(`⚠️  Sheet "${sheetName}" (groups) did not contain valid rows`)
        continue
      }

      await insertRows(normalized)
      totalInserted += normalized.length
      console.log(`✅ Imported ${normalized.length} group distribution(s) from "${sheetName}"`)
      continue
    }

    if (!isMonthlySheet(sheetName)) {
      console.log(`⚠️  Skipping sheet "${sheetName}" (not a monthly tab)`)
      continue
    }

    if (year && !matchesYear(sheetName, year)) {
      console.log(`⚠️  Skipping sheet "${sheetName}" (year doesn't match ${year})`)
      skippedByYear++
      continue
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = extractRows(sheet)
    const normalized = rows
      .map((row, idx) => normalizeRow(row, sheetName, idx))
      .filter(Boolean)

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
