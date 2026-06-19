/**
 * LocalStorage utilities for Calm Cards
 */

import type { CalmCard, CalmCardRecord } from './types';
import { toCalmCardRecord } from './generate-report';

const STORAGE_KEY = 'trading_discipline_cards';

export function saveCard(card: CalmCard): void {
  if (typeof window === 'undefined') return;
  const existing = getCards();
  existing.unshift(card);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getCards(): CalmCard[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getCardById(id: string): CalmCard | null {
  return getCards().find(c => c.id === id) || null;
}

export function getCardRecords(): CalmCardRecord[] {
  return getCards()
    .filter(c => c && c.calmStatus) // skip any legacy/corrupt entries
    .map(toCalmCardRecord);
}

export function deleteCard(id: string): void {
  if (typeof window === 'undefined') return;
  const filtered = getCards().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Replace a card in place (keeps its position in the list). Used when the
// user supplements position info and the card is regenerated.
export function updateCard(id: string, next: CalmCard): void {
  if (typeof window === 'undefined') return;
  const cards = getCards().map(c => (c.id === id ? next : c));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
