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

    // Haal alle paginas op; mislukte paginas worden overgeslagen
    const resultatenRaw = await Promise.allSettled(requests);
    const responses = resultatenRaw
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    let resultaten = responses.flatMap(r => r.results || []).slice(0, cpp);

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

// --- Modal ---

const modalBackdrop = $('#modal-backdrop');
const modalInner    = $('#modal-inner');
const modalClose    = $('#modal-close');

const openModal = async (id) => {
  modalBackdrop?.classList.add('open');
  modalBackdrop?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (modalInner) {
    modalInner.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--text-muted);font-weight:700;">Laden...</div>`;
  }

  try {
    const personage = await fetchPersonageById(id);
    renderModalInhoud(modalInner, personage, onFavWijziging);
  } catch (err) {
    console.error('Modal laden mislukt:', err);
    if (modalInner) {
      modalInner.innerHTML = `<p style="padding:2rem;color:var(--danger);font-weight:700;">Fout bij laden: ${esc(err.message)}</p>`;
    }
  }
};

const sluitModal = () => {
  modalBackdrop?.classList.remove('open');
  modalBackdrop?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

modalClose?.addEventListener('click', sluitModal);
modalBackdrop?.addEventListener('click', (e) => { if (e.target === modalBackdrop) sluitModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalBackdrop?.classList.contains('open')) sluitModal();
});

// --- Favorieten ---

const onFavWijziging = (toegevoegd, personage) => {
  toonToast(
    toegevoegd ? `${personage.name} toegevoegd aan favorieten` : `${personage.name} verwijderd uit favorieten`,
    toegevoegd ? 'success' : 'info'
  );
  updateFavBadge();
  if (state.actieveSectie === 'favorites') renderFavorietenSectie();
};

const updateFavBadge = () => {
  const aantal = getFavorieten().length;
  $$('#fav-badge').forEach(el => { el.textContent = aantal; });
};

const favGrid  = $('#fav-grid');
const favEmpty = $('#fav-empty');
const favTotal = $('#fav-total');

const renderFavorietenSectie = () => {
  const favorieten = getFavorieten();
  updateFavBadge();

  const isLeeg = favorieten.length === 0;
  favEmpty?.classList.toggle('hidden', !isLeeg);
  if (favTotal) favTotal.textContent = `${favorieten.length} personage${favorieten.length !== 1 ? 's' : ''} opgeslagen`;

  if (isLeeg) {
    if (favGrid) favGrid.innerHTML = '';
    return;
  }

  renderPersonages(favGrid, favorieten, openModal, (toegevoegd, personage) => {
    onFavWijziging(toegevoegd, personage);
    renderFavorietenSectie();
  });
};

$('#fav-clear-all')?.addEventListener('click', () => {
  if (!confirm('Weet je zeker dat je alle favorieten wilt verwijderen?')) return;
  leegFavorieten();
  updateFavBadge();
  renderFavorietenSectie();
  toonToast('Alle favorieten verwijderd.', 'info');
});

// --- Afleveringen ---

const epTbody    = $('#ep-tbody');
const epCount    = $('#ep-count');
const epPrev     = $('#ep-prev');
const epNext     = $('#ep-next');
const epPageInfo = $('#ep-page-info');
const EP_PER_PAGINA = 20;

