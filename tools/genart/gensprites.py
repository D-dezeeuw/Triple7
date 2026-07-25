"""Triple7 dev-time art pipeline (Phase 31) — OpenRouter · Nano Banana 2.

Generates the isolated sprite set (match-3 fruits, slot symbols, logo
strawberry) in the wet-glass style of reference/strawberry-icon-ref.png,
which is sent along as a style reference with every request.

Usage:  OPENROUTER_API_KEY=... python3 gensprites.py <asset-id ...|all>
Needs:  python3 + Pillow (pip install pillow). Dev-time only — the shipped
        game never touches the network and keeps working without sprites
        (canvas painters are the permanent fallback).

Raw 1024px renders are cached in out/raw/ (gitignored); delete one to force
a regeneration. Processed 256px transparent sprites land in assets/sprites/.
The model paints a fake checkerboard instead of real PNG alpha, so the
background is keyed out in post (see key_out_white).
"""
import base64, json, os, sys, time, urllib.request
from PIL import Image
from collections import deque

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
REF = os.path.join(BASE, "reference/strawberry-icon-ref.png")
RAW_DIR = os.path.join(BASE, "out/raw")
OUT_DIR = os.path.join(REPO, "assets/sprites")
MODEL = "google/gemini-3.1-flash-image"

STYLE = (
    "Match the exact art style of the attached reference image: a glossy semi-transparent "
    "glass-candy object, wet-looking with water droplets and strong specular highlights, "
    "light refracting through the translucent body, high contrast, bold saturated colours, "
    "premium mobile-game icon quality. "
)
ISOLATE = (
    "Render the subject completely ISOLATED on a plain solid pure white background (#FFFFFF). "
    "Absolutely no checkerboard 'transparency' pattern anywhere — not even inside holes, gaps "
    "or between stems. No backdrop, no scenery, no ground plane, no cast shadow, no reflection "
    "surface, no text, no watermark. The subject floats alone, centered, filling ~85% of a "
    "square 1:1 frame."
)

