import { Locale } from './wl/useLocale';

/**
 * This app's own page copy, German/English.
 *
 * The *switching* (current value, persistence, the toggle in TopNav) is the
 * shared concern and lives in `src/wl/useLocale.ts` — the React port of
 * @wagnerluca/ui's `useLocale()`, reading the same `wl-locale` key. Here we only
 * say what is displayed. Same `{ section: { field: { de, en } } }` shape the
 * portfolio and the arcade use, so the pattern is recognisable across repos.
 *
 * Rules:
 *  - never hardcode either language in a component — add a pair here and call `t()`;
 *  - a string that is generic chrome shared by several modules belongs in the
 *    design system's own DICTIONARY instead, not in this file;
 *  - anything counted uses a `Plural` entry and `tp()`, so German and English can
 *    disagree about plural forms without string surgery at the call site.
 */
export type Message = Record<Locale, string>;
export type Plural = Record<Locale, { one: string; other: string }>;

export const messages = {
  brand: {
    // Sub-brand shown in TopNav: renders as "WL TasteTogether".
    product: { de: 'TasteTogether', en: 'TasteTogether' } as Message,
    tagline: {
      de: 'Gemeinsam verkosten — bewerten, kommentieren, genießen.',
      en: 'Taste together — rate, comment, and enjoy.',
    } as Message,
  },

  common: {
    loading: { de: 'Lädt…', en: 'Loading…' } as Message,
    back: { de: 'Zurück', en: 'Back' } as Message,
    copy: { de: 'Kopieren', en: 'Copy' } as Message,
    copied: { de: '✓ Kopiert', en: '✓ Copied' } as Message,
    goHome: { de: 'Zur Startseite', en: 'Go home' } as Message,
    saving: { de: 'Wird gespeichert…', en: 'Saving…' } as Message,
    notRated: { de: 'nicht bewertet', en: 'not rated' } as Message,
  },

  home: {
    hostTitle: { de: 'Verkostung veranstalten', en: 'Host a tasting' } as Message,
    hostHint: {
      de: 'Du legst die Proben fest und deckst am Ende die Rangliste auf.',
      en: 'You add the items and reveal the ranking at the end.',
    } as Message,
    eventNamePlaceholder: {
      de: 'Name der Verkostung (z. B. Weinabend #3)',
      en: 'Event name (e.g. Wine Night #3)',
    } as Message,
    passwordPlaceholder: {
      de: 'Gastgeber-Passwort (mind. 6 Zeichen)',
      en: 'Host password (min. 6 characters)',
    } as Message,
    passwordHint: {
      de: 'Damit meldest du dich als Gastgeber an — auch von einem anderen Gerät.',
      en: 'Lets you sign in as host again — from any device.',
    } as Message,
    create: { de: 'Verkostung erstellen', en: 'Create event' } as Message,
    creating: { de: 'Wird erstellt…', en: 'Creating…' } as Message,
    createError: {
      de: 'Verkostung konnte nicht erstellt werden. Bitte erneut versuchen.',
      en: 'Failed to create event. Please try again.',
    } as Message,

    joinTitle: { de: 'Verkostung beitreten', en: 'Join a tasting' } as Message,
    joinHint: {
      de: 'Du brauchst nur den sechsstelligen Code des Gastgebers.',
      en: 'All you need is the host’s six-character code.',
    } as Message,
    codePlaceholder: { de: 'Event-Code (z. B. HK3PQ7)', en: 'Event code (e.g. HK3PQ7)' } as Message,
    find: { de: 'Verkostung finden', en: 'Find event' } as Message,
    finding: { de: 'Wird gesucht…', en: 'Looking up…' } as Message,
    notFound: {
      de: 'Verkostung nicht gefunden. Bitte den Code prüfen.',
      en: 'Event not found. Check the code and try again.',
    } as Message,
    joiningPrefix: { de: 'Beitreten:', en: 'Joining:' } as Message,
    namePlaceholder: { de: 'Dein Name', en: 'Your name' } as Message,
    join: { de: 'Beitreten', en: 'Join' } as Message,
    joining: { de: 'Tritt bei…', en: 'Joining…' } as Message,
    joinError: {
      de: 'Beitritt fehlgeschlagen. Dieser Name ist möglicherweise schon vergeben.',
      en: 'Failed to join. That name may already be taken.',
    } as Message,
  },

  admin: {
    eyebrow: { de: 'Gastgeber-Ansicht', en: 'Host view' } as Message,
    loginTitle: { de: 'Als Gastgeber anmelden', en: 'Sign in as host' } as Message,
    loginHint: {
      de: 'Gib das Passwort ein, das beim Erstellen der Verkostung vergeben wurde.',
      en: 'Enter the password that was set when the event was created.',
    } as Message,
    passwordPlaceholder: { de: 'Gastgeber-Passwort', en: 'Host password' } as Message,
    login: { de: 'Anmelden', en: 'Sign in' } as Message,
    loggingIn: { de: 'Wird angemeldet…', en: 'Signing in…' } as Message,
    loginError: { de: 'Falsches Passwort.', en: 'Wrong password.' } as Message,
    loginThrottled: {
      de: 'Zu viele Versuche. Bitte eine Minute warten.',
      en: 'Too many attempts. Please wait a minute.',
    } as Message,
    eventCode: { de: 'Event-Code', en: 'Event code' } as Message,
    joinLink: { de: 'Beitritts-Link', en: 'Join link' } as Message,
    shareHint: {
      de: 'QR-Code scannen oder Link bzw. Code teilen, um Teilnehmende einzuladen.',
      en: 'Scan the QR code or share the link or code to invite participants.',
    } as Message,
    participants: { de: 'Teilnehmende', en: 'Participants' } as Message,
    noParticipants: { de: 'Noch niemand beigetreten.', en: 'No one has joined yet.' } as Message,
    nowTasting: { de: 'Aktuelle Probe', en: 'Now tasting' } as Message,
    ratedOf: { de: 'von {total} bewertet', en: 'of {total} rated' } as Message,
    addItem: { de: 'Probe hinzufügen', en: 'Add tasting item' } as Message,
    itemNamePlaceholder: {
      de: 'Name (z. B. Château Margaux 2018)',
      en: 'Name (e.g. Château Margaux 2018)',
    } as Message,
    pricePlaceholder: { de: 'Preis (€)', en: 'Price (€)' } as Message,
    add: { de: 'Hinzufügen', en: 'Add' } as Message,
    adding: { de: 'Wird hinzugefügt…', en: 'Adding…' } as Message,
    addError: { de: 'Probe konnte nicht hinzugefügt werden.', en: 'Failed to add item.' } as Message,
    invalidPrice: { de: 'Bitte einen gültigen Preis eingeben.', en: 'Enter a valid price.' } as Message,
    items: { de: 'Proben', en: 'Tasting items' } as Message,
    activate: { de: 'Aktivieren', en: 'Activate' } as Message,
    deactivate: { de: 'Deaktivieren', en: 'Deactivate' } as Message,
    resultsTitle: { de: 'Ergebnisse & Rangliste', en: 'Results & ranking' } as Message,
    resultsVisible: {
      de: 'Für alle Teilnehmenden sichtbar.',
      en: 'Visible to all participants.',
    } as Message,
    resultsHidden: {
      de: 'Verborgen — nur du siehst die Rangliste unten.',
      en: 'Hidden — only you can see the ranking below.',
    } as Message,
    reveal: { de: 'Für alle aufdecken', en: 'Reveal to everyone' } as Message,
    hideResults: { de: 'Wieder verbergen', en: 'Hide from participants' } as Message,
    statusError: {
      de: 'Status der Verkostung konnte nicht geladen werden.',
      en: 'Could not load event status.',
    } as Message,
  },

  event: {
    joinPrompt: { de: 'Namen eingeben, um beizutreten', en: 'Enter your name to join' } as Message,
    joinCta: { de: 'Verkostung beitreten', en: 'Join tasting' } as Message,
    greeting: { de: 'Hallo,', en: 'Hi,' } as Message,
    loadError: {
      de: 'Verkostung konnte nicht geladen werden. Der Code ist möglicherweise ungültig.',
      en: 'Could not load event. The code may be invalid.',
    } as Message,
    waiting: {
      de: 'Warten, bis der Gastgeber die nächste Probe startet…',
      en: 'Waiting for the host to start the next tasting…',
    } as Message,
    yourRating: { de: 'Deine Bewertung:', en: 'Your rating:' } as Message,
    rateThis: { de: 'Diese Probe bewerten:', en: 'Rate this item:' } as Message,
    submit: { de: 'Bewertung abgeben', en: 'Submit rating' } as Message,
    submitting: { de: 'Wird gesendet…', en: 'Submitting…' } as Message,
    rateError: {
      de: 'Bewertung konnte nicht gesendet werden.',
      en: 'Failed to submit rating.',
    } as Message,
    ratedOfPeople: {
      de: '{rated} von {total} haben bewertet',
      en: '{rated} of {total} people have rated',
    } as Message,
    tastedSoFar: { de: 'Bisher verkostet', en: 'Tasted so far' } as Message,
  },

  rating: {
    sliderLabel: { de: 'Bewertungsschieber', en: 'Rating slider' } as Message,
    ariaValue: { de: 'Bewertung {value} von {max}', en: 'Rating {value} of {max}' } as Message,
    ariaSet: { de: 'Mit {value} von {max} bewerten', en: 'Rate {value} of {max}' } as Message,
  },

  comments: {
    title: { de: 'Kommentare', en: 'Comments' } as Message,
    empty: { de: 'Noch keine Kommentare.', en: 'No comments yet.' } as Message,
    placeholder: { de: 'Kommentar hinzufügen…', en: 'Add a comment…' } as Message,
    send: { de: 'Senden', en: 'Send' } as Message,
    noneForItem: {
      de: 'Keine Kommentare zu dieser Probe.',
      en: 'No comments for this item.',
    } as Message,
  },

  results: {
    title: { de: 'Ergebnisse', en: 'Results' } as Message,
    fullRanking: { de: 'Gesamt-Rangliste', en: 'Full ranking' } as Message,
    noItems: { de: 'Noch keine Proben.', en: 'No tasting items yet.' } as Message,
  },
} as const;

/** Counted strings — resolved with `tp(key, count)`. */
export const plurals = {
  'admin.participantCount': {
    de: { one: '{count} Teilnehmer', other: '{count} Teilnehmende' },
    en: { one: '{count} participant', other: '{count} participants' },
  },
  'admin.commentCount': {
    de: { one: '{count} Kommentar', other: '{count} Kommentare' },
    en: { one: '{count} comment', other: '{count} comments' },
  },
  'results.ratingCount': {
    de: { one: '{count} Bewertung', other: '{count} Bewertungen' },
    en: { one: '{count} rating', other: '{count} ratings' },
  },
} satisfies Record<string, Plural>;

export type PluralKey = keyof typeof plurals;
