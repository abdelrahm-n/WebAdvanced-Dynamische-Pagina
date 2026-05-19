// ui.js — Alle DOM-rendering functies

import { isFavoriet, toggleFavoriet } from './storage.js';
import { vertaalStatus, vertaalGeslacht, formateerDatum, parserEpisodeCode } from './api.js';

// Ontsnap HTML-tekens om XSS te voorkomen
export const esc = (str) =>
  String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Geef de CSS-klasse terug op basis van status
export const statusKlasse = (status) => {
  if (status === 'Alive') return 'alive';
  if (status === 'Dead')  return 'dead';
  return 'unknown';
};

// --- Toast berichten ---

export const toonToast = (bericht, type = 'info', duur = 2800) => {
  const container = document.getElementById('toast-stack');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = bericht;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duur);
};

// --- Skeleton loaders ---

export const toonSkeletons = (container, aantal = 20) => {
  container.innerHTML = Array.from({ length: aantal }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-photo"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-line" style="width:75%"></div>
        <div class="skeleton skeleton-line" style="width:50%;margin-top:0.25rem"></div>
      </div>
    </div>
  `).join('');
};

// --- Personagekaarten ---

// Bouw HTML voor één personagekaart
const bouwPersonageKaart = (personage) => {
  const fav = isFavoriet(personage.id);
  const sc  = statusKlasse(personage.status);
  const nlStatus = vertaalStatus(personage.status);
  const aantalEps = personage.episode?.length || 0;
  const laatsteEp = personage.episode?.[personage.episode.length - 1]?.split('/').pop() || '?';

  return `
    <article class="char-card" data-id="${personage.id}" tabindex="0" aria-label="Personage: ${esc(personage.name)}">

      <div class="char-photo-wrap" data-detail="${personage.id}">
        <img class="char-photo" src="${esc(personage.image)}" alt="${esc(personage.name)}" loading="lazy" />
        <span class="char-status-badge ${sc}">${nlStatus}</span>
        <button class="char-fav-btn ${fav ? 'active' : ''}" data-fav-id="${personage.id}" title="${fav ? 'Verwijder favoriet' : 'Voeg toe aan favorieten'}">
          ${fav ? '&#10084;' : '&#9825;'}
        </button>
      </div>

      <div class="char-body">
        <h3 class="char-name">${esc(personage.name)}</h3>
        <p class="char-meta">${esc(personage.species)}${personage.type ? ` — ${esc(personage.type)}` : ''}</p>
      </div>

      <div class="char-hover-stats" aria-hidden="true">
        <p class="hover-stats-title">${esc(personage.name)}</p>
        <div class="hover-stats-grid">
          <div class="stat-row"><span class="stat-label">Status</span><span class="stat-value ${sc}">${nlStatus}</span></div>
          <div class="stat-row"><span class="stat-label">Soort</span><span class="stat-value">${esc(personage.species)}</span></div>
          <div class="stat-row"><span class="stat-label">Geslacht</span><span class="stat-value">${vertaalGeslacht(personage.gender)}</span></div>
          <div class="stat-row"><span class="stat-label">Herkomst</span><span class="stat-value">${esc(personage.origin?.name || 'Onbekend')}</span></div>
          <div class="stat-row"><span class="stat-label">Locatie</span><span class="stat-value">${esc(personage.location?.name || 'Onbekend')}</span></div>
          <div class="stat-row"><span class="stat-label">Afleveringen</span><span class="stat-value">${aantalEps} (laatste: E${laatsteEp})</span></div>
        </div>
        <div class="hover-stats-actions">
          <button class="hover-detail-btn" data-detail="${personage.id}">Meer info</button>
          <button class="hover-fav-btn ${fav ? 'active' : ''}" data-fav-id="${personage.id}">
            ${fav ? 'Opgeslagen' : 'Opslaan'}
          </button>
        </div>
      </div>

    </article>
  `;
};

// Render een lijst personages in een container
export const renderPersonages = (container, personages, onDetail, onFavWijziging) => {
  if (!personages.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-weight:700;padding:2rem 0;grid-column:1/-1;">Geen personages gevonden met deze filters.</p>`;
    return;
  }

  // Gebruik .map() om alle kaarten te bouwen
  container.innerHTML = personages.map(p => bouwPersonageKaart(p)).join('');

  // Event listeners op elke kaart
  container.querySelectorAll('.char-card').forEach((kaart, i) => {
    kaart.style.animationDelay = `${i * 0.03}s`;

    // Klik op foto of hover-knop opent detail
    kaart.querySelectorAll('[data-detail]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onDetail(parseInt(el.dataset.detail, 10));
      });
    });

    // Keyboard: enter of spatie opent detail
    kaart.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDetail(parseInt(kaart.dataset.id, 10));
      }
    });
  });

  // Favoriet-knoppen
  container.querySelectorAll('[data-fav-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.favId, 10);
      const personage = personages.find(p => p.id === id);
      if (!personage) return;

      const { toegevoegd } = toggleFavoriet(personage);

      // Update alle knoppen voor dit personage op de pagina
      document.querySelectorAll(`[data-fav-id="${id}"]`).forEach(b => {
        b.classList.toggle('active', toegevoegd);
        if (b.classList.contains('char-fav-btn')) {
          b.innerHTML = toegevoegd ? '&#10084;' : '&#9825;';
        }
        if (b.classList.contains('hover-fav-btn')) {
          b.textContent = toegevoegd ? 'Opgeslagen' : 'Opslaan';
        }
      });

      if (onFavWijziging) onFavWijziging(toegevoegd, personage);
    });
  });
};

