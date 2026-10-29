# Product card images from the supplied shots in public/assets/source.
#   milo-angle    round tortoise frame from a brand flyer (only the frame is kept, never
#                 its web address or logo); grey studio backdrop lifted to white
#   willow-green  cut off the cream backdrop along its outer outline; everything inside
#                 the rims is kept, so the tinted lenses stay as photographed
#   willow-sand / fern-teal   same outline cut; their lenses are clear glass lying on
#                 coloured paper, so they keep the glass's own reflections and a faint
#                 sheen rather than the paper seen through them
# Colours stay true (the cards no longer blend the image); cast shadows are dropped.
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = "public/assets/source"
OUT = "public/assets/products"

def save(img, name):
    img.save(f"{OUT}/{name}.webp", quality=92, method=6, exact=True)
    print(name, img.size)

# --- Studio shot: lift the grey backdrop to white ---
zeno = Image.open(f"{SRC}/frame-round-tortoise.png").convert("RGB")
a = np.asarray(zeno).astype(np.float32)
bg = np.median(a[20:120, 20:120].reshape(-1, 3), axis=0)
save(Image.fromarray(np.clip(a * (255 / bg), 0, 255).astype(np.uint8)).crop((180, 370, 1015, 765)), "milo-angle")


def hsv(arr):
    arr = arr / 255
    mx, mn = arr.max(2), arr.min(2); d = np.maximum(mx - mn, 1e-4)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1e-4), mx


def fill_holes(mask):
    """Everything the outline encloses (the lenses) becomes part of the shape."""
    m = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8))
    pad = Image.new("L", (m.width + 2, m.height + 2), 0)
    pad.paste(m, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    outside = np.asarray(pad)[1:-1, 1:-1] == 128
    return ~outside


def outline_cutout(rgb, frame_mask, name, grow=2, glass=None):
    m = Image.fromarray(np.where(frame_mask, 255, 0).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))   # close small gaps in the rim
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))   # drop specks
    shape = fill_holes(np.asarray(m) > 0)
    a = Image.fromarray(np.where(shape, 255, 0).astype(np.uint8))
    if grow:
        a = a.filter(ImageFilter.MaxFilter(2 * grow + 1))
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    rgb = rgb.copy()
    if glass is not None:
        # Clear lenses: keep only what the glass itself adds (reflections, glints) and a
        # faint sheen, instead of the backdrop seen through it.
        rim = np.asarray(m.filter(ImageFilter.MaxFilter(3))) > 0
        lens = shape & ~rim
        lens_alpha = np.clip(glass * 2.2, 0.07, 0.85)
        bright = rgb.max(axis=2) > 200
        rgb[lens & ~bright] = (255, 255, 255)
        a_arr = np.asarray(a).astype(np.float32) / 255
        a_arr = np.where(lens, np.minimum(a_arr, lens_alpha), a_arr)
        a = Image.fromarray((a_arr * 255).astype(np.uint8))
    img = Image.fromarray(rgb.astype(np.uint8)).convert("RGBA")
    img.putalpha(a)
    bbox = a.point(lambda x: 255 if x > 40 else 0).getbbox()
    save(img.crop(bbox), name)


def frame_pixels(rgb, side_masks, thresholds):
    """Pixels that differ from an empty plate of each backdrop plane, minus cast shadows."""
    plate = np.zeros_like(rgb)
    for side in side_masks:
        fill = rgb.copy()
        fill[~side] = np.median(rgb[side].reshape(-1, 3), axis=0)
        med = np.asarray(Image.fromarray(fill.astype(np.uint8)).filter(ImageFilter.MedianFilter(41))).astype(np.float32)
        plate[side] = med[side]
    diff = np.abs(rgb - plate).max(axis=2) / 255
    t = np.zeros(diff.shape, np.float32)
    for side, thr in zip(side_masks, thresholds):
        t[side] = thr
    h_i, s_i, v_i = hsv(rgb); h_p, s_p, v_p = hsv(plate)
    dh = np.abs((h_i - h_p + 180) % 360 - 180)
    shadow = (v_i < v_p * 0.96) & (dh < 20) & (np.abs(s_i - s_p) < 0.1)
    return (diff > t) & ~shadow, diff


