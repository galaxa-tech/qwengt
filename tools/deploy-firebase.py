"""Deploy this static site to Firebase Hosting (project galaxatechweb) using the
gcloud login of mail.galaxatech@gmail.com. No Firebase CLI login needed.
Usage: python tools/deploy-firebase.py"""
import gzip, hashlib, json, os, subprocess, sys, fnmatch, urllib.request

PROJECT, SITE = "galaxatechweb", "galaxatechweb"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, "firebase.json"), encoding="utf-8"))["hosting"]
IGNORE = cfg["ignore"]

def token():
    return subprocess.check_output("gcloud auth print-access-token", shell=True, text=True).strip()

def call(method, url, body=None, raw=None, ctype="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": "Bearer " + TOKEN, "x-goog-user-project": PROJECT, "Content-Type": ctype})
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} on {method} {url.split('?')[0]}: {e.read().decode()[:400]}")

def ignored(rel):
    return any(fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(os.path.basename(rel), p) for p in IGNORE)

TOKEN = token()
files = {}
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if not d.startswith(".") and d not in ("node_modules", "tools")]
    for f in fn:
        rel = os.path.relpath(os.path.join(dp, f), ROOT).replace("\\", "/")
        if ignored(rel):
            continue
        gz = gzip.compress(open(os.path.join(dp, f), "rb").read(), 9, mtime=0)
        files["/" + rel] = (hashlib.sha256(gz).hexdigest(), gz)
print(len(files), "files")

base = "https://firebasehosting.googleapis.com/v1beta1"
rest_headers = [{"glob": h["source"], "headers": {x["key"]: x["value"] for x in h["headers"]}} for h in cfg.get("headers", [])]
ver = call("POST", f"{base}/sites/{SITE}/versions", {"config": {"headers": rest_headers}})
name = ver["name"]
pop = call("POST", f"{base}/{name}:populateFiles", {"files": {k: v[0] for k, v in files.items()}})
need = set(pop.get("uploadRequiredHashes", []))
by_hash = {v[0]: v[1] for v in files.values()}
for h in need:
    call("POST", f"{pop['uploadUrl']}/{h}", raw=by_hash[h], ctype="application/octet-stream")
print("uploaded", len(need), "new files")
call("PATCH", f"{base}/{name}?updateMask=status", {"status": "FINALIZED"})
rel = call("POST", f"{base}/sites/{SITE}/releases?versionName={name}", {})
print("released:", rel.get("name"))
print("live: https://galaxatechweb.web.app")
