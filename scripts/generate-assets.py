#!/usr/bin/env python3
"""
MIREVA — seed artwork generator.

The MIREVA starter library is generated procedurally as SVG so the project is
100% self-contained: no external image CDN, no API keys, no broken links, and a
service worker that can genuinely cache every asset for offline use.

Run:  python3 scripts/generate-assets.py
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "images")
THUMB = os.path.join(ROOT, "assets", "thumbnails")
os.makedirs(IMG, exist_ok=True)
os.makedirs(THUMB, exist_ok=True)

PALETTES = {
    "Nature":       [["#0F2B25", "#1E5945", "#4F8F6B", "#B9CDA4", "#E8DFB8"],
                     ["#132A1F", "#2F6B4F", "#7FAE7A", "#D6D2A5", "#F1E4C3"],
                     ["#0B1F1C", "#27564A", "#5E9A7E", "#A8C6A0", "#EADFC0"]],
    "Architecture": [["#1B1A21", "#3B3A45", "#6E6B77", "#A8A3A9", "#E3DCD6"],
                     ["#16161B", "#2E3138", "#5C6169", "#9AA0A6", "#DDD6CE"],
                     ["#201C22", "#443C46", "#7A6E77", "#B3A7A6", "#EDE3DA"]],
    "Travel":       [["#0E2439", "#1D4E6B", "#3E8EA8", "#8FC4C6", "#F2DFC0"],
                     ["#122B3D", "#2B6076", "#61A2AE", "#C3D8CE", "#F6E3C4"],
                     ["#13233A", "#28577E", "#5C93B4", "#A8C7D6", "#EFD9B4"]],
    "Photography":  [["#111014", "#2B282D", "#5A555C", "#948E94", "#DCD5D2"],
                     ["#0D0C0F", "#242227", "#4E4A50", "#877F86", "#D4CCC8"],
                     ["#15121A", "#332C38", "#635A69", "#A099A4", "#E6DEDC"]],
    "Art":          [["#2A0F22", "#63204A", "#A8386A", "#E07A78", "#F6C99B"],
                     ["#240E20", "#5A1C46", "#96305F", "#D4696F", "#F2BE96"],
                     ["#2E1024", "#6E2450", "#B44370", "#E88A80", "#F8D2A6"]],
    "Fashion":      [["#1C1216", "#432630", "#8A4A55", "#D18E8A", "#F3D9CC"],
                     ["#181014", "#3B222C", "#7C424E", "#C58480", "#EFD2C6"],
                     ["#211417", "#4C2A33", "#96545C", "#DA9A92", "#F7E0D2"]],
    "Technology":   [["#0C1220", "#1B2A45", "#33507A", "#6E8DB5", "#C6D6E4"],
                     ["#0A0F1B", "#17243C", "#2C466B", "#6182A8", "#BCCEDE"],
                     ["#0E1424", "#20304F", "#3B5B87", "#7897BE", "#CFDCE8"]],
    "Abstract":     [["#2A1218", "#7A2A32", "#E85D4A", "#F4A261", "#F7E4CE"],
                     ["#26101C", "#6C2440", "#C44569", "#F0A177", "#FBE7D3"],
                     ["#2D1420", "#84303F", "#EE7256", "#F6B87A", "#FCEBDA"]],
}

STYLES_BY_CATEGORY = {
    "Nature":       ["horizon", "mesh", "drape"],
    "Architecture": ["geometry", "grid", "geometry"],
    "Travel":       ["horizon", "mesh", "horizon"],
    "Photography":  ["light", "mesh", "light"],
    "Art":          ["drape", "mesh", "grid"],
    "Fashion":      ["drape", "light", "mesh"],
    "Technology":   ["grid", "geometry", "grid"],
    "Abstract":     ["mesh", "drape", "geometry"],
}

SIZES = {
    "landscape": (1600, 1067),
    "portrait": (1000, 1500),
    "square": (1200, 1200),
}


def defs_common(rng, pal, w, h, uid):
    """Background gradient + grain + vignette definitions."""
    a, b = pal[0], pal[1]
    angle = rng.choice([0, 25, 45, 70, 110, 135])
    rad = math.radians(angle)
    x2, y2 = 0.5 + math.cos(rad) / 2, 0.5 + math.sin(rad) / 2
    x1, y1 = 1 - x2, 1 - y2
    return f'''
  <linearGradient id="bg{uid}" x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}">
    <stop offset="0" stop-color="{a}"/>
    <stop offset="1" stop-color="{b}"/>
  </linearGradient>
  <radialGradient id="vig{uid}" cx="0.5" cy="0.45" r="0.78">
    <stop offset="0.45" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
  </radialGradient>
  <filter id="grain{uid}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="{rng.randint(1, 999)}" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
    <feComponentTransfer in="g"><feFuncA type="linear" slope="0.32"/></feComponentTransfer>
  </filter>
  <filter id="soft{uid}" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="{int(min(w, h) * rng.uniform(0.07, 0.13))}"/>
  </filter>
  <filter id="soft2{uid}" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="{int(min(w, h) * rng.uniform(0.02, 0.045))}"/>
  </filter>'''


def style_mesh(rng, pal, w, h, uid):
    out = []
    for i in range(rng.randint(4, 6)):
        c = rng.choice(pal[1:])
        cx = rng.uniform(-0.1, 1.1) * w
        cy = rng.uniform(-0.1, 1.1) * h
        r = rng.uniform(0.28, 0.62) * max(w, h)
        out.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{c}" '
                   f'opacity="{rng.uniform(0.42, 0.8):.2f}" filter="url(#soft{uid})"/>')
    # thin editorial rule lines keep the mesh from reading as a plain blur
    for i in range(rng.randint(2, 4)):
        y = h * rng.uniform(0.12, 0.9)
        out.append(f'<path d="M0 {y:.0f} Q {w * 0.5:.0f} {y - h * rng.uniform(0.04, 0.14):.0f} {w} {y:.0f}" '
                   f'fill="none" stroke="{pal[-1]}" stroke-width="{max(1.0, min(w, h) * 0.0018):.1f}" '
                   f'opacity="{rng.uniform(0.14, 0.34):.2f}"/>')
    cx, cy = w * rng.uniform(0.25, 0.75), h * rng.uniform(0.25, 0.75)
    r = min(w, h) * rng.uniform(0.16, 0.3)
    out.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="none" stroke="{pal[-1]}" '
               f'stroke-width="{max(1.0, min(w, h) * 0.0022):.1f}" opacity="{rng.uniform(0.16, 0.32):.2f}"/>')
    return "\n    ".join(out)


def style_horizon(rng, pal, w, h, uid):
    out = []
    n = rng.randint(4, 6)
    base = rng.uniform(0.42, 0.66)
    for i in range(n):
        y = h * (base + i * (1 - base) / n)
        amp = h * rng.uniform(0.012, 0.05)
        ctrl = rng.uniform(0.2, 0.8) * w
        c = pal[min(len(pal) - 1, 1 + i % (len(pal) - 1))]
        out.append(
            f'<path d="M0 {y:.0f} Q {ctrl:.0f} {y - amp:.0f} {w} {y + amp * 0.5:.0f} L {w} {h} L 0 {h} Z" '
            f'fill="{c}" opacity="{max(0.35, 1 - i * 0.13):.2f}"/>')
    sun_r = min(w, h) * rng.uniform(0.07, 0.14)
    sx, sy = w * rng.uniform(0.22, 0.78), h * (base - rng.uniform(0.05, 0.22))
    out.insert(0, f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{sun_r * 2.6:.0f}" fill="{pal[-1]}" '
                  f'opacity="0.16" filter="url(#soft{uid})"/>')
    out.insert(1, f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{sun_r:.0f}" fill="{pal[-1]}" opacity="0.72"/>')
    return "\n    ".join(out)


def style_geometry(rng, pal, w, h, uid):
    out = []
    cx, cy = w * rng.uniform(0.35, 0.65), h * rng.uniform(0.4, 0.7)
    for i in range(rng.randint(4, 7)):
        r = min(w, h) * (0.12 + i * rng.uniform(0.07, 0.1))
        c = rng.choice(pal[2:])
        out.append(f'<path d="M {cx - r:.0f} {cy:.0f} A {r:.0f} {r:.0f} 0 0 1 {cx + r:.0f} {cy:.0f}" '
                   f'fill="none" stroke="{c}" stroke-width="{max(2, min(w, h) * rng.uniform(0.004, 0.014)):.1f}" '
                   f'opacity="{rng.uniform(0.35, 0.85):.2f}"/>')
    for i in range(rng.randint(2, 4)):
        bw = w * rng.uniform(0.08, 0.2)
        bx = rng.uniform(0, 1) * (w - bw)
        bh = h * rng.uniform(0.25, 0.75)
        out.append(f'<rect x="{bx:.0f}" y="{h - bh:.0f}" width="{bw:.0f}" height="{bh:.0f}" '
                   f'fill="{rng.choice(pal[1:4])}" opacity="{rng.uniform(0.22, 0.5):.2f}"/>')
    return "\n    ".join(out)


def style_grid(rng, pal, w, h, uid):
    out = []
    cols = rng.randint(5, 9)
    rows = max(3, int(cols * h / w))
    cw, ch = w / cols, h / rows
    for r in range(rows):
        for c in range(cols):
            if rng.random() < 0.42:
                continue
            col = rng.choice(pal[1:])
            pad = rng.uniform(0, 0.12) * min(cw, ch)
            out.append(f'<rect x="{c * cw + pad:.0f}" y="{r * ch + pad:.0f}" '
                       f'width="{cw - pad * 2:.0f}" height="{ch - pad * 2:.0f}" '
                       f'rx="{rng.choice([0, 0, cw * 0.5]):.0f}" fill="{col}" '
                       f'opacity="{rng.uniform(0.18, 0.72):.2f}"/>')
    out.append(f'<circle cx="{w * rng.uniform(0.2, 0.8):.0f}" cy="{h * rng.uniform(0.2, 0.8):.0f}" '
               f'r="{min(w, h) * 0.4:.0f}" fill="{pal[-1]}" opacity="0.14" filter="url(#soft{uid})"/>')
    return "\n    ".join(out)


def style_drape(rng, pal, w, h, uid):
    out = []
    for i in range(rng.randint(3, 5)):
        y0 = h * rng.uniform(0.1, 0.9)
        y1 = h * rng.uniform(0.1, 0.9)
        k = h * rng.uniform(0.12, 0.3)
        thick = h * rng.uniform(0.06, 0.18)
        c = rng.choice(pal[1:])
        out.append(
            f'<path d="M -50 {y0:.0f} C {w * 0.3:.0f} {y0 - k:.0f} {w * 0.7:.0f} {y1 + k:.0f} {w + 50} {y1:.0f} '
            f'L {w + 50} {y1 + thick:.0f} C {w * 0.7:.0f} {y1 + k + thick:.0f} {w * 0.3:.0f} {y0 - k + thick:.0f} -50 {y0 + thick:.0f} Z" '
            f'fill="{c}" opacity="{rng.uniform(0.4, 0.85):.2f}" filter="url(#soft2{uid})"/>')
    return "\n    ".join(out)


def style_light(rng, pal, w, h, uid):
    out = []
    out.append(f'<ellipse cx="{w * rng.uniform(0.35, 0.65):.0f}" cy="{h * rng.uniform(0.45, 0.7):.0f}" '
               f'rx="{w * rng.uniform(0.18, 0.3):.0f}" ry="{h * rng.uniform(0.26, 0.4):.0f}" '
               f'fill="{pal[1]}" opacity="0.9" filter="url(#soft2{uid})"/>')
    for i in range(rng.randint(2, 4)):
        x = w * rng.uniform(0.05, 0.85)
        bw = w * rng.uniform(0.06, 0.16)
        skew = w * rng.uniform(-0.15, 0.15)
        out.append(f'<path d="M {x:.0f} 0 L {x + bw:.0f} 0 L {x + bw + skew:.0f} {h} L {x + skew:.0f} {h} Z" '
                   f'fill="{pal[-1]}" opacity="{rng.uniform(0.07, 0.18):.2f}" filter="url(#soft2{uid})"/>')
    out.append(f'<circle cx="{w * rng.uniform(0.15, 0.85):.0f}" cy="{h * rng.uniform(0.12, 0.35):.0f}" '
               f'r="{min(w, h) * rng.uniform(0.05, 0.1):.0f}" fill="{pal[-1]}" opacity="0.55"/>')
    return "\n    ".join(out)


STYLE_FN = {"mesh": style_mesh, "horizon": style_horizon, "geometry": style_geometry,
            "grid": style_grid, "drape": style_drape, "light": style_light}


def build_svg(seed, category, style, w, h, grain=True):
    rng = random.Random(seed)
    pal = rng.choice(PALETTES[category])
    uid = f"{seed}"
    body = STYLE_FN[style](rng, pal, w, h, uid)
    grain_layer = (f'<rect width="{w}" height="{h}" filter="url(#grain{uid})" opacity="0.5" '
                   f'style="mix-blend-mode:overlay"/>') if grain else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">
  <defs>{defs_common(rng, pal, w, h, uid)}
  </defs>
  <rect width="{w}" height="{h}" fill="url(#bg{uid})"/>
  <g>
    {body}
  </g>
  {grain_layer}
  <rect width="{w}" height="{h}" fill="url(#vig{uid})"/>
</svg>'''


# ---------------------------------------------------------------- library ----
TITLES = {
    "Nature": ["Fern Interval", "Moss & Morning", "Quiet Canopy", "Verdant Drift", "Low Tide Reeds",
               "Understory", "Highland Hush", "Cedar Light"],
    "Architecture": ["Concrete Rhythm", "Brutal Arc", "Stair Study", "Facade No. 7", "Column & Void",
                     "Atrium Section", "Load Bearing", "Grey Elevation"],
    "Travel": ["Harbour Blue", "Coastal Passage", "Southbound", "Salt Air", "Ferry Window",
               "Peninsula", "Long Crossing", "Northern Bay"],
    "Photography": ["Grain Study I", "Available Light", "Shutter Half", "Silver Print",
                    "Contact Sheet", "Push Two Stops", "Aperture Wide", "Darkroom Note"],
    "Art": ["Berry Composition", "Pigment Field", "Gesture No. 3", "Ink & Rose", "Chroma Study",
            "Still Motion", "Plum Interval", "Layered Wash"],
    "Fashion": ["Silk Fold", "Blush Drape", "Atelier Study", "Hem Line", "Runway Blur",
                "Cashmere Note", "Wardrobe No. 2", "Rose Tailoring"],
    "Technology": ["Signal Grid", "Cold Circuit", "Data Terrace", "Blueprint Blue", "Node Map",
                   "Interface Study", "Latency", "Cobalt Frame"],
    "Abstract": ["Coral Bloom", "Warm Fracture", "Ember Field", "Sand & Flame", "Soft Collision",
                 "Amber Motion", "Peach Static", "Sunward"],
}

TAGS = {
    "Nature": ["green", "organic", "landscape", "calm", "botanical", "earth"],
    "Architecture": ["concrete", "geometry", "structure", "minimal", "urban", "form"],
    "Travel": ["coast", "water", "horizon", "journey", "blue", "open"],
    "Photography": ["monochrome", "grain", "analog", "light", "study", "contrast"],
    "Art": ["painterly", "pigment", "expressive", "colour", "gesture", "canvas"],
    "Fashion": ["textile", "drape", "editorial", "soft", "atelier", "blush"],
    "Technology": ["grid", "systems", "cobalt", "digital", "network", "precision"],
    "Abstract": ["gradient", "warm", "coral", "motion", "field", "bloom"],
}

DESCRIPTIONS = {
    "Nature": "A generated study in layered greens and low light, built from soft gradient fields.",
    "Architecture": "A structural composition of arcs, blocks and negative space in cool concrete tones.",
    "Travel": "A horizon study in maritime blues, evoking distance, water and open air.",
    "Photography": "A monochrome light study exploring grain, falloff and tonal separation.",
    "Art": "A painterly field of berry and rose pigment layered into a single chroma study.",
    "Fashion": "A textile study of folded, draping forms in muted blush and charcoal.",
    "Technology": "A modular grid composition in cobalt and slate, referencing systems and interfaces.",
    "Abstract": "A warm gradient field in coral, peach and plum — MIREVA's signature palette.",
}

CATS = list(PALETTES.keys())
ORIENT_CYCLE = ["landscape", "portrait", "landscape", "square", "portrait", "landscape"]

library = []
idx = 0
for ci, cat in enumerate(CATS):
    for k in range(6):
        idx += 1
        seed = 1000 + idx * 7
        rng = random.Random(seed)
        orientation = ORIENT_CYCLE[(ci + k) % len(ORIENT_CYCLE)]
        w, h = SIZES[orientation]
        style = STYLES_BY_CATEGORY[cat][k % 3]
        slug = f"mireva-{idx:03d}"
        with open(os.path.join(IMG, slug + ".svg"), "w") as f:
            f.write(build_svg(seed, cat, style, w, h, grain=True))
        tw = 640
        th = round(h * tw / w)
        with open(os.path.join(THUMB, slug + ".svg"), "w") as f:
            f.write(build_svg(seed, cat, style, tw, th, grain=True))
        title = TITLES[cat][k % len(TITLES[cat])]
        if k >= len(TITLES[cat]):
            title += f" {k}"
        tags = rng.sample(TAGS[cat], 3)
        # deterministic dates spread across an 18-month window (all in the past)
        offset = (idx * 7) % 18            # 0..17 months back from 2026-06
        month = 6 - offset
        year = 2026
        while month < 1:
            month += 12
            year -= 1
        day = 1 + (idx * 11) % 27
        library.append({
            "id": slug,
            "title": title,
            "category": cat,
            "tags": tags,
            "description": DESCRIPTIONS[cat],
            "src": f"assets/images/{slug}.svg",
            "thumb": f"assets/thumbnails/{slug}.svg",
            "width": w,
            "height": h,
            "orientation": orientation,
            "type": "image/svg+xml",
            "dateAdded": f"{year}-{month:02d}-{day:02d}",
            "source": "generated",
        })

with open(os.path.join(ROOT, "js", "library.js"), "w") as f:
    f.write("// MIREVA seed library — generated by scripts/generate-assets.py. Do not edit by hand.\n")
    f.write("export const SEED_LIBRARY = ")
    f.write(json.dumps(library, indent=2))
    f.write(";\n\nexport const CATEGORIES = ")
    f.write(json.dumps(["All"] + CATS))
    f.write(";\n")

print(f"generated {len(library)} images across {len(CATS)} categories")