# --- Grey crystal frame on a white set: studio treatment ---
# Translucent acetate and clear lenses can't be cut out without losing them, so the
# backdrop is divided out instead (a wide median gives the empty set); the card then
# shows through the white, and the frame keeps its see-through look.
gc = Image.open(f"{SRC}/new-frames/round-grey-crystal.png").convert("RGB").crop((50, 455, 750, 735))
g = np.asarray(gc).astype(np.float32)
empty = np.asarray(gc.filter(ImageFilter.MedianFilter(61)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
lifted = np.clip(g / np.maximum(empty, 1) * 255 * 1.02, 0, 255)
save(Image.fromarray(lifted.astype(np.uint8)), "ash-crystal")

# --- Olive oval with tortoise arms, studio white: same treatment ---
# The frame fills most of this crop, so a median "empty set" would pick up its colour;
# the backdrop is an even white, so divide by its measured colour instead.
ov_full = np.asarray(Image.open(f"{SRC}/new-frames/oval-olive.png").convert("RGB")).astype(np.float32)
paper = np.median(ov_full[20:200, 20:715].reshape(-1, 3), axis=0)
o = ov_full[268:500, 30:715]
save(Image.fromarray(np.clip(o / paper * 255, 0, 255).astype(np.uint8)), "rowan-olive")

# --- Tortoise aviator on a white tray against a cream wall ---
av = np.asarray(Image.open(f"{SRC}/new-frames/aviator-tortoise.webp").convert("RGB")).astype(np.float32)
ax0, ay0, ax1, ay1 = 265, 640, 940, 905
crop = av[ay0:ay1, ax0:ax1]
h, s, v = hsv(crop)
# Tortoise acetate: warm and saturated, or dark. Wall (cream) and tray (white) are neither.
frame_a = ((h < 50) & (s > 0.32) & (v < 0.9)) | (v < 0.42)
outline_cutout(crop, frame_a, "rowan-aviator")

# --- Sand + teal duo (white and orange planes split by a diagonal) ---
duo = np.asarray(Image.open(f"{SRC}/frames-sand-teal.webp").convert("RGB")).astype(np.float32)
H, W = duo.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
line = 550 - (550 / 620) * xx                      # the diagonal, read off a grid
white = yy < line - 6
orange = yy > line + 6
fp, duo_diff = frame_pixels(duo, [white, orange], [0.07, 0.11])
fp &= np.abs(yy - line) > 6                         # nothing of either frame sits on the seam except rims; closing bridges it
sand_box, teal_box = (25, 60, 565, 312), (160, 318, 736, 690)
for box, name in ((sand_box, "willow-sand"), (teal_box, "fern-teal")):
    x0, y0, x1, y1 = box
    region = np.zeros_like(fp); region[y0:y1, x0:x1] = True
    sub = (fp & region)[y0:y1, x0:x1]
    # Reflections on the glass: lighter than the backdrop around them.
    glare = np.clip(duo_diff[y0:y1, x0:x1] - 0.04, 0, 1)
    outline_cutout(duo[y0:y1, x0:x1], sub, name, glass=glare)

# --- Green sunglasses on cream ---
green = np.asarray(Image.open(f"{SRC}/frame-green-sun.png").convert("RGB")).astype(np.float32)
gx0, gy0, gx1, gy1 = 90, 410, 640, 660
crop = green[gy0:gy1, gx0:gx1]
h, s, v = hsv(crop)
frame_g = ((h > 70) & (h < 170) & (s > 0.25)) | ((s > 0.18) & (v < 0.55))   # green acetate, its dark inner shading
outline_cutout(crop, frame_g, "willow-green")
