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
for d in ("css", "js"):
    shutil.copytree(os.path.join(SRC, d), os.path.join(DIST, d))
shutil.copytree(os.path.join(ROOT, "img"), os.path.join(DIST, "img"), ignore=shutil.ignore_patterns("logo-original.jpg"))
asset_v = hashlib.sha1((read(os.path.join(SRC, "css/main.css")) + read(os.path.join(SRC, "js/main.js"))).encode()).hexdigest()[:8]

# --- partials and data
partials = {"form_" + n[5:-5]: read(os.path.join(SRC, "partials", n)) for n in os.listdir(os.path.join(SRC, "partials"))}
work = json.load(open(os.path.join(SRC, "data/work.json"), encoding="utf-8"))["items"]

def work_html():
    out = []
    for w in work:
        lap = f'<img src="/img/work/{html.escape(w["laptop"])}" alt="{html.escape(w["title"])} on a laptop" loading="lazy">' if w.get("laptop") else "Mockup<br>coming soon"
        ph = f'<img src="/img/work/{html.escape(w["phone"])}" alt="{html.escape(w["title"])} on a phone" loading="lazy">' if w.get("phone") else "<span></span>"
        out.append(f'    <article class="work rv" data-type="{html.escape(w["type"])}"><div class="dev"><div class="laptop">{lap}</div><div class="phone">{ph}</div></div><div><span class="soon" style="background:var(--black)">{html.escape(w["type"])}</span><h3>{html.escape(w["title"])}</h3></div></article>')
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
