from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).resolve().parent
logo = np.asarray(Image.open(root / 'dist/oldcrow-transparent.png').convert('RGBA')).copy()
rgb = logo[:,:,:3].astype(int)
red = (rgb[:,:,0] - rgb[:,:,1] > 30) & (rgb[:,:,0] - rgb[:,:,2] > 30)
emblem = logo.copy()
emblem[~red] = 0
bird = logo.copy()
bird[red] = 0
Image.fromarray(emblem).save(root / 'dist/oldcrow-emblem.png', optimize=True)
Image.fromarray(bird).save(root / 'dist/oldcrow-bird.png', optimize=True)
assert not np.any((emblem[:,:,3] > 0) & (bird[:,:,3] > 0))
assert np.array_equal(np.maximum(emblem[:,:,3], bird[:,:,3]), logo[:,:,3])
print('Created aligned transparent bird and red-emblem layers; combined alpha matches the original.')
