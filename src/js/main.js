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

