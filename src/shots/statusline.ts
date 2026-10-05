import { Sheet, keyframes, n, ring, spans, squares, type Theme } from '../kit.ts'

const [W, H] = [1280, 540]
const LOOP = 14
const STILL = 9

/** The session the loop plays: three prompts, each typed, sent and answered, then the conversation cleared. */
const TURNS = [
  { prompt: 'draw a ring in braille dots', at: 0.6, context: 0.09, tokens: '90k' },
  { prompt: 'snap each point to the grid', at: 4.8, context: 0.21, tokens: '210k' },
  { prompt: 'light it clockwise from the top', at: 9, context: 0.34, tokens: '340k' },
]
const [TYPED, SENT, ANSWERED] = [1.1, 1.4, 2.9]
const CLEAR = { prompt: '/clear', at: 12.5, typed: 0.4, sent: 0.8, context: 0.03, tokens: '30k' }

/** How full the context is, and when it changes. */
const CONTEXT: [number, { used: number; tokens: string }][] = [
  ...TURNS.map(turn => [turn.at + ANSWERED, { used: turn.context, tokens: turn.tokens }] as [number, { used: number; tokens: string }]),
  [CLEAR.at + CLEAR.sent, { used: CLEAR.context, tokens: CLEAR.tokens }],
]

/** The minutes the prompt cache has left: an hour at each answer, then four fewer with each second of the loop. */
const CACHE: [number, number][] = TURNS.flatMap((turn, k) => {
  const answered = turn.at + ANSWERED
  const next = (TURNS[k + 1]?.at ?? TURNS[0]!.at + LOOP) + ANSWERED
  return Array.from({ length: Math.ceil(next - answered) }, (_, second) => [(answered + second) % LOOP, 60 - 4 * second] as [number, number])
})

const RING = ring()
const CELL = 22
const DOT = 0.42 * (CELL / 2)
const CELLS = [...new Set(RING.dots.map(dot => dot.cell))].map(cell => {
  const dots = RING.dots.filter(dot => dot.cell === cell)
  return { dots, from: Math.min(...dots.map(dot => dot.at)), path: squares(dots.map(dot => [dot.px * CELL, dot.py * CELL] as const), DOT) }
})

/** Whether a cell is lit on a ring `used` full: lit clockwise from the top, any use at all lighting the first dot. */
const lit = (from: number, used: number) => used > 0 && from <= Math.max(used, RING.first) + 1e-9

