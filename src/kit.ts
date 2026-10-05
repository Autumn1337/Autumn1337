import { readFileSync } from 'node:fs'

/** The paper, the inks and the hues of one theme: Rosé Pine Moon and Dawn, as better-statusline is drawn. */
export type Theme = {
  name: 'dark' | 'light'
  paper: string
  edge: string
  line: string
  lattice: string
  well: string
  track: string
  ink: string
  soft: string
  faint: string
  ember: string
  gold: string
  iris: string
  moss: string
  warn: string
}

export const THEMES: Theme[] = [
  {
    name: 'dark',
    paper: '#242137',
    edge: '#1b1929',
    line: '#39355a',
    lattice: '#353150',
    well: '#1f1d30',
    track: '#505370',
    ink: '#e0def4',
    soft: '#a09cbc',
    faint: '#6e6a86',
    ember: '#e58a68',
    gold: '#f6c177',
    iris: '#b1b9f9',
    moss: '#91c882',
    warn: '#ffc107',
  },
  {
    name: 'light',
    paper: '#faf4ed',
    edge: '#f1e7dc',
    line: '#e6dbd0',
    lattice: '#e9dfd5',
    well: '#f4ebe1',
    track: '#cdc3c4',
    ink: '#474266',
    soft: '#797593',
    faint: '#a8a2b3',
    ember: '#d0633f',
    gold: '#dd8a1c',
    iris: '#5769f7',
    moss: '#2f9d44',
    warn: '#b57f14',
  },
]

export type Face = 'mono' | 'bold' | 'sign'
type Glyph = { w: number; d: string }
const GLYPHS: Record<Face, Record<string, Glyph>> = JSON.parse(readFileSync(new URL('./glyphs.json', import.meta.url), 'utf8'))

/** A number as short as an SVG can carry it. */
export const n = (value: number) => String(+value.toFixed(2))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))

/** How far apart a braille cell's four rows of dots stand, as a fraction of its height, and a cell's height over its
 * width: the terminal's uneven grid, as better-statusline measures it. */
export const PITCH = 0.218
export const ASPECT = 2.5

/** The terminal's grid of dots, `u` apart across: where dot (`i`, `j`) stands, and the dot nearest a point. */
export function lattice(u: number, x0: number, y0: number) {
  const cell = 2 * u * ASPECT
  const x = (i: number) => x0 + u * (i + 0.5)
  const y = (j: number) => y0 + cell * (Math.floor(j / 4) + PITCH * (((j % 4) + 4) % 4))
  const nearest = (px: number, py: number): [number, number] => {
    const base = 4 * Math.floor((py - y0) / cell)
    let j = base
    for (let k = base - 1; k <= base + 4; k++) if (Math.abs(y(k) - py) < Math.abs(y(j) - py)) j = k
    return [Math.round((px - x0) / u - 0.5), j]
  }
  return { u, cell, size: 0.4 * u, x, y, nearest }
}
export type Lattice = ReturnType<typeof lattice>

/** A ginkgo leaf about its own centre: the fan with its notch, the veins, the stem. */
export const leaf = (theme: Theme) =>
  `<path d="M0 8Q-3 21 1 33" fill="none" stroke="${theme.gold}" stroke-width="2.8" stroke-linecap="round"/>` +
  `<path d="M0 9C-11 4-26-1-32-10C-35-22-21-32-5-32L0-16L5-32C21-32 35-22 32-10C26-1 11 4 0 9Z" fill="${theme.gold}"/>` +
  `<path d="M0 6L-21-21M0 6L-10-26M0 6L10-26M0 6L21-21" fill="none" stroke="${theme.paper}" stroke-opacity="0.35" stroke-width="1.2"/>`

/** Numbers between 0 and 1 that come out the same on every build. */
export function random(seed: number) {
  let state = seed
  return () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296
}

/** Square dots of side `size` about their centres, as one path. */
export const squares = (centres: (readonly [number, number])[], size: number) =>
  centres.map(([x, y]) => `M${n(x - size / 2)} ${n(y - size / 2)}h${n(size)}v${n(size)}h${n(-size)}z`).join('')

/** Keyframes named `name` over a loop of `span` seconds, from stops given in seconds. */
export const keyframes = (name: string, span: number, stops: [number, string][]) =>
  `@keyframes ${name}{${stops.map(([at, rule]) => `${n((100 * at) / span)}%{${rule}}`).join('')}}`

/** A value that changes at moments of a loop `span` seconds long: where a test of it holds, as spans of seconds. */
export function spans<T>(span: number, events: [number, T][], holds: (value: T) => boolean) {
  const sorted = [...events].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  sorted.forEach(([at, value], k) => {
    if (!holds(value)) return
    const until = sorted[k + 1]?.[0] ?? span
    if (out.length > 0 && out.at(-1)![1] === at) out.at(-1)![1] = until
    else out.push([at, until])
  })
  if (sorted[0]![0] > 0 && holds(sorted.at(-1)![1])) out.unshift([0, sorted[0]![0]])
  return out
}

