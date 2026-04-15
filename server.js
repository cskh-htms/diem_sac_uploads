import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const app = express()
const PORT = 4000
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || '/app/uploads'

const IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]

const VIDEO_MIME = ['video/mp4', 'video/webm']

const FILE_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_SIZE = {
  image: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  file: 10 * 1024 * 1024,
}

function isValidMime(fileType, mime) {
  if (fileType === 'image') return IMAGE_MIME.includes(mime)
  if (fileType === 'video') return VIDEO_MIME.includes(mime)
  if (fileType === 'file') return FILE_MIME.includes(mime)
  return false
}

function sanitizeSubPath(str = '') {
  return str
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\/+|\/+$/g, '')
}

function safeRemoveFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return
  fs.unlinkSync(filePath)
}

app.use('/uploads', express.static(UPLOAD_ROOT))

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const subPath = sanitizeSubPath(req.body.sub_path)
    const dir = path.join(UPLOAD_ROOT, subPath)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },

  filename(_req, file, cb) {
    const ext = path.extname(file.originalname)
    const safeName =
      `upload_${Date.now()}_${Math.random().toString(36).slice(2)}` + ext
    cb(null, safeName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter(_req, file, cb) {
    const mime = file.mimetype

    if (
      IMAGE_MIME.includes(mime) ||
      VIDEO_MIME.includes(mime) ||
      FILE_MIME.includes(mime)
    ) {
      return cb(null, true)
    }

    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
  },
})

app.post('/upload', (req, res) => {
  upload.single('file')(req, res, err => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File vuot qua dung luong cho phep',
        })
      }

      return res.status(400).json({
        message: 'Dinh dang file khong duoc ho tro',
      })
    }

    if (err) {
      console.error('UPLOAD ERROR:', err)
      return res.status(500).json({ message: 'Upload failed' })
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' })
      }

      const { file_type } = req.body

      if (!['image', 'video', 'file'].includes(file_type)) {
        safeRemoveFile(req.file.path)
        return res.status(400).json({ message: 'Invalid file_type' })
      }

      if (!isValidMime(file_type, req.file.mimetype)) {
        safeRemoveFile(req.file.path)
        return res.status(400).json({
          message: 'Dinh dang file khong duoc ho tro',
        })
      }

      if (req.file.size > MAX_SIZE[file_type]) {
        safeRemoveFile(req.file.path)
        return res.status(400).json({
          message: 'File vuot qua dung luong cho phep',
        })
      }

      const subPath = sanitizeSubPath(req.body.sub_path)

      return res.json({
        file_name: req.file.filename,
        file_path: path.posix.join('/uploads', subPath, req.file.filename),
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      })
    } catch (routeErr) {
      console.error('UPLOAD ERROR:', routeErr)
      return res.status(500).json({ message: 'Upload failed' })
    }
  })
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'upload-server',
    time: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Upload server running at http://localhost:${PORT}`)
})
