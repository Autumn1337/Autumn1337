import { Sheet, keyframes, n, random, squares, type Theme } from '../kit.ts'

const [W, H] = [632, 440]
const LOOP = 12
const STILL = 6

/** The loop's beats: the sun comes up and the stars go out, all but the few kept; it sets, and they return. */
const [RISE, DAWN, DUSK, SET] = [0.6, 2.7, 9.2, 11.4]

const [LEFT, RIGHT, SKY, HORIZON] = [64, 568, 112, 300]
const PITCH = 12

export function daybreak(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  sheet.head('Daybreak', '')
  const next = random(7)

  // The sun: a disc of dots on an arc from one end of the horizon to the other, with its light about it.
  const disc: (readonly [number, number])[] = []
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) if (Math.hypot(x, y) <= 4.3) disc.push([x * 9, y * 9])
  const path = Array.from({ length: 25 }, (_, k) => {
    const p = k / 24
    return [RISE + (SET - RISE) * p, `transform:translate(${n(LEFT + 60 + (RIGHT - LEFT - 120) * p)}px,${n(HORIZON + 170 - 316 * Math.sin(Math.PI * p))}px)`] as [number, string]
  })
  const noon = path[12]![1].slice('transform:translate('.length, -1).split(',').map(parseFloat)
  sheet.css(keyframes('sun', LOOP, [[0, path[0]![1]], ...path, [LOOP, path[0]![1]]]), `.sun{animation:sun ${LOOP}s linear infinite}`)
  sheet.def(
    `<clipPath id="sky"><rect x="0" y="0" width="${W}" height="${HORIZON - 7}"/></clipPath>`,
    `<radialGradient id="light"><stop offset="0" stop-color="${theme.gold}" stop-opacity="${theme.name === 'dark' ? 0.3 : 0.4}"/><stop offset="1" stop-color="${theme.gold}" stop-opacity="0"/></radialGradient>`,
  )
  sheet.add(`<g clip-path="url(#sky)"><g class="sun" transform="translate(${n(noon[0]!)} ${n(noon[1]!)})"><circle r="150" fill="url(#light)"/><path fill="${theme.gold}" d="${squares(disc, 5)}"/></g></g>`)

  // The night's posts: stars on the sky's grid, which twinkle until dawn. Five are kept through the day, clear of
  // the sun's way, each with the score that kept it.
  const KEPT: [number, number, string][] = [
    [4, 2, '9.4'],
    [8, 6, '8.7'],
    [21, 12, '9.1'],
    [33, 3, '8.2'],
    [38, 7, '8.9'],
  ]
  const taken = new Set(KEPT.map(([col, row]) => `${col},${row}`))
  const place = (col: number, row: number) => [LEFT + 6 + col * PITCH, SKY + 6 + row * PITCH] as const
  const others = Array.from({ length: 54 }, () => {
    for (;;) {
      const [col, row] = [Math.floor(next() * ((RIGHT - LEFT) / PITCH)), Math.floor(next() * ((HORIZON - SKY - 24) / PITCH))]
      if (taken.has(`${col},${row}`)) continue
      taken.add(`${col},${row}`)
      return place(col, row)
    }
  })
  const night = `opacity:1`
  sheet.css(
    keyframes('night', LOOP, [[0, night], [DAWN - 0.6, night], [DAWN + 0.5, 'opacity:0'], [DUSK, 'opacity:0'], [DUSK + 1.2, night], [LOOP, night]]),
    keyframes('twinkle', 2.6, [[0, 'opacity:.35'], [1.3, 'opacity:1'], [2.6, 'opacity:.35']]),
    `.night{animation:night ${LOOP}s linear infinite}.twinkle rect{animation:twinkle 2.6s ease-in-out infinite}`,
  )
  const kept = KEPT.map(([col, row]) => place(col, row))
  const stars = [...others, ...kept]
  const twinkling = stars.map(([x, y]) => `<rect x="${x - 2.5}" y="${y - 2.5}" width="5" height="5" style="animation-delay:${n(-2.6 * next())}s"/>`)
  sheet.add(
    `<g class="night" opacity="0"><g class="twinkle" fill="${theme.soft}">${twinkling.join('')}</g></g>`,
    `<path fill="${theme.gold}"${sheet.appear(LOOP, DAWN, DUSK, STILL)} d="${squares(kept, 7)}"/>`,
  )
  kept.forEach(([x, y], k) => sheet.add(`<g${sheet.appear(LOOP, DAWN + 0.5 + 0.18 * k, DUSK - 0.3, STILL)}>${sheet.type('mono', KEPT[k]![2], x + 10, y + 5.5, 16, { fill: theme.gold })}</g>`))

  const ground = Array.from({ length: Math.floor((RIGHT - LEFT) / PITCH) + 1 }, (_, k) => [LEFT + 6 + k * PITCH, HORIZON] as const)
  sheet.add(
    `<path fill="${theme.track}" d="${squares(ground, 5)}"/>`,
    sheet.type('mono', 'HN · RSS · Reddit · arXiv', LEFT, 328, 18, { fill: theme.faint }),
    sheet.type('bold', 'A tech briefing at daybreak.', 64, 374, 23, { tracking: -6 }),
    sheet.type('mono', 'Each night’s posts scored, the best summarised.', 64, 404, 18, { fill: theme.soft }),
  )
  return sheet.toString()
}
