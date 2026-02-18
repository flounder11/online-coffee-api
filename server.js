const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const productsRouter = require('./routes/products')
const cartRouter = require('./routes/cart')
const additivesRouter = require('./routes/additives')
const { initializeDatabase } = require('./database')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const path = require('path')

// Создаем папку для загрузок, если её нет
const fs = require('fs')
const uploadDir = path.join(__dirname, 'images')
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true })
}

// Раздаем статические файлы из папки uploads
app.use('/images', express.static(path.join(__dirname, 'images')))

// Логирование запросов
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
	next()
})

// Роуты
app.use('/api/products', productsRouter)
app.use('/api/cart', cartRouter)
app.use('/api/additives', additivesRouter)

// Обработка ошибок
app.use((err, req, res, next) => {
	console.error(err.stack)
	res.status(500).json({ error: 'Что-то пошло не так!' })
})

// Инициализация базы данных и запуск сервера
async function startServer() {
	try {
		await initializeDatabase()
		app.listen(PORT, () => {
			console.log(`Сервер запущен на порту ${PORT}`)
			console.log(`http://localhost:${PORT}`)
		})
	} catch (error) {
		console.error('Ошибка при запуске сервера:', error)
		process.exit(1)
	}
}

startServer()
