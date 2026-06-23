# Web Project Guidelines

Standards and preferences for building and maintaining web projects. Follow these rules on every new project to keep things clean, fast, and professional from day one.

---

## 1. Code Organisation

### Separate everything
- **HTML** in `.html` files — markup only, no inline styles or scripts.
- **CSS** in external `.css` files — linked via `<link rel="stylesheet">`.
- **JavaScript** in external `.js` files — loaded via `<script src="...">`.
- Never embed CSS inside `<style>` tags in the HTML.
- Never embed JS inside `<script>` tags in the HTML (except small config objects if absolutely necessary).

### File structure
Keep a consistent folder layout across all projects:

```
project/
├── index.html
├── styles.css                  # Main stylesheet (or css/ folder if multiple)
├── assets/
│   ├── images/                 # All site images
│   ├── icons/                  # Favicons, app icons
│   └── brand/                  # Logo variations, social share images
├── js/
│   ├── main.js                 # Core site interactions
│   └── [feature].js            # One file per feature/component
├── server/                     # Backend code (if applicable)
├── .github/workflows/          # CI/CD pipelines
├── README.md
└── LICENSE
```

### Naming conventions
- File names: lowercase, hyphens for spaces (`brand-mark.png`, not `Brand Mark.png`).
- CSS classes: lowercase, hyphens (`hero-content`, `nav-links`).
- JS variables/functions: camelCase (`scrollPosition`, `handleClick`).
- Keep names descriptive but short.

---

## 2. Images and Assets

### Never use base64-encoded images in HTML
- Base64 data URIs bloat the HTML file massively (a 50KB image becomes ~67KB of text).
- The browser cannot cache base64 images separately.
- It makes the HTML unreadable and impossible to maintain.
- Always use external image files referenced with `src="assets/images/photo.jpg"`.

### Image optimisation
- Use **JPEG** for photographs (aim for 60-150KB per image for web).
- Use **PNG** for logos, icons, and images that need transparency.
- Use **SVG** for logos and icons whenever possible (scales perfectly, tiny file size).
- Use **WebP** as a modern alternative for both photos and graphics.
- Resize images to the maximum display size they'll be used at — don't serve a 4000px image for a 400px thumbnail.

### Logo handling
- Always have multiple logo formats available:
  - **SVG** — for web use, scales to any size without blur.
  - **PNG** — for contexts that don't support SVG (social previews, emails).
  - Light and dark versions if the logo is used on different backgrounds.
- Store all brand assets in a dedicated `assets/brand/` or `Brand/` folder.
- The nav logo, footer logo, and favicon should all reference external files, never inline data.

---

## 3. Social Preview (Open Graph)

When someone shares a link on WhatsApp, iMessage, LinkedIn, Slack, etc., the preview image and text come from Open Graph meta tags.

### Required meta tags
```html
<!-- Basic OG -->
<meta property="og:title" content="Site Title" />
<meta property="og:description" content="Short description of the site." />
<meta property="og:url" content="https://your-live-url.com/" />
<meta property="og:image" content="https://your-live-url.com/assets/brand/preview.png" />
<meta property="og:image:width" content="600" />
<meta property="og:image:height" content="600" />

<!-- Twitter/X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Site Title" />
<meta name="twitter:description" content="Short description." />
<meta name="twitter:image" content="https://your-live-url.com/assets/brand/preview.png" />
```

### Rules
- The `og:image` URL must be an **absolute URL** (full `https://...`), not a relative path.
- The image must be **publicly accessible** — test by opening the URL in an incognito browser.
- Use the **brand logo or a branded card** as the preview image, not a random screenshot.
- After changing the `og:image`, messaging apps cache the old preview. Allow 24-48 hours, or use platform debug tools to force a refresh.
- For GitHub repos, the social preview must be uploaded manually: **Settings > Social preview > Edit > Upload**.

---

## 4. Responsiveness

### Mobile-first approach
- Design for mobile screens first, then add complexity for larger screens.
- Use CSS `clamp()` for fluid typography: `font-size: clamp(16px, 2vw, 20px)`.
- Use CSS Grid and Flexbox for layouts — never use floats or fixed pixel widths for page structure.

