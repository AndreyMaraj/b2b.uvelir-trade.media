import express from 'express'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import fs from 'fs'

function loadEnv() {
	const envFilePath = path.join(__dirname, '..', '.env')
	if (fs.existsSync(envFilePath)) {
		const envFileContent = fs.readFileSync(envFilePath, 'utf-8'),
			lines = envFileContent.split('\n')
		lines.forEach(line => {
			const [key, value] = line.split('=')
			if (key && value) {
				process.env[key.trim()] = value.trim()
			}
		})
	} else {
		console.error('.env файл не найден!')
	}
}

loadEnv()

const app = express(),
	PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

const uploadDir = path.join(__dirname, '..', 'media')
app.use('/media', express.static(uploadDir))

fs.mkdir(uploadDir, { recursive: true }, (err) => {
	if (err) {
		console.error('Ошибка при создании папки media:', err)
	} else {
		console.log('Папка media успешно создана или уже существует.')
	}
})

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => cb(null, file.originalname)
})

const upload = multer({ storage })

app.post('/upload', upload.array('files'), (req, res) => {
	const folderPath = req.body.folderPath ?? '',
		fullUploadDir = path.join(uploadDir, folderPath)

	if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
		if (folderPath) {
			fs.rmdir(fullUploadDir, { recursive: true }, err => {
				if (err) {
					res.status(500).json({ error: 'Ошибка при удалении папки' })
				} else {
					res.json([])
				}
			})
		} else {
			res.status(400).json({ error: 'folderPath не может быть пустым, если не переданы файлы.' })
		}
		return
	}

	fs.mkdir(fullUploadDir, { recursive: true }, err => {
		if (err) {
			return res.status(500).json({ error: 'Ошибка при создании папки' })
		}

		fs.readdir(fullUploadDir, (err, files) => {
			if (err) {
				return res.status(500).json({ error: 'Ошибка при чтении папки' })
			}

			const deletePromises = files.map(file =>
				new Promise((resolve, reject) =>
					fs.unlink(path.join(fullUploadDir, file), err => {
						if (err) {
							reject(err)
						} else {
							resolve(true)
						}
					})
				)
			)

			Promise.all(deletePromises)
				.then(() => {
					const filePromises = (req.files as Express.Multer.File[]).map((file: Express.Multer.File) => {
						const filePath = path.join(fullUploadDir, file.originalname)
						return new Promise<string>((resolve, reject) =>
							fs.rename(file.path, filePath, err => {
								if (err) {
									reject(err)
								} else {
									resolve(`/${folderPath}/${file.originalname}`)
								}
							})
						)
					})

					return Promise.all(filePromises)
				})
				.then(results => res.json(results))
				.catch(err => res.status(500).json({ error: 'Ошибка при сохранении файлов' }))
		})
	})
})

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`))