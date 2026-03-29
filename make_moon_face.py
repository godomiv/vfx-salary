"""
Generate a Méliès-style "Moon Face" composite:
- Moon texture as a sphere/circle
- Face from the beanie photo blended onto the moon
- Projectile (cone) stuck in the right eye
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math

BASE = "D:/PROJECT/2026/vfx_salary"
OUT  = f"{BASE}/melies_moon_face.jpg"

# ── 1. Load sources ───────────────────────────────────
face_src = Image.open(f"{BASE}/image_1m2pkmgme0h9k50nal7t_0.png").convert("RGBA")
moon_tex = Image.open(f"{BASE}/moon-photo.jpg").convert("RGBA")

SIZE = 1200  # output moon circle diameter

# ── 2. Create circular moon from texture ──────────────
# Take center crop from moon texture
mw, mh = moon_tex.size
crop_size = min(mw, mh)
mx = (mw - crop_size) // 2
my = (mh - crop_size) // 2
moon_crop = moon_tex.crop((mx, my, mx + crop_size, my + crop_size))
moon_crop = moon_crop.resize((SIZE, SIZE), Image.LANCZOS)

# Create circular mask
circle_mask = Image.new("L", (SIZE, SIZE), 0)
draw_mask = ImageDraw.Draw(circle_mask)
draw_mask.ellipse((0, 0, SIZE - 1, SIZE - 1), fill=255)

# Apply slight spherical shading (darker at edges)
shade = Image.new("L", (SIZE, SIZE), 0)
shade_draw = ImageDraw.Draw(shade)
cx, cy = SIZE // 2, SIZE // 2
for r in range(SIZE // 2, 0, -1):
    brightness = int(255 * (r / (SIZE // 2)) ** 0.5)
    shade_draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=brightness)

moon_circle = moon_crop.copy()
# Darken edges
moon_arr = moon_circle.split()
r_ch, g_ch, b_ch, a_ch = moon_arr
from PIL import ImageChops
r_ch = ImageChops.multiply(r_ch, shade)
g_ch = ImageChops.multiply(g_ch, shade)
b_ch = ImageChops.multiply(b_ch, shade)
moon_circle = Image.merge("RGBA", (r_ch, g_ch, b_ch, circle_mask))

# ── 3. Extract and prepare face ───────────────────────
# Crop face region — just head + beard, no shoulders
fw, fh = face_src.size
face_crop_y = int(fh * 0.05)   # top of beanie
face_crop_h = int(fh * 0.52)   # down to chin/beard only
face_crop_x = int(fw * 0.25)
face_crop_w = int(fw * 0.50)
face = face_src.crop((face_crop_x, face_crop_y, face_crop_x + face_crop_w, face_crop_y + face_crop_h))

# Resize face to fit moon — bigger face
face_size = int(SIZE * 0.85)
face_h = int(face_size * face.height / face.width)
face = face.resize((face_size, face_h), Image.LANCZOS)

# Convert face to grayscale-ish (desaturate heavily for vintage look)
face_gray = ImageEnhance.Color(face).enhance(0.0)  # fully desaturated
face_gray = ImageEnhance.Contrast(face_gray).enhance(1.3)
face_gray = ImageEnhance.Brightness(face_gray).enhance(0.85)

# Create oval mask for face blending (soft edges)
face_mask = Image.new("L", (face_size, face_h), 0)
fm_draw = ImageDraw.Draw(face_mask)
# Oval slightly smaller than face
pad_x = int(face_size * 0.05)
pad_y = int(face_h * 0.05)
fm_draw.ellipse((pad_x, pad_y, face_size - pad_x, face_h - pad_y), fill=200)
face_mask = face_mask.filter(ImageFilter.GaussianBlur(radius=40))

# ── 4. Composite face onto moon ──────────────────────
# Position face centered on moon
fx = (SIZE - face_size) // 2
fy = (SIZE - face_h) // 2 + int(SIZE * 0.02)  # slightly lower

# Blend: use multiply-like effect for moon texture to show through
result = moon_circle.copy()
result.paste(face_gray, (fx, fy), face_mask)

# Re-apply circle mask
result.putalpha(circle_mask)

# Mix with moon texture for that "face in the moon" look
# Blend result with original moon to let craters show through
blended = Image.blend(
    moon_circle.convert("RGBA"),
    result.convert("RGBA"),
    alpha=0.7  # 70% face, 30% moon
)
blended.putalpha(circle_mask)

# ── 5. Draw projectile (cone/rocket) in right eye ────
draw = ImageDraw.Draw(blended)

# Right eye position (viewer's right, like Méliès)
eye_x = fx + int(face_size * 0.56)
eye_y = fy + int(face_h * 0.58)

# Draw a cone/bullet shape — bigger and more visible
bullet_len = int(SIZE * 0.22)
bullet_w = int(SIZE * 0.05)

# Cone tip embedded in the eye, body extending upper-right
angle = math.radians(-30)  # coming from upper-right
tip_x, tip_y = eye_x, eye_y

# Base of the cone (away from eye)
base_cx = tip_x + int(bullet_len * math.cos(angle))
base_cy = tip_y + int(bullet_len * math.sin(angle))

# Perpendicular for base width
perp_angle = angle + math.pi / 2
bx1 = base_cx + int(bullet_w * math.cos(perp_angle))
by1 = base_cy + int(bullet_w * math.sin(perp_angle))
bx2 = base_cx - int(bullet_w * math.cos(perp_angle))
by2 = base_cy - int(bullet_w * math.sin(perp_angle))

# Draw cone body
draw.polygon([(tip_x, tip_y), (bx1, by1), (bx2, by2)], fill=(60, 60, 65, 255))

# Draw cone base (flat end) - a wider rectangle behind
base_ext = int(bullet_len * 0.5)
ext_cx = base_cx + int(base_ext * math.cos(angle))
ext_cy = base_cy + int(base_ext * math.sin(angle))
ext_w = int(bullet_w * 1.3)
ex1 = ext_cx + int(ext_w * math.cos(perp_angle))
ey1 = ext_cy + int(ext_w * math.sin(perp_angle))
ex2 = ext_cx - int(ext_w * math.cos(perp_angle))
ey2 = ext_cy - int(ext_w * math.sin(perp_angle))
draw.polygon([(bx1, by1), (bx2, by2), (ex2, ey2), (ex1, ey1)], fill=(50, 50, 55, 255))

# Decorative ring on bullet
ring_cx = base_cx + int(bullet_len * 0.05 * math.cos(angle))
ring_cy = base_cy + int(bullet_len * 0.05 * math.sin(angle))
ring_w = int(bullet_w * 1.15)
rx1 = ring_cx + int(ring_w * math.cos(perp_angle))
ry1 = ring_cy + int(ring_w * math.sin(perp_angle))
rx2 = ring_cx - int(ring_w * math.cos(perp_angle))
ry2 = ring_cy - int(ring_w * math.sin(perp_angle))
# Thin ring
rr = int(bullet_len * 0.03)
r_end_cx = ring_cx + int(rr * math.cos(angle))
r_end_cy = ring_cy + int(rr * math.sin(angle))
re1 = r_end_cx + int(ring_w * math.cos(perp_angle))
re1y = r_end_cy + int(ring_w * math.sin(perp_angle))
re2 = r_end_cx - int(ring_w * math.cos(perp_angle))
re2y = r_end_cy - int(ring_w * math.sin(perp_angle))
draw.polygon([(rx1, ry1), (rx2, ry2), (re2, re2y), (re1, re1y)], fill=(80, 80, 85, 255))

# ── 6. Add dark space background ─────────────────────
canvas_w, canvas_h = SIZE + 200, SIZE + 200
canvas = Image.new("RGB", (canvas_w, canvas_h), (5, 5, 10))

# Add a few stars
import random
random.seed(42)
star_draw = ImageDraw.Draw(canvas)
for _ in range(80):
    sx = random.randint(0, canvas_w)
    sy = random.randint(0, canvas_h)
    sb = random.randint(100, 255)
    sr = random.randint(0, 2)
    star_draw.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=(sb, sb, sb))

# Paste moon onto canvas
paste_x = (canvas_w - SIZE) // 2
paste_y = (canvas_h - SIZE) // 2
canvas.paste(blended, (paste_x, paste_y), blended)

# ── 7. Vintage effect ────────────────────────────────
# Sepia/vintage tint
canvas_v = ImageEnhance.Color(canvas).enhance(0.3)
canvas_v = ImageEnhance.Contrast(canvas_v).enhance(1.1)

# Light sepia toning
r, g, b = canvas_v.split()
r = ImageEnhance.Brightness(r.convert("RGB").split()[0].convert("L")).enhance(1.05)
canvas_v = Image.merge("RGB", (
    r,
    g,
    ImageEnhance.Brightness(b).enhance(0.9)
))

# Add slight vignette
vignette = Image.new("L", (canvas_w, canvas_h), 0)
vig_draw = ImageDraw.Draw(vignette)
vcx, vcy = canvas_w // 2, canvas_h // 2
max_r = int(math.sqrt(vcx**2 + vcy**2))
for rad in range(max_r, 0, -2):
    val = int(255 * min(1.0, (rad / max_r) * 1.5))
    val = 255 - int((255 - val) * 0.4)  # subtle vignette
    vig_draw.ellipse((vcx - rad, vcy - rad, vcx + rad, vcy + rad), fill=val)

vig_rgb = Image.merge("RGB", (vignette, vignette, vignette))
canvas_v = ImageChops.multiply(canvas_v, vig_rgb)

# ── 8. Save ──────────────────────────────────────────
canvas_v.save(OUT, quality=95)
print(f"Saved to {OUT} — {canvas_v.size}")