ASSETS = {
    # logo / favicon
    "strawberry": "Subject: the exact same whole strawberry with its green leafy crown as in the reference image — same glassy red body (#e8283c), golden stud seeds, green glass crown.",
    # match-3 fruits (silhouettes must match the canvas painters; colors from data.js)
    "cherry": "Subject: a pair of twin cherries — two overlapping round glass cherries in vivid red (#e8283c, highlight #ff7d8a), joined by a single green stem arching between them.",
    "lemon":  "Subject: a single whole lemon — a tilted oval glass lemon in vivid sunny yellow (#ffd23f, highlight #fff3a6) with two small nubs at the ends.",
    "melon":  "Subject: a watermelon slice — a half-moon (semicircle, flat side up) of vivid green glass (#37c05e, highlight #a4f0b7) with a darker green rind (#1c7a38) along the curved edge and a lighter juicy interior with a few small dark glass seeds.",
    "berry":  "Subject: a cluster of exactly three round berries arranged in a triangle (one on top, two below) in vivid violet-purple glass (#7b52d6, highlight #c9b1ff), like glossy blueberries. The cluster is LARGE, filling most of the square frame. Square 1:1 image on a plain solid pure white background — absolutely no checkerboard pattern.",
    "orange": "Subject: a single whole round orange — a sphere of vivid orange glass (#ff8c1a, highlight #ffcf8f) with a subtle dimpled peel texture and one small green glass leaf at the top.",
    "plum":   "Subject: a single plum with a softly rounded square silhouette (a squircle) in vivid blue glass (#2e7bd8, highlight #9fd0ff) with a small crease line and a tiny stem on top.",
    # slot-only symbols (visually heavier, cabinet-grade)
    "seven":  "Subject: a big bold glossy numeral 7 — casino slot-machine style lucky seven made of vivid red glass (#ff3355, highlight #ff8ba0) with a dark red outline rim (#8f0f26) and gold bevel edge, chunky and readable. The numeral 7 is the entire subject (this digit is required, not decorative text).",
    "star":   "Subject: a classic five-pointed star of vivid golden-yellow glass (#ffc93c, highlight #fff3b0), chunky rounded points, casino slot-machine style. Only the star shape itself — no leaf, no stem, no crown, no fruit elements.",
    # UI icons (replace the old emoji glyphs — tabs, buttons, coins, toasts)
    "sun":     "Subject: a cheerful radiant sun — a round golden-yellow glass disc (#ffc93c, highlight #fff3b0) with chunky rounded triangular rays all around. No face, no leaf, no fruit elements.",
    "sprout":  "Subject: a young seedling sprout — a short stem with two rounded leaves of vivid green glass (#37c05e, highlight #a4f0b7). Just the sprout, no pot, no soil mound, no fruit.",
    "sparkle": "Subject: a four-pointed sparkle / twinkle shape of vivid violet glass (#b06ce8, highlight #ecd4ff), with one smaller sparkle beside it. No fruit elements, no leaf.",
    "arrowup": "Subject: a bold chunky upward-pointing arrow of golden-yellow glass (#ffc93c, highlight #fff3b0), rounded corners, like an upgrade button icon. No fruit elements, no leaf.",
    "lock":    "Subject: a small closed padlock of golden-yellow glass (#ffc93c) with a rounded gold shackle and a darker keyhole. No fruit elements, no leaf.",
    "gear":    "Subject: a chunky settings gear / cog of pale sky-blue glass (#8fdcff, highlight white) with rounded teeth and a round center hole. No fruit elements, no leaf. Render on a plain solid pure white background (#FFFFFF) — absolutely no checkerboard pattern anywhere, including inside the center hole.",
    "jar":     "Subject: a preserves mason jar of clear glass filled with glossy red fruit jam (#e8283c), with a golden screw lid and a tiny cloth cap. No text on the label. Render on a plain solid pure white background (#FFFFFF) — absolutely no checkerboard pattern anywhere.",
    "trophy":  "Subject: a small victory trophy cup of golden-yellow glass (#ffc93c, highlight #fff3b0) with two rounded handles and a little base. No text, no fruit elements. Render on a plain solid pure white background (#FFFFFF) — absolutely no checkerboard pattern anywhere, including inside the handle openings.",
    "gem":     "Subject: a brilliant-cut diamond gemstone of vivid sky-blue glass (#3ec6ff, highlight #c8f0ff), classic pointed diamond silhouette. No fruit elements, no leaf.",
    "bottle":  "Subject: a small round juice bottle of vivid red glass (#ff5a4e, highlight #ffc2b8) with a golden cap and a single droplet emblem on the front. No text.",
}

