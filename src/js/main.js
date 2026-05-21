// main.js — Hoofdbestand dat alles samenbrengt

import { fetchPersonages, fetchPersonageById, fetchAlleAfleveringen, fetchLocaties, cacheLegen, cacheInfo } from './api.js';
import { getFavorieten, leegFavorieten, getThema, setThema, getKaartenPerPagina, setKaartenPerPagina, getLocatie, setLocatie, slaFeedbackOp, wisAlles } from './storage.js';
import { renderPersonages, toonSkeletons, renderModalInhoud, renderAfleveringenTabel, renderLocaties, renderFilterTags, updatePaginering, toonToast, esc } from './ui.js';

// Korte selectors
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// --- App state ---
const state = {
  // Personages
  charPagina:       1,
  charTotaalPaginas: 1,
  charFilters:      { naam: '', status: '', geslacht: '', soort: '' },
  charSortering:    'name-asc',
  charResultaten:   [],

  // Afleveringen
  alleAfleveringen: [],
  epGefilterd:      [],
  epPagina:         1,
  epFilters:        { naam: '', episode: '' },
  epSortering:      'ep-asc',

  // Locaties
  locPagina:        1,
  locTotaalPaginas: 1,
  locFilters:       { naam: '', type: '' },
  locSortering:     'name-asc',

  // Algemeen
  actieveSectie:    'characters',
  kaartenPerPagina: getKaartenPerPagina(),
};

// --- Thema ---

const pasThemaToe = (thema) => {
  document.documentElement.setAttribute('data-theme', thema);
  setThema(thema);

  // DOM manipulatie: tekst van knop aanpassen
  const label = $('#theme-label');
  if (label) label.textContent = thema === 'dark' ? 'Licht' : 'Donker';

  const select = $('#set-theme');
  if (select) select.value = thema;
};

pasThemaToe(getThema());

$('#theme-btn')?.addEventListener('click', () => {
  pasThemaToe(getThema() === 'dark' ? 'light' : 'dark');
});

// --- Navigatie ---

const navigeerNaar = (sectieId) => {
  state.actieveSectie = sectieId;

  // DOM manipulatie: klassen toggelen
  $$('.page-section').forEach(el => el.classList.remove('active'));
  $(`#section-${sectieId}`)?.classList.add('active');

  $$('.nav-btn, .mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectieId);
  });

  $('#mobile-menu')?.classList.remove('open');
  $('#hamburger')?.setAttribute('aria-expanded', 'false');

  if (sectieId === 'favorites') renderFavorietenSectie();
  if (sectieId === 'settings')  syncInstellingenUI();

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

$$('.nav-btn, .mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.section) navigeerNaar(btn.dataset.section);
  });
});

// Knoppen buiten de nav
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-section]');
  if (btn && !btn.classList.contains('nav-btn') && !btn.classList.contains('mobile-nav-btn')) {
    navigeerNaar(btn.dataset.section);
  }
});

$('#hamburger')?.addEventListener('click', () => {
  const menu = $('#mobile-menu');
  const isOpen = menu?.classList.toggle('open');
  $('#hamburger')?.setAttribute('aria-expanded', String(!!isOpen));
});

// --- Observer API: scroll-naar-boven knop ---

