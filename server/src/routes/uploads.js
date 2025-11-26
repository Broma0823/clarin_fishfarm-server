import { Router } from 'express'
import multer from 'multer'
import os from 'os'
import path from 'path'
import { handleExcelUpload } from '../controllers/uploadsController.js'

const upload = multer({
  dest: path.join(os.tmpdir(), 'bfar_uploads'),
})

const router = Router()

router.post('/excel', upload.single('file'), handleExcelUpload)

export default router


