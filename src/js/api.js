// api.js — Communicatie met de Rick and Morty API
// Documentatie: https://rickandmortyapi.com/documentation

const BASE_URL = 'https://rickandmortyapi.com/api';
const CACHE_DUUR = 15 * 60 * 1000; // 15 minuten

// --- Cache helpers ---

const cacheOpslaan = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ tijd: Date.now(), data }));
  } catch (e) {
    console.warn('Cache opslaan mislukt:', e);
  }
};

const cacheOphalen = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.tijd > CACHE_DUUR) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
};

export const cacheLegen = () => {
  const sleutels = Object.keys(localStorage).filter(k => k.startsWith('rm_cache_'));
  sleutels.forEach(k => localStorage.removeItem(k));
  return sleutels.length;
};

export const cacheInfo = () => {
  const sleutels = Object.keys(localStorage).filter(k => k.startsWith('rm_cache_'));
  let grootte = 0;
  sleutels.forEach(k => { grootte += (localStorage.getItem(k) || '').length; });
  return { aantal: sleutels.length, kb: (grootte / 1024).toFixed(1) };
};

// --- Basis fetch functie met caching ---

export const apiFetch = async (url) => {
  // Gebruik een veilige cache sleutel (geen btoa die kan crashen op speciale tekens)
  const cacheKey = 'rm_cache_' + url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
  const gecached = cacheOphalen(cacheKey);
  if (gecached) return gecached;

  const response = await fetch(url);

  // 404 = geen resultaten, geen echte fout
  if (response.status === 404) {
    return { results: [], info: { count: 0, pages: 0 } };
  }

  if (!response.ok) {
    throw new Error(`API fout ${response.status}`);
  }

  const data = await response.json();
  cacheOpslaan(cacheKey, data);
  return data;
};

// --- Personages ---

export const fetchPersonages = async ({ pagina = 1, naam = '', status = '', geslacht = '', soort = '' } = {}) => {
  const params = new URLSearchParams({ page: pagina });
  if (naam)     params.set('name',    naam.trim());
  if (status)   params.set('status',  status);
  if (geslacht) params.set('gender',  geslacht);
  if (soort)    params.set('species', soort);

  return apiFetch(`${BASE_URL}/character?${params}`);
};

export const fetchPersonageById = async (id) => {
  return apiFetch(`${BASE_URL}/character/${id}`);
};

// --- Afleveringen ---

export const fetchAfleveringen = async ({ pagina = 1, naam = '', episode = '' } = {}) => {
  const params = new URLSearchParams({ page: pagina });
  if (naam)    params.set('name',    naam.trim());
  if (episode) params.set('episode', episode);

  return apiFetch(`${BASE_URL}/episode?${params}`);
};

// Haal ALLE afleveringen op via meerdere pagina's tegelijk (Promise.all)
export const fetchAlleAfleveringen = async () => {
  const eerste = await fetchAfleveringen({ pagina: 1 });
  const totaalPaginas = eerste.info?.pages || 1;

  if (totaalPaginas === 1) return eerste.results || [];

  // Bouw een array van paginanummers en haal ze parallel op
  const paginaNummers = Array.from({ length: totaalPaginas - 1 }, (_, i) => i + 2);
  const rest = await Promise.all(paginaNummers.map(p => fetchAfleveringen({ pagina: p })));

  return [
    ...(eerste.results || []),
    ...rest.flatMap(r => r.results || []),
  ];
};

// --- Locaties ---

export const fetchLocaties = async ({ pagina = 1, naam = '', type = '' } = {}) => {
  const params = new URLSearchParams({ page: pagina });
  if (naam) params.set('name', naam.trim());
  if (type) params.set('type', type);

  return apiFetch(`${BASE_URL}/location?${params}`);
};

// --- Hulpfuncties ---

export const vertaalStatus = (status) => {
  const map = { Alive: 'Levend', Dead: 'Dood', unknown: 'Onbekend' };
  return map[status] || status;
};

export const vertaalGeslacht = (geslacht) => {
  const map = { Male: 'Man', Female: 'Vrouw', Genderless: 'Genderloos', unknown: 'Onbekend' };
  return map[geslacht] || geslacht;
};

export const formateerDatum = (datumStr) => {
  if (!datumStr) return 'Onbekend';
  const d = new Date(datumStr);
  if (isNaN(d)) return datumStr;
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const parserEpisodeCode = (code) => {
  const match = code.match(/S(\d+)E(\d+)/i);
  if (!match) return { seizoen: 0, aflevering: 0 };
  return { seizoen: parseInt(match[1], 10), aflevering: parseInt(match[2], 10) };
};
