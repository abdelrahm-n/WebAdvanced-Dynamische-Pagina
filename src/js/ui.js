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
