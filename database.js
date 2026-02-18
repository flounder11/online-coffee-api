const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')

async function initializeDatabase() {
	const db = await open({
		filename: './db/coffee-shop.db',
		driver: sqlite3.Database,
	})

	// Создание таблицы продуктов
	await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      img TEXT,
      price INTEGER NOT NULL,
      volume INTEGER,
      category TEXT NOT NULL,
      popular BOOLEAN DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

	// Создание таблицы добавок
	await db.exec(`
    CREATE TABLE IF NOT EXISTS additives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      available BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

	// Создание таблицы заказов
	await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_amount INTEGER NOT NULL,
      items_count INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending'
    )
  `)

	// Создание таблицы для деталей заказа
	await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_time INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `)

	// Создание таблицы для добавок в заказе
	await db.exec(`
    CREATE TABLE IF NOT EXISTS order_additives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      additive_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price_at_time INTEGER NOT NULL,
      FOREIGN KEY (order_item_id) REFERENCES order_items (id),
      FOREIGN KEY (additive_id) REFERENCES additives (id)
    )
  `)

	// Добавление тестовых данных, если таблица пуста
	const productCount = await db.get('SELECT COUNT(*) as count FROM products')
	const additiveCount = await db.get('SELECT COUNT(*) as count FROM additives')

	if (productCount.count === 0) {
		const sampleProducts = [
			[
				'Капучино',
				'http://localhost:3000/images/capuchino.png',
				140,
				200,
				'drinks',
				1,
				'Классический капучино',
			],
			[
				'Айс латте',
				'http://localhost:3000/images/ice-latte.png',
				190,
				200,
				'drinks',
				1,
				'Классический айс латте',
			],
			[
				'Матча тоник',
				'http://localhost:3000/images/matcha-tonik.png',
				190,
				200,
				'drinks',
				0,
				'Классический матча тоник',
			],
			[
				'Американо',
				'http://localhost:3000/images/americano.png',
				190,
				200,
				'drinks',
				1,
				'Классический американо',
			],
			[
				'Какао',
				'http://localhost:3000/images/kakao.png',
				120,
				200,
				'drinks',
				0,
				'Классический какао',
			],
			[
				'Багет',
				'https://example.com/baguette.jpg',
				90,
				null,
				'bakery',
				0,
				'Хрустящий багет',
			],
			[
				'Зерновой кофе',
				'https://example.com/beans.jpg',
				450,
				null,
				'stock',
				0,
				'Кофе в зернах 250г',
			],
		]

		for (const product of sampleProducts) {
			await db.run(
				'INSERT INTO products (title, img, price, volume, category, popular, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
				product,
			)
		}
		console.log('Добавлены тестовые продукты')
	}

	if (additiveCount.count === 0) {
		const sampleAdditives = [
			['Сахар', 10, 'sweeteners', 1],
			['Корица', 15, 'spices', 1],
			['Ванильный сироп', 30, 'syrups', 1],
			['Карамельный сироп', 30, 'syrups', 1],
			['Сливки', 25, 'dairy', 1],
			['Молоко', 20, 'dairy', 1],
			['Шоколадная крошка', 25, 'toppings', 1],
		]

		for (const additive of sampleAdditives) {
			await db.run(
				'INSERT INTO additives (title, price, category, available) VALUES (?, ?, ?, ?)',
				additive,
			)
		}
		console.log('Добавлены тестовые добавки')
	}

	console.log('База данных инициализирована')
	return db
}

module.exports = { initializeDatabase }
