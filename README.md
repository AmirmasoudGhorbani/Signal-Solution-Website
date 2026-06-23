# TV Signal Solutions

Marketing website for **TV Signal Solutions** — a 100% NZ-owned, family-run TV aerial, satellite, WiFi, 4G and CCTV business serving Auckland.

🔵 Live site: _add your URL once deployed_

---

## ✨ Features

- **Interactive particle hero** — a canvas particle field that morphs between a satellite dish, a satellite and an Auckland coverage map, reacting to the cursor.
- **Animated signal background** — drifting node mesh, broadcast rings, data pulses and waveforms behind the lower sections.
- **3D liquid-glass services carousel** — a rotating cylinder of service cards (React + `requestAnimationFrame`).
- **Animated Auckland coverage map** — live radar sweep and pulsing signal beams.
- **Recent Work** — horizontal photo carousel of completed jobs.
- **Live AI chat assistant** — answers questions about services (with a keyword fallback when no AI host is present).
- **Quote form + chat callback** — lead delivery via [FormSubmit](https://formsubmit.co) with a mail-client fallback.
- **Genuine Google reviews** — auto-rotating testimonial section.
- **Fully responsive** + custom logo, favicon, and social-share image.

---

## 🚀 Deploying

The site is a **single self-contained file**: [`index.html`](./index.html). Everything (CSS, JS, images, fonts config) is inlined, so you can host it anywhere with zero build step.

### Option 1 — GitHub Pages (free)
1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main` / `root`**, and Save.
4. Your site goes live at `https://<username>.github.io/<repo>/` in a minute or two.

### Option 2 — Netlify / Vercel / Cloudflare Pages
Drag-and-drop `index.html` (or connect the repo). No build command needed — it's static.

### Option 3 — Your own host
Upload `index.html` to your web root. Done.

> **📩 Email delivery:** The contact form and chat callback post to FormSubmit. The **first** submission from the live domain triggers a one-time activation email to the owner — click the link in it once and leads flow automatically thereafter.
>
> **🖼 Social share image:** For link previews (WhatsApp/Facebook/LinkedIn) to show the branded card, upload `assets/og-image.png` to `/assets/og-image.png` at your live domain root. Social scrapers need a hosted URL — an embedded image won't show.

---

## 🛠 Editing the site

`index.html` is **generated** — don't hand-edit it. Edit the source, then rebuild.

| Source | Purpose |
|---|---|
| `index.src.html` | Page markup with `/*INJECT:*/` placeholders |
| `css/styles.css` | All styles / design system |
| `js/hero.js` | Particle-morph hero |
| `js/background.js` | Animated signal background |
| `js/coverage.js` | Auckland coverage map animation |
| `js/carousel.jsx` | 3D liquid-glass services carousel (React) |
| `js/work.js` | Recent Work photo carousel |
| `js/reviews.js` | Rotating Google reviews |
| `js/chat.js` | AI chat assistant |
| `js/leads.js` | Contact form + chat lead delivery (**edit email/phone here**) |
| `js/main.js` | Nav, mobile menu, scroll reveals, counters |
| `js/image-slot.js` | Drag-and-drop image placeholder component |
| `assets/` | Images, logos, favicon, social image |

### The build step
`index.html` is produced by inlining each source file into the `/*INJECT:*/` and `__WORK_*__` placeholders in `index.src.html`, and embedding the hero/work images as downscaled data-URIs (so the single file works fully offline). The build was run inside the design tool that created this site — re-open the project there to regenerate `index.html` after editing source.

If you just need a quick copy/content change, editing `index.html` directly is fine — just remember a future rebuild from source would overwrite it.

---

## 📇 Contact / config

Business and developer contact details live in **`js/leads.js`** (`window.TVS_CONTACT`). Update the `email`, `phone` and FormSubmit `endpoint` there, then rebuild.

---

## 🎨 Brand

A full logo/brand pack (logo lockups, mark, favicon, app icon, social image — dark & light) is in **`TV-Signal-Solutions-Brand/`**.

---

© TV Signal Solutions. Built with care — TV/aerial site by the team; web & app development by [Amir](https://amirghorbani.dev).
