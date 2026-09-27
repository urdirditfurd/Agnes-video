import type { DesignDocument } from './design/types'

export const GRID_SIZE = 1000
export const MIN_BLOCK = 1
export const PRICE_PER_PIXEL = 1

export type BlockAttachment = {
  id: string
  name: string
  mime: string
  size: number
  dataUrl: string
  kind: 'image' | 'file'
  x?: number
  y?: number
  w?: number
  h?: number
}

export type PixelBlock = {
  id: string
  x: number
  y: number
  width: number
  height: number
  ownerName: string
  title: string
  message: string
  linkUrl: string
  color: string
  imageData: string | null
  attachments: BlockAttachment[]
  priceEuros: number
  paymentMode: string
  createdAt: string
}

export type FresqueStats = {
  totalPixels: number
  soldPixels: number
  availablePixels: number
  soldBlocks: number
  revenueEuros: number
  occupancyPercent: number
  pricePerPixelEuros: number
}

export type Selection = {
  x: number
  y: number
  width: number
  height: number
}

export type BlockDraft = {
  ownerName: string
  ownerEmail: string
  title: string
  message: string
  linkUrl: string
  color: string
  imageData: string | null
  attachments: BlockAttachment[]
  useStripe: boolean
  designDoc: DesignDocument | null
}

export type { DesignDocument }
