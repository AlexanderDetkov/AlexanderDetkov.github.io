# alexanderdetkov.github.io

Personal academic website for Alexander Detkov — PhD student, Computation & Neural
Systems, Caltech (Thomson Lab).

Plain static site: no build step, no Jekyll. GitHub Pages serves it directly.

```
index.html              # all page content (edit here)
assets/css/style.css    # styling; light/dark follow the system setting
assets/img/papers/      # paper figures (self-contained SVGs with their own light/dark colors)
assets/img/             # avatar, favicons
assets/files/           # CV PDF
.nojekyll               # tell GitHub Pages to skip Jekyll processing
```

## Editing
- **Bio / papers:** edit `index.html` directly. Each paper is one `<li class="paper">`:
  figure, title link, one-line summary, author line.
- **Paper figures:** 160×100 SVGs in `assets/img/papers/`.
- **CV:** replace `assets/files/curriculum_vitae_public.pdf`.
- **Colors / fonts:** the CSS custom properties at the top of `style.css`.

## Local preview
```
python3 -m http.server 8000   # then open http://localhost:8000
```
