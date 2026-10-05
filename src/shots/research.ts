import { Sheet, clamp, keyframes, n, squares, type Theme } from '../kit.ts'

const [W, H] = [1280, 580]
const LOOP = 9
const STILL = 7
const END = 8.3

/** The loop's beats: the past arrives frame by frame, the two experts work through their layers, the future is made. */
const [PAST, WORK, FUTURE] = [0.3, 2.1, 3.9]
const LAYERS = 6

/** Success on DOMINO Level 1, in per cent, as the paper reports it. */
const RESULTS: [string, number][] = [
  ['OpenVLA', 1.5],
  ['π0-FAST', 3.5],
  ['π0.5', 9.6],
  ['PUMA', 17.2],
  ['InternVLA-A1.5', 29.3],
  ['DynamicWAM', 38.2],
]

/** Where the target stands in frame `k` of seven, four seen and three foreseen: one arc carried across them all. */
const target = (k: number) => [14 + 6.4 * k, 49 - 31 * Math.sin((Math.PI * (k + 0.4)) / 6.6)] as const

export function research(theme: Theme) {
  const sheet = new Sheet(W, H, theme)
  sheet.head('DynamicWAM', 'a world–action model for dynamic manipulation')
  const label = (text: string, x: number, y: number, fill = theme.soft, anchor: 'start' | 'middle' | 'end' = 'start') => sheet.type('mono', text, x, y, 19, { fill, anchor })
  const [worldY, actionY, side] = [214, 368, 68]
  const frameX = (k: number) => (k < 4 ? 64 + 76 * k : 580 + 76 * (k - 4))
  const layerX = (k: number) => 414 + 24 * k

  // The world, above: four frames seen, their motion drawn into them, and three the model foresees.
  for (let k = 0; k < 7; k++) {
    const seen = k < 4
    const [x, y] = target(k)
    const [bx, by] = target(k - 1)
    const tail = [0.34, 0.62, 0.9].map(t => [x - (x - bx) * 1.5 * t, y - (y - by) * 1.5 * t] as const)
    const at = seen ? PAST + 0.4 * k : FUTURE + 0.4 * (k - 4)
    sheet.add(
      `<g transform="translate(${frameX(k)} ${worldY - side / 2})"><g${sheet.appear(LOOP, at, END, STILL, 8)}>`,
      `<rect width="${side}" height="${side}" rx="9" fill="${theme.well}" stroke="${seen ? theme.line : theme.iris}" stroke-width="1.5"${seen ? '' : ' stroke-dasharray="4 4"'}/>`,
      seen ? tail.map(([tx, ty], j) => `<rect x="${n(tx - 3)}" y="${n(ty - 3)}" width="6" height="6" fill="${theme.iris}" fill-opacity="${n(0.9 - 0.28 * j)}"/>`).join('') : '',
      seen ? `<rect x="${n(x - 7)}" y="${n(y - 7)}" width="14" height="14" rx="2" fill="${theme.gold}"/>` : `<rect x="${n(x - 6.1)}" y="${n(y - 6.1)}" width="12.2" height="12.2" rx="2" fill="none" stroke="${theme.gold}" stroke-width="1.8"/>`,
      sheet.type('mono', k < 3 ? `t-${3 - k}` : k === 3 ? 't' : `t+${k - 3}`, side / 2, side + 24, 15, { fill: theme.faint, anchor: 'middle' }),
      `</g></g>`,
    )
  }
  sheet.add(label('history flow', 64, worldY - 54), label('future video', frameX(6) + side, worldY - 54, theme.soft, 'end'))

  // The action, below: a token of twelve numbers for each interval, and the sixteen actions that come out.
  for (let k = 0; k < 4; k++) {
    const dots = Array.from({ length: 12 }, (_, d) => {
      const level = 0.3 + 0.7 * Math.abs(Math.sin(1.7 * (k + 1) * (d + 2)))
      return `<rect x="${n(frameX(k) + side / 2 - 8 + 10 * (d % 2))}" y="${n(actionY - 28 + 10 * (d >> 1))}" width="6" height="6" fill="${theme.ember}" fill-opacity="${n(level)}"/>`
    })
    sheet.add(`<g${sheet.appear(LOOP, PAST + 0.4 * k + 0.15, END, STILL, 8)}>${dots.join('')}</g>`)
  }
  for (let k = 0; k < 16; k++) sheet.add(`<rect x="${n(frameX(4) + 14.2 * k)}" y="${actionY - 4}" width="8" height="8" rx="1" fill="${theme.ember}"${sheet.appear(LOOP, FUTURE + 0.08 * k, END, STILL)}/>`)
  sheet.add(label('kinematic tokens', 64, actionY + 66), label('16 actions', frameX(6) + side, actionY + 66, theme.soft, 'end'))

  // Between them the two experts, layer by layer, each layer of one attending to the other's.
  const rail = (y: number) => Array.from({ length: LAYERS }, (_, k) => [layerX(k), y] as const)
  const rung = (k: number) => Array.from({ length: 11 }, (_, j) => [layerX(k), worldY + 16 + ((actionY - worldY - 32) * j) / 10] as const)
  const feed = (y: number, from: number, to: number) => Array.from({ length: 3 }, (_, j) => [from + ((to - from) * (j + 0.5)) / 3, y] as const)
  const feeds = [feed(worldY, 372, 404), feed(actionY, 372, 404), feed(worldY, 544, 576), feed(actionY, 544, 576)].flat()
  sheet.add(`<path fill="${theme.track}" d="${squares([...rail(worldY), ...rail(actionY)], 10)}${squares(Array.from({ length: LAYERS }, (_, k) => rung(k)).flat(), 3.4)}${squares(feeds, 3.4)}"/>`)
  for (let k = 0; k < LAYERS; k++) {
    const at = WORK + 0.26 * k
    sheet.css(
      keyframes(`rung${k}`, LOOP, [[0, 'opacity:0'], [at, 'opacity:0'], [at + 0.12, 'opacity:1'], [at + 0.8, 'opacity:.45'], [END, 'opacity:.45'], [END + 0.4, 'opacity:0'], [LOOP, 'opacity:0']]),
      `.rung${k}{animation:rung${k} ${LOOP}s linear infinite}`,
    )
    sheet.add(
      `<path fill="${theme.iris}"${sheet.appear(LOOP, at, END, STILL)} d="${squares([[layerX(k), worldY]], 10)}"/>`,
      `<path fill="${theme.ember}"${sheet.appear(LOOP, at, END, STILL)} d="${squares([[layerX(k), actionY]], 10)}"/>`,
      `<path class="rung${k}" fill="${theme.ink}" opacity="0.45" d="${squares(rung(k), 3.4)}"/>`,
    )
  }
  sheet.add(label('joint attention', layerX(2.5), actionY + 66, theme.soft, 'middle'))

  sheet.add(
    sheet.type('bold', 'Grasping what moves.', 64, 498, 38, { tracking: -8 }),
    sheet.type('mono', 'One path keeps a motion’s shape; the other, its speed and timing.', 64, 532, 18, { fill: theme.soft }),
  )

  // What it comes to: a bar of dots for each method, half a per cent to a dot.
  const [cx, cw, pitch] = [862, 354, 7.08]
  sheet.add(label('DOMINO Level 1 · success rate', cx, worldY - 54))
  RESULTS.forEach(([name, value], row) => {
    const ours = row === RESULTS.length - 1
    const y = 186 + 50 * row
    const hue = ours ? theme.gold : theme.soft
    const place = (k: number) => [cx + pitch * (k >> 1) + 1.9, y + 27 + pitch * (k & 1)] as const
    const count = Math.round(value * 2)
    const from = 0.5 + 0.22 * row
    sheet.add(
      sheet.type(ours ? 'bold' : 'mono', name, cx, y + 13, 19, { fill: ours ? theme.ink : theme.soft }),
      sheet.type(ours ? 'bold' : 'mono', `${value.toFixed(1)}%`, cx + cw, y + 13, 19, { fill: ours ? theme.gold : theme.soft, anchor: 'end' }),
      `<path fill="${theme.track}" fill-opacity="0.55" d="${squares(Array.from({ length: 100 }, (_, k) => place(k)), 3.8)}"/>`,
    )
    for (let col = 0; col * 2 < count; col++) {
      const lit = [col * 2, col * 2 + 1].filter(k => k < count).map(place)
      sheet.add(`<path fill="${hue}"${sheet.gated(LOOP, [[from + clamp(col / 76) * 1.6, END + 0.2]], STILL)} d="${squares(lit, 3.8)}"/>`)
    }
  })
  sheet.add(label('35 tasks, 100 episodes each', cx, 508, theme.faint), label('real robot, 12 tasks: 46.7%', cx, 533, theme.faint))

  return sheet.toString()
}