/** Stops that hold `on` through each of `spans` and `off` between them, for an animation that steps at its stops. */
export function gate(span: number, spans: [number, number][], on: string, off: string): [number, string][] {
  const starts = spans.some(([from]) => from === 0)
  const stops: [number, string][] = [[0, starts ? on : off]]
  for (const [from, to] of spans) {
    if (from > 0) stops.push([from, on])
    if (to < span) stops.push([to, off])
  }
  return [...stops, [span, starts ? on : off]]
}

/** Points taken round a ring, as better-statusline takes them. */
const STEPS = 40

/**
 * The dots of a ring three rows of cells tall on the terminal's grid, as better-statusline finds them: `STEPS` points
 * of a true circle, each snapped to the nearest dot, the right half's and their mirror. Places are in cell widths;
 * `at` is how far round the ring a dot lies, clockwise from the top, and `cell` names the cell that holds it, since a
 * terminal cell has one colour for all its dots.
 */
export function ring() {
  const rows = 3
  const centre = (x: number, y: number) => [(x >> 1) + 0.25 + 0.5 * (x & 1), ASPECT * ((y >> 2) + PITCH * (y & 3))] as const
  const h = rows * 4
  const [top, bottom] = [centre(0, 0)[1], centre(0, h - 1)[1]]
  const r = (bottom - top) / 2
  const cols = Math.ceil(2 * r)
  const [cx, cy] = [cols / 2, (top + bottom) / 2]
  const grid = Array.from({ length: cols * 2 * h }, (_, k) => {
    const [x, y] = [k % (cols * 2), Math.floor(k / (cols * 2))]
    const [px, py] = centre(x, y)
    return { x, y, px, py, at: (1.25 - Math.atan2(cy - py, px - cx) / (2 * Math.PI)) % 1, cell: `${x >> 1},${y >> 2}` }
  })
  const nearest = (px: number, py: number) => grid.reduce((best, dot) => ((dot.px - px) ** 2 + (dot.py - py) ** 2 < (best.px - px) ** 2 + (best.py - py) ** 2 ? dot : best))
  const right = Array.from({ length: STEPS / 2 + 1 }, (_, k) => nearest(cx + r * Math.sin((2 * Math.PI * k) / STEPS), cy - r * Math.cos((2 * Math.PI * k) / STEPS)))
  const dots = [...new Set(right.flatMap(dot => [dot, grid[dot.y * cols * 2 + cols * 2 - 1 - dot.x]!]))]
  return { cols, cx, cy, dots, first: Math.min(...dots.map(dot => dot.at)) }
}

type Type = { fill?: string; anchor?: 'start' | 'middle' | 'end'; tracking?: number; cls?: string }

/** One frame of the reel: a rounded sheet of paper with its lattice, its name at the left and the signature at the right. */
export class Sheet {
  w: number
  h: number
  theme: Theme
  private glyphs = new Map<string, string>()
  private rules: string[] = []
  private defs: string[] = []
  private parts: string[] = []
  private gates = new Map<string, string>()

  constructor(w: number, h: number, theme: Theme) {
    this.w = w
    this.h = h
    this.theme = theme
  }

  css(...rules: string[]) {
    this.rules.push(...rules)
  }

  def(...markup: string[]) {
    this.defs.push(...markup)
  }

  add(...markup: string[]) {
    this.parts.push(...markup)
  }

  /** The attributes that show an element through `spans` of a loop `span` seconds long and hide it between them;
   * a page that may not move holds what shows at `still`. */
  gated(span: number, spans: [number, number][], still: number) {
    const key = `${span}:${spans.join(';')}`
    if (!this.gates.has(key)) {
      const name = `gate${this.gates.size}`
      this.gates.set(key, name)
      this.css(keyframes(name, span, gate(span, spans, 'opacity:1', 'opacity:0')), `.${name}{animation:${name} ${span}s step-end infinite}`)
    }
    return ` class="${this.gates.get(key)}"${spans.some(([from, to]) => from <= still && still < to) ? '' : ' opacity="0"'}`
  }

  /** The attributes that bring an element in at `from`, rising `rise` px into place, and take it out at `to`. */
  appear(span: number, from: number, to: number, still: number, rise = 0) {
    const key = `${span}:${from}-${to}^${rise}`
    if (!this.gates.has(key)) {
      const name = `gate${this.gates.size}`
      this.gates.set(key, name)
      const [out, there] = [`opacity:0;transform:translateY(${rise}px)`, 'opacity:1;transform:translateY(0px)']
      this.css(keyframes(name, span, [[0, out], [from, `${out};animation-timing-function:cubic-bezier(.2,.7,.2,1)`], [from + 0.4, there], [to, there], [to + 0.4, out], [span, out]]), `.${name}{animation:${name} ${span}s linear infinite}`)
    }
    return ` class="${this.gates.get(key)}"${from <= still && still < to ? '' : ' opacity="0"'}`
  }

  width(face: Face, text: string, size: number, tracking = 0) {
    return ([...text].reduce((sum, char) => sum + GLYPHS[face][char]!.w + tracking, 0) * size) / 1000
  }

