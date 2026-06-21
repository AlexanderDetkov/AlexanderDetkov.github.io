# alexanderdetkov.github.io

Personal academic website for Alexander Detkov — PhD student, Computation & Neural
Systems, Caltech (Thomson Lab).

Plain static site: no build step, no Jekyll. GitHub Pages serves it directly.

```
index.html              # all page content (edit here)
assets/css/style.css    # styling, light/dark theme
assets/js/main.js        # theme toggle, scroll reveals, nav
assets/img/             # avatar, paper figures, favicons
assets/files/           # CV PDF
.nojekyll               # tell GitHub Pages to skip Jekyll processing
```

## Editing
- **Bio / news / publications:** edit `index.html` directly.
- **CV:** replace `assets/files/curriculum_vitae_public.pdf`.
- **Colors / fonts:** the CSS custom properties at the top of `style.css`.

## Local preview
```
python3 -m http.server 8000   # then open http://localhost:8000
```
