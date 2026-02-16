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
  console.error('Options:')
  console.error('  --year=2025          Delete records with date_implemented in this year')
  console.error('  --date=2025-01-15    Delete records with this exact date_implemented')
  console.error('  --from=2025-01-01    Delete records from this date (requires --to)')
  console.error('  --to=2025-12-31      Delete records up to this date (requires --from)')
  console.error('  --created=2025-01-15  Delete records created on this date')
  console.error('  --all                Delete ALL records (use with caution!)')
  console.error('  --dry-run            Show what would be deleted without actually deleting')
  console.error('')
  console.error('Examples:')
  console.error('  npm run delete-records -- --year=2025 --dry-run')
  console.error('  npm run delete-records -- --year=2025')
  console.error('  npm run delete-records -- --from=2025-01-01 --to=2025-03-31')
  console.error('  npm run delete-records -- --date=2025-01-15')
  console.error('  npm run delete-records -- --all --dry-run')
}

const buildDeleteQuery = (options) => {
  let whereClause = ''
  const params = []
  let paramIndex = 1

  if (options.all) {
    return { sql: 'DELETE FROM beneficiaries', params: [] }
  }

  if (options.year) {
    whereClause = `WHERE EXTRACT(YEAR FROM date_implemented) = $${paramIndex}`
    params.push(options.year)
    paramIndex++
  } else if (options.date) {
    whereClause = `WHERE date_implemented = $${paramIndex}`
    params.push(options.date)
    paramIndex++
  } else if (options.from && options.to) {
    whereClause = `WHERE date_implemented >= $${paramIndex} AND date_implemented <= $${paramIndex + 1}`
    params.push(options.from, options.to)
    paramIndex += 2
  } else if (options.from || options.to) {
    throw new Error('Both --from and --to must be provided together')
  } else if (options.created) {
    whereClause = `WHERE DATE(created_at) = $${paramIndex}`
    params.push(options.created)
    paramIndex++
  } else {
    throw new Error('No deletion criteria specified. Use --year, --date, --from/--to, --created, or --all')
  }

  return {
    sql: `DELETE FROM beneficiaries ${whereClause}`,
    params,
  }
}

const countRecords = async (options) => {
  const { sql, params } = buildDeleteQuery(options)
  const countSql = sql.replace('DELETE FROM', 'SELECT COUNT(*) FROM')
  const result = await query(countSql, params)
  return Number(result.rows[0].count)
}

const main = async () => {
  const options = parseArgs()

  if (process.argv.length === 2 || (process.argv.length === 3 && options.dryRun)) {
    showUsage()
    process.exit(1)
  }

  try {
    console.log('🔍 Checking records to delete...')
    const count = await countRecords(options)
    
    if (count === 0) {
      console.log('✅ No records found matching the criteria.')
      process.exit(0)
    }

    console.log(`📊 Found ${count} record(s) to delete`)

    if (options.dryRun) {
      console.log('')
      console.log('🔍 DRY RUN MODE - No records will be deleted')
      console.log('   Remove --dry-run to actually delete these records')
      process.exit(0)
    }

    // Confirm deletion
    console.log('')
    console.log('⚠️  WARNING: This will permanently delete records!')
    console.log(`   ${count} record(s) will be deleted`)
    console.log('')
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...')
    
    await new Promise((resolve) => setTimeout(resolve, 5000))

    console.log('')
    console.log('🗑️  Deleting records...')
    const { sql, params } = buildDeleteQuery(options)
    const result = await query(sql, params)
    
    console.log(`✅ Successfully deleted ${result.rowCount || count} record(s)`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('No deletion criteria')) {
      showUsage()
    }
    process.exit(1)
  }
}

main()

