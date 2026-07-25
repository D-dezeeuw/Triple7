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
    "Render the subject completely ISOLATED on a fully transparent background (PNG alpha). "
    "No backdrop, no scenery, no ground plane, no cast shadow, no reflection surface, "
    "no text, no watermark. The subject floats alone, centered, filling ~85% of a square frame."
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
}


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


def key_out_white(img):
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

    # Enclosed background holes (e.g. the gap between cherry stems): a neutral
    # region whose values sit in one or two flat plateaus is checker/white fill;
    # real speculars are smooth gradients and fail the plateau test.
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or not neutral(x0, y0):
                continue
            region = []
            q = deque([(x0, y0)])
            seen[y0 * w + x0] = 1
            while q:
                x, y = q.popleft()
                region.append((x, y))
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and neutral(nx, ny):
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(region) < 600:
                continue
            hist = {}
            for x, y in region:
                v = max(px[x, y][:3])
                hist[v] = hist.get(v, 0) + 1
            top = sorted(hist, key=hist.get, reverse=True)[:2]
            flat = sum(n for v, n in hist.items() if any(abs(v - t) <= 5 for t in top))
            if flat / len(region) >= 0.65:
                for x, y in region:
                    mpx[x, y] = 0

    mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    img.putalpha(mask)
    return img


def process(raw_path, out_path, size=256):
    img = Image.open(raw_path).convert("RGBA")
    if not has_alpha(img):
        print("  no alpha in render — keying out white background")
        img = key_out_white(img)
    # trim to content bounding box, then pad to square and downscale
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    side = max(img.size)
    pad = int(side * 0.06)
    canvas = Image.new("RGBA", (side + 2 * pad,) * 2, (0, 0, 0, 0))
    canvas.paste(img, ((canvas.width - img.width) // 2, (canvas.height - img.height) // 2))
    canvas = canvas.resize((size, size), Image.LANCZOS)
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
        if not os.path.exists(raw):
            data = call_model_retry(STYLE + ASSETS[aid] + " " + ISOLATE, REF)
            with open(raw, "wb") as f:
                f.write(data)
            print("  raw", len(data), "bytes")
        process(raw, os.path.join(OUT_DIR, aid + ".png"))