# Glass Charm collectibles (28) — small jewel-like trinkets, one per charm id.
CHARM_ASSETS = {
    "lemondrop":   "Subject: a teardrop-shaped charm of sunny lemon-yellow glass, a stylized lemon drop candy.",
    "limewedge":   "Subject: a wedge slice of lime in bright green glass with a paler juicy interior.",
    "orangeslice": "Subject: a round orange citrus slice of vivid orange glass showing radial segments.",
    "grapefruit":  "Subject: a half grapefruit of rosy pink glass with segments radiating like a little sun.",
    "yuzu":        "Subject: a small knobbly yuzu citrus of yellow-green glass with tiny sparkles around it.",
    "citron":      "Subject: an elongated citron fruit of deep golden glass with a soft warm inner glow.",
    "tangerine":   "Subject: a small tangerine of vivid orange glass with dreamy pastel swirl highlights and one tiny leaf.",
    "cherrytwin":  "Subject: two twin cherries of vivid red glass joined on a single forked green stem.",
    "strawheart":  "Subject: a heart-shaped strawberry of vivid red glass with golden stud seeds and a small green crown.",
    "bluepearl":   "Subject: a single round blueberry of pearlescent blue-violet glass, like a pearl with a frosty sheen.",
    "raspcluster": "Subject: a raspberry of magenta-red glass made of many little round glass beads.",
    "blacknight":  "Subject: a blackberry of very dark indigo glass with tiny star-like glints, night-sky mood.",
    "cranbead":    "Subject: a small perfectly round cranberry bead of bright scarlet glass.",
    "elderstar":   "Subject: five tiny dark-purple elderberries arranged in a five-pointed star pattern, glass beads.",
    "pinecrown":   "Subject: a small pineapple of amber glass with a proud spiky green glass crown.",
    "mangosunset": "Subject: a mango of glass with a sunset gradient from deep orange to rosy pink.",
    "cocomoon":    "Subject: a coconut half of creamy white and brown glass shaped like a crescent moon.",
    "papayadawn":  "Subject: a papaya half of soft orange-coral glass with tiny dark seeds, dawn-light mood.",
    "kiwieye":     "Subject: a round kiwi slice of bright green glass with a pale center and dark seeds, like a friendly eye.",
    "dragonflame": "Subject: a dragonfruit of hot-pink glass with flame-like green-tipped scales.",
    "passionswirl":"Subject: a passionfruit half of purple glass with a golden swirling seed center.",
    "sunprism":    "Subject: a radiant sun of prismatic rainbow-tinted golden glass with triangular rays.",
    "moonmelon":   "Subject: a crescent-moon shaped slice of pale green melon glass with a serene glow.",
    "starseed":    "Subject: a small glowing five-pointed star seed of warm golden glass with a sprouting tip.",
    "cometgrape":  "Subject: a single grape of violet glass streaking like a comet with a sparkle tail.",
    "aurorapeach": "Subject: a peach of soft glass shimmering with aurora borealis iridescence (pink, teal, violet).",
    "nebulaplum":  "Subject: a plum of deep purple glass with a swirling nebula of stars visible inside.",
    "galaxyfig":   "Subject: a cut fig of dark violet glass revealing a spiral galaxy of tiny golden seeds inside.",
}
CHARM_STYLE = "It is a tiny jewel-like collectible charm trinket, cute and readable at small size. "
for _cid, _prompt in CHARM_ASSETS.items():
    ASSETS["charms/" + _cid] = CHARM_STYLE + _prompt

# Coins are METAL, not glass — same lighting/quality, different material.
COIN_STYLE = (
    "Match the lighting, quality and cheerful mood of the attached reference image, but this "
    "asset's material is GLISTENING POLISHED GOLD METAL, not glass: mirror-bright metallic "
    "shine, warm golden reflections, sharp specular glints, crisp embossed relief. "
)
COIN_ASSETS = {
    "suncoin": "Subject: a round gold coin, face-on, with an embossed radiant sun (disc with rays) on its face and a beaded rim. No numerals, no letters.",
    "coin7":   "Subject: a round gold coin, face-on, with a large embossed numeral 7 on its face and a beaded rim. The numeral 7 is required.",
    "coin21":  "Subject: a round rose-gold coin, face-on, with a large embossed number 21 on its face and an ornate double rim. The number 21 is required.",
    "coin49":  "Subject: an ornate precious coin of deep radiant gold, face-on, with a large embossed number 49 on its face and a gem-studded decorated rim, clearly the most valuable coin. The number 49 is required.",
}
for _cid, _prompt in COIN_ASSETS.items():
    ASSETS[_cid] = _prompt
STYLE_OVERRIDE = dict.fromkeys(COIN_ASSETS, COIN_STYLE)
ASSETS["droplet"] = "Subject: a single plump droplet of vivid red juice as shiny glass (#ff5a4e, highlight #ffc2b8), classic teardrop shape. No fruit, no leaf."


def call_model(prompt, ref_path):
    with open(ref_path, "rb") as f:
        ref_b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64," + ref_b64}},
        ]}],
        "modalities": ["image", "text"],
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"],
                 "Content-Type": "application/json"},
    )
    for delay in [2, 4, 8, 16, 0]:
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                body = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and delay:
                print(f"  HTTP {e.code}, retry in {delay}s", file=sys.stderr)
                time.sleep(delay)
                continue
            print(e.read().decode()[:1000], file=sys.stderr)
            raise
    images = body["choices"][0]["message"].get("images") or []
    if not images:
        raise NoImage(json.dumps(body)[:600])
    return base64.b64decode(images[0]["image_url"]["url"].split(",", 1)[1])


