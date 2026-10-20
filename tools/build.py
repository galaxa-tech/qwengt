"""Build the Galaxa Tech site from src/ into dist/ (one real HTML file per page).
Usage: python tools/build.py"""
import hashlib, html, json, os, re, shutil, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DIST = os.path.join(ROOT, "src"), os.path.join(ROOT, "dist")
SITE_URL = "https://galaxatechweb.web.app"   # change when a custom domain is connected
GLOBALS = {
    "SITE_URL": SITE_URL,
    "EMAIL": "mail.galaxatech@gmail.com",
    "PHONE": "+8801824888701",
    "PHONE_DISPLAY": "+880 1824 888701",
    "WA_URL": "https://wa.me/8801824888701",
}

def read(p):
    return open(p, encoding="utf-8").read()

def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

def fill(s, mapping):
    for k, v in mapping.items():
        s = s.replace("{{" + k + "}}", v)
    return s

# --- reset dist, copy assets
shutil.rmtree(DIST, ignore_errors=True)
def minify_css(t):
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s*([{};,>])\s*", r"\1", t)
    t = re.sub(r":\s+", ":", t)
    return t.replace(";}", "}").strip()

os.makedirs(os.path.join(DIST, "css"), exist_ok=True)
write(os.path.join(DIST, "css", "site.css"), minify_css(read(os.path.join(SRC, "css/main.css")) + "\n" + read(os.path.join(SRC, "css/scenes.css"))))
shutil.copytree(os.path.join(SRC, "js"), os.path.join(DIST, "js"))
shutil.copytree(os.path.join(ROOT, "img"), os.path.join(DIST, "img"), ignore=shutil.ignore_patterns("logo-original.jpg"))
shutil.copytree(os.path.join(ROOT, "fonts"), os.path.join(DIST, "fonts"))
asset_v = hashlib.sha1("".join(read(os.path.join(SRC, f)) for f in ("css/main.css", "css/scenes.css", "js/main.js", "js/fx.js", "js/hero3d.js")).encode()).hexdigest()[:8]

# --- partials and data
partials = {n[:-5].replace("-", "_"): read(os.path.join(SRC, "partials", n)) for n in os.listdir(os.path.join(SRC, "partials"))}
for _ in range(3):  # partials may contain other partials
    partials = {k: fill(v, {kk: vv for kk, vv in partials.items() if kk != k}) for k, v in partials.items()}
work = json.load(open(os.path.join(SRC, "data/work.json"), encoding="utf-8"))["items"]

def work_html():
    out = []
    for w in work:
        t = html.escape(w["title"])
        if w.get("laptop"):
            lap = f'<div class="laptop"><img src="/img/work/{html.escape(w["laptop"])}" alt="{t} on a laptop" loading="lazy"></div>'
        else:
            lap = '<div class="laptop ui">' + partials["sample_" + w["sample"]] + "</div>"
        if w.get("phone"):
            ph = f'<div class="phone"><img src="/img/work/{html.escape(w["phone"])}" alt="{t} on a phone" loading="lazy"></div>'
        else:
            ph = '<div class="phone ui">' + partials["phone_generic"] + "</div>"
        tag = "Illustrative sample" if not w.get("laptop") else "Project"
        out.append(f'    <article class="work rv" data-type="{html.escape(w["type"])}"><div class="dev">{lap}{ph}</div><div><span class="soon">{html.escape(w["type"])}</span><h3>{t}</h3><p class="samp-note">{tag}</p></div></article>')
    return "\n".join(out)

layout = read(os.path.join(SRC, "layout.html"))
pages = []
for name in sorted(os.listdir(os.path.join(SRC, "pages"))):
    raw = read(os.path.join(SRC, "pages", name))
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    meta = dict(l.split(": ", 1) if ": " in l else (l.rstrip(":"), "") for l in m.group(1).split("\n"))
    meta["body"] = m.group(2)
    pages.append(meta)

for p in pages:
    body = fill(p["body"], {**partials, "work_items": work_html()})
    cur = {f"cur_{k}": (' aria-current="page"' if p.get("nav") == k else "") for k in ("services", "work", "systems", "contact")}
    robots = '<meta name="robots" content="noindex">' if p.get("noindex") else ""
    page = fill(layout, {**cur, "content": body, "robots": robots, "ASSET_V": asset_v,
                         "title": html.escape(p["title"]), "description": html.escape(p["description"], quote=True), "path": "" if p["path"] == "/" else p["path"]})
    page = fill(page, GLOBALS)
    leftover = re.findall(r"\{\{[^}]+\}\}", page)
    assert not leftover, (p["path"], leftover)
    if p["path"] == "/":
        out = os.path.join(DIST, "index.html")
    elif p["path"] == "/404":
        out = os.path.join(DIST, "404.html")
    else:
        out = os.path.join(DIST, p["path"].strip("/"), "index.html")
    write(out, page)

# --- sitemap + robots
today = datetime.date.today().isoformat()
urls = [p["path"] for p in pages if not p.get("noindex")]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f'  <url><loc>{SITE_URL}{"" if u == "/" else u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + "</urlset>\n"
write(os.path.join(DIST, "sitemap.xml"), sm)
write(os.path.join(DIST, "robots.txt"), f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
print(f"built {len(pages)} pages -> dist/  (assets v{asset_v})")
