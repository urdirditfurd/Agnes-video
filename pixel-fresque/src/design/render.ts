import type { DesignDocument, DesignElement } from './types'

const STUDIO_TARGET = 520

/** Résolution interne du document (pixels logiques du bloc, upscalés pour le studio) */
export function studioScale(w: number, h: number) {
  return Math.max(8, Math.min(128, Math.floor(STUDIO_TARGET / Math.max(w, h, 1))))
}

export function docPixelSize(blockW: number, blockH: number) {
  const s = studioScale(blockW, blockH)
  return { scale: s, width: Math.max(1, blockW * s), height: Math.max(1, blockH * s) }
}

export async function renderDesignToDataUrl(doc: DesignDocument): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = doc.width
  canvas.height = doc.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.imageSmoothingEnabled = true

  ctx.fillStyle = doc.background
  ctx.fillRect(0, 0, doc.width, doc.height)

  for (const el of doc.elements) {
    await drawElement(ctx, el)
  }

  return canvas.toDataURL('image/png')
}

async function drawElement(ctx: CanvasRenderingContext2D, el: DesignElement) {
  ctx.save()
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  if (el.rotation) {
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }

  switch (el.type) {
    case 'rect': {
      roundRect(ctx, el.x, el.y, el.w, el.h, el.radius)
      ctx.fillStyle = el.fill
      ctx.fill()
      if (el.strokeWidth > 0) {
        ctx.strokeStyle = el.stroke
        ctx.lineWidth = el.strokeWidth
        ctx.stroke()
      }
      break
    }
    case 'ellipse': {
      ctx.beginPath()
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2)
      ctx.fillStyle = el.fill
      ctx.fill()
      if (el.strokeWidth > 0) {
        ctx.strokeStyle = el.stroke
        ctx.lineWidth = el.strokeWidth
        ctx.stroke()
      }
      break
    }
    case 'text': {
      ctx.fillStyle = el.color
      ctx.font = `${el.bold ? '700' : '500'} ${el.fontSize}px ${el.fontFamily}, sans-serif`
      ctx.textAlign = el.align
      ctx.textBaseline = 'top'
      const tx =
        el.align === 'center' ? el.x + el.w / 2 : el.align === 'right' ? el.x + el.w : el.x
      wrapText(ctx, el.text, tx, el.y, el.w, el.fontSize * 1.25)
      break
    }
    case 'image': {
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, el.x, el.y, el.w, el.h)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = el.src
      })
      break
    }
    case 'path': {
      if (el.points.length < 2) break
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(el.points[0].x, el.points[0].y)
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y)
      }
      ctx.stroke()
      break
    }
    default: {
      const _exhaustive: never = el
      void _exhaustive
      break
    }
  }
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/)
  let line = ''
  let yy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy)
      line = word
      yy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

export function hitTest(doc: DesignDocument, x: number, y: number): DesignElement | null {
  for (let i = doc.elements.length - 1; i >= 0; i--) {
    const el = doc.elements[i]
    if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) return el
  }
  return null
}
