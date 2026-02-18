const express = require('express')
const router = express.Router()
const { open } = require('sqlite')
const sqlite3 = require('sqlite3').verbose()

// Получение всех продуктов с фильтрацией
router.get('/', async (req, res) => {
	try {
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		let query = 'SELECT * FROM products WHERE 1=1'
		const params = []

		// Фильтрация по категории
		if (req.query.category) {
			query += ' AND category = ?'
			params.push(req.query.category)
		}

		// Фильтрация по популярности
		if (req.query.popular === 'true') {
			query += ' AND popular = 1'
		}

		// Фильтрация по объему
		if (req.query.volume) {
			query += ' AND volume = ?'
			params.push(req.query.volume)
		}

		// Сортировка
		if (req.query.sort) {
			switch (req.query.sort) {
				case 'price_asc':
					query += ' ORDER BY price ASC'
					break
				case 'price_desc':
					query += ' ORDER BY price DESC'
					break
				case 'title':
					query += ' ORDER BY title ASC'
					break
				default:
					query += ' ORDER BY id ASC'
			}
		} else {
			query += ' ORDER BY id ASC'
		}

		const products = await db.all(query, params)

		// Преобразование popular в boolean
		const formattedProducts = products.map(p => ({
			...p,
			popular: Boolean(p.popular),
		}))

		res.json(formattedProducts)
		await db.close()
	} catch (error) {
		console.error('Ошибка при получении продуктов:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Получение продукта по ID
router.get('/:id', async (req, res) => {
	try {
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		const product = await db.get(
			'SELECT * FROM products WHERE id = ?',
			req.params.id,
		)

		if (!product) {
			res.status(404).json({ error: 'Продукт не найден' })
			return
		}

		product.popular = Boolean(product.popular)
		res.json(product)
		await db.close()
	} catch (error) {
		console.error('Ошибка при получении продукта:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