const renderAfleveringPagina = () => {
  let gefilterd = [...state.alleAfleveringen];

  // Filter op naam
  if (state.epFilters.naam) {
    const zoekopdracht = state.epFilters.naam.toLowerCase();
    gefilterd = gefilterd.filter(ep => ep.name.toLowerCase().includes(zoekopdracht));
  }

  // Filter op seizoen
  if (state.epFilters.episode) {
    gefilterd = gefilterd.filter(ep => ep.episode.startsWith(state.epFilters.episode));
  }

  // Sorteren
  gefilterd.sort((a, b) => {
    switch (state.epSortering) {
      case 'ep-asc':    return a.id - b.id;
      case 'ep-desc':   return b.id - a.id;
      case 'name-asc':  return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'date-asc':  return new Date(a.air_date) - new Date(b.air_date);
      case 'date-desc': return new Date(b.air_date) - new Date(a.air_date);
      default:          return 0;
    }
  });

  state.epGefilterd = gefilterd;
  const totaalPaginas = Math.max(1, Math.ceil(gefilterd.length / EP_PER_PAGINA));
  if (state.epPagina > totaalPaginas) state.epPagina = 1;

  const start  = (state.epPagina - 1) * EP_PER_PAGINA;
  const pagina = gefilterd.slice(start, start + EP_PER_PAGINA);

  if (epCount) epCount.textContent = `${gefilterd.length} afleveringen gevonden`;

  renderAfleveringenTabel(epTbody, pagina);
  updatePaginering({ vorigeBtn: epPrev, volgendeBtn: epNext, infoEl: epPageInfo, huidigePagina: state.epPagina, totaalPaginas });

  renderFilterTags(
    $('#ep-active-tags'),
    { Naam: state.epFilters.naam, Seizoen: state.epFilters.episode },
    (key) => {
      if (key === 'Naam')    { state.epFilters.naam = ''; const el = $('#ep-search'); if (el) el.value = ''; }
      if (key === 'Seizoen') { state.epFilters.episode = ''; const el = $('#ep-season'); if (el) el.value = ''; }
      state.epPagina = 1;
      renderAfleveringPagina();
    }
  );
};

const laadAfleveringen = async () => {
  if (state.alleAfleveringen.length > 0) { renderAfleveringPagina(); return; }

  if (epTbody) epTbody.innerHTML = `<tr><td colspan="7" style="padding:2rem;color:var(--text-muted);font-weight:700;">Laden...</td></tr>`;

  try {
    state.alleAfleveringen = await fetchAlleAfleveringen();
    renderAfleveringPagina();
  } catch (err) {
    console.error('Afleveringen laden mislukt:', err);
    toonToast('Afleveringen konden niet geladen worden.', 'error');
  }
};

$('#ep-search')?.addEventListener('input', debounce((e) => { state.epFilters.naam = e.target.value.trim(); state.epPagina = 1; renderAfleveringPagina(); }));
$('#ep-search-clear')?.addEventListener('click', () => { const el = $('#ep-search'); if (el) el.value = ''; state.epFilters.naam = ''; state.epPagina = 1; renderAfleveringPagina(); });
$('#ep-season')?.addEventListener('change', (e) => { state.epFilters.episode = e.target.value; state.epPagina = 1; renderAfleveringPagina(); });
$('#ep-sort')?.addEventListener('change', (e) => { state.epSortering = e.target.value; renderAfleveringPagina(); });

$('#ep-reset')?.addEventListener('click', () => {
  state.epFilters = { naam: '', episode: '' };
  state.epPagina  = 1;
  const epSearch = $('#ep-search');   if (epSearch) epSearch.value = '';
  const epSeason = $('#ep-season');   if (epSeason) epSeason.value = '';
  renderAfleveringPagina();
  toonToast('Filters gereset.', 'info', 2000);
});

epPrev?.addEventListener('click', () => { if (state.epPagina > 1) { state.epPagina--; renderAfleveringPagina(); scrollNaarSectie('section-episodes'); } });
epNext?.addEventListener('click', () => {
  const totaal = Math.ceil(state.epGefilterd.length / EP_PER_PAGINA);
  if (state.epPagina < totaal) { state.epPagina++; renderAfleveringPagina(); scrollNaarSectie('section-episodes'); }
});

// --- Locaties ---

const locGrid     = $('#loc-grid');
const locCount    = $('#loc-count');
const locPrev     = $('#loc-prev');
const locNext     = $('#loc-next');
const locPageInfo = $('#loc-page-info');

