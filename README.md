# Rick & Morty Explorer

Een webapplicatie om alle personages, afleveringen en locaties uit het Rick & Morty-universum te verkennen. Deze applicatie is gebouwd met Vite en Vanilla JavaScript — zonder frameworks of externe dependencies.

---

## Functionaliteiten

* Bladeren, zoeken en filteren van alle personages, afleveringen en locaties
* Zoekfunctie met debounce, meerdere filters en sorteermogelijkheden
* Favoriete personages opslaan via `localStorage`
* Detailmodal van personages inclusief afleveringslijst
* Donker / licht thema wisselaar met opslag in `localStorage`
* Skeleton loaders tijdens het laden van data
* Toastmeldingen voor gebruikersfeedback
* Feedbackformulier met realtime validatie
* API-cache met een TTL van 15 minuten om netwerkverzoeken te verminderen
* Volledig responsive design voor mobiel, tablet en desktop

---

## Tech Stack

* **Vite** — bundler en development server
* **Vanilla JavaScript (ES Modules)**
* **Rick and Morty API** — gratis API zonder API-sleutel

---

## Installatie

Clone de repository en installeer de dependencies:

```bash
git clone https://github.com/abdelrahm-n/WebAdvanced-Dynamische-Pagina.git
cd WebAdvanced-Dynamische-Pagina
npm install
```

Start daarna de development server:

```bash
npm run dev
```

Open vervolgens de applicatie in je browser via:

```text
http://localhost:5173
```

---

## Productie Build

Om een productieversie van de applicatie te genereren:

```bash
npm run build
```

De gegenereerde bestanden worden opgeslagen in de map:

```text
dist/
```

---

## Projectstructuur

```text
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── css/
    │   ├── main.css
    │   ├── components.css
    │   └── responsive.css
    │
    └── js/
        ├── api.js
        ├── storage.js
        ├── ui.js
        └── main.js
```

### Overzicht van bestanden

#### CSS

| Bestand          | Beschrijving                              |
| ---------------- | ----------------------------------------- |
| `main.css`       | Variabelen, layout en basisstijlen        |
| `components.css` | Cards, overlays, modals en tabellen       |
| `responsive.css` | Responsive breakpoints en mobiele layouts |

#### JavaScript

| Bestand      | Beschrijving                        |
| ------------ | ----------------------------------- |
| `api.js`     | API-calls, caching en retry-logica  |
| `storage.js` | Helpers voor `localStorage`         |
| `ui.js`      | DOM-rendering en UI-functionaliteit |
| `main.js`    | App state, events en navigatie      |

---

## API

De applicatie gebruikt de gratis **Rick and Morty API** van Axel Fuhrmann.

Eigenschappen van de API:

* Geen registratie vereist
* Geen API-sleutel nodig
* Snelle publieke endpoints
* Data wordt 15 minuten gecachet in `localStorage`

Meer informatie:

```text
https://rickandmortyapi.com
```

---

## Responsive Design

De applicatie is volledig responsive en geoptimaliseerd voor:

* Mobiele apparaten
* Tablets
* Desktop schermen

Gebruikte breakpoints:

```text
640px
960px
1400px
```
---

## Thema Ondersteuning

De applicatie ondersteunt zowel een licht als donker thema.

* Themawissel gebeurt dynamisch
* Voorkeur wordt opgeslagen in `localStorage`
* Thema blijft behouden na herladen van de pagina

---

## Website voorbeeld
### darkmode:
<img width="1920" height="936" alt="01-20-03-049 on the date of 25-05-26" src="https://github.com/user-attachments/assets/7ac82c7a-42ba-42b5-a38f-ec4913ee580b" />
<img width="1920" height="936" alt="01-21-39-702 on the date of 25-05-26" src="https://github.com/user-attachments/assets/d084c96b-a4a6-4203-93d5-81e293680532" />


### lightmode:
<img width="1920" height="936" alt="01-21-07-973 on the date of 25-05-26" src="https://github.com/user-attachments/assets/a826b92c-e1fe-45b2-9d58-0fd273014a13" />
<img width="1920" height="936" alt="01-21-57-239 on the date of 25-05-26" src="https://github.com/user-attachments/assets/cc707fde-5f34-4e48-bf50-67abb87aa655" />


---
## Auteur

Ontwikkeld als een dynamische webapplicatie met focus op:

* Vanilla JavaScript
* API-integratie
* Responsive UI
* Performance en caching
* Moderne frontend-architectuur
