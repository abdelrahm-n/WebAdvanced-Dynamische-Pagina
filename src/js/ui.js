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

