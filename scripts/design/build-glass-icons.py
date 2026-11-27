"""Build original COLR icons. Presentation only; preserves all original Unicode text."""
from pathlib import Path
import math, shutil
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

ROOT=Path(__file__).resolve().parents[2]
def glyph(draw,drop=0):
 p=TTGlyphPen(None)
 def poly(points):
  p.moveTo((points[0][0]*40+40,880-(points[0][1]+drop)*40))
  for x,y in points[1:]:p.lineTo((x*40+40,880-(y+drop)*40))
  p.closePath()
 def circle(x,y,r):
  n=20;poly([(x+r*math.cos(i*math.tau/n),y+r*math.sin(i*math.tau/n)) for i in range(n)])
 def line(x,y,a,b,w=1.4):
  d=math.hypot(a-x,b-y);dx=-(b-y)/d*w/2;dy=(a-x)/d*w/2
  poly([(x+dx,y+dy),(a+dx,b+dy),(a-dx,b-dy),(x-dx,y-dy)])
  circle(x,y,w/2);circle(a,b,w/2)
 def rect(x,y,w,h):poly([(x,y),(x+w,y),(x+w,y+h),(x,y+h)])
 def roundrect(x,y,w,h,r=4):
  pts=[]
  for cx,cy,start in [(x+w-r,y+r,-90),(x+w-r,y+h-r,0),(x+r,y+h-r,90),(x+r,y+r,180)]:
   pts += [(cx+r*math.cos(math.radians(start+i*90/5)),cy+r*math.sin(math.radians(start+i*90/5))) for i in range(6)]
  poly(pts)
 draw(poly,circle,line,rect,roundrect)
 return p.glyph()

