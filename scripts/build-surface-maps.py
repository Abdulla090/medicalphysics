"""Original tiling micro-surface maps. Deterministic; retain PNG sources beside Blender sources."""
from PIL import Image
from pathlib import Path
import math,random,subprocess,json
root=Path(__file__).resolve().parents[1];source=root/'assets/radiography/materials';out=root/'public/radiography';source.mkdir(parents=True,exist_ok=True)
rng=random.Random(27184);n=512
height=[];color=[];rough=[]
for y in range(n):
 for x in range(n):
  a=x/n*math.tau;b=y/n*math.tau
  pore=(rng.random()**18)*.32
  h=.5+.018*math.sin(a*97)*math.cos(b*89)-pore
  height.append(h);t=int(236+4*math.sin(a*3+math.sin(b*4))+rng.random()*6-pore*16)
  color.append((t,t-2,t-3,255));rough.append((int(172+rng.random()*25+pore*20),)*3+(255,))
norm=[]
for y in range(n):
 for x in range(n):
  dx=(height[y*n+(x+1)%n]-height[y*n+(x-1)%n])*.5;dy=(height[((y+1)%n)*n+x]-height[((y-1)%n)*n+x])*.5
  norm.append((int(128-dx*127),int(128-dy*127),255,255))
compiler=root/'.local-tools/ktx/extracted/bin/toktx.exe'
for name,data,srgb in [('skin-color',color,True),('skin-normal',norm,False),('skin-roughness',rough,False)]:
 img=Image.new('RGBA',(n,n));img.putdata(data);img.save(source/(name+'.png'))
 subprocess.run([str(compiler),'--t2','--encode','uastc','--uastc_quality','2','--genmipmap','--assign_oetf','srgb' if srgb else 'linear',str(out/(name+'.ktx2')),str(source/(name+'.png'))],check=True)
manifest=json.loads((out/'manifest.json').read_text());manifest['textures']=[{'url':'/radiography/'+n+'.ktx2','colorSpace':'sRGB' if n=='skin-color' else 'linear','source':'assets/radiography/materials/'+n+'.png'} for n in ['skin-color','skin-normal','skin-roughness']];(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
