# Neuroimaging Group website

Website of the Neuroimaging Group (Cajal Neuroscience Center, CSIC), built with Jekyll and published with GitHub Pages.

## How to edit

Edit files directly on GitHub: open a file, click the pencil icon, change it and click "Commit changes". The site rebuilds in about a minute.

| What you want to change | File |
|---|---|
| Team members and alumni | `_data/team.yml` |
| Publications | `_data/publications.yml` |
| Research lines and resources | `_data/research.yml` |
| Contact details, menu | `_config.yml` |
| Home page text | `index.html` |
| Projects | `projects/` |
| Colours and fonts | `assets/css/main.css` |

## Adding news

Each news item is a file in `_posts/` whose name starts with its date: `YYYY-MM-DD-short-title.md`, for example `2026-04-09-doctorado-mas-alla-academia.md`. Several items on the same day just need different short titles. Its page will be at `/news/2026-04-09-doctorado-mas-alla-academia/`.

The file starts with a small header:

```
---
title: "Title of the news"
date: 2026-04-09
image: /assets/img/news/my-photo.jpg   # optional, upload the photo to assets/img/news/
---

Text of the news. Links can be pasted as <https://example.org>.
```

Drafts carry the line `published: false` in the header: they are kept in the repository but not shown on the website. Delete that line to publish them.

To add a team photo, upload it to `assets/img/team/` and add `photo: file-name.jpg` to that person in `_data/team.yml`.

### Team photos

`assets/img/team/originals/` keeps the original photos. `assets/img/team/<name>.png` are the cut-out portraits (transparent background, same framing) used on the website; the coloured square behind each one is set in `assets/css/main.css` (search for "team v3"), so colours can be changed without touching the images.
