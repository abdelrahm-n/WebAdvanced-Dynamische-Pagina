// storage.js — Alles wat met localStorage te maken heeft

const SLEUTELS = {
  favorieten: 'rm_favorites',
  thema:      'rm_theme',
  kaarten:    'rm_cards_per_page',
  locatie:    'rm_location',
  feedback:   'rm_feedback',
};

// Lees een waarde uit localStorage (geeft fallback terug als niet gevonden)
const lsLees = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// Schrijf een waarde naar localStorage
const lsSchrijf = (key, waarde) => {
  try {
    localStorage.setItem(key, JSON.stringify(waarde));
    return true;
  } catch (e) {
    console.warn('localStorage schrijven mislukt:', e);
    return false;
  }
};

// --- Favorieten ---

export const getFavorieten = () => lsLees(SLEUTELS.favorieten, []);

export const isFavoriet = (id) => getFavorieten().some(f => f.id === id);

export const voegFavorietToe = (personage) => {
  const lijst = getFavorieten();
  if (lijst.some(f => f.id === personage.id)) return lijst;

  // Sla alleen de benodigde velden op
  const compact = {
    id:       personage.id,
    name:     personage.name,
    status:   personage.status,
    species:  personage.species,
    gender:   personage.gender,
    type:     personage.type || '',
    origin:   personage.origin?.name || 'Onbekend',
    location: personage.location?.name || 'Onbekend',
    image:    personage.image,
    episode:  personage.episode || [],
  };

  lijst.unshift(compact);
  lsSchrijf(SLEUTELS.favorieten, lijst);
  return lijst;
};

export const verwijderFavoriet = (id) => {
  const bijgewerkt = getFavorieten().filter(f => f.id !== id);
  lsSchrijf(SLEUTELS.favorieten, bijgewerkt);
  return bijgewerkt;
};

export const toggleFavoriet = (personage) => {
  if (isFavoriet(personage.id)) {
    return { toegevoegd: false, favorieten: verwijderFavoriet(personage.id) };
  } else {
    return { toegevoegd: true, favorieten: voegFavorietToe(personage) };
  }
};

export const leegFavorieten = () => {
  localStorage.removeItem(SLEUTELS.favorieten);
  return [];
};

// --- Thema ---

export const getThema = () => lsLees(SLEUTELS.thema, 'dark');
export const setThema = (thema) => lsSchrijf(SLEUTELS.thema, thema);

// --- Kaarten per pagina ---

export const getKaartenPerPagina = () => lsLees(SLEUTELS.kaarten, 20);
export const setKaartenPerPagina = (n) => lsSchrijf(SLEUTELS.kaarten, n);

// --- Locatie ---

export const getLocatie = () => lsLees(SLEUTELS.locatie, null);
export const setLocatie = (loc) => lsSchrijf(SLEUTELS.locatie, loc);
export const verwijderLocatie = () => localStorage.removeItem(SLEUTELS.locatie);

// --- Feedback ---

export const slaFeedbackOp = (data) => {
  const alle = lsLees(SLEUTELS.feedback, []);
  alle.push({ ...data, datum: new Date().toISOString() });
  return lsSchrijf(SLEUTELS.feedback, alle);
};

// --- Alles wissen ---

export const wisAlles = () => {
  const appSleutels = Object.keys(localStorage).filter(k => k.startsWith('rm_'));
  appSleutels.forEach(k => localStorage.removeItem(k));
};

// Einde storage.js - rm_ prefix voor naamruimte-isolatie