export function statusline(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  sheet.head('better-statusline', 'a status line for Claude Code, drawn in braille dots')
  sheet.def(`<radialGradient id="glow" cx="640" cy="230" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${theme.iris}" stop-opacity="0.07"/><stop offset="1" stop-color="${theme.iris}" stop-opacity="0"/></radialGradient>`)
  sheet.add(`<rect width="${W}" height="${H}" fill="url(#glow)"/>`)

  // The rings: context, cache, 5-hour and weekly, each with its figure at its heart, its name beside it.
  const top = 142
  const heart = top + RING.cy * CELL
  const unit = (k: number) => 64 + 288 * k
  const figure = (k: number, value: string, mark: string, fill: string, gate = '') => {
    const size = 30
    const wide = sheet.width('bold', value, size) + sheet.width('mono', mark, size)
    const left = unit(k) + RING.cx * CELL - wide / 2
    return `<g${gate}>${sheet.type('bold', value, left, heart + 10.5, size, { fill })}${sheet.type('mono', mark, left + sheet.width('bold', value, size), heart + 10.5, size, { fill: theme.soft })}</g>`
  }
  const beside = (k: number, name: string) => sheet.type('mono', name, unit(k) + RING.cols * CELL + 20, heart + 9, 21)
  const beneath = (k: number, detail: string, gate = '') => `<g${gate}>${sheet.type('mono', detail, unit(k) + RING.cols * CELL + 20, heart + 41, 20, { fill: theme.faint })}</g>`
  const drawn = (k: number, cells: string[]) => `<g transform="translate(${unit(k)} ${top})">${cells.join('')}</g>`
  const track = `<path fill="${theme.track}" d="${CELLS.map(cell => cell.path).join('')}"/>`

  const context = CELLS.map(cell => `<path fill="${theme.iris}"${sheet.gated(LOOP, spans(LOOP, CONTEXT, ({ used }) => lit(cell.from, used)), STILL)} d="${cell.path}"/>`)
  sheet.add(drawn(0, [track, ...context]), beside(0, 'context'))
  for (const state of CONTEXT.map(([, state]) => state)) {
    const gate = sheet.gated(LOOP, spans(LOOP, CONTEXT, now => now === state), STILL)
    sheet.add(figure(0, String(Math.round(state.used * 100)), '%', theme.ink, gate), beneath(0, `${state.tokens}/1M`, gate))
  }

  const cache = CELLS.map(cell => `<path fill="${theme.ember}"${sheet.gated(LOOP, spans(LOOP, CACHE, minutes => lit(cell.from, minutes / 60)), STILL)} d="${cell.path}"/>`)
  sheet.add(drawn(1, [track, ...cache]), beside(1, 'cache'), beneath(1, 'of 1h'))
  for (const minutes of new Set(CACHE.map(([, minutes]) => minutes))) sheet.add(figure(1, String(minutes), 'm', theme.ink, sheet.gated(LOOP, spans(LOOP, CACHE, now => now === minutes), STILL)))

  const [hourly, weekly, pace] = [0.23, 0.63, 0.46]
  sheet.add(
    drawn(2, CELLS.map(cell => `<path fill="${lit(cell.from, hourly) ? theme.moss : theme.track}" d="${cell.path}"/>`)),
    figure(2, '23', '%', theme.ink),
    beside(2, '5-hour'),
    beneath(2, '2h 35m'),
    drawn(3, CELLS.map(cell => `<path fill="${!lit(cell.from, weekly) ? theme.track : cell.dots.some(dot => dot.at > pace && dot.at <= weekly) ? theme.warn : theme.iris}" d="${cell.path}"/>`)),
    figure(3, '63', '%', theme.warn),
    beside(3, 'weekly'),
    beneath(3, '2d 1h'),
  )

  // The music beside them: the cover in its glow, the title with its meter, the line of the track.
  const [cx, cy, side] = [64, 352, 120]
  const cover = { base: '#24161c', warm: '#f08a4b', deep: '#c2326f', dots: '#f6e7cf' }
  sheet.css(keyframes('halo', 3.2, [[0, 'opacity:.45'], [1.6, 'opacity:.8'], [3.2, 'opacity:.45']]), `.halo{animation:halo 3.2s ease-in-out infinite}`)
  sheet.def(
    `<filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="20"/></filter>`,
    `<radialGradient id="warm" cx="0.3" cy="0.28" r="0.6"><stop offset="0" stop-color="${cover.warm}"/><stop offset="1" stop-color="${cover.warm}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="deep" cx="0.82" cy="0.86" r="0.55"><stop offset="0" stop-color="${cover.deep}"/><stop offset="1" stop-color="${cover.deep}" stop-opacity="0"/></radialGradient>`,
    `<clipPath id="cover"><rect x="${cx}" y="${cy}" width="${side}" height="${side}" rx="9"/></clipPath>`,
  )
  const art = (attrs: string) => `<g ${attrs}><rect x="${cx}" y="${cy}" width="${side}" height="${side}" fill="${cover.base}"/><rect x="${cx}" y="${cy}" width="${side}" height="${side}" fill="url(#warm)"/><rect x="${cx}" y="${cy}" width="${side}" height="${side}" fill="url(#deep)"/></g>`
  sheet.add(art(`class="halo" filter="url(#soft)" opacity="${theme.name === 'dark' ? 0.6 : 0.5}"`), art('clip-path="url(#cover)"'), sheet.mark(cx + side / 2 - 12, cy + 26, 12, cover.dots))

  const tx = cx + side + 30
  const title = 'Eight Dots'
  sheet.add(
    sheet.type('bold', title, tx, cy + 26, 22),
    sheet.type('mono', 'Ewen Gao', tx, cy + 57, 20, { fill: theme.soft }),
    sheet.type('mono', 'better-statusline', tx, cy + 86, 20, { fill: theme.faint }),
    sheet.type('mono', '0:23', tx, cy + 117, 18, { fill: theme.soft }),
    `<path d="M${tx + 60} ${cy + 111}H${tx + 250}" stroke="${theme.track}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M${tx + 60} ${cy + 111}H${tx + 144}" stroke="${theme.ember}" stroke-width="3.5" stroke-linecap="round"/>`,
    sheet.type('mono', '0:52', tx + 264, cy + 117, 18, { fill: theme.soft }),
  )

  // The meter: four columns of dots that sway, a step each fifth of a second.
  const SWAY = [
    [2, 4, 3, 1],
    [3, 3, 4, 2],
    [1, 4, 2, 3],
    [2, 2, 3, 4],
    [4, 3, 1, 2],
    [3, 4, 2, 2],
    [2, 3, 4, 3],
    [1, 2, 3, 4],
  ]
  const beat = 0.2
  const sway = SWAY.length * beat
  const mx = tx + sheet.width('bold', title, 22) + 16
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++) {
      const on = spans(sway, SWAY.map((heights, k) => [k * beat, heights[col]!] as [number, number]), height => height > row)
      sheet.add(`<rect x="${n(mx + 6.5 * col)}" y="${n(cy + 21 - 6.5 * row)}" width="3.9" height="3.9" fill="${theme.ember}"${sheet.gated(sway, on, 0)}/>`)
    }

  // The prompt the band stands above: what is typed there is why the rings move.
  const [px, py, pw, ph] = [640, 392, 576, 60]
  const [startX, baseline] = [px + 54, py + 38]
  const step = sheet.width('mono', 'm', 22)
  sheet.add(
    `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="${theme.well}" stroke="${theme.line}" stroke-width="1.5"/>`,
    `<path d="M${px + 24} ${py + 21}l9 9l-9 9" fill="none" stroke="${theme.ember}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  )
  sheet.def(`<clipPath id="prompt"><rect x="${px + 2}" y="${py + 2}" width="${pw - 4}" height="${ph - 4}" rx="10"/></clipPath>`)
  const lines = [...TURNS.map(turn => ({ ...turn, typed: TYPED, sent: SENT })), CLEAR]
  lines.forEach(({ prompt, at, typed, sent }, k) => {
    const wide = prompt.length * step
    sheet.css(
      keyframes(`typing${k}`, LOOP, [[0, 'transform:translateX(0px)'], [at, `transform:translateX(0px);animation-timing-function:steps(${prompt.length})`], [at + typed, `transform:translateX(${n(wide)}px)`], [LOOP, `transform:translateX(${n(wide)}px)`]]),
      `.typing${k}{animation:typing${k} ${LOOP}s linear infinite}`,
    )
    sheet.add(
      `<g clip-path="url(#prompt)"><g${sheet.gated(LOOP, [[at, at + sent]], STILL)}>${sheet.type('mono', prompt, startX, baseline, 22)}`,
      `<g class="typing${k}" transform="translate(${n(wide)} 0)"><rect x="${startX}" y="${py + 8}" width="${n(wide + 4)}" height="${ph - 16}" fill="${theme.well}"/>`,
      `<rect x="${startX + 2}" y="${py + 16}" width="12" height="28" fill="${theme.ink}" fill-opacity="0.8"/></g></g></g>`,
    )
  })
  const idle = spans(LOOP, lines.flatMap(({ at, sent }) => [[at, false], [at + sent, true]] as [number, boolean][]), free => free)
  sheet.add(`<rect x="${startX + 2}" y="${py + 16}" width="12" height="28" fill="${theme.ink}" fill-opacity="0.8"${sheet.gated(LOOP, idle, STILL)}/>`)

  // Between a prompt sent and its answer, the engine is at work.
  const working = TURNS.map(turn => [turn.at + SENT, turn.at + ANSWERED] as [number, number])
  sheet.css(keyframes('spin', 2.4, [[0, 'transform:rotate(0deg)'], [2.4, 'transform:rotate(360deg)']]), `.spin{animation:spin 2.4s linear infinite}`)
  sheet.add(
    `<g${sheet.gated(LOOP, working, -1)}><g transform="translate(${px + 12} ${py - 22})"><path class="spin" d="M0-8V8M-6.9-4L6.9 4M-6.9 4L6.9-4" stroke="${theme.ember}" stroke-width="2.4" stroke-linecap="round"/></g>`,
    `${sheet.type('mono', 'working…', px + 32, py - 15, 19, { fill: theme.soft })}</g>`,
  )

  return sheet.toString()
}
