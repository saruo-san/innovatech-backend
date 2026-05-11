const express = require('express')
const { Pool } = require('pg')

const app = express()
app.use(express.json())

// Simple CORS middleware to allow requests from the frontend (adjust origin in production)
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*'
  res.header('Access-Control-Allow-Origin', origin)
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

const {
  DATABASE_HOST = process.env.DATABASE_HOST || 'localhost',
  DATABASE_USER = process.env.DATABASE_USER || 'postgres',
  DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'example',
  DATABASE_DB = process.env.DATABASE_DB || 'appdb',
  DATABASE_PORT = process.env.DATABASE_PORT || 5432,
  PORT = process.env.PORT || 3000,
} = process.env

const pool = new Pool({
  host: DATABASE_HOST,
  user: DATABASE_USER,
  password: DATABASE_PASSWORD,
  database: DATABASE_DB,
  port: DATABASE_PORT,
})

async function initDb() {
  const client = await pool.connect()
  try {
    await client.query('CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, name TEXT NOT NULL)')
  } finally {
    client.release()
  }
}

async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await initDb()
      console.log('Database initialized')
      return
    } catch (err) {
      console.error(`DB init error (attempt ${i + 1}/${retries}):`, err.message || err)
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

app.get('/ping', (req, res) => res.json({ pong: true }))

app.get('/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM items ORDER BY id')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/items', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const { rows } = await pool.query('INSERT INTO items(name) VALUES($1) RETURNING id, name', [name])
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/items/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
  try {
    const result = await pool.query('DELETE FROM items WHERE id = $1', [id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'not found' })
    return res.status(204).end()
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Start server after DB is ready (with retries)
connectWithRetry().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}).catch(err => {
  console.error('Failed to initialize DB after retries:', err)
  process.exit(1)
})
