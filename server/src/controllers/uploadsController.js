import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDirectory = path.resolve(__dirname, '../../', env.uploadDir)

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

export const handleExcelUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing Excel file' })
    }

    const tempPath = req.file.path
    const targetPath = path.join(uploadDirectory, req.file.originalname)
    await fs.promises.rename(tempPath, targetPath)

    res.status(201).json({
      message: 'File received. Run the import script to sync with the database.',
      file: {
        name: req.file.originalname,
        storedAt: targetPath,
      },
    })
  } catch (error) {
    next(error)
  }
}


