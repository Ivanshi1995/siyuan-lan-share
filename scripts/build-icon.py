"""Render the project's vector icon to a deterministic 160px PNG."""
import struct
import zlib
from pathlib import Path
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parent.parent
source = '''<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
<rect x="4" y="4" width="152" height="152" rx="36" fill="#103e39"/>
<polygon points="48,28 82,28 106,52 106,121 100,127 48,127 42,121 42,34" fill="#f1fbf6"/>
<polygon points="82,28 82,52 106,52" fill="#97dac0"/>
<rect x="55" y="66" width="32" height="6" rx="3" fill="#497f70"/>
<rect x="55" y="81" width="24" height="6" rx="3" fill="#497f70"/>
<circle cx="108" cy="110" r="29" fill="#103e39"/>
<line x1="94" y1="110" x2="121" y2="94" stroke="#a7efd1" stroke-width="6"/>
<line x1="94" y1="110" x2="121" y2="126" stroke="#a7efd1" stroke-width="6"/>
<circle cx="93" cy="110" r="8" fill="#a7efd1"/>
<circle cx="121" cy="93" r="8" fill="#a7efd1"/>
<circle cx="121" cy="127" r="8" fill="#a7efd1"/>
</svg>'''
(root / 'assets').mkdir(exist_ok=True)
(root / 'assets/icon.svg').write_bytes(source.encode('utf-8'))
scale = 4
width = 160 * scale
pixels = bytearray(width * width * 4)

def color(value):
    return bytes(int(value[i:i+2], 16) for i in (1, 3, 5)) + b'\xff'

for element in ET.fromstring(source):
    tag = element.tag.split('}')[-1]
    a = element.attrib
    inside = None
    if tag == 'rect':
        x, y, w, h = [float(a[k]) for k in ('x', 'y', 'width', 'height')]
        radius = float(a.get('rx', 0))
        def inside(px, py, x=x, y=y, w=w, h=h, r=radius):
            if not (x <= px <= x+w and y <= py <= y+h):
                return False
            cx, cy = max(x+r, min(px, x+w-r)), max(y+r, min(py, y+h-r))
            return (px-cx)**2 + (py-cy)**2 <= r*r
    elif tag == 'circle':
        cx, cy, radius = [float(a[k]) for k in ('cx', 'cy', 'r')]
        def inside(px, py, cx=cx, cy=cy, r=radius):
            return (px-cx)**2 + (py-cy)**2 <= r*r
    elif tag == 'polygon':
        points = [tuple(map(float, value.split(','))) for value in a['points'].split()]
        def inside(px, py, pts=points):
            hit = False
            for i, (ax, ay) in enumerate(pts):
                bx, by = pts[i-1]
                if (ay > py) != (by > py) and px < (bx-ax)*(py-ay)/(by-ay)+ax:
                    hit = not hit
            return hit
    elif tag == 'line':
        ax, ay, bx, by, stroke = [float(a[k]) for k in ('x1', 'y1', 'x2', 'y2', 'stroke-width')]
        def inside(px, py, ax=ax, ay=ay, bx=bx, by=by, r=stroke/2):
            u = max(0, min(1, ((px-ax)*(bx-ax)+(py-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)))
            return (px-ax-u*(bx-ax))**2 + (py-ay-u*(by-ay))**2 <= r*r
    if inside:
        ink = color(a.get('fill', a.get('stroke')))
        for py in range(width):
            for px in range(width):
                if inside((px+.5)/scale, (py+.5)/scale):
                    offset = (py*width+px)*4
                    pixels[offset:offset+4] = ink

rows = []
for y in range(160):
    row = bytearray(b'\0')
    for x in range(160):
        samples = [(yy*width+xx)*4 for yy in range(y*scale, (y+1)*scale) for xx in range(x*scale, (x+1)*scale)]
        alpha = sum(pixels[i+3] for i in samples)
        rgb = [round(sum(pixels[i+c]*pixels[i+3] for i in samples)/alpha) if alpha else 0 for c in range(3)]
        row.extend(rgb + [round(alpha/(scale*scale))])
    rows.append(row)

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind+data) & 0xffffffff)

png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 160, 160, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b'')
(root / 'icon.png').write_bytes(png)
print('icon.png and assets/icon.svg generated.')
