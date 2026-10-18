"""Optimize local CC0 source textures without changing their originals. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageOps
import json
PROJECT=Path(__file__).resolve().parents[1]
root=PROJECT/'assets/radiography/vendor/makehuman/system'
out=PROJECT/'assets/radiography/materials/character';out.mkdir(parents=True,exist_ok=True)
mapping={}
for path in root.rglob('*.png'):
    if not path.name.endswith(('diffuse.png','_eye.png','_normal.png')):continue
    im=Image.open(path);hair='hair' in path.parts;normal=path.name.endswith('_normal.png');eye='eyes' in path.parts
    size=1024 if hair else 512 if normal or eye else 2048
    im.thumbnail((size,size),Image.Resampling.LANCZOS)
    dest=out/(path.parent.name+'-'+path.stem+('.png' if hair or normal else '.jpg'))
    if hair or normal:im.save(dest,optimize=True)
    else:im.convert('RGB').save(dest,quality=87,optimize=True)
    mapping[path.relative_to(root).as_posix()]=dest.relative_to(PROJECT).as_posix()
im=Image.open(root/'clothes/male_casualsuit01/male_casualsuit01_diffuse.png').convert('RGB')
im.thumbnail((2048,2048),Image.Resampling.LANCZOS)
ImageOps.grayscale(im).point(lambda p:int(255*(p/255)**.45)).convert('RGB').save(out/'cotton-neutral.jpg',quality=87,optimize=True)
(out/'textures.json').write_text(json.dumps(mapping,indent=2))
print('Prepared character textures; original files unchanged.')
