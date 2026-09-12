# Rachel Sepulveda — Portfolio Website

A static interior design & art curation portfolio site, with a Sanity CMS
integration for editing projects, photographs and page text.

**CMS setup and current connection status:** see [cms/SETUP.md](cms/SETUP.md).
**Everyday editing:** see [EDITING.md](EDITING.md).
Run `npm run build:local` for an offline preview or `npm run build` for a
connected build using published Sanity content. Netlify publishes `dist/`.
The original HTML files below remain source templates and open independently.

The historical manual-editing instructions below describe the original site;
after connecting Sanity, routine content changes belong in the editor.

---

## File Structure

```
Website/
├── index.html              ← Home (hero slider + models preview)
├── models.html             ← All ten model units
├── commercial.html         ← All four commercial spaces
├── art.html                ← Art & curation gallery (lightbox)
├── hand-drawn.html         ← Hand-drawn artwork
├── about.html              ← Bio, philosophy, stats
├── contact.html            ← Contact form
├── models/                 ← Case study pages (models + commercial)
│   ├── murabella.html
│   ├── nc-sc.html
│   ├── nc.html
│   ├── westlake.html
│   ├── jacksonville.html
│   ├── annandale.html
│   ├── residence-peninsula.html
│   ├── assembly.html
│   ├── nexus-45.html
│   ├── moorefield.html
│   ├── overlook.html
│   ├── tortoise-one.html
│   ├── westlake-commercial.html
│   └── southern-maryland.html
├── css/
│   └── style.css           ← All styles (Google Fonts imported here)
├── js/
│   └── main.js             ← Hero slider, gallery filter, lightbox, nav
└── images/
    ├── hero/               ← 4 hero slider images
    ├── murabella/          ← 6 images (murabella-1.jpg … murabella-6.jpg)
    ├── nc-sc/              ← 10 images (nc-sc-1.jpg … nc-sc-10.jpg)
    ├── nc/                 ← 17 images (nc-1.jpg … nc-17.jpg)
    ├── jacksonville/       ← 4 images (jacksonville-1.png … jacksonville-4.png)
    ├── annandale/          ← 6 images (annandale-1.jpg … annandale-6.jpg)
    ├── residence-peninsula/ ← 3 images (residence-peninsula-1.jpg … residence-peninsula-3.jpg)
    ├── assembly/           ← 2 images (assembly-1.jpg … assembly-2.jpg)
    ├── nexus-45/           ← 5 images (nexus-45-1.jpg … nexus-45-5.jpg)
    ├── moorefield/         ← 8 images (moorefield-1.jpg … moorefield-8.jpg)
    ├── overlook/           ← 5 images (overlook-1.jpg … overlook-5.jpg)
    ├── tortoise-one/       ← 6 images (art-1.jpg … art-6.jpg)
    ├── westlake/           ← 11 images (art-1.jpg … art-11.jpg)
    ├── southern-maryland/  ← 4 images (southern-maryland-1.png … southern-maryland-4.png)
    ├── art/                ← All art images combined (for gallery page)
    └── hand-drawn/         ← 2 hand-drawn artwork images
```

---

## Running Locally

Just open `index.html` in any modern browser. Because Google Fonts are loaded over the network, you need an internet connection for fonts to render — but all images and layout work fully offline.

For the best local experience (avoids any browser CORS restrictions), serve it with a simple HTTP server:

```bash
# Python 3
cd /Users/cameronglass/Documents/RachelWebsite/Website
python3 -m http.server 8080
# Then open: http://localhost:8080
```

---

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `rachel-sepulveda-portfolio`)
2. From the `Website` folder, initialise git and push:

```bash
cd /Users/cameronglass/Documents/RachelWebsite/Website
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/rachel-sepulveda-portfolio.git
git push -u origin main
```

3. In the GitHub repo → **Settings → Pages → Source → Deploy from branch → main / root**
4. The site will be live at `https://YOUR-USERNAME.github.io/rachel-sepulveda-portfolio/` within a few minutes.

---

## Deploying to Netlify (alternative — recommended for custom domain)

1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag and drop the entire `Website` folder onto the Netlify upload area
3. Done — Netlify provides a live URL instantly
4. To add a custom domain: Site settings → Domain management → Add custom domain

---

## How to Update Content

### Replace the About portrait
The about page currently uses a project photo as a placeholder. Replace it with Rachel's portrait:
1. Add the portrait to `images/` (e.g. `images/rachel-portrait.jpg`)
2. In `about.html`, find the `<img>` inside `.about-portrait` and update the `src`

### Add a new project photo
1. Add the image to the relevant folder (e.g. `images/murabella/murabella-7.jpg`)
2. Open the case study HTML file and add a new `<div class="case-gallery-item">` block

### Change the hero slider images
In `index.html`, find the `.hero-slides` section and update the `<img src="...">` paths inside each `.hero-slide` div. The slider auto-detects how many slides exist.

### Update placeholder bio text
Open `about.html` and replace the `<p class="about-bio">` paragraphs with Rachel's actual biography.

### Add contact email / social links
In `contact.html`, update the `.contact-detail` blocks with real contact information. To wire up the form to a real email service, replace the form's `submit` handler in `js/main.js` with a fetch call to a service like [Formspree](https://formspree.io) or [Netlify Forms](https://docs.netlify.com/forms/setup/).

### Change the color theme defaults
All colors are defined as CSS custom properties at the top of `css/style.css` inside `:root { }`. Edit those values to adjust the global palette.

---

## Features

| Feature | Details |
|---|---|
| Hero slider | Auto-advances every 5 s, touch-swipe on mobile, dot nav + arrows |
| Gallery filter | Filter tabs on Models and Art pages hide/show items by category |
| Color theme switcher | Four dot buttons shift the CSS custom properties live |
| Lightbox | Click any image on Art or case study pages to open full-screen viewer with keyboard nav (← → Esc) |
| Scroll animations | Elements fade up as they enter the viewport via IntersectionObserver |
| Fixed nav | Transparent over hero, becomes solid + blurred on scroll |
| Mobile menu | Full-screen overlay triggered by MENU button |
| Responsive | Fluid grid layouts collapse gracefully from desktop → tablet → mobile |
| No dependencies | Pure HTML + CSS + vanilla JS — nothing to install or build |
