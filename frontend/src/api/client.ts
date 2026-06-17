import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function getAdminToken(code: string): string | null {
  return localStorage.getItem(`tastetogether_admin_${code}`);
}

function getSession(code: string): { sessionToken: string; username: string } | null {
  const raw = localStorage.getItem(`tastetogether_session_${code}`);
  return raw ? JSON.parse(raw) : null;
}

export function saveAdminToken(code: string, token: string) {
  localStorage.setItem(`tastetogether_admin_${code}`, token);
}

export function saveSession(code: string, sessionToken: string, username: string) {
  localStorage.setItem(`tastetogether_session_${code}`, JSON.stringify({ sessionToken, username }));
}

export function hasAdminToken(code: string): boolean {
  return !!getAdminToken(code);
}

export function getStoredUsername(code: string): string | null {
  return getSession(code)?.username ?? null;
}

// Events
export async function createEvent(name: string) {
  const { data } = await api.post('/events', { name });
  return data as { event: { id: string; name: string; code: string; createdAt: string }; adminToken: string };
}

export async function getEvent(code: string) {
  const { data } = await api.get(`/events/${code}`);
  return data;
}

export async function getEventStatus(code: string) {
  const adminToken = getAdminToken(code);
  const session = getSession(code);
  const params: Record<string, string> = {};
  if (adminToken) params.adminToken = adminToken;
  if (session) params.sessionToken = session.sessionToken;

  const { data } = await api.get(`/events/${code}/status`, { params });
  return data;
}

export async function joinEvent(code: string, username: string) {
  const { data } = await api.post(`/events/${code}/join`, { username });
  return data as { participant: { id: string; username: string }; sessionToken: string };
}

// Admin actions
export async function addTastingItem(code: string, name: string, price: number) {
  const adminToken = getAdminToken(code)!;
  const { data } = await api.post(`/events/${code}/items`, { name, price }, {
    headers: { 'X-Admin-Token': adminToken },
  });
  return data;
}

export async function setActiveItem(code: string, itemId: string | null) {
  const adminToken = getAdminToken(code)!;
  const { data } = await api.patch(`/events/${code}/active-item`, { itemId }, {
    headers: { 'X-Admin-Token': adminToken },
  });
  return data;
}

export async function setResultsRevealed(code: string, revealed: boolean) {
  const adminToken = getAdminToken(code)!;
  const { data } = await api.patch(`/events/${code}/results`, { revealed }, {
    headers: { 'X-Admin-Token': adminToken },
  });
  return data as { resultsRevealed: boolean };
}

// Participant actions
export async function rateItem(code: string, itemId: string, score: number) {
  const session = getSession(code)!;
  const { data } = await api.post(`/events/${code}/items/${itemId}/rate`, { score }, {
    headers: { 'X-Session-Token': session.sessionToken },
  });
  return data;
}

export async function postComment(code: string, itemId: string, text: string) {
  const session = getSession(code)!;
  const { data } = await api.post(`/events/${code}/items/${itemId}/comments`, { text }, {
    headers: { 'X-Session-Token': session.sessionToken },
  });
  return data;
}