const laadLocaties = async () => {
  try {
    toonSkeletons(locGrid, 12);

    const data = await fetchLocaties({ pagina: state.locPagina, naam: state.locFilters.naam, type: state.locFilters.type });
    let resultaten = data.results || [];

    // Clientzijde sortering
    resultaten.sort((a, b) => {
      switch (state.locSortering) {
        case 'name-asc':       return a.name.localeCompare(b.name);
        case 'name-desc':      return b.name.localeCompare(a.name);
        case 'id-asc':         return a.id - b.id;
        case 'residents-desc': return (b.residents?.length || 0) - (a.residents?.length || 0);
        default:               return 0;
      }
    });

    state.locTotaalPaginas = data.info?.pages || 1;
    if (locCount) locCount.textContent = `${data.info?.count || 0} locaties gevonden`;

    renderLocaties(locGrid, resultaten);
    updatePaginering({ vorigeBtn: locPrev, volgendeBtn: locNext, infoEl: locPageInfo, huidigePagina: state.locPagina, totaalPaginas: state.locTotaalPaginas });

    renderFilterTags(
      $('#loc-active-tags'),
      { Naam: state.locFilters.naam, Type: state.locFilters.type },
      (key) => {
        if (key === 'Naam') { state.locFilters.naam = ''; const el = $('#loc-search'); if (el) el.value = ''; }
        if (key === 'Type') { state.locFilters.type = ''; const el = $('#loc-type');   if (el) el.value = ''; }
        state.locPagina = 1;
        laadLocaties();
      }
    );

  } catch (err) {
    console.error('Locaties laden mislukt:', err);
    toonToast('Locaties konden niet geladen worden.', 'error');
  }
};

$('#loc-search')?.addEventListener('input', debounce((e) => { state.locFilters.naam = e.target.value.trim(); state.locPagina = 1; laadLocaties(); }));
$('#loc-search-clear')?.addEventListener('click', () => { const el = $('#loc-search'); if (el) el.value = ''; state.locFilters.naam = ''; state.locPagina = 1; laadLocaties(); });
$('#loc-type')?.addEventListener('change', (e) => { state.locFilters.type = e.target.value; state.locPagina = 1; laadLocaties(); });
$('#loc-sort')?.addEventListener('change', (e) => { state.locSortering = e.target.value; laadLocaties(); });

$('#loc-reset')?.addEventListener('click', () => {
  state.locFilters = { naam: '', type: '' };
  state.locPagina  = 1;
  const locSearch = $('#loc-search'); if (locSearch) locSearch.value = '';
  const locType   = $('#loc-type');   if (locType)   locType.value   = '';
  laadLocaties();
  toonToast('Filters gereset.', 'info', 2000);
});

locPrev?.addEventListener('click', () => { if (state.locPagina > 1) { state.locPagina--; laadLocaties(); scrollNaarSectie('section-locations'); } });
locNext?.addEventListener('click', () => { if (state.locPagina < state.locTotaalPaginas) { state.locPagina++; laadLocaties(); scrollNaarSectie('section-locations'); } });

// --- Instellingen ---

const syncInstellingenUI = () => {
  const setThemeEl = $('#set-theme');
  if (setThemeEl) setThemeEl.value = getThema();

  const setKaarten = $('#set-cards-per-page');
  if (setKaarten) setKaarten.value = String(getKaartenPerPagina());

  const loc   = getLocatie();
  const locEl = $('#location-display');
  if (locEl) {
    locEl.textContent = loc
      ? `Opgeslagen: ${loc.stad} (${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)})`
      : 'Geen locatie opgeslagen.';
  }

  const cacheEl = $('#cache-status');
  if (cacheEl) {
    const info = cacheInfo();
    cacheEl.textContent = `${info.aantal} gecachte verzoeken — ${info.kb} KB opgeslagen`;
  }
};

$('#set-theme')?.addEventListener('change', (e) => pasThemaToe(e.target.value));

$('#set-cards-per-page')?.addEventListener('change', (e) => {
  const n = parseInt(e.target.value, 10);
  state.kaartenPerPagina = n;
  setKaartenPerPagina(n);
  state.charPagina = 1;
  navigeerNaar('characters');
  laadPersonages();
  toonToast(`Kaarten per pagina ingesteld op ${n}.`, 'success', 2000);
});

