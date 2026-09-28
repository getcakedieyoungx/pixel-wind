"""Procedural pixel-art tree (original art for the Pixel Wind demo, CC0).

Canopy = overlapping leaf clumps with jagged edges, lit from the top-left,
drawn top-to-bottom so lower clumps overlap the ones behind them. Trunk and a
few branches are drawn first and peek through the gaps.

usage: python tree.py SEED WIDTH HEIGHT OUT.png
"""

import sys
import numpy as np
from PIL import Image

LEAF = ["#1b2f45", "#224a55", "#2f6b56", "#3f8c4f", "#62ad4a", "#96cf4f", "#d4ec7a"]
BARK = ["#1d1730", "#35284a", "#54395a", "#7a5566"]


def hexc(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


LEAF = [hexc(c) for c in LEAF]
BARK = [hexc(c) for c in BARK]


def smooth_noise(rng, w, h, period):
    """Blocky value noise at roughly `period` px, bilinear, about 0..1."""
    gw, gh = w // period + 2, h // period + 2
    g = rng.random((gh, gw))
    ys, xs = np.mgrid[0:h, 0:w] / period
    x0, y0 = xs.astype(int), ys.astype(int)
    fx, fy = xs - x0, ys - y0
    a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx
    b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def line(canvas, mask, x0, y0, x1, y1, w0, w1, tone_fn):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        t = i / max(1, n - 1)
        x, y, w = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w0 + (w1 - w0) * t
        for dx in range(int(-w / 2) - 1, int(w / 2) + 2):
            px, py = int(round(x + dx)), int(round(y))
            if 0 <= px < canvas.shape[1] and 0 <= py < canvas.shape[0] and abs(px - x) <= w / 2:
                canvas[py, px] = tone_fn((px - x) / max(w / 2, 1))
                mask[py, px] = True


def make_tree(seed, W, H):
    rng = np.random.default_rng(seed)
    img = np.zeros((H, W, 3), np.uint8)
    op = np.zeros((H, W), bool)
    cx = W / 2 + rng.uniform(-2, 2)

    # canopy ellipse
    rmax = 0.13 * W
    crx, cry = W * 0.5 - rmax - 3, H * 0.40 - rmax * 0.5
    ccy = cry + rmax + 2
    base_y = H - 1
    trunk_top = ccy + cry * 0.2

    def bark(u):  # u in [-1, 1] across the trunk, lit from the left
        return BARK[3] if u < -0.45 else BARK[2] if u < 0.2 else BARK[1] if u < 0.7 else BARK[0]

    # trunk + root flare
    line(img, op, cx, base_y, cx + rng.uniform(-2, 2), trunk_top, W * 0.11, W * 0.06, bark)
    for s in (-1, 1):
        line(img, op, cx + s * W * 0.03, base_y, cx + s * W * 0.09, base_y, 3, 2, bark)
    # branches toward the canopy
    for _ in range(5):
        ang = rng.uniform(-2.4, -0.7)
        ln = rng.uniform(0.45, 0.8) * crx
        sx, sy = cx, trunk_top + rng.uniform(0, H * 0.08)
        line(img, op, sx, sy, sx + np.cos(ang) * ln, sy + np.sin(ang) * ln * 0.8, W * 0.035, 1.5, bark)

    # clumps: sample centres inside the canopy ellipse
    clumps = []
    tries = 0
    while len(clumps) < 60 and tries < 6000:
        tries += 1
        ang, rad = rng.uniform(0, 2 * np.pi), np.sqrt(rng.random())
        x = cx + np.cos(ang) * rad * crx * 0.86
        y = ccy + np.sin(ang) * rad * cry * 0.86
        r = rng.uniform(0.09, 0.13) * W * (1.0 - 0.2 * rad)
        if all(np.hypot(x - a, y - b) > 0.7 * (r + c) for a, b, c, *_ in clumps):
            clumps.append((x, y, r, rng.uniform(0, 2 * np.pi), rng.integers(11, 15)))
    clumps.sort(key=lambda c: c[1])  # top first; lower clumps overlap

    leafn = smooth_noise(rng, W, H, 3)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    lx, ly = -0.62, -0.78
    top, bot = ccy - cry, ccy + cry
    for x, y, r, ph, k in clumps:
        dx, dy = xx - x, yy - y
        theta = np.arctan2(dy, dx)
        edge = r * (1 + 0.08 * np.sin(k * theta + ph) + 0.05 * np.sin(2.3 * k * theta + 2 * ph)) + 1.6 * (leafn - 0.5)
        d = np.hypot(dx, dy)
        inside = d <= edge
        if not inside.any():
            continue
        lam = -(dx * lx + dy * ly) / np.maximum(edge, 1)          # -1 .. 1
        height = 1 - np.clip((yy - top) / (bot - top), 0, 1)      # 1 at top
        t = 2.1 + 1.8 * lam + 1.5 * height + 1.2 * (leafn - 0.5)
        rim = inside & (d > edge - 1.6) & (lam < 0.1)             # dark separation on the shadow side
        t = np.where(rim, np.minimum(t, 0.6), t)
        tone = np.clip(np.round(t), 0, 5).astype(int)
        for i in range(6):
            m = inside & (tone == i)
            img[m] = LEAF[i]
        op |= inside

    # sparse highlight flecks on lit upper clumps
    lit = op & (img == np.array(LEAF[5])).all(axis=2)
    cand = np.argwhere(lit)
    for py, px in cand[rng.choice(len(cand), size=min(len(cand), W // 5), replace=False)]:
        img[py, px] = LEAF[6]

    # silhouette outline on the shadow side
    pad = np.pad(op, 1)
    edge = op & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    shade = (xx - cx) * 0.4 + (yy - ccy)
    out = edge & (shade > -cry * 0.15) & (yy < trunk_top)
    img[out] = LEAF[0]

    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = img
    rgba[..., 3] = np.where(op, 255, 0)
    return rgba


if __name__ == "__main__":
    seed, W, H, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    Image.fromarray(make_tree(seed, W, H), "RGBA").save(out)
    print("wrote", out)
