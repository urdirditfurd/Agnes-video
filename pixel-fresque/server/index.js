import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import Stripe from 'stripe'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  listBlocks,
  getBlock,
  findOverlapping,
  insertBlock,
  updateBlock,
  getStats,
  seedDemoBlocks,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8787)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const GRID = 1000
const MIN_SIZE = 1
const PRICE_PER_PIXEL_CENTS = 100 // 1 €

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

seedDemoBlocks()

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '12mb' }))

function parseAttachments(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function publicBlock(row) {
  if (!row) return null
  return {
    id: row.id,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    ownerName: row.owner_name,
    title: row.title,
    message: row.message,
    linkUrl: row.link_url,
    color: row.color,
    imageData: row.image_data,
    attachments: parseAttachments(row.attachments),
    priceEuros: row.price_cents / 100,
    paymentMode: row.payment_mode,
    createdAt: row.created_at,
  }
}

function validateSelection(body) {
  const x = Number(body.x)
  const y = Number(body.y)
  const width = Number(body.width)
  const height = Number(body.height)

  if (![x, y, width, height].every(Number.isFinite)) {
    return { error: 'Coordonnées invalides' }
  }
  if (width < MIN_SIZE || height < MIN_SIZE) {
    return { error: `Taille minimale : ${MIN_SIZE}×${MIN_SIZE} pixel` }
  }
  if (x < 0 || y < 0 || x + width > GRID || y + height > GRID) {
    return { error: 'La sélection sort de la fresque (1000×1000)' }
  }
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(width) || !Number.isInteger(height)) {
    return { error: 'Les dimensions doivent être des entiers' }
  }

  const overlaps = findOverlapping(x, y, width, height)
  if (overlaps.length) {
    return { error: 'Cette zone chevauche déjà des pixels vendus', overlaps }
  }

  const pixels = width * height
  const priceCents = pixels * PRICE_PER_PIXEL_CENTS
  return { x, y, width, height, pixels, priceCents }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    stripeEnabled: Boolean(stripe),
    paymentNote:
      'Mode démo = 0 frais. Stripe Checkout (cartes) = frais processeur uniquement, aucune commission Pixora.',
  })
})

app.get('/api/stats', (_req, res) => {
  res.json(getStats())
})

app.get('/api/blocks', (_req, res) => {
  res.json(listBlocks().map(publicBlock))
})

app.get('/api/blocks/:id', (req, res) => {
  const block = getBlock(req.params.id)
  if (!block) return res.status(404).json({ error: 'Bloc introuvable' })
  res.json(publicBlock(block))
})

app.post('/api/quote', (req, res) => {
  const result = validateSelection(req.body || {})
  if (result.error) return res.status(400).json(result)
  res.json({
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
    pixels: result.pixels,
    priceEuros: result.priceCents / 100,
    pricePerPixelEuros: 1,
  })
})

