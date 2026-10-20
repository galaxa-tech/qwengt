# Galaxa Tech website

Static website for Galaxa Tech. One HTML file per page, built from `src/`.

- Live: https://galaxatechweb.web.app (Firebase Hosting, project `galaxatechweb`)
- Code: GitHub `galaxa-tech/qwengt`

## Folders
- `src/pages/` one file per page (text lives here)
- `src/layout.html` shared menu, footer and page frame
- `src/partials/` the three forms (free audit, AI automation, contact)
- `src/css/main.css`, `src/js/main.js` styles and behaviour
- `src/data/work.json` the Work page gallery (see below)
- `img/` logo files and images (`img/logo-original.jpg` is the master logo and is never published or redrawn)
- `firestore.rules` who can write form requests (create-only)
- `tools/build.py` builds `dist/`; `tools/deploy-firebase.py` builds and deploys; `tools/email-alert.gs` optional free email alert

## Commands
```
python tools/build.py                      # build into dist/
python tools/deploy-firebase.py            # build + publish the website
python tools/deploy-firebase.py --rules    # also publish firestore.rules
```
Deploy uses the gcloud login of mail.galaxatech@gmail.com. No Firebase CLI login needed.

## Add a project to the Work page
1. Put screenshots in `img/work/` (e.g. `ecommerce-laptop.jpg`, `ecommerce-phone.jpg`).
2. In `src/data/work.json` set that project's `laptop` and `phone` to the file names.
3. Label projects by type only. Never client names, links or logos.

## Where requests go
Form submissions are saved in Firebase Console > Firestore Database > `audit_requests`, `automation_requests`, `contact_requests`.

## Connecting a domain later
Change `SITE_URL` in `tools/build.py`, add the domain in Firebase Hosting, then redeploy.
