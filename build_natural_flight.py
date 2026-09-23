from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent
reference = Image.open(root / 'crow-flight-reference.gif')
frames = []
durations = []
# One complete wingbeat from the user-provided motion reference. Isolate the
# crow, discard the sky, and stabilize its torso instead of its changing wings.
for index in range(8, 44):
    reference.seek(index)
    rgb = np.asarray(reference.convert('RGB')).astype(float)
    intensity = rgb.mean(axis=2)
    mask = intensity < 45
    labels = np.zeros(mask.shape, dtype=np.int32)
    components = []
    h,w = mask.shape
    for y,x in zip(*np.where(mask)):
        if labels[y,x]: continue
        label = len(components)+1
        labels[y,x] = label
        queue = deque([(y,x)])
        coords = []
        while queue:
            cy,cx = queue.popleft()
            coords.append((cy,cx))
            for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny,nx] and not labels[ny,nx]:
                    labels[ny,nx] = label
                    queue.append((ny,nx))
        components.append(coords)
    bird = max(components, key=len)
    ys,xs = np.asarray(bird).T
    projection = xs-ys
    head = np.array([xs[projection >= np.percentile(projection,99)].mean(), ys[projection >= np.percentile(projection,99)].mean()])
    tail = np.array([xs[projection <= np.percentile(projection,1)].mean(), ys[projection <= np.percentile(projection,1)].mean()])
    anchor = head*.48 + tail*.52
    alpha = np.zeros(mask.shape,dtype=np.uint8)
    alpha[ys,xs] = np.clip((45-intensity[ys,xs])/18*255,0,255).astype('uint8')
    image = Image.new('RGBA',(w,h),(9,10,8,0))
    image.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.35)))
    canvas = Image.new('RGBA',(512,512))
    canvas.alpha_composite(image, (int(256-anchor[0]), int(256-anchor[1])))
    canvas = canvas.resize((256,256),Image.Resampling.LANCZOS)
    frames.append(canvas)
    durations.append(reference.info.get('duration',30))
frames[0].save(root/'dist/crow-natural-flight.webp',save_all=True,append_images=frames[1:],duration=durations,loop=0,lossless=True,method=6)
board = Image.new('RGB',(256*6,256*2),'#f3efe5')
for j,i in enumerate(range(0,36,3)):
    board.paste(frames[i],((j%6)*256,(j//6)*256),frames[i])
board.save(root/'crow-natural-flight-review.jpg')
print(f'Exported {len(frames)} transparent frames, {sum(durations)}ms wingbeat cycle.')
