/**
 * LocalStorage utilities for Trading Discipline Cards
 */

import type { TradeReport, TradeCardRecord } from './types';

const STORAGE_KEY = 'trading_discipline_cards';

export function saveReport(report: TradeReport): void {
  if (typeof window === 'undefined') return;

  const existing = getReports();
  existing.unshift(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getReports(): TradeReport[] {
  if (typeof window === 'undefined') return [];

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getReportById(id: string): TradeReport | null {
  const reports = getReports();
  return reports.find(r => r.id === id) || null;
}

export function getCardRecords(): TradeCardRecord[] {
  const reports = getReports();
  return reports.map(r => ({
    id: r.id,
    type: r.input.type,
    symbol: r.input.symbol,
    calmStatus: r.calmStatus ?? 'pause',
    impulseRisk: r.scores.impulseRisk,
    positionRisk: r.scores.positionRisk,
    reasonQuality: r.scores.reasonQuality,
    summary: r.summary,
    createdAt: r.createdAt,
  }));
}

export function deleteReport(id: string): void {
  if (typeof window === 'undefined') return;

  const reports = getReports();
  const filtered = reports.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