app.post('/api/checkout', async (req, res) => {
  const result = validateSelection(req.body || {})
  if (result.error) return res.status(400).json(result)

  const ownerName = String(req.body.ownerName || '').trim() || 'Anonyme'
  const ownerEmail = String(req.body.ownerEmail || '').trim()
  const title = String(req.body.title || '').trim() || ownerName
  const message = String(req.body.message || '').trim()
  const linkUrl = String(req.body.linkUrl || '').trim()
  const color = String(req.body.color || '#c8f542')
  const imageData = req.body.imageData || null
  const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : []
  const preferStripe = Boolean(req.body.useStripe)

  const draft = {
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
    ownerName,
    ownerEmail,
    title,
    message,
    linkUrl,
    color,
    imageData,
    attachments,
    priceCents: result.priceCents,
  }

  if (preferStripe && stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: ownerEmail || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: result.priceCents,
              product_data: {
                name: `Bloc Pixora ${result.width}×${result.height}`,
                description: `${result.pixels} pixels à 1 € — ${title}`,
              },
            },
          },
        ],
        metadata: {
          x: String(result.x),
          y: String(result.y),
          width: String(result.width),
          height: String(result.height),
          ownerName,
          title,
          message: message.slice(0, 400),
          linkUrl: linkUrl.slice(0, 400),
          color,
          // image stored after success via confirm endpoint for size limits
        },
        success_url: `${CLIENT_URL}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CLIENT_URL}/?canceled=1`,
      })

      // stash draft image server-side keyed by session
      pendingDrafts.set(session.id, draft)

      return res.json({
        mode: 'stripe',
        checkoutUrl: session.url,
        sessionId: session.id,
        note: 'Aucun frais Pixora. Seuls les frais Stripe (processeur) s’appliquent.',
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Échec création session Stripe', detail: String(err.message || err) })
    }
  }

  // Paiement démonstration : 0 frais, inscription immédiate
  const block = insertBlock({
    id: randomUUID(),
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
    owner_name: ownerName,
    owner_email: ownerEmail || null,
    title,
    message,
    link_url: linkUrl,
    color,
    image_data: imageData,
    attachments: JSON.stringify(attachments),
    price_cents: result.priceCents,
    payment_mode: 'demo',
    stripe_session_id: null,
  })

  res.json({
    mode: 'demo',
    block: publicBlock(block),
    note: 'Paiement démo sans frais — activez STRIPE_SECRET_KEY pour les paiements réels.',
  })
})

const pendingDrafts = new Map()

app.post('/api/checkout/confirm', async (req, res) => {
  const sessionId = String(req.body.sessionId || '')
  if (!sessionId || !stripe) {
    return res.status(400).json({ error: 'sessionId requis (mode Stripe)' })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Paiement non confirmé' })
    }

    const existing = listBlocks().find((b) => b.stripe_session_id === sessionId)
    if (existing) return res.json({ block: publicBlock(existing), already: true })

    const draft = pendingDrafts.get(sessionId) || {}
    const meta = session.metadata || {}
    const x = Number(meta.x)
    const y = Number(meta.y)
    const width = Number(meta.width)
    const height = Number(meta.height)

    const overlaps = findOverlapping(x, y, width, height)
    if (overlaps.length) {
      return res.status(409).json({ error: 'Zone déjà prise après paiement — contactez le support' })
    }

    const block = insertBlock({
      id: randomUUID(),
      x,
      y,
      width,
      height,
      owner_name: meta.ownerName || draft.ownerName || 'Anonyme',
      owner_email: session.customer_details?.email || draft.ownerEmail || null,
      title: meta.title || draft.title || 'Sans titre',
      message: meta.message || draft.message || '',
      link_url: meta.linkUrl || draft.linkUrl || '',
      color: meta.color || draft.color || '#c8f542',
      image_data: draft.imageData || null,
      attachments: JSON.stringify(draft.attachments || []),
      price_cents: session.amount_total || width * height * PRICE_PER_PIXEL_CENTS,
      payment_mode: 'stripe',
      stripe_session_id: sessionId,
    })

    pendingDrafts.delete(sessionId)
    res.json({ block: publicBlock(block) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.patch('/api/blocks/:id', (req, res) => {
  const block = getBlock(req.params.id)
  if (!block) return res.status(404).json({ error: 'Bloc introuvable' })

  const updated = updateBlock(req.params.id, {
    title: req.body.title,
    message: req.body.message,
    link_url: req.body.linkUrl,
    color: req.body.color,
    image_data: req.body.imageData,
    attachments:
      req.body.attachments !== undefined
        ? JSON.stringify(req.body.attachments)
        : undefined,
    owner_name: req.body.ownerName,
  })
  res.json(publicBlock(updated))
})

// Serve built client in production
const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get(/^(?!\/api).*/, (req, res, next) => {
  if (req.method !== 'GET') return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) next()
  })
})

app.listen(PORT, () => {
  console.log(`Pixora API → http://localhost:${PORT}`)
  console.log(stripe ? 'Stripe: activé' : 'Stripe: mode démo (0 frais)')
})
