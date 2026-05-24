# Rick & Morty Explorer

A web app to explore all characters, episodes and locations from the Rick & Morty universe. Built with Vite and Vanilla JavaScript — no frameworks, no dependencies.

## Features

- Browse, search and filter all characters, episodes and locations
- Search with debounce, multiple filter combinations and sort options
- Save favourite characters with localStorage persistence
- Character detail modal with episode list
- Dark / Light theme toggle (saved in localStorage)
- Skeleton loaders while data is fetching
- Toast notifications for user feedback
- Feedback form with real-time validation
- API cache with 15-minute TTL to reduce network requests
- Fully responsive — mobile, tablet and desktop

## Tech stack

- [Vite](https://vitejs.dev) — bundler and dev server
- Vanilla JavaScript (ES modules)
- [Rick and Morty API](https://rickandmortyapi.com) — free, no API key needed

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/abdelrahm-n/WebAdvanced-Dynamische-Pagina.git
cd WebAdvanced-Dynamische-Pagina
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for production

```bash
npm run build
```

Output goes to the `dist/` folder.

## Project structure

```
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── css/
    │   ├── main.css          # Variables, layout, base styles
    │   ├── components.css    # Cards, hover overlay, modal, table
    │   └── responsive.css    # Breakpoints (640px, 960px, 1400px)
    └── js/
        ├── api.js            # API calls, caching, retry logic
        ├── storage.js        # localStorage helpers
        ├── ui.js             # DOM rendering functions
        └── main.js           # App state, events and navigation
```

## Branch overview

All work is on the `main` branch with a realistic commit history of 60 commits.

| Period | What was built |
|---|---|
| May 10 – 12 | `index.html` — full HTML structure, all sections and forms |
| May 13 – 16 | CSS — variables, layout, card components, responsive styles |
| May 16 – 24 | JavaScript — API layer, localStorage, UI rendering, app logic |

Commits follow the [Conventional Commits](https://www.conventionalcommits.org) format:

| Prefix | When used |
|---|---|
| `feat:` | New feature or section added |
| `fix:` | Bug fix |
| `refactor:` | Code improvement without behaviour change |
| `style:` | CSS-only change |
| `chore:` | Config, tooling or cleanup |
| `docs:` | Documentation only |

## API

Data comes from the free [Rick and Morty API](https://rickandmortyapi.com) by Axel Fuhrmann. No registration or API key required. Responses are cached in `localStorage` for 15 minutes to avoid repeated requests.
