export type DesignTool =
  | 'select'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'draw'
  | 'image'

export type TextAlign = 'left' | 'center' | 'right'

export type DesignElementBase = {
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  locked?: boolean
  name: string
}

export type TextElement = DesignElementBase & {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  color: string
  align: TextAlign
  bold: boolean
}

export type RectElement = DesignElementBase & {
  type: 'rect'
  fill: string
  stroke: string
  strokeWidth: number
  radius: number
}

export type EllipseElement = DesignElementBase & {
  type: 'ellipse'
  fill: string
  stroke: string
  strokeWidth: number
}

export type ImageElement = DesignElementBase & {
  type: 'image'
  src: string
  fileName: string
}

export type PathElement = DesignElementBase & {
  type: 'path'
  points: { x: number; y: number }[]
  color: string
  strokeWidth: number
}

export type DesignElement =
  | TextElement
  | RectElement
  | EllipseElement
  | ImageElement
  | PathElement

export type DesignDocument = {
  width: number
  height: number
  background: string
  elements: DesignElement[]
}

export const FONT_OPTIONS = [
  'Outfit',
  'Bricolage Grotesque',
  'Georgia',
  'Courier New',
  'Impact',
] as const

export const NUANCIER_ROWS: { label: string; colors: string[] }[] = [
  {
    label: 'Vifs',
    colors: ['#c8f542', '#ff6b4a', '#ef476f', '#f72585', '#ffd166', '#06d6a0', '#4ecdc4', '#118ab2'],
  },
  {
    label: 'Profonds',
    colors: ['#073b4c', '#1b4332', '#3d5a80', '#5c4d7a', '#9b5de5', '#7b2cbf', '#bc4749', '#6a994e'],
  },
  {
    label: 'Pastels',
    colors: ['#f4f1de', '#ffe5ec', '#e8f5e9', '#e3f2fd', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec'],
  },
  {
    label: 'Neutres',
    colors: ['#ffffff', '#e8e8e8', '#bdbdbd', '#757575', '#424242', '#1a1a1a', '#0c0f0a', '#000000'],
  },
]

export function createEmptyDoc(width: number, height: number, background = '#ffffff'): DesignDocument {
  return { width, height, background, elements: [] }
}

export function uid() {
  return crypto.randomUUID()
}
