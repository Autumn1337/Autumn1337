"""The page's type as outlines: reads the three faces from a folder of fonts and writes glyphs.json beside this file.

    python3 src/glyphs.py <folder holding JetBrainsMono[wght].ttf and Newsreader-Italic[opsz,wght].ttf>

Both families are under the SIL Open Font License.
"""

import json
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

CHARS = "".join(chr(c) for c in range(0x20, 0x7F)) + "·–—→×Δπ…’"
FACES = {
    "mono": ("JetBrainsMono[wght].ttf", {"wght": 500}),
    "bold": ("JetBrainsMono[wght].ttf", {"wght": 700}),
    "sign": ("Newsreader-Italic[opsz,wght].ttf", {"opsz": 36, "wght": 400}),
}


def face(file: Path, axes: dict[str, float]):
    font = instantiateVariableFont(TTFont(file), axes)
    scale = 1000 / font["head"].unitsPerEm
    cmap, glyphs, widths = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
    out = {}
    for char in CHARS:
        name = cmap.get(ord(char))
        if name is None:
            continue
        pen = SVGPathPen(glyphs, ntos=lambda v: str(round(v)))
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, scale, 0, 0)))
        out[char] = {"w": round(widths[name][0] * scale), "d": pen.getCommands()}
    return out


fonts = Path(sys.argv[1])
faces = {name: face(fonts / file, axes) for name, (file, axes) in FACES.items()}
Path(__file__).with_name("glyphs.json").write_text(json.dumps(faces, ensure_ascii=False, separators=(",", ":")))