def pictogram(kind):
 def draw(P,C,L,R,B):
  if kind=='diamond':
   for a,b in [((5,9),(8,5)),((8,5),(16,5)),((16,5),(19,9)),((19,9),(12,19)),((12,19),(5,9)),((5,9),(19,9)),((9,9),(12,19)),((15,9),(12,19)),((8,5),(9,9)),((16,5),(15,9))]:L(*a,*b,1)
  elif kind=='bank':
   P([(4,8),(12,4),(20,8)]);R(4,18,16,1.5)
   for x in [6,11,16]:R(x,10,1.8,6)
  elif kind in ['money','card']:
   for a,b in [((5,6),(19,6)),((19,6),(19,18)),((19,18),(5,18)),((5,18),(5,6))]:L(*a,*b,1.2)
   if kind=='card':R(5,9,14,2);R(8,14,4,1.5)
   else:C(12,12,2.4);L(7,9,7,15,1);L(17,9,17,15,1)
  elif kind=='scales':
   L(12,5,12,18);L(8,19,16,19);L(5,8,19,8);C(12,5,1)
   for x in [6,18]:
    L(x,8,x-3,14,0.8);L(x,8,x+3,14,0.8);P([(x-3,14),(x+3,14),(x+1.5,16),(x-1.5,16)])
  elif kind in ['receipt','file','clipboard','folder']:
   if kind=='folder':
    for a,b in [((4,8),(10,8)),((10,8),(12,10)),((12,10),(20,10)),((20,10),(19,18)),((19,18),(4,18)),((4,18),(4,8))]:L(*a,*b,1.2)
   else:
    for a,b in [((7,5),(17,5)),((17,5),(17,19)),((17,19),(7,19)),((7,19),(7,5))]:L(*a,*b,1.2)
    for y in [9,12,15]:L(10,y,14,y,1)
    if kind=='clipboard':R(9,4,6,3)
  elif kind=='box':
   for a,b in [((5,8),(12,4)),((12,4),(19,8)),((19,8),(19,16)),((19,16),(12,20)),((12,20),(5,16)),((5,16),(5,8)),((5,8),(12,12)),((12,12),(19,8)),((12,12),(12,20))]:L(*a,*b,1.2)
  elif kind=='chart':
   R(5,13,3,6);R(10.5,9,3,10);R(16,5,3,14)
  elif kind=='hourglass':
   L(6,5,18,5);L(6,19,18,19);L(7,6,17,18);L(17,6,7,18);L(7,6,7,9);L(17,6,17,9);L(7,15,7,18);L(17,15,17,18)
  elif kind=='rewind':P([(11,6),(4,12),(11,18)]);P([(20,6),(13,12),(20,18)])
  elif kind=='barcode':
   for x,w in [(5,1.1),(7.4,.7),(9.5,1.6),(12.2,.7),(14.5,1.1),(17,1.8)]:R(x,6,w,12)
  elif kind in ['person','people']:
   C(12,8,3);L(7,18,8,14,2);L(8,14,16,14,2);L(16,14,17,18,2)
   if kind=='people':C(5,10,1.7);C(19,10,1.7);L(4,15,3,18,1.6);L(20,15,21,18,1.6)
  elif kind in ['refresh','clock','globe','eye','target','info']:
   if kind=='eye':
    for a,b in [((4,12),(8,8)),((8,8),(16,8)),((16,8),(20,12)),((20,12),(16,16)),((16,16),(8,16)),((8,16),(4,12))]:L(*a,*b,1)
    C(12,12,2)
   else:
    for i in range(28):
     if kind=='refresh' and i>23:continue
     t=i*math.tau/28;t2=(i+1)*math.tau/28;L(12+7*math.cos(t),12+7*math.sin(t),12+7*math.cos(t2),12+7*math.sin(t2),1.1)
    if kind=='refresh':P([(19,7),(14,6),(18,3)])
    elif kind=='clock':L(12,7,12,12);L(12,12,15,14)
    elif kind=='globe':L(5,12,19,12,1);L(12,5,12,19,1);L(7,8,17,8,0.6);L(7,16,17,16,0.6)
    elif kind=='info':C(12,8,1);L(12,11,12,17,1.5)
    else:C(12,12,2.5)
  elif kind in ['check','cross','plus','minus','arrow','return','download','upload']:
   if kind=='check':L(6,12,10,16,1.8);L(10,16,18,7,1.8)
   elif kind=='cross':L(7,7,17,17,1.8);L(17,7,7,17,1.8)
   elif kind in ['plus','minus']:L(6,12,18,12,1.8);L(12,6,12,18,1.8) if kind=='plus' else None
   elif kind=='arrow':L(5,12,18,12);L(13,7,18,12);L(13,17,18,12)
   elif kind=='return':L(7,9,17,9);L(17,9,17,17);L(17,17,11,17);L(7,9,11,5);L(7,9,11,13)
   else:
    a,b=(6,15) if kind=='download' else (17,8);L(12,a,12,b);L(8,b-4 if kind=='download' else b+4,12,b);L(16,b-4 if kind=='download' else b+4,12,b);L(6,19,18,19)
  elif kind=='warning':
   for a,b in [((12,5),(20,19)),((20,19),(4,19)),((4,19),(12,5))]:L(*a,*b,1.2)
   L(12,10,12,14,1.7);C(12,16.7,0.8)
  elif kind in ['lock','key','shield']:
   if kind=='shield':
    for a,b in [((5,7),(12,4)),((12,4),(19,7)),((19,7),(17,16)),((17,16),(12,20)),((12,20),(7,16)),((7,16),(5,7))]:L(*a,*b,1.3)
    L(9,12,11,14);L(11,14,15,9)
   elif kind=='key':
    for i in range(20):
     t=i*math.tau/20;u=(i+1)*math.tau/20;L(9+3*math.cos(t),9+3*math.sin(t),9+3*math.cos(u),9+3*math.sin(u),1.2)
    L(11,11,18,18,1.5);L(15,15,17,13);L(17,17,19,15)
   else:
    B(6,10,12,10,2);L(9,10,9,6);L(9,6,15,6);L(15,6,15,10)
  elif kind=='search':
   for i in range(24):
    t=i*math.tau/24;u=(i+1)*math.tau/24;L(10+5*math.cos(t),10+5*math.sin(t),10+5*math.cos(u),10+5*math.sin(u),1.2)
   L(14,14,19,19,1.8)
  elif kind=='calendar':
   for a,b in [((5,7),(19,7)),((19,7),(19,19)),((19,19),(5,19)),((5,19),(5,7)),((5,10),(19,10)),((8,5),(8,8)),((16,5),(16,8))]:L(*a,*b,1.2)
   for x in [8,12,16]:C(x,14,0.7)
  elif kind=='cart':
   L(4,6,6,6);L(6,6,8,15);L(8,15,18,15);L(18,15,20,8);L(7,8,20,8);C(9,19,1.5);C(17,19,1.5)
  elif kind=='edit':
   P([(6,15),(15,6),(18,9),(9,18),(5,19)]);L(14,7,17,10,0.6)
  elif kind=='trash':
   L(5,7,19,7);L(9,5,15,5);L(7,9,8,19);L(8,19,16,19);L(16,19,17,9);L(10,10,10,16,0.8);L(14,10,14,16,0.8)
  elif kind=='phone':B(7,4,10,16,2);R(10,6,4,10);C(12,18,0.7)
  elif kind=='pin':C(12,9,4);P([(8,11),(16,11),(12,20)])
  elif kind=='printer':
   R(7,4,10,4);R(4,9,16,8);R(7,15,10,5);C(17,12,0.7)
  elif kind=='save':
   R(5,5,14,14);R(8,5,7,5);R(8,14,8,5)
  elif kind=='chain':
   for dx,dy in [(0,0),(4,4)]:
    for a,b in [((6,10),(10,6)),((10,6),(14,6)),((14,6),(14,10)),((14,10),(10,14)),((10,14),(6,14)),((6,14),(6,10))]:L(a[0]+dx,a[1]+dy,b[0]+dx,b[1]+dy,1)
  elif kind=='tag':
   for a,b in [((5,5),(13,5)),((13,5),(20,12)),((20,12),(12,20)),((12,20),(5,13)),((5,13),(5,5))]:L(*a,*b,1.2)
   C(9,9,1.2)
  elif kind in ['gear','tools']:
   if kind=='tools':L(6,18,17,7,2.4);L(14,5,18,9,2);L(5,7,17,19,1.8)
   else:
    for i in range(8):
     t=i*math.tau/8;L(12+5*math.cos(t),12+5*math.sin(t),12+8*math.cos(t),12+8*math.sin(t),2)
    for i in range(24):
     t=i*math.tau/24;u=(i+1)*math.tau/24;L(12+5*math.cos(t),12+5*math.sin(t),12+5*math.cos(u),12+5*math.sin(u),2)
  elif kind=='bolt':P([(13,4),(6,14),(11,14),(10,21),(19,10),(13,10)])
  elif kind=='light':C(12,9,4);R(9,12,6,4);L(10,19,14,19,1.5)
  elif kind=='truck':R(4,8,10,9);R(14,11,6,6);C(8,18,2);C(17,18,2)
  elif kind=='chat':B(4,5,16,12,3);P([(7,15),(7,20),(12,15)]);C(8,11,0.7);C(12,11,0.7);C(16,11,0.7)
  elif kind=='robot':B(5,8,14,12,3);L(12,8,12,5);C(12,4,1);C(9,13,1.2);C(15,13,1.2);L(9,17,15,17,1)
  elif kind=='medal':P([(7,4),(11,4),(14,10),(10,10)]);P([(13,4),(17,4),(14,10),(10,10)]);C(12,15,4.7)
  elif kind=='status':C(12,12,5)
  else:
   P([(12,4),(14,10),(20,12),(14,14),(12,20),(10,14),(4,12),(10,10)]);P([(18,3),(19,5),(21,6),(19,7),(18,9),(17,7),(15,6),(17,5)])
 return draw

