import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const app = express()
const PORT = 4000
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || '/app/uploads'
const UPLOAD_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.UPLOAD_CONCURRENCY || '1', 10) || 1,
)
const UPLOAD_QUEUE_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.UPLOAD_QUEUE_LIMIT || '100', 10) || 100,
)

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

function safeRemoveFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return
  fs.unlinkSync(filePath)
}

class UploadQueue {
  constructor(concurrency, queueLimit) {
    this.concurrency = concurrency
    this.queueLimit = queueLimit
    this.activeCount = 0
    this.pending = []
  }

  getStats() {
    return {
      concurrency: this.concurrency,
      active: this.activeCount,
      waiting: this.pending.length,
      limit: this.queueLimit,
    }
  }

  push(task) {
    if (this.pending.length >= this.queueLimit) {
      return false
    }

    this.pending.push(task)
    this.runNext()
    return true
  }

  remove(task) {
    const index = this.pending.indexOf(task)
    if (index === -1) return false
    this.pending.splice(index, 1)
    return true
  }

  runNext() {
    while (this.activeCount < this.concurrency && this.pending.length > 0) {
      const task = this.pending.shift()
      this.activeCount += 1

      task(() => {
        this.activeCount = Math.max(0, this.activeCount - 1)
        this.runNext()
      })
    }
  }
}

const uploadQueue = new UploadQueue(UPLOAD_CONCURRENCY, UPLOAD_QUEUE_LIMIT)

app.use('/uploads', express.static(UPLOAD_ROOT))

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true })
    cb(null, UPLOAD_ROOT)
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
  let finished = false

  const release = () => {
    if (finished) return
    finished = true
  }

  const runUpload = done => {
    let released = false

    const complete = () => {
      if (released) return
      released = true
      release()
      done()
    }

    upload.single('file')(req, res, err => {
      try {
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

        return res.json({
          file_name: req.file.filename,
          file_path: path.posix.join('/uploads', req.file.filename),
          mime_type: req.file.mimetype,
          file_size: req.file.size,
        })
      } catch (routeErr) {
        console.error('UPLOAD ERROR:', routeErr)
        return res.status(500).json({ message: 'Upload failed' })
      } finally {
        complete()
      }
    })
  }

  const queuedTask = done => {
    if (req.aborted || res.writableEnded) {
      done()
      return
    }

    runUpload(done)
  }

  req.on('aborted', () => {
    if (uploadQueue.remove(queuedTask)) {
      release()
    }
  })

  if (!uploadQueue.push(queuedTask)) {
    return res.status(503).json({
      message: 'Server dang ban, vui long thu lai sau',
    })
  }

  res.on('close', () => {
    if (!res.writableEnded && uploadQueue.remove(queuedTask)) {
      release()
    }
  })
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'upload-server',
    time: new Date().toISOString(),
    upload_queue: uploadQueue.getStats(),
  })
})

app.listen(PORT, () => {
  console.log(
    `Upload server running at http://localhost:${PORT} with concurrency=${UPLOAD_CONCURRENCY} queue_limit=${UPLOAD_QUEUE_LIMIT}`,
  )
})
