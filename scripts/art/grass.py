"""Procedural grass strip that tiles horizontally (original art, CC0).

usage: python grass.py SEED WIDTH HEIGHT OUT.png
"""

import sys
import numpy as np
from PIL import Image

GREENS = ["#2f6b56", "#3f8c4f", "#62ad4a", "#96cf4f"]


def hexc(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


GREENS = [hexc(c) for c in GREENS]


def make_grass(seed, W, H):
    rng = np.random.default_rng(seed)
    rgba = np.zeros((H, W, 4), np.uint8)
    for x in range(W):
        # periodic height so the strip tiles seamlessly
        h = int(round(H * 0.55 + H * 0.25 * np.sin(2 * np.pi * x / W * 3) + rng.integers(-2, 3)))
        h = max(3, min(H, h))
        for y in range(H - h, H):
            depth = (y - (H - h)) / max(1, h)  # 0 at blade tip
            tone = 3 if depth < 0.2 else 2 if depth < 0.5 else 1 if depth < 0.8 else 0
            if x % 3 == 0 and depth < 0.3:
                tone = max(0, tone - 1)
            rgba[y, x, :3] = GREENS[tone]
            rgba[y, x, 3] = 255
    return rgba


if __name__ == "__main__":
    seed, W, H, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    Image.fromarray(make_grass(seed, W, H), "RGBA").save(out)
    print("wrote", out)
