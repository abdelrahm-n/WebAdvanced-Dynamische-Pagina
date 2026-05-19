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
