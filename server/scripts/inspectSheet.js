import xlsx from 'xlsx'

const filePath =
  process.argv[2] ??
  'D:/Users/Ken/Documents/School Documents/BISU 4TH YEAR/THESIS FILES/fwd/2019.xlsx'
const sheetName = process.argv[3] ?? 'January'

const workbook = xlsx.readFile(filePath)
const sheet = workbook.Sheets[sheetName]

if (!sheet) {
  console.error('Sheet not found:', sheetName)
  process.exit(1)
}

const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })
const headerIndex = matrix.findIndex((row) =>
  row.some(
    (cell) => typeof cell === 'string' && cell.toUpperCase().includes('NAME OF BENEFICIARIES')
  )
)

if (headerIndex === -1) {
  console.error('Header row not found')
  process.exit(1)
}

const headers = matrix[headerIndex]
console.log('Header index:', headerIndex)
headers.forEach((cell, index) => {
  console.log(`${index}: ${cell}`)
})

const firstRow = matrix[headerIndex + 1]
console.log('First data row:', firstRow)