// --- Modal inhoud ---

export const renderModalInhoud = (inner, personage, onFavWijziging) => {
  const fav = isFavoriet(personage.id);
  const sc  = statusKlasse(personage.status);
  const aantalEps = personage.episode?.length || 0;

  // Toon max 30 aflevering-chips
  const epChips = (personage.episode || []).slice(0, 30)
    .map(url => `<span class="ep-chip">E${url.split('/').pop()}</span>`)
    .join('');

  const meerEps = aantalEps > 30
    ? `<span class="ep-chip" style="border-color:var(--text-muted);color:var(--text-muted)">+${aantalEps - 30} meer</span>`
    : '';

  inner.innerHTML = `
    <div class="modal-char-header">
      <img class="modal-char-photo" src="${esc(personage.image)}" alt="${esc(personage.name)}" />
      <div class="modal-char-title-block">
        <h2 class="modal-char-name" id="modal-char-name">${esc(personage.name)}</h2>
        <div class="modal-badges">
          <span class="badge badge-species">${esc(personage.species)}</span>
          <span class="badge badge-gender">${vertaalGeslacht(personage.gender)}</span>
          ${personage.type ? `<span class="badge badge-type">${esc(personage.type)}</span>` : ''}
          <span class="char-status-badge ${sc}" style="position:static;display:inline-flex;">${vertaalStatus(personage.status)}</span>
        </div>
      </div>
    </div>

    <div class="modal-body">
      <p class="modal-section-label">Personage-informatie</p>
      <div class="modal-info-grid">
        <div class="modal-info-item"><p class="modal-info-label">ID</p><p class="modal-info-value">#${personage.id}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Status</p><p class="modal-info-value">${vertaalStatus(personage.status)}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Soort</p><p class="modal-info-value">${esc(personage.species)}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Geslacht</p><p class="modal-info-value">${vertaalGeslacht(personage.gender)}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Herkomst</p><p class="modal-info-value">${esc(personage.origin?.name || 'Onbekend')}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Huidige locatie</p><p class="modal-info-value">${esc(personage.location?.name || 'Onbekend')}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Type</p><p class="modal-info-value">${esc(personage.type || '—')}</p></div>
        <div class="modal-info-item"><p class="modal-info-label">Afleveringen</p><p class="modal-info-value">${aantalEps}</p></div>
      </div>

      ${epChips ? `
        <p class="modal-section-label" style="margin-top:1.25rem;">Voorkomt in afleveringen</p>
        <div class="modal-episodes-list">${epChips}${meerEps}</div>
      ` : ''}

      <div class="modal-actions">
        <button class="modal-fav-btn ${fav ? 'active' : ''}" id="modal-fav-btn" data-modal-fav="${personage.id}">
          ${fav ? 'Verwijder favoriet' : 'Voeg toe aan favorieten'}
        </button>
        <a class="page-btn" href="https://rickandmortyapi.com/api/character/${personage.id}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;">
          API-link
        </a>
      </div>
    </div>
  `;

  // Favoriet-knop in modal
  const modalFavBtn = inner.querySelector('#modal-fav-btn');
  if (modalFavBtn) {
    modalFavBtn.addEventListener('click', () => {
      const { toegevoegd } = toggleFavoriet(personage);
      modalFavBtn.classList.toggle('active', toegevoegd);
      modalFavBtn.textContent = toegevoegd ? 'Verwijder favoriet' : 'Voeg toe aan favorieten';
      if (onFavWijziging) onFavWijziging(toegevoegd, personage);
    });
  }
};

