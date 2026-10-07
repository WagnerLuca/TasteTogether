/**
 * Port of `createKontoAuth` from the design system's `src/core/konto.js`. The package (0.1.0)
 * ships it as plain JS without type definitions, so this TS copy stays. Same behaviour, same
 * storage keys — keep the two in step.
 *
 * Sign in with WL Konto: authorization code + PKCE, tokens in sessionStorage, refresh with a
 * single in-flight request (refresh tokens rotate), logout ends the Konto session too.
 * The ID token arrives over TLS straight from the token endpoint, so only iss/aud/nonce/exp are
 * checked here; the backend verifies the access token's signature against Konto's JWKS.
 */

export interface KontoUser {
  sub: string;
  name: string;
  email: string;
  picture: string | null;
  locale: string | null;
}

interface Tokens {
  access_token: string;
  refresh_token: string | null;
  id_token: string;
  expires_at: number;
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomString = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

function read<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: signed in until reload
  }
}

export function createKontoAuth({
  authority,
  clientId,
  scope = 'openid profile email offline_access',
  redirectUri = location.origin + '/auth/callback',
  postLogoutRedirectUri = location.origin + '/',
}: {
  authority: string;
  clientId: string;
  scope?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
}) {
  const base = authority.replace(/\/+$/, '');
  const tokenKey = `wl-konto:${clientId}`;
  const pendingKey = `wl-konto:${clientId}:pending`;
  const listeners = new Set<(u: KontoUser | null) => void>();
  let discovery: Discovery | null = null;
  let refreshing: Promise<string | null> | null = null;

  async function discover() {
    if (!discovery) {
      const res = await fetch(base + '/.well-known/openid-configuration');
      if (!res.ok) throw new Error('Konto discovery failed: ' + res.status);
      discovery = (await res.json()) as Discovery;
    }
    return discovery;
  }

  const tokens = () => read<Tokens>(tokenKey);

  function user(): KontoUser | null {
    const t = tokens();
    if (!t?.id_token) return null;
    const c = decodeJwt(t.id_token);
    return {
      sub: String(c.sub),
      name: String(c.name ?? ''),
      email: String(c.email ?? ''),
      picture: (c.picture as string) ?? null,
      locale: (c.locale as string) ?? null,
    };
  }

  function save(t: Tokens | null) {
    write(tokenKey, t);
    const u = user();
    listeners.forEach((fn) => fn(u));
  }

  async function storeTokenResponse(res: Response, expectedNonce: string | null, previous: Tokens | null) {
    const body = await res.json();
    if (!res.ok) throw new Error(body.error_description ?? body.error ?? 'token request failed');
    if (body.id_token) {
      const claims = decodeJwt(body.id_token);
      const d = await discover();
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (claims.iss !== d.issuer || !aud.includes(clientId) || Number(claims.exp) * 1000 < Date.now()) throw new Error('invalid id_token');
      if (expectedNonce && claims.nonce !== expectedNonce) throw new Error('nonce mismatch');
    }
    save({
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? previous?.refresh_token ?? null,
      id_token: body.id_token ?? previous?.id_token,
      expires_at: Date.now() + (body.expires_in ?? 900) * 1000,
    });
  }

  const tokenRequest = async (params: Record<string, string>) =>
    fetch((await discover()).token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, ...params }).toString(),
    });

  return {
    async login({ returnTo, prompt }: { returnTo?: string; prompt?: string } = {}) {
      const d = await discover();
      const verifier = randomString();
      const state = randomString(16);
      const nonce = randomString(16);
      write(pendingKey, { verifier, state, nonce, returnTo: returnTo ?? location.pathname + location.search });
      const url = new URL(d.authorization_endpoint);
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        state,
        nonce,
        code_challenge: await challengeFor(verifier),
        code_challenge_method: 'S256',
        ...(prompt ? { prompt } : {}),
      }).toString();
      location.assign(url.toString());
    },

    async handleCallback(href = location.href): Promise<{ returnTo: string; error?: string }> {
      const params = new URL(href).searchParams;
      const pending = read<{ verifier: string; state: string; nonce: string; returnTo: string }>(pendingKey);
      write(pendingKey, null);
      if (!pending || params.get('state') !== pending.state) return { error: 'invalid_state', returnTo: '/' };
      if (params.get('error')) return { error: params.get('error')!, returnTo: pending.returnTo };
      const res = await tokenRequest({
        grant_type: 'authorization_code',
        code: params.get('code') ?? '',
        redirect_uri: redirectUri,
        code_verifier: pending.verifier,
      });
      await storeTokenResponse(res, pending.nonce, null);
      return { returnTo: pending.returnTo };
    },

    async accessToken(): Promise<string | null> {
      const t = tokens();
      if (!t) return null;
      if (t.expires_at - 60_000 > Date.now()) return t.access_token;
      if (!t.refresh_token) {
        save(null);
        return null;
      }
      refreshing ??= (async () => {
        try {
          await storeTokenResponse(await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token! }), null, t);
          return tokens()!.access_token;
        } catch {
          save(null);
          return null;
        } finally {
          refreshing = null;
        }
      })();
      return refreshing;
    },

    user,
    isSignedIn: () => !!tokens(),

    async logout() {
      const t = tokens();
      save(null);
      const url = new URL((await discover()).end_session_endpoint);
      url.search = new URLSearchParams({
        client_id: clientId,
        post_logout_redirect_uri: postLogoutRedirectUri,
        ...(t?.id_token ? { id_token_hint: t.id_token } : {}),
      }).toString();
      location.assign(url.toString());
    },

    forget: () => save(null),

    subscribe(fn: (u: KontoUser | null) => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    accountUrl: base + '/account',
  };
}

export type KontoAuth = ReturnType<typeof createKontoAuth>;
