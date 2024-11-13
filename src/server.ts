import express from 'express'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import fs from 'fs'

const app = express()
const PORT = 3001 // Порт для вашего сервера

// Настройка CORS
app.use(cors())

// Настройка папки для загрузки изображений
const uploadDir = path.join(__dirname, 'media')
app.use('/media', express.static(uploadDir))

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir)
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname)
	},
})

const upload = multer({ storage })

// API для загрузки изображений
app.post('/upload', upload.single('image'), (req, res) => {
	res.json({ url: `http://localhost:${PORT}/media/${req.file?.filename}` })
})

// API для удаления изображений
app.delete('/delete/:filename', (req, res) => {
	const filePath = path.join(uploadDir, req.params.filename)
	fs.unlink(filePath, (err) => {
		if (err) {
			return res.status(404).json({ error: 'Файл не найден' })
		}
		res.json({ message: 'Файл успешно удален' })
	})
})

// Запуск сервера
app.listen(PORT, () => {
	console.log(`Сервер запущен на http://localhost:${PORT}`)
})