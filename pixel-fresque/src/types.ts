export const GRID_SIZE = 1000
export const MIN_BLOCK = 10
export const PRICE_PER_PIXEL = 1

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
  useStripe: boolean
}

export type BuilderTool = 'select' | 'paint' | 'image' | 'link' | 'text'
