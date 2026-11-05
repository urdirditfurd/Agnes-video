import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(path.join(dataDir, 'fresque.db'))

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT,
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    link_url TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#1a1a1a',
    image_data TEXT,
    attachments TEXT NOT NULL DEFAULT '[]',
    price_cents INTEGER NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'demo',
    stripe_session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_blocks_pos ON blocks(x, y);
`)

// Migration douce si DB déjà créée sans attachments
try {
  db.prepare('SELECT attachments FROM blocks LIMIT 1').get()
} catch {
  db.exec(`ALTER TABLE blocks ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'`)
}

export function listBlocks() {
  return db.prepare('SELECT * FROM blocks ORDER BY created_at DESC').all()
}

export function getBlock(id) {
  return db.prepare('SELECT * FROM blocks WHERE id = ?').get(id)
}

export function findOverlapping(x, y, width, height) {
  return db
    .prepare(
      `SELECT id, x, y, width, height, title FROM blocks
       WHERE NOT (x + width <= ? OR ? + ? <= x OR y + height <= ? OR ? + ? <= y)`
    )
    .all(x, x, width, y, y, height)
}

export function insertBlock(block) {
  db.prepare(
    `INSERT INTO blocks (
      id, x, y, width, height, owner_name, owner_email, title, message,
      link_url, color, image_data, attachments, price_cents, payment_mode, stripe_session_id
    ) VALUES (
      @id, @x, @y, @width, @height, @owner_name, @owner_email, @title, @message,
      @link_url, @color, @image_data, @attachments, @price_cents, @payment_mode, @stripe_session_id
    )`
  ).run(block)
  return getBlock(block.id)
}

export function updateBlock(id, fields) {
  const allowed = [
    'title',
    'message',
    'link_url',
    'color',
    'image_data',
    'attachments',
    'owner_name',
  ]
  const sets = []
  const params = { id }
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = @${key}`)
      params[key] = fields[key]
    }
  }
  if (!sets.length) return getBlock(id)
  db.prepare(`UPDATE blocks SET ${sets.join(', ')} WHERE id = @id`).run(params)
  return getBlock(id)
}

export function getStats() {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS sold_blocks,
         COALESCE(SUM(width * height), 0) AS sold_pixels,
         COALESCE(SUM(price_cents), 0) AS revenue_cents
       FROM blocks`
    )
    .get()
  const TOTAL = 1_000_000
  return {
    totalPixels: TOTAL,
    soldPixels: row.sold_pixels,
    availablePixels: TOTAL - row.sold_pixels,
    soldBlocks: row.sold_blocks,
    revenueEuros: row.revenue_cents / 100,
    occupancyPercent: Number(((row.sold_pixels / TOTAL) * 100).toFixed(4)),
    pricePerPixelEuros: 1,
  }
}

export function seedDemoBlocks() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM blocks').get().c
  if (count > 0) return

  const samples = [
    {
      id: 'seed-01',
      x: 40,
      y: 40,
      width: 40,
      height: 40,
      owner_name: 'Studio Nord',
      owner_email: null,
      title: 'Studio Nord',
      message: 'Design & code',
      link_url: 'https://example.com',
      color: '#c8f542',
      image_data: null,
      attachments: '[]',
      price_cents: 160000,
      payment_mode: 'demo',
      stripe_session_id: null,
    },
    {
      id: 'seed-02',
      x: 200,
      y: 120,
      width: 60,
      height: 30,
      owner_name: 'Atelier Lune',
      owner_email: null,
      title: 'Atelier Lune',
      message: 'Créations artisanales',
      link_url: '',
      color: '#ff6b4a',
      image_data: null,
      attachments: '[]',
      price_cents: 180000,
      payment_mode: 'demo',
      stripe_session_id: null,
    },
    {
      id: 'seed-03',
      x: 520,
      y: 300,
      width: 50,
      height: 50,
      owner_name: 'Pixel Club',
      owner_email: null,
      title: 'Pixel Club',
      message: 'Communauté makers',
      link_url: '',
      color: '#4ecdc4',
      image_data: null,
      attachments: '[]',
      price_cents: 250000,
      payment_mode: 'demo',
      stripe_session_id: null,
    },
  ]

  const insert = db.prepare(
    `INSERT INTO blocks (
      id, x, y, width, height, owner_name, owner_email, title, message,
      link_url, color, image_data, attachments, price_cents, payment_mode, stripe_session_id
    ) VALUES (
      @id, @x, @y, @width, @height, @owner_name, @owner_email, @title, @message,
      @link_url, @color, @image_data, @attachments, @price_cents, @payment_mode, @stripe_session_id
    )`
  )

  const tx = db.transaction((rows) => {
    for (const row of rows) insert.run(row)
  })
  tx(samples)
}

export default db