### Breakpoints
Use consistent breakpoints across all projects:

| Breakpoint | Target |
|---|---|
| `max-width: 560px` | Small phones |
| `max-width: 780px` | Large phones / small tablets |
| `max-width: 980px` | Tablets / small laptops |
| `max-width: 1080px` | Standard laptops |
| `min-width: 1080px` | Desktops |

### Common responsive patterns
- **Navigation**: Full horizontal nav on desktop, hamburger dropdown on mobile (switch around 980px).
- **Grids**: 3 columns on desktop, 2 on tablet, 1 on mobile.
- **Hero sections**: Flexible height with `min-height: 100svh`, fluid padding.
- **Buttons**: Full-width stacked on mobile, inline on desktop.
- **Images**: Always set `max-width: 100%` and `display: block`.
- **Touch targets**: Minimum 44x44px for all interactive elements on mobile.

### Testing
- Always test on both a real phone and desktop browser before calling a page done.
- Use browser DevTools responsive mode as a quick check, but don't rely on it exclusively.

---

## 5. CSS Design System

### Use CSS custom properties
Define all colours, fonts, spacing, and radii as variables in `:root` so the entire design can be updated from one place:

```css
:root {
  --bg: #04070f;
  --ink: #eaf2ff;
  --accent: #2ea3ff;
  --display: "Space Grotesk", system-ui, sans-serif;
  --body: "Manrope", system-ui, sans-serif;
  --r-lg: 22px;
  --pad: clamp(20px, 5vw, 56px);
}
```

### Organisation
Structure the CSS file in this order:
1. **Variables** (`:root`)
2. **Reset / base styles** (`*`, `html`, `body`, `h1-h4`, `a`, `img`)
3. **Layout** (`.wrap`, `section`, padding utilities)
4. **Components** (nav, buttons, cards, forms) — one comment block per component
5. **Section-specific styles** (hero, services, reviews, footer)
6. **Animations** (`@keyframes`)
7. **Responsive overrides** (`@media` queries, largest to smallest)

---

## 6. Performance

- Keep the total HTML file under **100KB** (excluding external assets).
- Load fonts via Google Fonts with `preconnect` for speed.
- Use `loading="lazy"` on images below the fold.
- Prefer CSS animations over JavaScript animations where possible — they run on the GPU.
- Minimise the number of external HTTP requests (combine small JS files if needed).

---

## 7. Git and Deployment

### Repository hygiene
- Never commit secrets (`.env`, API keys, credentials) — use `.gitignore`.
- Never add contributors or co-author tags to commits unless explicitly asked.
- Write clear, concise commit messages that describe *what changed*, not the process.
- Keep commits focused — one logical change per commit.

### GitHub Pages deployment
1. Include a `.github/workflows/deploy.yml` for automatic deployment.
2. Set source to **GitHub Actions** in repo settings.
3. Include a `.nojekyll` file to prevent Jekyll processing.

### README
Every project README should be professional and include:
- Project logo (centered, reasonable size).
- One-line description.
- Live site link.
- Tech stack badges.
- Feature descriptions.
- Project structure.
- Deployment instructions.
- License.

---

## 8. Checklist Before Going Live

- [ ] All CSS is in external files (no inline `<style>` blocks).
- [ ] All JS is in external files (no inline `<script>` blocks beyond config).
- [ ] All images are external files (no base64 data URIs in HTML).
- [ ] Open Graph meta tags are set with absolute URLs to the live domain.
- [ ] Favicon is set.
- [ ] Page is responsive on mobile, tablet, and desktop.
- [ ] All links work (no dead `#` anchors or broken hrefs).
- [ ] Page loads with the hero/top section visible (no unexpected scroll).
- [ ] README is professional with logo, live link, and tech stack.
- [ ] GitHub repo social preview image is uploaded in Settings.
- [ ] No secrets or credentials in the codebase.
- [ ] `.gitignore` is in place.
