import { useEffect, useRef, useState } from 'react'
import type { PixelBlock, Selection } from '../types'
import { GRID_SIZE, MIN_BLOCK } from '../types'

type Props = {
  blocks: PixelBlock[]
  selection: Selection | null
  onSelect: (selection: Selection) => void
  onOpenBlock: (block: PixelBlock) => void
  selecting: boolean
}

type Point = { x: number; y: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function FresqueCanvas({
  blocks,
  selection,
  onSelect,
  onOpenBlock,
  selecting,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(0.7)
  const [offset, setOffset] = useState({ x: 40, y: 40 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const selectStart = useRef<Point | null>(null)
  const [hoverHint, setHoverHint] = useState('')
  const imageCache = useRef(new Map<string, HTMLImageElement>())

  useEffect(() => {
    for (const block of blocks) {
      if (!block.imageData || imageCache.current.has(block.id)) continue
      const img = new Image()
      img.onload = () => {
        imageCache.current.set(block.id, img)
        draw()
      }
      img.src = block.imageData
    }
    draw()
  }, [blocks, selection, scale, offset])

  function worldFromEvent(e: React.PointerEvent | PointerEvent): Point {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    return {
      x: Math.floor((px - offset.x) / scale),
      y: Math.floor((py - offset.y) / scale),
    }
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#12160f'
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    // Fresque base with subtle noise pattern via grid
    const grad = ctx.createLinearGradient(0, 0, GRID_SIZE, GRID_SIZE)
    grad.addColorStop(0, '#1a2114')
    grad.addColorStop(0.5, '#151a11')
    grad.addColorStop(1, '#1e2618')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)

    // Grid lines (adaptive density)
    const step = scale < 0.4 ? 50 : scale < 0.8 ? 25 : 10
    ctx.strokeStyle = 'rgba(200, 245, 66, 0.06)'
    ctx.lineWidth = 1 / scale
    ctx.beginPath()
    for (let i = 0; i <= GRID_SIZE; i += step) {
      ctx.moveTo(i, 0)
      ctx.lineTo(i, GRID_SIZE)
      ctx.moveTo(0, i)
      ctx.lineTo(GRID_SIZE, i)
    }
    ctx.stroke()

    // Border
    ctx.strokeStyle = 'rgba(244, 241, 222, 0.25)'
    ctx.lineWidth = 2 / scale
    ctx.strokeRect(0, 0, GRID_SIZE, GRID_SIZE)

    for (const block of blocks) {
      const img = imageCache.current.get(block.id)
      if (img) {
        ctx.drawImage(img, block.x, block.y, block.width, block.height)
      } else {
        ctx.fillStyle = block.color
        ctx.fillRect(block.x, block.y, block.width, block.height)
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1 / scale
      ctx.strokeRect(block.x, block.y, block.width, block.height)
    }

    if (selection) {
      ctx.fillStyle = 'rgba(200, 245, 66, 0.22)'
      ctx.fillRect(selection.x, selection.y, selection.width, selection.height)
      ctx.strokeStyle = '#c8f542'
      ctx.lineWidth = 2 / scale
      ctx.setLineDash([6 / scale, 4 / scale])
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      ctx.setLineDash([])
    }

    ctx.restore()
  }

  function onPointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    const world = worldFromEvent(e)

    if (selecting && e.button === 0) {
      const x = clamp(world.x, 0, GRID_SIZE - 1)
      const y = clamp(world.y, 0, GRID_SIZE - 1)
      selectStart.current = { x, y }
      // Clic = 1 pixel tout de suite (agrandi dans le studio)
      onSelect({ x, y, width: 1, height: 1 })
      return
    }

    if (!selecting) {
      const hit = [...blocks]
        .reverse()
        .find(
          (b) =>
            world.x >= b.x &&
            world.x < b.x + b.width &&
            world.y >= b.y &&
            world.y < b.y + b.height,
        )
      if (hit) {
        onOpenBlock(hit)
        return
      }
    }

    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(e: React.PointerEvent) {
    const world = worldFromEvent(e)
    setHoverHint(`${clamp(world.x, 0, GRID_SIZE - 1)}, ${clamp(world.y, 0, GRID_SIZE - 1)}`)

    if (selectStart.current) {
      const x0 = selectStart.current.x
      const y0 = selectStart.current.y
      const x1 = clamp(world.x, 0, GRID_SIZE)
      const y1 = clamp(world.y, 0, GRID_SIZE)
      let x = Math.min(x0, x1)
      let y = Math.min(y0, y1)
      let width = Math.max(MIN_BLOCK, Math.abs(x1 - x0) || 1)
      let height = Math.max(MIN_BLOCK, Math.abs(y1 - y0) || 1)
      if (x + width > GRID_SIZE) width = GRID_SIZE - x
      if (y + height > GRID_SIZE) height = GRID_SIZE - y
      onSelect({ x, y, width, height })
      return
    }

    if (dragging && dragStart.current) {
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
        y: dragStart.current.oy + (e.clientY - dragStart.current.my),
      })
    }
  }

  function onPointerUp() {
    selectStart.current = null
    setDragging(false)
    dragStart.current = null
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const next = clamp(scale * (e.deltaY > 0 ? 0.9 : 1.1), 0.15, 4)
    setScale(next)
  }

  return (
    <div className="canvas-shell" ref={wrapRef}>
      <div className="canvas-toolbar">
        <button type="button" onClick={() => setScale((s) => clamp(s * 1.2, 0.15, 4))} aria-label="Zoom +">
          +
        </button>
        <button type="button" onClick={() => setScale((s) => clamp(s / 1.2, 0.15, 4))} aria-label="Zoom -">
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(0.7)
            setOffset({ x: 40, y: 40 })
          }}
        >
          Recadrer
        </button>
        <span className="canvas-meta">
          {Math.round(scale * 100)}% · {hoverHint || '—'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className={`fresque-canvas ${selecting ? 'selecting' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />
      <p className="canvas-hint">
        {selecting
          ? 'Clic = 1 pixel · glisse = zone · puis « Personnaliser dans le studio ».'
          : 'Clique un bloc · glisse pour naviguer · molette pour zoomer.'}
      </p>
    </div>
  )
}
