#!/usr/bin/env node
/**
 * Bulk-clean beneficiaries: same name rules as the API (normalizeName:
 * "Last, First" → "First Last", suffixes Jr./Sr./II/… trailing, title case), plus trim/collapse spaces on
 * barangay, municipality, contact.
 *
 * Usage:
 *   cd server && node scripts/normalizeBeneficiaryFields.js
 *   cd server && node scripts/normalizeBeneficiaryFields.js --dry-run
 */
import { query } from '../src/db/pool.js'
import { normalizeName } from '../src/utils/nameNormalizer.js'

const trimSpace = (value) => {
  if (value == null) return null
  const s = String(value).trim().replace(/\s+/g, ' ')
  return s.length ? s : null
}

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')

  const { rows } = await query(
    'SELECT id, name, barangay, municipality, contact FROM beneficiaries ORDER BY id'
  )

  let updated = 0
  for (const r of rows) {
    const nameRaw = r.name ? String(r.name) : ''
    const nameNorm = normalizeName(nameRaw)
    const nameNext = nameNorm.length ? nameNorm : nameRaw

    const barNext = trimSpace(r.barangay)
    const munNext = trimSpace(r.municipality)
    const conNext = trimSpace(r.contact)

    const same =
      nameNext === r.name &&
      barNext === r.barangay &&
      munNext === r.municipality &&
      conNext === r.contact

    if (same) continue

    if (dryRun) {
      console.log(`[dry-run] id=${r.id}`)
      if (nameNext !== r.name) console.log(`  name: ${JSON.stringify(r.name)} -> ${JSON.stringify(nameNext)}`)
      if (barNext !== r.barangay) console.log(`  barangay: ${JSON.stringify(r.barangay)} -> ${JSON.stringify(barNext)}`)
      if (munNext !== r.municipality) console.log(`  municipality: ${JSON.stringify(r.municipality)} -> ${JSON.stringify(munNext)}`)
      if (conNext !== r.contact) console.log(`  contact: ${JSON.stringify(r.contact)} -> ${JSON.stringify(conNext)}`)
      updated++
      continue
    }

    await query(
      `UPDATE beneficiaries
       SET name = $2, barangay = $3, municipality = $4, contact = $5
       WHERE id = $1`,
      [r.id, nameNext, barNext, munNext, conNext]
    )
    updated++
  }

  console.log(dryRun ? `Dry run: ${updated} row(s) would change.` : `Updated ${updated} beneficiary row(s).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