groups={'diamond':'💎','bank':'🏦🏢🏬🏭','money':'💵💰💸','card':'💳','scales':'⚖','receipt':'🧾📜','file':'📄📑','clipboard':'📋','folder':'📁💼','box':'📦','chart':'📊📈📉','person':'👤','people':'👥','refresh':'🔄','clock':'🕒','globe':'🌐','eye':'👁','target':'🎯','check':'✅✓✔','cross':'❌✕','plus':'➕','minus':'➖','arrow':'➔','download':'📥','upload':'📤','warning':'⚠🚨','lock':'🔒🔓','key':'🔑','shield':'🛡','search':'🔍','calendar':'📅🗓📆','cart':'🛒🛍','edit':'✏','trash':'🗑','phone':'📱📞','pin':'📍','printer':'🖨','save':'💾','chain':'🧵','tag':'🏷','gear':'⚙','tools':'🛠','bolt':'⚡','light':'💡','truck':'🚚','chat':'💬','robot':'🧠','medal':'🥇🥈🥉','status':'🟢🔴🟡','sparkle':'✨🌟★🎨🎉🎲'}
mapping={ord(ch):kind for kind,chars in groups.items() for ch in chars}
groups.update({'info':'ℹ','return':'↩'})
mapping.update({ord(ch):kind for kind in ['info','return'] for ch in groups[kind]})
groups.update({'hourglass':'⏳','rewind':'⏪','barcode':'║'})
for kind in ['hourglass','rewind','barcode']:mapping.update({ord(ch):kind for ch in groups[kind]})
mapping.update({0x21BA:'refresh',0xE001:'money',0xE002:'cross',0xE003:'plus',0xE004:'minus'})
for file in [ROOT/'index.html',*(ROOT/'js').glob('*.js')]:
 for ch in file.read_text(encoding='utf-8'):
  if 0x1F000<=ord(ch)<=0x1FAFF or 0x2600<=ord(ch)<=0x27FF:mapping.setdefault(ord(ch),'sparkle')
