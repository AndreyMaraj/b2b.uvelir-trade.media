import express from 'express'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import fs from 'fs/promises'

const app = express(),
	PORT = process.env.PORT ?? 3001,
	uploadDir = path.join(__dirname, '..', 'media'),
	tempDir = path.join(__dirname, '..', 'temp'),
	storage = multer.diskStorage({
		destination: (req, file, cb) => cb(null, tempDir),
		filename: (req, file, cb) => cb(null, file.originalname)
	}),
	upload = multer({ storage })

app.use(cors())
app.use(express.json())
app.use('/media', express.static(uploadDir))

fs.mkdir(uploadDir, { recursive: true })
fs.mkdir(tempDir, { recursive: true })

app.post('/upload', upload.array('files'), async (req, res) => {
	const folderPath = req.body.folderPath || '',
		fullUploadDir = path.join(uploadDir, folderPath)

	try {
		const files = req.files as Express.Multer.File[] || []

		if (files.length === 0) {
			if (folderPath) {
				await fs.rm(fullUploadDir, { recursive: true, force: true })
				res.json([])
			} else {
				res.status(400).send('folderPath не может быть пустым, если не переданы файлы.')
			}
		}

		await fs.mkdir(fullUploadDir, { recursive: true })

		await Promise.all((await fs.readdir(fullUploadDir)).map(file => fs.unlink(path.join(fullUploadDir, file))))

		const results = await Promise.all(
			files.map(file =>
				fs.rename(path.join(tempDir, file.originalname), path.join(fullUploadDir, file.originalname))
					.then(() => `${folderPath}/${file.originalname}`)
			)
		)

		res.json(results)
	}
	catch (e) {
		console.error('Ошибка при обработке файлов:', e)
		res.status(500).send('Ошибка при обработке файлов')
	}
})

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`))