  /** A line of type set as outlines, its baseline at `y`. */
  type(face: Face, text: string, x: number, y: number, size: number, { fill = this.theme.ink, anchor = 'start', tracking = 0, cls }: Type = {}) {
    const left = x - this.width(face, text, size, tracking) * { start: 0, middle: 0.5, end: 1 }[anchor]
    let pen = 0
    const uses = [...text].map(char => {
      const id = `${face[0]}${char.codePointAt(0)!.toString(36)}`
      const glyph = GLYPHS[face][char]!
      const use = glyph.d === '' ? '' : `<use href="#${id}"${pen === 0 ? '' : ` x="${pen}"`}/>`
      if (glyph.d !== '') this.glyphs.set(id, glyph.d)
      pen += glyph.w + tracking
      return use
    })
    const scale = +(size / 1000).toFixed(4)
    return `<g${cls === undefined ? '' : ` class="${cls}"`} fill="${fill}" transform="translate(${n(left)} ${n(y)}) scale(${scale} -${scale})">${uses.join('')}</g>`
  }

  /** The braille mark, two dots across and four down, its top left at (`x`, `y`). */
  mark(x: number, y: number, u: number, fill = this.theme.ink) {
    const grid = lattice(u, x, y + 0.2 * u)
    const centres = Array.from({ length: 8 }, (_, k) => [grid.x(k % 2), grid.y(k >> 1)] as const)
    return `<path fill="${fill}" d="${squares(centres, grid.size)}"/>`
  }

  /** The frame's head, as the film's stills carry it: the mark, a name and a word about it at the left, the
   * signature at the right. */
  head(name: string, note: string, signed = true) {
    this.add(this.mark(64, 46, 9), this.type('bold', name, 94, 73, 28), this.type('mono', note, 116 + this.width('bold', name, 28), 72, 20, { fill: this.theme.soft }))
    if (signed) this.add(this.type('sign', 'Ewen Gao', this.w - 64, 73, 29, { fill: this.theme.soft, anchor: 'end' }))
  }

  /** The lattice as a pattern to fill with: `id` names it. */
  pattern(id: string, grid: Lattice, fill = this.theme.lattice) {
    const { u, cell, size } = grid
    const dots = Array.from({ length: 8 }, (_, k) => `<rect x="${n(u * ((k % 2) + 0.5) - size / 2)}" y="${n(cell * PITCH * (k >> 1))}" width="${n(size)}" height="${n(size)}"/>`)
    this.def(`<pattern id="${id}" x="${n(grid.x(0) - u / 2)}" y="${n(grid.y(0) - size / 2)}" width="${n(2 * u)}" height="${n(cell)}" patternUnits="userSpaceOnUse" fill="${fill}">${dots.join('')}</pattern>`)
  }

  /** The lattice as the ground of a scene, a slow band of light crossing its dots; `mask` names a mask to lay it
   * through. The dots are drawn bright and a veil of paper dims them, thinner where the band passes. */
  field(grid: Lattice, mask?: string) {
    const { w, h, theme } = this
    const [turn, period] = [900, 16]
    const veil = [[0, 0.62], [0.3, 0.62], [0.5, 0.1], [0.7, 0.62], [1, 0.62]].map(([at, alpha]) => `<stop offset="${at}" stop-color="${theme.paper}" stop-opacity="${alpha}"/>`)
    this.pattern('lattice', grid, theme.track)
    this.def(`<linearGradient id="veil" gradientUnits="userSpaceOnUse" x1="0" x2="${turn}" spreadMethod="repeat" gradientTransform="skewX(-24)">${veil.join('')}</linearGradient>`)
    this.css(keyframes('drift', period, [[0, 'transform:translateX(0px)'], [period, `transform:translateX(${turn}px)`]]), `.drift{animation:drift ${period}s linear infinite}`)
    this.add(
      `<g${mask === undefined ? '' : ` mask="url(#${mask})"`}><rect width="${w}" height="${h}" fill="url(#lattice)"/>`,
      `<rect class="drift" x="${-turn}" width="${w + turn}" height="${h}" fill="url(#veil)"/></g>`,
    )
  }

  toString() {
    const { w, h, theme } = this
    const glyphs = [...this.glyphs].map(([id, d]) => `<path id="${id}" d="${d}"/>`)
    const vignette = `<radialGradient id="vignette" cx="50%" cy="42%" r="75%"><stop offset="0.45" stop-color="${theme.edge}" stop-opacity="0"/><stop offset="1" stop-color="${theme.edge}"/></radialGradient>`
    const frame = `<clipPath id="frame"><rect width="${w}" height="${h}" rx="22"/></clipPath>`
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
      `<style>${this.rules.join('')}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`,
      `<defs>${vignette}${frame}${this.defs.join('')}${glyphs.join('')}</defs>`,
      `<g clip-path="url(#frame)"><rect width="${w}" height="${h}" fill="${theme.paper}"/><rect width="${w}" height="${h}" fill="url(#vignette)"/>${this.parts.join('')}</g>`,
      `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="21.25" fill="none" stroke="${theme.line}" stroke-width="1.5"/>`,
      `</svg>`,
    ].join('')
  }
}
