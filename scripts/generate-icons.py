# สร้างไอคอนแอป / Android adaptive / splash ตามภาษาภาพ [DS]: พื้นดำ + แสงเรืองสีหลัก + ดัมเบลเส้นบางสีชมพูม่วงอ่อน
# ใช้: python3 scripts/generate-icons.py assets   (ต้องมี Pillow)
import sys
from PIL import Image, ImageDraw, ImageFilter

out = sys.argv[1] if len(sys.argv) > 1 else 'assets'
ACCENT = (229, 169, 220)  # #E5A9DC สีหลักค่าเริ่มต้น
GLOW = (110, 59, 143)


def glow_bg(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    g = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    r = int(size * 0.6)
    cx, cy = size // 2, int(size * -0.02)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GLOW + (210,))
    g = g.filter(ImageFilter.GaussianBlur(size * 0.18))
    img.alpha_composite(g)
    return img


def dumbbell(size, scale=1.0, color=ACCENT):
    """ดัมเบลแนวนอนแบบเส้นมน + เครื่องหมายถูกเล็กด้านล่าง (สื่อ 'วางแผนและเช็ก')"""
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2
    w = max(2, int(size * 0.045 * scale))
    bar_half = size * 0.22 * scale
    # คาน
    d.line([(c - bar_half, c - size * 0.04 * scale), (c + bar_half, c - size * 0.04 * scale)], fill=color + (255,), width=w)
    # แผ่นน้ำหนัก 2 ชั้นต่อข้าง
    for side in (-1, 1):
        for i, (off, h) in enumerate(((0.20, 0.13), (0.27, 0.09))):
            x = c + side * size * off * scale
            y0 = c - size * 0.04 * scale - size * h * scale
            y1 = c - size * 0.04 * scale + size * h * scale
            pw = size * 0.045 * scale
            d.rounded_rectangle([x - pw / 2, y0, x + pw / 2, y1], radius=pw / 2, outline=color + (255,), width=max(2, int(w * 0.8)))
    # เครื่องหมายถูก
    s = size * 0.11 * scale
    by = c + size * 0.17 * scale
    pts = [(c - s, by), (c - s * 0.25, by + s * 0.7), (c + s * 1.1, by - s * 0.6)]
    d.line(pts, fill=color + (255,), width=int(w * 1.1), joint='curve')
    for p in (pts[0], pts[-1]):
        rr = w * 0.55
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=color + (255,))
    return layer


S = 1024
icon = glow_bg(S)
icon.alpha_composite(dumbbell(S))
icon.convert('RGB').save(f'{out}/icon.png')
fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
fg.alpha_composite(dumbbell(S, scale=0.75))
fg.save(f'{out}/android-icon-foreground.png')
mono = dumbbell(S, scale=0.75, color=(255, 255, 255))
mono.save(f'{out}/android-icon-monochrome.png')
dumbbell(S, scale=1.3).save(f'{out}/splash-icon.png')
fav = glow_bg(48)
fav.alpha_composite(dumbbell(48))
fav.save(f'{out}/favicon.png')
print('icons written to', out)
