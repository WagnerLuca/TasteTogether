import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import AdminEvent from './pages/AdminEvent';
import ParticipantEvent from './pages/ParticipantEvent';
import Board from './pages/Board';
import { TopNav, useTheme, useLocale } from './wl';
import { TASTING_ACCENT } from './accent';
import { useT } from './useT';

/**
 * Shell for the whole app: the shared TopNav plus the routes.
 *
 * No MobileNav here (unlike the portfolio): this app has no site-wide sections
 * to navigate between — you are either on the entry page or inside one specific
 * event, reached by code or QR link. So there is nothing for a bottom tab bar to
 * hold, and the 720px nav rule doesn't come into play.
 *
 * `init()` for theme and locale runs once on mount, mirroring the `onMounted`
 * calls in the portfolio's and arcade's App.vue. index.html has already applied
 * the stored theme class pre-paint; this makes React's copy of that state
 * authoritative and writes <html lang>.
 */
export default function App() {
  const { init: initTheme } = useTheme();
  const { init: initLocale } = useLocale();
  const { t } = useT();

  useEffect(() => {
    initTheme();
    initLocale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* The board is for a screen in the room — full-bleed, no TopNav. */}
        <Route path="/board/:code" element={<Board />} />
        <Route
          element={
            <div className="flex min-h-screen flex-col">
              <TopNav accent={TASTING_ACCENT} product={t('brand.product')} />
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/admin/:code" element={<AdminEvent />} />
          <Route path="/event/:code" element={<ParticipantEvent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
