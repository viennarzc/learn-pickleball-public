#!/usr/bin/env python3
"""Crop a generated sticker sheet into stable, titled local assets.

The illustration sheet is generated once; this deterministic step adds the exact
catalog titles so the artwork never relies on AI-generated lettering.

Usage: python3 scripts/build-stickers.py /path/to/generated-sticker-sheet.png
       python3 scripts/build-stickers.py --strip /path/to/generated-three-sticker-strip.png
"""

from pathlib import Path
import os
import sys
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "stickers"

STICKERS = [
    ("court-explorer", "Court Explorer", "sky"),
    ("kitchen-keeper", "Kitchen Keeper", "coral"),
    ("grip-guide", "Grip Guide", "yellow"),
    ("ready-set", "Ready, Set", "green"),
    ("serve-compass", "Serve Compass", "coral"),
    ("rally-rhythm", "Rally Rhythm", "sky"),
    ("reset-runner", "Reset Runner", "violet"),
    ("score-caller", "Score Caller", "sky"),
    ("side-out-sleuth", "Side-out Sleuth", "yellow"),
    ("soft-touch", "Soft Touch", "violet"),
    ("sync-squad", "Sync Squad", "green"),
    ("fair-call", "Fair Call", "coral"),
    ("open-play-pal", "Open-play Pal", "sky"),
    ("game-day-ready", "Game-day Ready", "yellow"),
    ("kitchen-ace", "Kitchen Ace", "yellow"),
]

# A few neighboring motifs in the generated sheet touched the nominal cell
# boundary. These small gutters keep the final assets isolated without changing
# the artwork scale or composition.
CELL_GUTTERS = {
    2: (26, 0, 0, 0),
    3: (32, 0, 0, 0),
    10: (0, 0, 24, 0),
    12: (28, 0, 0, 0),
    13: (0, 0, 26, 0),
    14: (76, 0, 0, 0),
    15: (170, 0, 0, 0),
}

PALETTE = {
    "ink": (17, 21, 35, 255),
    "yellow": (255, 218, 58, 255),
    "coral": (255, 190, 176, 255),
    "sky": (173, 225, 246, 255),
    "violet": (216, 202, 255, 255),
    "green": (190, 235, 213, 255),
}


def load_font(size: int):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def wrap_title(draw: ImageDraw.ImageDraw, title: str, font, max_width: int):
    words = title.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=font)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines[:2]


def remove_edge_fragments(tile: Image.Image) -> Image.Image:
    """Drop tiny alpha components that leaked across the sheet cell boundary."""
    alpha = tile.getchannel("A")
    width, height = tile.size
    pixels = alpha.load()
    visited = set()
    components = []

    for y in range(height):
        for x in range(width):
            if (x, y) in visited or pixels[x, y] < 12:
                continue
            stack = [(x, y)]
            visited.add((x, y))
            points = []
            touches_edge = False
            while stack:
                px, py = stack.pop()
                points.append((px, py))
                touches_edge |= px in (0, width - 1) or py in (0, height - 1)
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited and pixels[nx, ny] >= 12:
                        visited.add((nx, ny))
                        stack.append((nx, ny))
            components.append((len(points), touches_edge, points))

    mask = Image.new("L", (width, height), 0)
    mask_pixels = mask.load()
    for area, touches_edge, points in components:
        if touches_edge and area < 2200:
            continue
        for px, py in points:
            mask_pixels[px, py] = 255
    tile.putalpha(mask)
    return tile


def main():
    args = sys.argv[1:]
    strip_mode = bool(args and args[0] == "--strip")
    source_path = args[1] if strip_mode and len(args) > 1 else args[0] if args else os.environ.get("STICKER_SHEET_SOURCE", "")
    source = Path(source_path)
    if not source.exists():
        raise SystemExit(f"Generated sticker sheet not found: {source}")

    sheet = Image.open(source).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    width, height = sheet.size
    selected = STICKERS[-3:] if strip_mode else STICKERS
    columns = 3 if strip_mode else 4
    tile_w = width / columns
    tile_h = height / (1 if strip_mode else 4)

    for index, (slug, title, tone) in enumerate(selected):
        row, column = divmod(index, columns)
        left = round(column * tile_w)
        top = round(row * tile_h)
        right = round((column + 1) * tile_w)
        bottom = round((row + 1) * tile_h)
        source_index = len(STICKERS) - len(selected) + index if strip_mode else index
        gutter_left, gutter_top, gutter_right, gutter_bottom = CELL_GUTTERS.get(source_index + 1, (0, 0, 0, 0))
        left += gutter_left
        top += gutter_top
        right -= gutter_right
        bottom -= gutter_bottom
        tile = sheet.crop((left, top, right, bottom))
        if not strip_mode:
            tile = remove_edge_fragments(tile)

        # Remove transparent padding, then leave a generous edge around the art.
        alpha = tile.getchannel("A")
        bbox = alpha.getbbox()
        if bbox:
            tile = tile.crop(bbox)
        tile.thumbnail((448, 380), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        art_x = (512 - tile.width) // 2
        art_y = 18 + max(0, 380 - tile.height) // 2
        canvas.alpha_composite(tile, (art_x, art_y))

        draw = ImageDraw.Draw(canvas)
        font_size = 30 if len(title) <= 13 else 26
        font = load_font(font_size)
        lines = wrap_title(draw, title, font, 420)
        line_heights = [draw.textbbox((0, 0), line, font=font)[3] for line in lines]
        line_gap = 2
        text_height = sum(line_heights) + line_gap * (len(lines) - 1)
        ribbon_h = max(64, text_height + 26)
        ribbon_y = 512 - ribbon_h - 10
        ribbon_box = (28, ribbon_y, 484, 502)
        draw.rounded_rectangle(
            ribbon_box,
            radius=24,
            fill=PALETTE[tone],
            outline=PALETTE["ink"],
            width=5,
        )
        y = ribbon_y + (ribbon_h - text_height) // 2 - 1
        for line, line_height in zip(lines, line_heights):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_w = bbox[2] - bbox[0]
            draw.text(
                ((512 - text_w) // 2, y),
                line,
                font=font,
                fill=PALETTE["ink"],
                stroke_width=1,
                stroke_fill=PALETTE["ink"],
            )
            y += line_height + line_gap

        output = OUTPUT / f"{slug}.png"
        canvas.save(output, format="PNG", optimize=True)
        print(output)


if __name__ == "__main__":
    main()
