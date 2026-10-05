import { Sheet, keyframes, lattice, leaf, lerp, n, squares, type Theme } from '../kit.ts'

const [W, H] = [1280, 580]
const LOOP = 10

/** The loop's beats, in seconds: the leaf, falling since the loop began, is seen, its path decided, the hand sets off, the leaf is caught, carried
 * home and let go. */
const [SEEN, DECIDED, ACTS, CAUGHT, CARRIED, HOME, GONE] = [0.8, 2.4, 3.6, 6, 6.8, 8.6, 9.4]

/** The frame the page holds when it may not move. */
const STILL = 3.3

const GRID = lattice(20, 0, 30)
const [LAND, REST] = [45, 56].map(GRID.x) as [number, number]
const HAND = 16
const [TOP, PALM] = [-44, GRID.y(HAND + 1) - 2]

/** The leaf's flight at `s` of its fall: swings that die away as it comes down, so it settles over the hand. */
function flight(s: number) {
  const swing = 5 * Math.PI * s
  const calm = (1 - s) ** 0.8
  return {
    x: lerp(1040, LAND, s) + 160 * calm * Math.sin(swing),
    y: lerp(TOP, PALM, s) + 18 * calm * Math.cos(2 * swing) - 18 * (1 - s),
    turn: 42 * calm * Math.sin(swing),
  }
}

const fall = (t: number) => flight(t / CAUGHT)
const STEP = 0.05
const TIMES = Array.from({ length: Math.round(CAUGHT / STEP) + 1 }, (_, k) => k * STEP)

