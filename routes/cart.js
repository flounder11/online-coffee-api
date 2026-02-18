const express = require('express')
const router = express.Router()
const { open } = require('sqlite')
const sqlite3 = require('sqlite3').verbose()

// POST запрос для оформления заказа из корзины
router.post('/', async (req, res) => {
	try {
		const { items, total } = req.body

		// Валидация входных данных
		if (!items || !Array.isArray(items) || items.length === 0) {
			return res.status(400).json({
				error: 'Корзина не может быть пустой',
				message: 'Добавьте товары в корзину',
			})
		}

		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		// Начинаем транзакцию
		await db.exec('BEGIN TRANSACTION')

		try {
			// Проверяем наличие всех товаров и получаем актуальные цены
			let calculatedTotal = 0
			const validatedItems = []

			for (const item of items) {
				const product = await db.get(
					'SELECT id, price, title FROM products WHERE id = ?',
					item.productId,
				)

				if (!product) {
					throw new Error(`Товар с ID ${item.productId} не найден`)
				}

				// Рассчитываем стоимость товара с добавками
				let itemTotal = product.price * item.quantity
				let additivesTotal = 0
				const validatedAdditives = []

				// Проверяем и обрабатываем добавки
				if (item.additives && Array.isArray(item.additives)) {
					for (const additive of item.additives) {
						const additiveData = await db.get(
							'SELECT id, price, title, available FROM additives WHERE id = ?',
							additive.id,
						)

						if (!additiveData) {
							throw new Error(`Добавка с ID ${additive.id} не найдена`)
						}

						if (!additiveData.available) {
							throw new Error(
								`Добавка "${additiveData.title}" временно недоступна`,
							)
						}

						const additiveQuantity = additive.quantity || 1
						const additiveCost = additiveData.price * additiveQuantity
						additivesTotal += additiveCost

						validatedAdditives.push({
							id: additiveData.id,
							title: additiveData.title,
							price: additiveData.price,
							quantity: additiveQuantity,
						})
					}
				}

				itemTotal += additivesTotal * item.quantity
				calculatedTotal += itemTotal

				validatedItems.push({
					productId: product.id,
					quantity: item.quantity,
					price: product.price,
					title: product.title,
					additives: validatedAdditives,
					additivesTotal: additivesTotal * item.quantity,
				})
			}

			// Проверяем соответствие переданной суммы
			if (total && Math.abs(calculatedTotal - total) > 1) {
				throw new Error('Несоответствие суммы заказа')
			}

			// Создаем заказ
			const orderResult = await db.run(
				'INSERT INTO orders (total_amount, items_count) VALUES (?, ?)',
				calculatedTotal,
				validatedItems.length,
			)

			const orderId = orderResult.lastID

			// Добавляем детали заказа с добавками
			for (const item of validatedItems) {
				// Добавляем позицию заказа
				const orderItemResult = await db.run(
					'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
					orderId,
					item.productId,
					item.quantity,
					item.price,
				)

				const orderItemId = orderItemResult.lastID

				// Добавляем добавки для этой позиции
				if (item.additives && item.additives.length > 0) {
					for (const additive of item.additives) {
						await db.run(
							'INSERT INTO order_additives (order_item_id, additive_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
							orderItemId,
							additive.id,
							additive.quantity,
							additive.price,
						)
					}
				}
			}

			// Завершаем транзакцию
			await db.exec('COMMIT')

			// Возвращаем успешный ответ
			res.status(201).json({
				success: true,
				message: 'Заказ успешно оформлен',
				order: {
					id: orderId,
					total: calculatedTotal,
					itemsCount: validatedItems.length,
					items: validatedItems,
					status: 'pending',
					createdAt: new Date().toISOString(),
				},
			})
		} catch (error) {
			// Откатываем транзакцию в случае ошибки
			await db.exec('ROLLBACK')
			throw error
		} finally {
			await db.close()
		}
	} catch (error) {
		console.error('Ошибка при оформлении заказа:', error)
		res.status(500).json({
			error: 'Ошибка при оформлении заказа',
			message: error.message,
		})
	}
})

// Получение информации о заказе
router.get('/order/:id', async (req, res) => {
	try {
		const db = await open({
			filename: './db/coffee-shop.db',
			driver: sqlite3.Database,
		})

		const order = await db.get(
			'SELECT * FROM orders WHERE id = ?',
			req.params.id,
		)

		if (!order) {
			return res.status(404).json({ error: 'Заказ не найден' })
		}

		// Получаем позиции заказа с добавками
		const items = await db.all(
			`SELECT oi.*, p.title, p.img 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
			req.params.id,
		)

		// Для каждой позиции получаем добавки
		for (let item of items) {
			const additives = await db.all(
				`SELECT oa.*, a.title, a.category 
         FROM order_additives oa 
         JOIN additives a ON oa.additive_id = a.id 
         WHERE oa.order_item_id = ?`,
				item.id,
			)

			item.additives = additives
		}

		res.json({
			...order,
			items,
		})

		await db.close()
	} catch (error) {
		console.error('Ошибка при получении заказа:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
