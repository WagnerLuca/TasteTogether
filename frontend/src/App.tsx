import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AdminEvent from './pages/AdminEvent';
import ParticipantEvent from './pages/ParticipantEvent';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/:code" element={<AdminEvent />} />
        <Route path="/event/:code" element={<ParticipantEvent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