const scrollUpBtn = $('#scroll-up');
const scrollObserver = new IntersectionObserver(
  ([entry]) => scrollUpBtn?.classList.toggle('hidden', entry.isIntersecting),
  { threshold: 0 }
);
if ($('#site-header')) scrollObserver.observe($('#site-header'));
scrollUpBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Observer API: header schaduw bij scrollen
const schaduwObserver = new IntersectionObserver(
  ([entry]) => $('#site-header')?.classList.toggle('scrolled', !entry.isIntersecting),
  { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
);
if ($('#app-main')) schaduwObserver.observe($('#app-main'));

// --- Personages laden ---

const charGrid     = $('#char-grid');
const charCount    = $('#char-count');
const charPrev     = $('#char-prev');
const charNext     = $('#char-next');
const charPageInfo = $('#char-page-info');

const laadPersonages = async () => {
  try {
    const cpp = state.kaartenPerPagina;
    const apiPaginasNodig = Math.ceil(cpp / 20);
    const startPagina = (state.charPagina - 1) * apiPaginasNodig + 1;

    toonSkeletons(charGrid, cpp);

    // Bouw requests voor alle benodigde API-paginas
    const requests = Array.from({ length: apiPaginasNodig }, (_, i) =>
      fetchPersonages({
        pagina:   startPagina + i,
        naam:     state.charFilters.naam,
        status:   state.charFilters.status,
        geslacht: state.charFilters.geslacht,
        soort:    state.charFilters.soort,
      })
    );

    // Haal alle paginas parallel op (Promise.all)
    const responses = await Promise.all(requests);
    let resultaten  = responses.flatMap(r => r.results || []).slice(0, cpp);

    const apiTotaalPaginas = responses[0]?.info?.pages || 1;
    const apiTotaalAantal  = responses[0]?.info?.count || 0;
    state.charTotaalPaginas = Math.ceil(apiTotaalPaginas / apiPaginasNodig);

    resultaten = sorteerPersonages(resultaten, state.charSortering);
    state.charResultaten = resultaten;

    if (charCount) charCount.textContent = `${apiTotaalAantal} personages gevonden`;

    renderPersonages(charGrid, resultaten, openModal, onFavWijziging);
    updatePaginering({ vorigeBtn: charPrev, volgendeBtn: charNext, infoEl: charPageInfo, huidigePagina: state.charPagina, totaalPaginas: state.charTotaalPaginas });

    renderFilterTags(
      $('#char-active-tags'),
      { Naam: state.charFilters.naam, Status: state.charFilters.status, Geslacht: state.charFilters.geslacht, Soort: state.charFilters.soort },
      (key) => verwijderCharFilter(key)
    );

  } catch (err) {
    console.error('Personages laden mislukt:', err);
    charGrid.innerHTML = `<p style="color:var(--danger);font-weight:700;padding:2rem 0;grid-column:1/-1;">Kon personages niet laden. Controleer je internetverbinding.</p>`;
    toonToast('Personages konden niet geladen worden.', 'error');
  }
};

// Sorteer een array personages op basis van de sortering
const sorteerPersonages = (lijst, sortering) => {
  return [...lijst].sort((a, b) => {
    switch (sortering) {
      case 'name-asc':    return a.name.localeCompare(b.name);
      case 'name-desc':   return b.name.localeCompare(a.name);
      case 'id-asc':      return a.id - b.id;
      case 'id-desc':     return b.id - a.id;
      case 'status-asc':  return a.status.localeCompare(b.status);
      case 'species-asc': return a.species.localeCompare(b.species);
      default:            return 0;
    }
  });
};

// Debounce: wacht tot de gebruiker stopt met typen
const debounce = (fn, vertraging = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), vertraging);
  };
};

// Filter events personages
const charSearchInput = $('#char-search');
charSearchInput?.addEventListener('input', debounce((e) => {
  state.charFilters.naam = e.target.value.trim();
  state.charPagina = 1;
  laadPersonages();
}));

$('#char-search-clear')?.addEventListener('click', () => {
  charSearchInput.value     = '';
  state.charFilters.naam    = '';
  state.charPagina          = 1;
  laadPersonages();
  charSearchInput.focus();
});

$('#char-status')?.addEventListener('change', (e) => { state.charFilters.status = e.target.value; state.charPagina = 1; laadPersonages(); });
$('#char-gender')?.addEventListener('change', (e) => { state.charFilters.geslacht = e.target.value; state.charPagina = 1; laadPersonages(); });
$('#char-species')?.addEventListener('change', (e) => { state.charFilters.soort = e.target.value; state.charPagina = 1; laadPersonages(); });
$('#char-sort')?.addEventListener('change', (e) => { state.charSortering = e.target.value; laadPersonages(); });

$('#char-reset')?.addEventListener('click', () => {
  state.charFilters = { naam: '', status: '', geslacht: '', soort: '' };
  state.charPagina  = 1;
  if (charSearchInput)       charSearchInput.value       = '';
  const statusEl = $('#char-status');   if (statusEl)  statusEl.value  = '';
  const genderEl = $('#char-gender');   if (genderEl)  genderEl.value  = '';
  const soortEl  = $('#char-species');  if (soortEl)   soortEl.value   = '';
  const sortEl   = $('#char-sort');     if (sortEl)    sortEl.value    = 'name-asc';
  laadPersonages();
  toonToast('Filters gereset.', 'info', 2000);
});

const verwijderCharFilter = (key) => {
  const map = { Naam: 'naam', Status: 'status', Geslacht: 'geslacht', Soort: 'soort' };
  const veld = map[key];
  if (!veld) return;
  state.charFilters[veld] = '';
  state.charPagina = 1;
  if (veld === 'naam' && charSearchInput) charSearchInput.value = '';
  const sel = { status: '#char-status', geslacht: '#char-gender', soort: '#char-species' }[veld];
  if (sel) $(sel).value = '';
  laadPersonages();
};

charPrev?.addEventListener('click', () => {
  if (state.charPagina > 1) { state.charPagina--; laadPersonages(); scrollNaarSectie('section-characters'); }
});
charNext?.addEventListener('click', () => {
  if (state.charPagina < state.charTotaalPaginas) { state.charPagina++; laadPersonages(); scrollNaarSectie('section-characters'); }
});

