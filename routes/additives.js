const express = require('express')
const router = express.Router()
const { open } = require('sqlite')
const sqlite3 = require('sqlite3').verbose()

// Получение всех добавок с фильтрацией
router.get('/', async (req, res) => {
	try {
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		let query = 'SELECT * FROM additives WHERE 1=1'
		const params = []

		// Фильтрация по категории
		if (req.query.category) {
			query += ' AND category = ?'
			params.push(req.query.category)
		}

		// Фильтрация по доступности
		if (req.query.available === 'true') {
			query += ' AND available = 1'
		}

		query += ' ORDER BY category, title'

		const additives = await db.all(query, params)

		// Преобразование available в boolean
		const formattedAdditives = additives.map(a => ({
			...a,
			available: Boolean(a.available),
		}))

		res.json(formattedAdditives)
		await db.close()
	} catch (error) {
		console.error('Ошибка при получении добавок:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Получение добавки по ID
router.get('/:id', async (req, res) => {
	try {
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		const additive = await db.get(
			'SELECT * FROM additives WHERE id = ?',
			req.params.id,
		)

		if (!additive) {
			res.status(404).json({ error: 'Добавка не найдена' })
			return
		}

		additive.available = Boolean(additive.available)
		res.json(additive)
		await db.close()
	} catch (error) {
		console.error('Ошибка при получении добавки:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Создание новой добавки (для админки)
router.post('/', async (req, res) => {
	try {
		const { title, price, category, available } = req.body

		if (!title || !price || !category) {
			return res.status(400).json({ error: 'Заполните обязательные поля' })
		}

		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		const result = await db.run(
			'INSERT INTO additives (title, price, category, available) VALUES (?, ?, ?, ?)',
			title,
			price,
			category,
			available ? 1 : 0,
		)

		const newAdditive = await db.get(
			'SELECT * FROM additives WHERE id = ?',
			result.lastID,
		)

		newAdditive.available = Boolean(newAdditive.available)
		res.status(201).json(newAdditive)
		await db.close()
	} catch (error) {
		console.error('Ошибка при создании добавки:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Обновление добавки
router.put('/:id', async (req, res) => {
	try {
		const { title, price, category, available } = req.body
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		const additive = await db.get(
			'SELECT * FROM additives WHERE id = ?',
			req.params.id,
		)

		if (!additive) {
			return res.status(404).json({ error: 'Добавка не найдена' })
		}

		await db.run(
			'UPDATE additives SET title = ?, price = ?, category = ?, available = ? WHERE id = ?',
			title || additive.title,
			price || additive.price,
			category || additive.category,
			available !== undefined ? (available ? 1 : 0) : additive.available,
			req.params.id,
		)

		const updatedAdditive = await db.get(
			'SELECT * FROM additives WHERE id = ?',
			req.params.id,
		)

		updatedAdditive.available = Boolean(updatedAdditive.available)
		res.json(updatedAdditive)
		await db.close()
	} catch (error) {
		console.error('Ошибка при обновлении добавки:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Удаление добавки
router.delete('/:id', async (req, res) => {
	try {
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		const additive = await db.get(
			'SELECT * FROM additives WHERE id = ?',
			req.params.id,
		)

		if (!additive) {
			return res.status(404).json({ error: 'Добавка не найдена' })
		}

		await db.run('DELETE FROM additives WHERE id = ?', req.params.id)
		res.json({ message: 'Добавка успешно удалена' })
		await db.close()
	} catch (error) {
		console.error('Ошибка при удалении добавки:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
