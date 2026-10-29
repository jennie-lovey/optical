# Builds front-on pairs from the real stacked-frames photo: cut the right half of each
# frame, drop the neighbouring frames by colour, mirror it, and centre the lenses on a
# 240:104 canvas (lens centres at 26.7% / 73.3% across, 50% down) to match the eyes.
# The canvas is drawn at ARM_ROOM x that size so the opened arms fit; the page scales the
# image up by the same factor (see .hero__frame-photo).
import sys
from PIL import Image, ImageFilter, ImageOps, ImageDraw
import numpy as np

src_path, out_dir, preview = sys.argv[1], sys.argv[2], sys.argv[3]
src = Image.open(src_path).convert("RGB")
im = np.asarray(src).astype(np.float32)
paper = np.asarray(src.convert("L").filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(25))).astype(np.float32)
dist = np.clip((paper[..., None] - im) / np.maximum(paper[..., None], 1), 0, 1).max(axis=2)
base = np.clip((dist - 0.06) / 0.42, 0, 1)

r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(2), im.min(2)
sat = (mx - mn) / np.maximum(mx, 1)
lum = 0.3 * r + 0.59 * g + 0.11 * b
blue = (b > r + 18) & (sat > 0.12)
warm = (r > b + 14) & (lum < 215)
dark = lum < 95

frames = {
    # name: (mirror axis x, band y0, y1, right edge x, lens centre (x, y) read off a grid, keep rule)
    "tortoise": (52, 140, 474, 548, (302, 318), (warm & (lum < 165)) | (lum < 70)),
    "azure":    (78, 596, 878, 548, (325, 765), blue | ((b > r + 4) & (lum > 150))),
    "smoke":    (72, 850, 1188, 548, (308, 1035), ~blue),
}

# Worn, front-on glasses show no arms: the folded arms seen through each lens are cleared
# by emptying the lens opening (cx, cy, half-w, half-h, squareness), and the arm tips that
# poke out past the hinge are boxed out (x0, y0, x1, y1).
openings = {
    "tortoise": ((300, 316, 172, 140, 2.6), [(485, 285, 560, 400)]),
    "azure":    ((322, 762, 168, 118, 3.5), [(505, 760, 560, 880)]),
    "smoke":    ((307, 1035, 151, 122, 3.0), [(494, 1072, 530, 1128)]),
}

# Opened arms, taken from a straight run of each real arm in the photo:
# (arm start (x, y), arm end (x, y), thickness, where it leaves the endpiece (x, y)).
arms = {
    "tortoise": ((160, 219), (455, 219), 58, (522, 216)),
    "azure":    ((262, 668), (462, 806), 34, (526, 648)),
    "smoke":    ((262, 945), (470, 1080), 42, (530, 914)),
}
ARM_ROOM = 1.4
ARM_REACH = 0.7     # foreshortened length, as a share of the real arm run
ARM_TAPER = 0.45    # far end is this much thinner (perspective)
ARM_DROP = np.radians(12)

def bilinear(img, xs, ys):
    h, w = img.shape[:2]
    x0 = np.clip(np.floor(xs).astype(int), 0, w - 2); y0 = np.clip(np.floor(ys).astype(int), 0, h - 2)
    fx = np.clip(xs - x0, 0, 1)[..., None]; fy = np.clip(ys - y0, 0, 1)[..., None]
    top = img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx
    bot = img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx
    return top * (1 - fy) + bot * fy

