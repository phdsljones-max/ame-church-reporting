#!/usr/bin/env python3
"""Generate AME Reports PWA icons (192/512 px, plus maskable variants).

Design: burgundy rounded-square background, centered gold ring,
gold Latin cross inside the ring. Maskable variants get generous
safe-zone padding so nothing is clipped on round/masked shapes.
"""
from pathlib import Path
from PIL import Image, ImageDraw

BURGUNDY = (92, 26, 27, 255)   # #5C1A1B
GOLD = (201, 162, 39, 255)     # #C9A227

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def rounded_square(size: int, radius_ratio: float = 0.18) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size * radius_ratio, fill=BURGUNDY)
    return img


def draw_mark(img: Image.Image, scale: float = 1.0) -> Image.Image:
    """Draw the gold ring + cross centered, sized relative to the canvas."""
    size = img.width
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    ring_r = size * 0.30 * scale
    ring_w = max(3, int(size * 0.045 * scale))
    d.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=GOLD, width=ring_w)

    # Latin cross sized to sit inside the ring
    cross_h = size * 0.30 * scale
    cross_w = size * 0.075 * scale
    bar_y = cy - cross_h * 0.18
    bar_h = size * 0.070 * scale
    bar_half = cross_h * 0.42
    d.rectangle([cx - cross_w / 2, cy - cross_h / 2, cx + cross_w / 2, cy + cross_h / 2], fill=GOLD)
    d.rectangle([cx - bar_half, bar_y - bar_h / 2, cx + bar_half, bar_y + bar_h / 2], fill=GOLD)
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size, scale, suffix in [(192, 1.0, ""), (512, 1.0, ""), (192, 0.72, "-maskable"), (512, 0.72, "-maskable")]:
        img = rounded_square(size)
        img = draw_mark(img, scale=scale)
        # Export maskable on an opaque canvas (no transparency at edges)
        if suffix == "-maskable":
            bg = Image.new("RGBA", (size, size), BURGUNDY)
            bg.alpha_composite(img)
            img = bg
        name = f"icon-{size}{suffix}.png"
        img.convert("RGB").save(OUT_DIR / name)
        print("wrote", OUT_DIR / name)


if __name__ == "__main__":
    main()
