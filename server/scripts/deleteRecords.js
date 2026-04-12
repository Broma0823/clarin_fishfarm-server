#!/usr/bin/env node
import { query } from '../src/db/pool.js'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const yearArg = args.find((arg) => arg.startsWith('--year='))
  const dateArg = args.find((arg) => arg.startsWith('--date='))
  const fromArg = args.find((arg) => arg.startsWith('--from='))
  const toArg = args.find((arg) => arg.startsWith('--to='))
  const createdArg = args.find((arg) => arg.startsWith('--created='))
  const allArg = args.includes('--all')
  const dryRunArg = args.includes('--dry-run')

  return {
    year: yearArg ? yearArg.split('=')[1] : null,
    date: dateArg ? dateArg.split('=')[1] : null,
    from: fromArg ? fromArg.split('=')[1] : null,
    to: toArg ? toArg.split('=')[1] : null,
    created: createdArg ? createdArg.split('=')[1] : null,
    all: allArg,
    dryRun: dryRunArg,
  }
}

const showUsage = () => {
  console.error('Usage: npm run delete-records -- [OPTIONS]')
  console.error('')
  console.error('Excel imports store dates on beneficiary_distributions. This script deletes')
  console.error('matching distribution rows, then beneficiaries that no longer have any distribution.')
  console.error('')
  console.error('Options:')
  console.error('  --year=2019          Delete distributions with date_implemented in that year, then orphans')
  console.error('  --date=2019-01-15    Delete distributions on that exact date, then orphans')
  console.error('  --from=2019-01-01    Delete distributions in date range (requires --to)')
  console.error('  --to=2019-12-31')
  console.error('  --created=2019-04-11 Delete beneficiaries created on that calendar day (and their distributions via CASCADE)')
  console.error('  --all                Delete ALL beneficiaries (CASCADE removes all distributions)')
  console.error('  --dry-run            Show counts only; no deletes')
  console.error('')
  console.error('Examples:')
  console.error('  npm run delete-records -- --year=2019 --dry-run')
  console.error('  npm run delete-records -- --year=2019')
  console.error('  npm run delete-records -- --from=2019-01-01 --to=2019-12-31')
  console.error('  npm run delete-records -- --all --dry-run')
}

/** WHERE on beneficiary_distributions (alias d) */
const distributionWhere = (options) => {
  const params = []
  let i = 1

  if (options.year) {
    return {
      where: `WHERE EXTRACT(YEAR FROM d.date_implemented) = $${i}`,
      params: [Number(options.year)],
    }
  }
  if (options.date) {
    return { where: `WHERE d.date_implemented = $${i}`, params: [options.date] }
  }
  if (options.from && options.to) {
    return {
      where: `WHERE d.date_implemented >= $${i} AND d.date_implemented <= $${i + 1}`,
      params: [options.from, options.to],
    }
  }
  if (options.from || options.to) {
    throw new Error('Both --from and --to must be provided together')
  }
  return null
}

const countDistributions = async (whereSql, params) => {
  const sql = `SELECT COUNT(*)::int AS c FROM beneficiary_distributions d ${whereSql}`
  const r = await query(sql, params)
  return r.rows[0].c
}

const main = async () => {
  const options = parseArgs()

  if (process.argv.length === 2 || (process.argv.length === 3 && options.dryRun)) {
    showUsage()
    process.exit(1)
  }

  try {
    if (options.all) {
      const benCount = await query('SELECT COUNT(*)::int AS c FROM beneficiaries')
      const distCount = await query('SELECT COUNT(*)::int AS c FROM beneficiary_distributions')
      const nBen = benCount.rows[0].c
      const nDist = distCount.rows[0].c
      console.log(`📊 Would delete all data: ${nDist} distribution(s), ${nBen} beneficiary row(s) (distributions removed by CASCADE when beneficiaries deleted)`)
      if (options.dryRun) {
        console.log('🔍 DRY RUN — no changes')
        process.exit(0)
      }
      console.log('⚠️  Deleting ALL beneficiaries in 5s… (Ctrl+C to cancel)')
      await new Promise((r) => setTimeout(r, 5000))
      const del = await query('DELETE FROM beneficiaries')
      console.log(`✅ Deleted ${del.rowCount ?? nBen} beneficiary row(s) (distributions CASCADE)`)
      process.exit(0)
    }

    if (options.created) {
      const countR = await query(
        `SELECT COUNT(*)::int AS c FROM beneficiaries WHERE DATE(created_at AT TIME ZONE 'UTC') = $1::date`,
        [options.created]
      )
      const n = countR.rows[0].c
      if (n === 0) {
        console.log('✅ No beneficiaries match --created=')
        process.exit(0)
      }
      console.log(`📊 Found ${n} beneficiary row(s) with created_at on that date (and their distributions)`)
      if (options.dryRun) {
        console.log('🔍 DRY RUN — no changes')
        process.exit(0)
      }
      console.log('⚠️  Deleting in 5s… (Ctrl+C to cancel)')
      await new Promise((r) => setTimeout(r, 5000))
      const del = await query(
        `DELETE FROM beneficiaries WHERE DATE(created_at AT TIME ZONE 'UTC') = $1::date`,
        [options.created]
      )
      console.log(`✅ Deleted ${del.rowCount} beneficiary row(s)`)
      process.exit(0)
    }

    const distFilter = distributionWhere(options)
    if (!distFilter) {
      throw new Error('No deletion criteria. Use --year, --date, --from/--to, --created, or --all')
    }

    const nDist = await countDistributions(distFilter.where, distFilter.params)
    if (nDist === 0) {
      console.log('✅ No distribution rows match that filter (nothing to delete).')
      process.exit(0)
    }

    console.log(`📊 Found ${nDist} distribution row(s) matching filter`)

    if (options.dryRun) {
      console.log('🔍 DRY RUN — no changes. Orphan beneficiaries (no remaining distributions) would be removed next.')
      process.exit(0)
    }

    console.log('⚠️  Deleting matching distributions, then beneficiaries with none left. 5s… (Ctrl+C to cancel)')
    await new Promise((r) => setTimeout(r, 5000))

    const delDist = await query(
      `DELETE FROM beneficiary_distributions d ${distFilter.where}`,
      distFilter.params
    )
    const delBen = await query(`
      DELETE FROM beneficiaries b
      WHERE NOT EXISTS (SELECT 1 FROM beneficiary_distributions d WHERE d.beneficiary_id = b.id)
    `)

    console.log(`✅ Deleted ${delDist.rowCount ?? 0} distribution row(s)`)
    console.log(`✅ Deleted ${delBen.rowCount ?? 0} orphan beneficiary row(s)`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('No deletion criteria')) showUsage()
    process.exit(1)
  }
}

main()