export function hero(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  const { u, size } = GRID
  const ease = 'animation-timing-function:cubic-bezier(.6,0,.2,1)'
  const loop = (name: string) => `animation:${name} ${LOOP}s linear infinite`

  sheet.def(
    `<linearGradient id="reveal" x1="0.36" x2="0.6" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`,
    `<mask id="right"><rect width="${W}" height="${H}" fill="url(#reveal)"/></mask>`,
    `<radialGradient id="warmth" cx="${REST - 160}" cy="270" r="460" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${theme.gold}" stop-opacity="${theme.name === 'dark' ? 0.1 : 0.16}"/><stop offset="1" stop-color="${theme.gold}" stop-opacity="0"/></radialGradient>`,
  )
  sheet.field(GRID, 'right')
  sheet.add(`<rect width="${W}" height="${H}" fill="url(#warmth)"/>`)

  sheet.head('Ewen Gao', 'embodied intelligence · Peking University', false)

  // The sentence: each verb lights as the scene reaches it.
  const verbs: [string, number, number][] = [
    ['perceive,', SEEN, DECIDED],
    ['decide,', DECIDED, ACTS],
    ['act.', ACTS, CAUGHT + 0.6],
  ]
  sheet.add(sheet.type('mono', 'I get machines to', 66, 196, 22, { fill: theme.soft }))
  verbs.forEach(([verb, from, to], k) => {
    const [idle, lit, done] = [`fill:${theme.track}`, `fill:${theme.gold}`, `fill:${theme.ink}`]
    sheet.css(
      keyframes(`verb${k}`, LOOP, [[0, idle], [from - 0.1, idle], [from + 0.2, lit], [to, lit], [to + 0.5, done], [9.3, done], [9.8, idle], [LOOP, idle]]),
      `.verb${k}{${loop(`verb${k}`)}}`,
    )
    sheet.add(sheet.type('bold', verb, 62, 286 + 92 * k, 84, { cls: `verb${k}`, tracking: -14 }))
  })
  sheet.add(sheet.type('mono', 'in the real world.', 66, 522, 22, { fill: theme.soft }))

  // What the machine senses: the dots the leaf passes light and fade behind it.
  const REACH = 30
  const wake = new Map<string, { i: number; j: number; at: number; gap: number }>()
  for (const t of TIMES) {
    const { x, y } = fall(t)
    const [ci, cj] = GRID.nearest(x, y)
    for (let i = ci - 3; i <= ci + 3; i++)
      for (let j = cj - 3; j <= cj + 3; j++) {
        const gap = Math.hypot(GRID.x(i) - x, GRID.y(j) - y)
        const kept = wake.get(`${i},${j}`)
        if (gap < REACH && j >= 0 && j < HAND && (kept === undefined || gap < kept.gap)) wake.set(`${i},${j}`, { i, j, at: t, gap })
      }
  }
  sheet.css(
    keyframes('wake', LOOP, [[0, 'opacity:0'], [0.08, 'opacity:1;animation-timing-function:cubic-bezier(.3,.5,.4,1)'], [2.8, 'opacity:0'], [LOOP, 'opacity:0']]),
    `.wake rect{opacity:0;${loop('wake')}}`,
  )
  const lit = [...wake.values()].map(
    ({ i, j, at, gap }) => `<rect x="${n(GRID.x(i) - size / 2)}" y="${n(GRID.y(j) - size / 2)}" width="${size}" height="${size}" fill-opacity="${n((1 - gap / REACH) ** 0.8)}" style="animation-delay:${n(at - LOOP)}s"/>`,
  )
  sheet.add(`<g class="wake" fill="${theme.gold}">${lit.join('')}</g>`)

  // What it decides: the dots the leaf has yet to reach, hollow, each gone as the leaf arrives.
  const ahead: { i: number; j: number; at: number }[] = []
  for (const t of TIMES.filter(t => t >= DECIDED)) {
    const { x, y } = fall(t)
    const [i, j] = GRID.nearest(x, y)
    if (j < HAND && !ahead.some(dot => dot.i === i && dot.j === j)) ahead.push({ i, j, at: t })
  }
  const hollow = ahead.map(({ i, j, at }, k) => {
    const shown = DECIDED + (0.7 * k) / ahead.length
    if (at - shown < 0.5) return ''
    sheet.css(keyframes(`ahead${k}`, LOOP, [[0, 'opacity:0'], [shown, 'opacity:0'], [shown + 0.12, 'opacity:1'], [at - 0.1, 'opacity:1'], [at, 'opacity:0'], [LOOP, 'opacity:0']]), `.ahead${k}{${loop(`ahead${k}`)}}`)
    return `<rect class="ahead${k}" x="${n(GRID.x(i) - size / 2)}" y="${n(GRID.y(j) - size / 2)}" width="${n(size)}" height="${n(size)}"${at < STILL ? ' opacity="0"' : ''}/>`
  })
  sheet.add(`<g fill="${theme.iris}" fill-opacity="0.16" stroke="${theme.iris}" stroke-width="1.6">${hollow.join('')}</g>`)

  // When: how long the leaf still has to fall, told where it will land.
  sheet.css(keyframes('when', LOOP, [[0, 'opacity:0'], [DECIDED + 0.7, 'opacity:0'], [DECIDED + 1, 'opacity:1'], [CAUGHT - 0.3, 'opacity:1'], [CAUGHT, 'opacity:0'], [LOOP, 'opacity:0']]), `.when{${loop('when')}}`)
  sheet.add(sheet.type('mono', `t + ${(CAUGHT - DECIDED).toFixed(1)} s`, LAND - 4 * u - 8, PALM + 7, 20, { fill: theme.iris, anchor: 'end', cls: 'when' }))

  // How it acts: a hand one braille cell tall on its arm, which goes to meet the leaf and brings it home.
  const column = (i: number, from: number, to: number) => Array.from({ length: to - from }, (_, k) => [GRID.x(i), GRID.y(from + k)] as const)
  const away = REST - LAND
  const travel: [number, string][] = [
    [0, `transform:translateX(${away}px)`],
    [ACTS, `transform:translateX(${away}px);${ease}`],
    [5.3, 'transform:translateX(0px)'],
    [CARRIED, `transform:translateX(0px);${ease}`],
    [HOME, `transform:translateX(${away}px)`],
    [LOOP, `transform:translateX(${away}px)`],
  ]
  const grip = (by: number): [number, string][] => [
    [0, 'transform:translateX(0px)'],
    [CAUGHT - 0.14, 'transform:translateX(0px)'],
    [CAUGHT + 0.04, `transform:translateX(${by}px)`],
    [GONE, `transform:translateX(${by}px)`],
    [GONE + 0.3, 'transform:translateX(0px)'],
    [LOOP, 'transform:translateX(0px)'],
  ]
  const [calm, glad] = [`fill:${theme.ink}`, `fill:${theme.gold}`]
  sheet.css(
    keyframes('travel', LOOP, travel),
    keyframes('gripL', LOOP, grip(u)),
    keyframes('gripR', LOOP, grip(-u)),
    keyframes('glad', LOOP, [[0, calm], [CAUGHT - 0.05, calm], [CAUGHT + 0.1, glad], [CAUGHT + 0.5, glad], [CAUGHT + 1.1, calm], [LOOP, calm]]),
    `.travel{${loop('travel')}}.gripL{${loop('gripL')}}.gripR{${loop('gripR')}}.glad{${loop('glad')}}`,
  )
  const [left, right, centre] = [GRID.nearest(LAND, 0)[0] - 3, GRID.nearest(LAND, 0)[0] + 3, GRID.nearest(LAND, 0)[0]]
  const palm = Array.from({ length: 7 }, (_, k) => [GRID.x(left + k), GRID.y(HAND + 3)] as const)
  sheet.add(
    `<g class="travel"><g class="glad" fill="${theme.ink}">`,
    `<path class="gripL" d="${squares(column(left, HAND, HAND + 3), size)}"/><path class="gripR" d="${squares(column(right, HAND, HAND + 3), size)}"/>`,
    `<path d="${squares(palm, size)}"/></g>`,
    `<path fill="${theme.track}" d="${squares(column(centre, HAND + 4, HAND + 8), size)}"/></g>`,
  )

  // The leaf itself, the one thing here that is not made of dots, and the box the machine keeps on it.
  const still = fall(STILL)
  const place = ({ x, y }: { x: number; y: number }) => `transform:translate(${n(x)}px,${n(y)}px)`
  const landed = { x: LAND, y: PALM }
  sheet.css(
    keyframes('fall', LOOP, [
      ...TIMES.map(t => [t, place(fall(t))] as [number, string]),
      [CARRIED, `${place(landed)};${ease}`],
      [HOME, place({ x: REST, y: PALM })],
      [LOOP, place({ x: REST, y: PALM })],
    ]),
    keyframes('tilt', LOOP, [...TIMES.map(t => [t, `transform:rotate(${n(fall(t).turn)}deg)`] as [number, string]), [LOOP, 'transform:rotate(0deg)']]),
    keyframes('leaf', LOOP, [[0, 'opacity:1'], [9, 'opacity:1'], [GONE, 'opacity:0'], [LOOP, 'opacity:0']]),
    keyframes('lock', LOOP, [
      [0, 'opacity:0;transform:scale(1.7)'],
      [SEEN - 0.1, 'opacity:0;transform:scale(1.7);animation-timing-function:cubic-bezier(.2,.8,.2,1)'],
      [SEEN + 0.35, 'opacity:1;transform:scale(1)'],
      [CAUGHT - 0.2, 'opacity:1;transform:scale(1)'],
      [CAUGHT, 'opacity:0;transform:scale(1)'],
      [LOOP, 'opacity:0;transform:scale(1.7)'],
    ]),
    `.fall{${loop('fall')}}.tilt{${loop('tilt')}}.leaf{${loop('leaf')}}.lock{${loop('lock')}}`,
  )
  const corner = (sx: number, sy: number) => `M${44 * sx} ${30 * sy}V${44 * sy}H${30 * sx}`
  sheet.add(
    `<g class="fall" transform="translate(${n(still.x)} ${n(still.y)})">`,
    `<g class="leaf"><g class="tilt" transform="rotate(${n(still.turn)})">${leaf(theme)}</g></g>`,
    `<path class="lock" d="${[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => corner(sx!, sy!)).join('')}" fill="none" stroke="${theme.ink}" stroke-width="1.8"/>`,
    `</g>`,
  )

  return sheet.toString()
}
