from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent
bird = Image.open(root / 'dist/oldcrow-bird.png').convert('RGBA')
# Isolate the folded wing already present in the supplied crow artwork.
# All layers use the same canvas and shoulder pivot, so there is no jump.
mask = Image.new('L', bird.size)
ImageDraw.Draw(mask).polygon([
    (600,418), (628,409), (668,416), (705,445), (738,488),
    (770,545), (799,607), (824,666), (844,738), (851,806),
    (827,792), (791,752), (749,695), (708,641), (664,589),
    (623,542), (599,494), (591,455)
], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(1))
pixels = np.asarray(bird).copy()
wing = pixels.copy()
wing[:,:,3] = (wing[:,:,3].astype(float) * np.asarray(mask)/255).astype('uint8')
Image.fromarray(wing).save(root / 'dist/oldcrow-flight-wing.png', optimize=True)
# Replace the folded-wing highlights with the black torso underneath. Moving
# wing layers supply the feathers; the perched logo remains untouched.
body = pixels.copy()
weight = np.asarray(mask).astype(float)/255
body[:,:,:3] = (body[:,:,:3] * (1-weight[:,:,None])).astype('uint8')
Image.fromarray(body).save(root / 'dist/oldcrow-flight-body.png', optimize=True)
print('Created body and articulated feathered wing layers from the existing logo.')