$('#detect-location-btn')?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    toonToast('Geolocatie wordt niet ondersteund door je browser.', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let stad = 'Onbekend';

      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        stad = data.address?.city || data.address?.town || data.address?.village || 'Onbekend';
      } catch {
        // Geocoding mislukt, gebruik coordinaten als fallback
      }

      setLocatie({ lat, lon, stad });
      syncInstellingenUI();
      toonToast(`Locatie opgeslagen: ${stad}`, 'success');
    },
    () => toonToast('Locatie detecteren mislukt.', 'error')
  );
});

$('#clear-cache-btn')?.addEventListener('click', () => {
  const n = cacheLegen();
  syncInstellingenUI();
  toonToast(`${n} gecachte items gewist.`, 'success');
});

$('#clear-all-btn')?.addEventListener('click', () => {
  if (!confirm('Dit verwijdert ALLE opgeslagen data inclusief favorieten. Doorgaan?')) return;
  wisAlles();
  pasThemaToe('dark');
  updateFavBadge();
  syncInstellingenUI();
  toonToast('Alle data gewist.', 'info');
});

// --- Formuliervalidatie ---

const feedbackForm = $('#feedback-form');

const valideerFeedback = () => {
  let geldig = true;

  // Helper: toon of verberg een foutmelding
  const setFout = (inputId, foutId, bericht) => {
    const input = $(`#${inputId}`);
    const foutEl = $(`#${foutId}`);
    if (bericht) {
      input?.classList.add('invalid');
      if (foutEl) foutEl.textContent = bericht;
      geldig = false;
    } else {
      input?.classList.remove('invalid');
      if (foutEl) foutEl.textContent = '';
    }
  };

  const naam  = $('#fb-name')?.value.trim();
  setFout('fb-name', 'fb-name-err', !naam ? 'Naam is verplicht.' : naam.length < 2 ? 'Naam moet minimaal 2 tekens bevatten.' : '');

  const email   = $('#fb-email')?.value.trim();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  setFout('fb-email', 'fb-email-err', !email ? 'E-mailadres is verplicht.' : !emailRe.test(email) ? 'Voer een geldig e-mailadres in.' : '');

  const bericht = $('#fb-msg')?.value.trim();
  setFout('fb-msg', 'fb-msg-err', !bericht ? 'Bericht is verplicht.' : bericht.length < 10 ? 'Bericht moet minimaal 10 tekens bevatten.' : '');

  const akkoord = $('#fb-agree')?.checked;
  const akkoordFout = $('#fb-agree-err');
  if (!akkoord) {
    if (akkoordFout) akkoordFout.textContent = 'Je moet akkoord gaan om te versturen.';
    geldig = false;
  } else {
    if (akkoordFout) akkoordFout.textContent = '';
  }

  return geldig;
};

feedbackForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!valideerFeedback()) return;

  slaFeedbackOp({
    naam:    $('#fb-name').value.trim(),
    email:   $('#fb-email').value.trim(),
    bericht: $('#fb-msg').value.trim(),
  });

  feedbackForm.reset();
  const successEl = $('#fb-success');
  successEl?.classList.remove('hidden');
  setTimeout(() => successEl?.classList.add('hidden'), 5000);
  toonToast('Feedback verstuurd! Bedankt.', 'success');
});

// Real-time validatie bij verlaten van een veld
['fb-name', 'fb-email', 'fb-msg'].forEach(id => {
  $(`#${id}`)?.addEventListener('blur', valideerFeedback);
});

// --- Laad secties on demand ---

$$('.nav-btn, .mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sectie = btn.dataset.section;
    if (sectie === 'episodes' && state.alleAfleveringen.length === 0) laadAfleveringen();
    if (sectie === 'locations') laadLocaties();
  });
});

// --- Hulpfunctie ---

const scrollNaarSectie = (id) => {
  $(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- Initialisatie ---

const init = async () => {
  updateFavBadge();
  syncInstellingenUI();
  await laadPersonages();
  console.log('Rick & Morty Explorer geladen.');
};

init().catch(err => {
  console.error('Initialisatie mislukt:', err);
  toonToast('De app kon niet opstarten. Probeer de pagina te herladen.', 'error', 6000);
});
