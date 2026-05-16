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
  const cacheKey = 'rm_cache_' + url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120);
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
