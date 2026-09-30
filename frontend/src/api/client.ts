import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// The admin token is a JWT scoped to one event. An expired (or pre-JWT) token counts as absent.
function getAdminToken(code: string): string | null {
  const token = localStorage.getItem(`tastetogether_admin_${code}`);
  try {
    const payload = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp * 1000 > Date.now()) return token;
  } catch {
    // not a JWT
  }
  return null;
}

function adminHeaders(code: string) {
  return { Authorization: `Bearer ${getAdminToken(code)}` };
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
export async function createEvent(name: string, password: string) {
  const { data } = await api.post('/events', { name, password });
  return data as { event: { id: string; name: string; code: string; createdAt: string }; token: string };
}

export async function adminLogin(code: string, password: string) {
  const { data } = await api.post(`/events/${code}/admin/login`, { password });
  saveAdminToken(code, data.token);
}

export async function getEvent(code: string) {
  const { data } = await api.get(`/events/${code}`);
  return data;
}

export async function getEventStatus(code: string) {
  const adminToken = getAdminToken(code);
  const session = getSession(code);
  const params: Record<string, string> = {};
  if (session) params.sessionToken = session.sessionToken;

  const { data } = await api.get(`/events/${code}/status`, {
    params,
    headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
  });
  return data;
}

export async function joinEvent(code: string, username: string) {
  const { data } = await api.post(`/events/${code}/join`, { username });
  return data as { participant: { id: string; username: string }; sessionToken: string };
}

// Admin actions
export async function addTastingItem(code: string, name: string, price: number) {
  const { data } = await api.post(`/events/${code}/items`, { name, price }, {
    headers: adminHeaders(code),
  });
  return data;
}

export async function setActiveItem(code: string, itemId: string | null) {
  const { data } = await api.patch(`/events/${code}/active-item`, { itemId }, {
    headers: adminHeaders(code),
  });
  return data;
}

export async function setResultsRevealed(code: string, revealed: boolean) {
  const { data } = await api.patch(`/events/${code}/results`, { revealed }, {
    headers: adminHeaders(code),
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
