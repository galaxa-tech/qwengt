"""Deploy to Firebase (project galaxatechweb) using the gcloud login of mail.galaxatech@gmail.com.
No Firebase CLI login needed.
  python tools/deploy-firebase.py            build, then deploy the website (Hosting)
  python tools/deploy-firebase.py --rules    also deploy firestore.rules
"""
import fnmatch, gzip, hashlib, json, os, subprocess, sys, urllib.error, urllib.request

PROJECT = SITE = "galaxatechweb"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "build.py")])
cfg = json.load(open(os.path.join(ROOT, "firebase.json"), encoding="utf-8"))["hosting"]

def token():
    return subprocess.check_output("gcloud auth print-access-token", shell=True, text=True).strip()

TOKEN = token()

def call(method, url, body=None, raw=None, ctype="application/json", allow=()):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": "Bearer " + TOKEN, "x-goog-user-project": PROJECT, "Content-Type": ctype})
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        if e.code in allow:
            return {"_http": e.code}
        sys.exit(f"HTTP {e.code} on {method} {url.split('?')[0]}: {e.read().decode()[:500]}")

def ignored(rel):
    return any(fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(os.path.basename(rel), p) for p in cfg["ignore"])

files = {}
for dp, dn, fn in os.walk(DIST):
    for f in fn:
        rel = os.path.relpath(os.path.join(dp, f), DIST).replace("\\", "/")
        if ignored(rel):
            continue
        gz = gzip.compress(open(os.path.join(dp, f), "rb").read(), 9, mtime=0)
        files["/" + rel] = (hashlib.sha256(gz).hexdigest(), gz)
print(len(files), "files")

base = "https://firebasehosting.googleapis.com/v1beta1"
rest_headers = [{"glob": h["source"], "headers": {x["key"]: x["value"] for x in h["headers"]}} for h in cfg.get("headers", [])]
config = {"headers": rest_headers, "cleanUrls": cfg.get("cleanUrls", False),
          "trailingSlashBehavior": "REMOVE" if cfg.get("trailingSlash") is False else "ADD"}
ver = call("POST", f"{base}/sites/{SITE}/versions", {"config": config})
name = ver["name"]
pop = call("POST", f"{base}/{name}:populateFiles", {"files": {k: v[0] for k, v in files.items()}})
by_hash = {v[0]: v[1] for v in files.values()}
need = set(pop.get("uploadRequiredHashes", []))
for h in need:
    call("POST", f"{pop['uploadUrl']}/{h}", raw=by_hash[h], ctype="application/octet-stream")
print("uploaded", len(need), "new files")
call("PATCH", f"{base}/{name}?updateMask=status", {"status": "FINALIZED"})
rel = call("POST", f"{base}/sites/{SITE}/releases?versionName={name}", {})
print("hosting released:", rel.get("name"))

if "--rules" in sys.argv:
    rules = open(os.path.join(ROOT, "firestore.rules"), encoding="utf-8").read()
    rs = call("POST", f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/rulesets",
              {"source": {"files": [{"name": "firestore.rules", "content": rules}]}})
    rel_name = f"projects/{PROJECT}/releases/cloud.firestore"
    body = {"release": {"name": rel_name, "rulesetName": rs["name"]}}
    r = call("PATCH", f"https://firebaserules.googleapis.com/v1/{rel_name}", body, allow=(404,))
    if r.get("_http") == 404:
        call("POST", f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/releases", body)
    print("firestore rules released")
print("live: https://galaxatechweb.web.app")
