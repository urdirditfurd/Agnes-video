import type { BlockDraft, FresqueStats, PixelBlock, Selection } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return data as T
}

export function fetchBlocks() {
  return request<PixelBlock[]>('/api/blocks')
}

export function fetchStats() {
  return request<FresqueStats>('/api/stats')
}

export function fetchHealth() {
  return request<{ ok: boolean; stripeEnabled: boolean; paymentNote: string }>('/api/health')
}

export function quoteSelection(selection: Selection) {
  return request<{
    pixels: number
    priceEuros: number
  }>('/api/quote', { method: 'POST', body: JSON.stringify(selection) })
}

export function checkout(selection: Selection, draft: BlockDraft) {
  return request<{
    mode: 'demo' | 'stripe'
    checkoutUrl?: string
    sessionId?: string
    block?: PixelBlock
    note?: string
  }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ ...selection, ...draft }),
  })
}

export function confirmStripe(sessionId: string) {
  return request<{ block: PixelBlock }>('/api/checkout/confirm', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export function updateBlock(id: string, draft: Partial<BlockDraft>) {
  return request<PixelBlock>(`/api/blocks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(draft),
  })
}
