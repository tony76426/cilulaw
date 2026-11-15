#!/usr/bin/env python3
"""Build content-addressed WebP derivatives, retaining every source asset.
Run with Python 3 and Pillow. HTML changes are idempotent; no AI regeneration/cropping.
"""
from pathlib import Path
import hashlib
import re
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'images/optimized'
OUT.mkdir(exist_ok=True)
manifest = {}

def variants(src, widths, quality=90):
    if src in manifest:
        return manifest[src]['variants']
    path = ROOT / src
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original)
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        result = []
        for width in sorted({min(w, image.width) for w in widths}):
            resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            import io
            buffer = io.BytesIO()
            resized.save(buffer, 'WEBP', quality=quality, method=6, exact=True)
            data = buffer.getvalue()
            digest = hashlib.sha256(data).hexdigest()[:12]
            filename = f'{path.stem}-{width}-{digest}.webp'
            (OUT / filename).write_bytes(data)
            result.append({'url': f'images/optimized/{filename}', 'width': width, 'height': resized.height, 'bytes': len(data)})
        manifest[src] = {'source_bytes': path.stat().st_size, 'variants': result}
        return result

# Read the original sources on repeated runs from the saved manifest.
previous_path = ROOT / 'docs/image-assets.json'
previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
reverse = {v['url']: src for src, entry in previous.items() for v in entry['variants']}
portraits = {'劉添錫律師', '張育銜律師', '廖婉茹律師', '林聖哲律師', '李孟融', '鄭惟仁-2026', '康鎮宇'}

for page in ROOT.glob('*.html'):
    text = page.read_text()
    def convert(match):
        tag = match.group()
        source_match = re.search(r'\bsrc="([^"]+)"', tag)
        if not source_match:
            return tag
        src = reverse.get(source_match[1], source_match[1])
        if not (ROOT / src).is_file():
            return tag
        stem = Path(src).stem
        if src.startswith('icons/'):
            widths, quality = [120, 240], 92
            size = re.search(r'\bwidth="(\d+)"', tag)
            sizes = (size[1] if size else '120') + 'px'
        elif stem in portraits:
            widths, quality = [160, 320, 640, 960], 92
            if page.name == 'team.html':
                # The first occurrence per person belongs to the 77px navigation row.
                thumbnail = text[:match.start()].count(f'src="{source_match[1]}"') == 0
                sizes = '(max-width: 992px) 72px, 77px' if thumbnail else '(max-width: 768px) calc(100vw - 68px), 210px'
            else:
                sizes = '80px'
        elif stem == 'cilu-logo-round-2048':
            widths, quality, sizes = [256, 512], 94, '128px'
        elif stem in ('office-environment-1', 'team-working-1'):
            widths, quality, sizes = [480, 960], 92, '(max-width: 768px) 100vw, 600px'
        else:
            return tag
        entries = variants(src, widths, quality)
        default = next((v for v in entries if v['width'] >= (320 if stem in portraits else 240)), entries[-1])
        # Attribute-only edits preserve all markup, alt text, styles and surrounding content.
        tag = re.sub(r'\bsrc="[^"]+"', f'src="{default["url"]}"', tag)
        for name in ('srcset', 'sizes', 'decoding'):
            tag = re.sub(r'\s+' + name + r'="[^"]*"', '', tag)
        attrs = f' srcset="{", ".join(v["url"] + " " + str(v["width"]) + "w" for v in entries)}" sizes="{sizes}" decoding="async"'
        if 'width=' not in tag and stem != 'cilu-logo-round-2048':
            attrs += f' width="{entries[-1]["width"]}" height="{entries[-1]["height"]}"'
        # Keep logos and team navigation/first portrait eager; lazy load lower content.
        eager = stem == 'cilu-logo-round-2048' or (page.name == 'team.html' and (thumbnail or stem == '劉添錫律師'))
        if not eager and 'loading=' not in tag:
            attrs += ' loading="lazy"'
        return re.sub(r'\s*/?>$', lambda m: attrs + ('/>' if '/>' in m[0] else '>'), tag)
    text = re.sub(r'<img\b[^>]*>', convert, text)
    page.write_text(text)

for index in range(1,5):
    variants(f'images/hero-banner-{index}.jpg', [960, 1600], 90)
previous_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'{len(manifest)} source assets; {sum(len(x["variants"]) for x in manifest.values())} derivatives')

# Hero backgrounds: responsive first frame, remaining frames only requested by JS.
page = ROOT / 'index.html'
text = page.read_text()
hero = {i: manifest[f'images/hero-banner-{i}.jpg']['variants'] for i in range(1, 5)}
text = re.sub(r'<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>', '', text)
preloads = '\n'.join(f'<link rel="preload" as="image" type="image/webp" href="{hero[1][j]["url"]}" media="{media}" fetchpriority="high">' for j, media in [(0, '(max-width: 768px)'), (1, '(min-width: 769px)')])
text = text.replace('</head>', preloads + '\n</head>')
for i in range(1, 5):
    pattern = r'<div class="hero-slide' + (' active' if i == 1 else '') + r'"[^>]*></div>'
    attrs = f'data-mobile="{hero[i][0]["url"]}" data-desktop="{hero[i][1]["url"]}"'
    text, count = re.subn(pattern, f'<div class="hero-slide' + (' active' if i == 1 else '') + f'" {attrs}></div>', text, count=1)
    assert count == 1
start, end = '/* responsive-hero-start */', '/* responsive-hero-end */'
text = re.sub(re.escape(start) + r'.*?' + re.escape(end), '', text, flags=re.S)
css = f'''{start}
.hero-slide:first-child {{ background-image: url('{hero[1][1]["url"]}'); }}
@media (max-width: 768px) {{
    .hero-slide:first-child {{ background-image: url('{hero[1][0]["url"]}'); }}
}}
{end}'''
text = text.replace('</style>', css + '\n</style>', 1)
old = '''            const slides = document.querySelectorAll('.hero-slide');
            let currentSlide = 0;
            if (slides.length > 0) {
                setInterval(() => {
                    slides[currentSlide].classList.remove('active');
                    currentSlide = (currentSlide + 1) % slides.length;
                    slides[currentSlide].classList.add('active');
                }, 4000);
            }'''
text = text.replace(old, '')
if 'hero-carousel.js' not in text:
    text = text.replace('</head>', '<script src="hero-carousel.js" defer></script>\n</head>')
page.write_text(text)

# Other service pages use the same hero photograph as a CSS background.
for page in ROOT.glob('*.html'):
    text = page.read_text()
    text = text.replace("url('images/hero-banner-1.jpg')", f"url('{hero[1][1]['url']}')")
    # Content revisions invalidate cached shared files without changing their behavior.
    for asset in ['design-refinement.css', 'gtm-events.js', 'hero-carousel.js']:
        path = ROOT / asset
        if path.exists():
            digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            text = re.sub(r'((?:href|src)=")' + re.escape(asset) + r'(?:\?v=[a-f0-9]+)?"', lambda m: m[1] + asset + '?v=' + digest + '"', text)
    page.write_text(text)