palette=[(0.05,0.48,0.77,1),(0.35,0.29,0.78,1),(0.04,0.55,0.43,1),(0.75,0.43,0.08,1),(0.79,0.20,0.32,1),(1,1,1,0.24),(1,1,1,0.12),(1,1,1,0.94)]
palette += [(1,1,1,.72),(.03,.11,.24,.33)]
gly={'.notdef':glyph(lambda *a:None)}
gly['tile']=glyph(lambda P,C,L,R,B:B(1,1,22,22,5))
gly['shine']=glyph(lambda P,C,L,R,B:B(2,2,20,9,4))
gly['facet']=glyph(lambda P,C,L,R,B:P([(2,20),(20,2),(22,5),(22,19),(19,22),(5,22)]))
for kind in groups:
 gly['shape_'+kind]=glyph(pictogram(kind))
 gly['shadow_'+kind]=glyph(pictogram(kind),.45)
bands=[]
for i in range(24):
 y=1.6+i*20.8/24;h=20.8/24+.025
 def left(t):
  r=4.8;d=max(0,6.4-t,t-17.6)
  return 1.6+r-math.sqrt(max(0,r*r-d*d))
 x1,x2=left(y),left(min(22.4,y+h))
 name='glass_band_'+str(i);gly[name]=glyph(lambda P,C,L,R,B,y=y,h=h,x1=x1,x2=x2:P([(x1,y),(24-x1,y),(24-x2,y+h),(x2,y+h)]));bands.append(name)
gradient_indices={}
for tone in range(5):
 gradient_indices[tone]=[]
 for i in range(24):
  t=i/23;blend=.53*(1-t)**2
  gradient_indices[tone].append(len(palette))
  palette.append(tuple(v*(1-blend)+blend for v in palette[tone][:3])+(.94,))
colorlayers={};cmap={}
for cp,kind in mapping.items():
 name='u'+hex(cp)[2:];gly[name]=gly['.notdef'];cmap[cp]=name
 tone=2 if kind in ['check','money'] else 3 if kind in ['medal','scales','warning'] else 4 if kind in ['cross','trash'] else 1 if kind in ['sparkle','robot','diamond','chain'] else 0
 if cp==ord('🔴'):tone=4
 if cp==ord('🟡'):tone=3
 if cp==ord('🟢'):tone=2
 colorlayers[name]=[('tile',8),*[(band,gradient_indices[tone][i]) for i,band in enumerate(bands)],('shine',5),('facet',6),('shadow_'+kind,9),('shape_'+kind,7)]
gly['barcode_combined']=gly['.notdef'];colorlayers['barcode_combined']=colorlayers['u2551']
fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(list(gly));fb.setupCharacterMap(cmap);fb.setupGlyf(gly);fb.setupHorizontalMetrics({n:(1040,getattr(g,'xMin',0)) for n,g in gly.items()});fb.setupHorizontalHeader(ascent=1000,descent=-200);fb.setupNameTable({'familyName':'Charles Glass Icons','styleName':'Regular','uniqueFontIdentifier':'CharlesGlassIcons-3','fullName':'Charles Glass Icons','psName':'CharlesGlassIcons-Regular','version':'Version 3.0'});fb.setupOS2(sTypoAscender=1000,sTypoDescender=-200,usWinAscent=1000,usWinDescent=200);fb.setupPost();fb.font['COLR']=buildCOLR(colorlayers,version=0);fb.font['CPAL']=buildCPAL([palette])
addOpenTypeFeaturesFromString(fb.font,'feature liga { sub u2551 u2551 u2551 u2551 by barcode_combined; } liga;')
uvs=CmapSubtable.newSubtable(14);uvs.platformID=0;uvs.platEncID=5;uvs.cmap={};uvs.uvsDict={0xFE0F:[(cp,None) for cp in mapping]};fb.font['cmap'].tables.append(uvs)
output=ROOT/'icons/charles-glass-icons.woff2';fb.font.flavor='woff2';fb.font.save(output);shutil.copy2(output,ROOT/'public/icons'/output.name)
print(f'{len(mapping)} Unicode icons, {len(groups)} original pictograms, {output.stat().st_size} bytes')
