# 배경 그림에서 등불(하얗게 빛나는 심지 + 둘레의 주황 빛무리)을 찾아 빛 번짐 층(저해상도 PNG)을 만듦
# 쓰는 법: KEEP="x,y;x,y" [SPOTS="x,y;x,y"] [LOOSE=1] python3 -I tools/glow.py <배경 jpg> <저장할 png | -> [미리보기 png | -]
# KEEP = 찾은 등불 중 남길 위치, SPOTS = 작아서 못 찾은 등불 자리에 직접 찍을 위치 (둘 다 그림 % 좌표. tools/glow-keep.txt · glow-spots.txt 참고)
import sys, os
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
src, out = sys.argv[1], sys.argv[2]; prev = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
drop = {int(x) for x in sys.argv[4].split(',') if x} if len(sys.argv) > 4 else set()
im = Image.open(src).convert('RGB'); W, H = im.size
a = np.asarray(im).astype(float); R, G, B = a[..., 0], a[..., 1], a[..., 2]
L = 0.299 * R + 0.587 * G + 0.114 * B
blur = lambda m, r: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
orange = ((R > 225) & (G > 120) & (G < 228) & (B < 140) & (R - B > 110)).astype(float)
dens = blur(orange, max(4, W // 150))
local = blur(L / 255, max(8, W // 60)) * 255
if os.environ.get('LOOSE'):  # 지도처럼 등불이 작을 때: 덜 하얀 노란 심지도
    core = (L > 205) & (R > 235) & (G > 175) & (L - local > 45) & (dens > 0.08)
else:
    core = (L > 238) & (B > 140) & (dens > 0.22) & (L - local > 62)
c = core.astype(np.uint8); n = sum(np.roll(np.roll(c, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
core = core & (n >= 3)
S_ = 4; h, w = H // S_, W // S_
m = core[:h * S_, :w * S_].reshape(h, S_, w, S_).max(axis=(1, 3))
# 덩어리 나누기 (가까운 점은 한 덩어리): 2칸 넓힌 뒤 이어진 것끼리
grow = m.copy()
for dy in (-2, -1, 0, 1, 2):
    for dx in (-2, -1, 0, 1, 2): grow |= np.roll(np.roll(m, dy, 0), dx, 1)
lab = np.zeros((h, w), int); blobs = []
for y0, x0 in zip(*np.where(grow)):
    if lab[y0, x0]: continue
    k = len(blobs) + 1; st = [(y0, x0)]; lab[y0, x0] = k; pts = []
    while st:
        y, x = st.pop(); pts.append((y, x))
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < h and 0 <= xx < w and grow[yy, xx] and not lab[yy, xx]: lab[yy, xx] = k; st.append((yy, xx))
    ys, xs = zip(*pts); blobs.append((k, sum(xs) / len(xs), sum(ys) / len(ys), len(pts)))
import os
if os.environ.get('BLOBINFO'): print([(k, sz, round(cy / h * 100)) for k, cx, cy, sz in blobs])
MIN = int(os.environ.get('MINBLOB', 45))
drop |= {k for k, cx, cy, sz in blobs if sz < MIN}
# KEEP='x,y;x,y' (그림 % 좌표): 이 근처 덩어리만 남김
if os.environ.get('KEEP'):
    pts = [tuple(map(float, p.split(','))) for p in os.environ['KEEP'].split(';')]
    drop |= {k for k, cx, cy, sz in blobs if not any(abs(cx / w * 100 - px) < 3.5 and abs(cy / h * 100 - py) < 5 for px, py in pts)}
keep = m & ~np.isin(lab, list(drop))
# SPOTS='x,y;x,y' (그림 % 좌표): 찾지 못한 작은 등불 자리에 둥근 빛을 직접 찍음 (지도처럼 등불이 작을 때)
spots = [tuple(map(float, p.split(','))) for p in os.environ.get('SPOTS', '').split(';') if p]
if spots:
    keep = keep.copy(); yy, xx = np.mgrid[0:h, 0:w]; rr = max(2, w * 0.0045)
    for px, py in spots: keep |= (xx - px / 100 * w) ** 2 + (yy - py / 100 * h) ** 2 <= rr * rr
g = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float)
g = np.clip(g / max(g.max(), 1) * 1.8, 0, 1)
alpha = (g * 230).astype(np.uint8)
rgba = np.dstack([np.full_like(alpha, 255), np.full_like(alpha, 214), np.full_like(alpha, 130), alpha])
if (keep.any()) and out != '-': Image.fromarray(rgba, 'RGBA').save(out, optimize=True)
print(src.split('/')[-1], 'blobs', len(blobs), 'kept', len([b for b in blobs if b[0] not in drop]), 'saved' if keep.any() else 'NONE')
if prev:
    PW = int(os.environ.get('PREVW', 640)); t = im.resize((PW, round(PW * H / W))).convert('RGBA'); f = PW / w
    d = ImageDraw.Draw(t)
    for k, cx, cy, sz in blobs:
        if k in drop: continue
        col = (120, 120, 120, 255) if k in drop else (255, 0, 255, 255)
        r = 6 + min(sz, 60) ** 0.5; d.ellipse((cx * f - r, cy * f - r, cx * f + r, cy * f + r), outline=col, width=2)
        d.text((cx * f + r + 1, cy * f - 6), str(k), fill=col, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    d.text((4, 4), src.split('/')[-1], fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    t.save(prev)
