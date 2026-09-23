from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

root = Path(__file__).resolve().parent
# This earlier restoration has a darker checkerboard, allowing the original
# white feather details to be separated from the false background reliably.
source = Image.open(root / 'logo-restored-draft.png').convert('RGB')
rgb = np.asarray(source).astype(float)
r, g, b = rgb.transpose(2, 0, 1)
gray = rgb.mean(axis=2)
red = (r > 110) & (r - g > 65) & (r - b > 65)
black = rgb.max(axis=2) < 85
white = rgb.min(axis=2) > 235

# Only retain white components touching the crow's black ink; discard isolated
# pale background artifacts while keeping interior feather and eye highlights.
labels = np.zeros(white.shape, dtype=np.int32)
count = 0
height, width = white.shape
for y, x in zip(*np.where(white)):
    if labels[y, x]:
        continue
    count += 1
    labels[y, x] = count
    queue = deque([(y, x)])
    while queue:
        cy, cx = queue.popleft()
        for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
            if 0 <= ny < height and 0 <= nx < width and white[ny,nx] and not labels[ny,nx]:
                labels[ny,nx] = count
                queue.append((ny,nx))
near_ink = np.asarray(Image.fromarray((black*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
areas = np.bincount(labels.ravel())
touches = np.bincount(labels[near_ink].ravel(), minlength=count + 1)
keep = (touches > 0) & (touches / np.maximum(areas, 1) > 0.035)
keep[0] = False
white = keep[labels]

# Sample actual solid red pixels from the user's original JPEG, not the
# generated reconstruction, so the exported red matches the brand reference.
original = np.asarray(Image.open(root / 'dist/oldcrow.jpg').convert('RGB'))
orig = original.astype(float)
selection = (orig[:,:,0] > 140) & (orig[:,:,0] - orig[:,:,1] > 95) & (orig[:,:,0] - orig[:,:,2] > 85) & (orig[:,:,1] < 100)
brand_red = np.median(orig[selection], axis=0).astype(np.uint8)

out = np.zeros((*gray.shape, 4), dtype=np.uint8)
out[red, :3] = brand_red
out[black, :3] = 0
out[white, :3] = 255
out[red | black | white, 3] = 255

# Re-render at a slightly smaller resolution to antialias the segmented edges.
logo = Image.fromarray(out, 'RGBA')
bounds = logo.getbbox()
logo = logo.crop(bounds)
logo.thumbnail((1060, 1060), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (1200, 1200), (0, 0, 0, 0))
canvas.alpha_composite(logo, ((1200-logo.width)//2, (1200-logo.height)//2))
canvas.save(root / 'dist/oldcrow-transparent.png', optimize=True)

# Review composite only; the web asset itself retains its true alpha channel.
preview = Image.new('RGB', (2400, 1200), '#f3efe5')
preview.paste(Image.new('RGB', (1200,1200), '#262820'), (1200,0))
preview.paste(canvas, (0,0), canvas)
preview.paste(canvas, (1200,0), canvas)
preview.save(root / 'logo-transparency-review.jpg')
alpha = np.asarray(canvas)[:,:,3]
print({'brand_red': '#'+''.join(f'{v:02x}' for v in brand_red), 'mode': canvas.mode, 'transparent_pixels': int((alpha == 0).sum()), 'partial_alpha_pixels': int(((alpha > 0) & (alpha < 255)).sum()), 'bounds': canvas.getbbox()})