def arm_layer(rgba_full, spec, to_canvas, size):
    """Right arm, opened outward and back from the hinge, drawn in canvas space."""
    (ax, ay), (bx, by), thick, (hx, hy) = spec
    A = np.array([ax, ay], float); B = np.array([bx, by], float)
    run = np.linalg.norm(B - A); sdir = (B - A) / run; sperp = np.array([-sdir[1], sdir[0]])
    hinge = np.array(to_canvas(hx, hy), float)
    d = np.array([np.cos(ARM_DROP), np.sin(ARM_DROP)]); perp = np.array([-d[1], d[0]])
    length = run * ARM_REACH
    W, H = size
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rel_x = xx - hinge[0]; rel_y = yy - hinge[1]
    u = (rel_x * d[0] + rel_y * d[1]) / length
    half = thick / 2 * (1 - ARM_TAPER * np.clip(u, 0, 1))
    v = (rel_x * perp[0] + rel_y * perp[1]) / half
    inside = (u >= -0.04) & (u <= 1) & (np.abs(v) <= 1)
    # The hinge end of the arm sits at the endpiece, so sample the real arm from its far
    # (hinge-side) end B back toward A.
    sx = B[0] - u * run * sdir[0] + v * thick / 2 * sperp[0]
    sy = B[1] - u * run * sdir[1] + v * thick / 2 * sperp[1]
    px = bilinear(rgba_full, sx, sy)
    px[..., 3] *= inside
    px[..., 3] *= np.clip((1 - u) / 0.3, 0, 1)  # fades as it heads back behind the head
    return Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))

def opening_mask(shape, cx, cy, a, b, n):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return (np.abs((xx - cx) / a) ** n + np.abs((yy - cy) / b) ** n) <= 1

def soft(mask, grow=1):
    m = Image.fromarray((mask * 255).astype(np.uint8))
    if grow: m = m.filter(ImageFilter.MaxFilter(2 * grow + 1))
    return np.asarray(m.filter(ImageFilter.GaussianBlur(1))).astype(np.float32) / 255

sheet = Image.new("RGB", (1200, 600), (140, 159, 134))
for i, (name, (axis, y0, y1, x1, (cx, cy), keep)) in enumerate(frames.items()):
    a = base * soft(keep)
    (cx_, cy_, ha, hb, n), boxes = openings[name]
    clear = opening_mask(a.shape, cx_, cy_, ha, hb, n)
    for x0, y0_, x1_, y1_ in boxes:
        clear[y0_:y1_, x0:x1_] = True
    a = a * (1 - soft(clear, grow=0))
    if name == "tortoise":
        # Below the temples only the dark lower rim is tortoise; the rest is the clear frame behind it.
        rows = np.arange(a.shape[0])[:, None] >= 392
        a = np.where(rows, a * soft(lum < 110, grow=0), a)
        a[395:478, :118] = 0  # the clear frame's bridge peeks out under the tortoise bridge
    rgba = np.dstack([im, a * 255]).astype(np.uint8)
    arm_src = np.dstack([im, base * 255]).astype(np.float32)  # arms keep their own colours, gold logos included
    half = Image.fromarray(rgba).crop((axis, y0, x1, y1))
    pair = Image.new("RGBA", (half.width * 2, half.height), (0, 0, 0, 0))
    pair.paste(ImageOps.mirror(half), (0, 0))
    pair.alpha_composite(half, (half.width, 0))

    lx = cx - axis; ly = cy - y0
    spacing = 2 * lx  # mirrored lens centres sit at axis -/+ lx
    W = int(round(spacing / 0.4667 * ARM_ROOM)); H = int(round(W * 104 / 240))
    ox = int(round(W / 2 - half.width)); oy = int(round(H / 2 - ly))
    assert ox >= 0 and oy >= 0 and oy + pair.height <= H, f"{name}: pair does not fit the canvas"
    to_canvas = lambda x, y: (ox + half.width + (x - axis), oy + (y - y0))

    # Arms and front are saved separately so the page can slide the side hair between
    # them (arms tuck under the hair, the front sits on top). Same canvas for both.
    right_arm = arm_layer(arm_src, arms[name], to_canvas, (W, H))
    arms_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    arms_img.alpha_composite(right_arm)
    arms_img.alpha_composite(ImageOps.mirror(right_arm))
    arms_img.save(f"{out_dir}/{name}-arms.webp", quality=88, method=6, exact=True)
    front = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    front.alpha_composite(pair, (ox, oy))
    front.save(f"{out_dir}/{name}-front.webp", quality=88, method=6, exact=True)
    canvas = arms_img.copy(); canvas.alpha_composite(front)
    print(name, "canvas", canvas.size, "offset", (ox, oy))
    th = canvas.resize((600, int(600 * canvas.height / canvas.width)))
    sheet.paste(th.convert("RGB"), ((i % 2) * 600, (i // 2) * 300), th)
sheet.crop((0, 0, 1200, 600)).save(preview)