// --- Afleveringentabel ---

export const renderAfleveringenTabel = (tbody, afleveringen) => {
  if (!afleveringen.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">Geen afleveringen gevonden.</td></tr>`;
    return;
  }

  // Gebruik .map() om tabelrijen te bouwen
  tbody.innerHTML = afleveringen.map(ep => {
    const { seizoen, aflevering } = parserEpisodeCode(ep.episode);
    return `
      <tr>
        <td>${ep.id}</td>
        <td>${esc(ep.name)}</td>
        <td><span class="ep-code-badge">${esc(ep.episode)}</span></td>
        <td><span class="ep-season-badge">S${String(seizoen).padStart(2, '0')}</span></td>
        <td>${String(aflevering).padStart(2, '0')}</td>
        <td>${formateerDatum(ep.air_date)}</td>
        <td><span class="ep-char-count">${ep.characters?.length || 0} personages</span></td>
      </tr>
    `;
  }).join('');
};

// --- Locatiekaarten ---

const bouwLocatieKaart = (loc) => `
  <article class="loc-card" aria-label="Locatie: ${esc(loc.name)}">
    <h3 class="loc-name">${esc(loc.name)}</h3>
    <div class="loc-meta-row">
      <div class="loc-meta-item">
        <span class="loc-meta-label">Type</span>
        <span class="loc-meta-value">${esc(loc.type || 'Onbekend')}</span>
      </div>
      <div class="loc-meta-item">
        <span class="loc-meta-label">Dimensie</span>
        <span class="loc-meta-value">${esc(loc.dimension || 'Onbekend')}</span>
      </div>
      <div class="loc-meta-item">
        <span class="loc-meta-label">ID</span>
        <span class="loc-meta-value">#${loc.id}</span>
      </div>
    </div>
    <div>
      <span class="loc-resident-count">${loc.residents?.length || 0}</span>
      <span class="loc-resident-label"> bewoners</span>
    </div>
  </article>
`;

export const renderLocaties = (container, locaties) => {
  if (!locaties.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-weight:700;padding:2rem 0;grid-column:1/-1;">Geen locaties gevonden.</p>`;
    return;
  }
  container.innerHTML = locaties.map(l => bouwLocatieKaart(l)).join('');
};

// --- Filter tags ---

export const renderFilterTags = (container, filters, onVerwijder) => {
  // filter() om alleen actieve filters te tonen
  const actief = Object.entries(filters).filter(([, v]) => v !== '');

  if (!actief.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = actief.map(([key, waarde]) => `
    <span class="filter-tag">
      ${esc(waarde)}
      <button data-remove="${esc(key)}" aria-label="Filter verwijderen">x</button>
    </span>
  `).join('');

  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => onVerwijder(btn.dataset.remove));
  });
};

// --- Paginering ---

export const updatePaginering = ({ vorigeBtn, volgendeBtn, infoEl, huidigePagina, totaalPaginas }) => {
  if (!vorigeBtn || !volgendeBtn || !infoEl) return;
  vorigeBtn.disabled   = huidigePagina <= 1;
  volgendeBtn.disabled = huidigePagina >= totaalPaginas;
  infoEl.textContent   = `Pagina ${huidigePagina} van ${totaalPaginas}`;
};