class NoImage(RuntimeError):
    pass


def call_model_retry(prompt, ref_path, tries=4):
    for i in range(tries):
        try:
            return call_model(prompt, ref_path)
        except NoImage as e:
            print(f"  model returned no image (try {i + 1}/{tries})", file=sys.stderr)
            last = e
            time.sleep(2)
    raise last


def has_alpha(img):
    if img.mode != "RGBA":
        return False
    lo, hi = img.getchannel("A").getextrema()
    return lo < 250


# Assets whose pale/iridescent interiors fool the enclosed-hole detector:
# skip the hole punch and trust the border flood alone.
NO_HOLE_PUNCH = {"charms/aurorapeach"}


def key_out_white(img, punch_holes=True):
    """Remove the painted fake-transparency background: flood neutral tones
    (white / checker gray, light or dark) from the borders, then kill enclosed
    flat-tone neutral patches (checker holes), then erode+blur the mask."""
    from PIL import ImageFilter
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    mask = Image.new("L", (w, h), 255)
    mpx = mask.load()

    def neutral(x, y):
        r, g, b, _ = px[x, y]
        return max(r, g, b) - min(r, g, b) <= 22

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not neutral(x, y):
            continue
        mpx[x, y] = 0
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))

    # Enclosed background holes (e.g. the gap between cherry stems, a gear's
    # center): a low-saturation region whose values sit in one or two flat
    # plateaus is checker/white fill — the model tints it slightly through
    # "glass", so allow more saturation here than at the borders; real
    # speculars are smooth gradients and fail the plateau test.
    def near_neutral(x, y):
        r, g, b, _ = px[x, y]
        return max(r, g, b) - min(r, g, b) <= 34

    for y0 in range(h if punch_holes else 0):
        for x0 in range(w):
            if seen[y0 * w + x0] or not near_neutral(x0, y0):
                continue
            region = []
            q = deque([(x0, y0)])
            seen[y0 * w + x0] = 1
            while q:
                x, y = q.popleft()
                region.append((x, y))
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and near_neutral(nx, ny):
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(region) < 400:
                continue
            hist = {}
            for x, y in region:
                v = max(px[x, y][:3])
                hist[v] = hist.get(v, 0) + 1
            top = sorted(hist, key=hist.get, reverse=True)[:2]
            flat = sum(n for v, n in hist.items() if any(abs(v - t) <= 6 for t in top))
            if flat / len(region) >= 0.6:
                for x, y in region:
                    mpx[x, y] = 0

    mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    img.putalpha(mask)
    return img


def process(raw_path, out_path, size=256, punch_holes=True):
    img = Image.open(raw_path).convert("RGBA")
    if not has_alpha(img):
        print("  no alpha in render — keying out white background")
        img = key_out_white(img, punch_holes)
    # trim to content bounding box, then pad to square and downscale
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    side = max(img.size)
    pad = int(side * 0.06)
    canvas = Image.new("RGBA", (side + 2 * pad,) * 2, (0, 0, 0, 0))
    canvas.paste(img, ((canvas.width - img.width) // 2, (canvas.height - img.height) // 2))
    canvas = canvas.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path)
    print("  ->", out_path, canvas.size)


if __name__ == "__main__":
    ids = sys.argv[1:]
    if ids == ["all"]:
        ids = list(ASSETS)
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    for aid in ids:
        print(aid)
        raw = os.path.join(RAW_DIR, aid + ".png")
        os.makedirs(os.path.dirname(raw), exist_ok=True)
        if not os.path.exists(raw):
            data = call_model_retry(STYLE_OVERRIDE.get(aid, STYLE) + ASSETS[aid] + " " + ISOLATE, REF)
            with open(raw, "wb") as f:
                f.write(data)
            print("  raw", len(data), "bytes")
        process(raw, os.path.join(OUT_DIR, aid + ".png"), punch_holes=aid not in NO_HOLE_PUNCH)
