import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SplashPage } from './pages/SplashPage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { LanguageSelectionPage } from './pages/LanguageSelectionPage';
import { AvatarSelectionPage } from './pages/AvatarSelectionPage';
import { RoomPage } from './pages/RoomPage';
import { VideoCallPage } from './pages/VideoCallPage';
import { DictionaryPage } from './pages/DictionaryPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/role" element={<RoleSelectionPage />} />
        <Route path="/language" element={<LanguageSelectionPage />} />
        <Route path="/avatar" element={<AvatarSelectionPage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/call/:roomId" element={<VideoCallPage />} />
        <Route path="/dictionary" element={<DictionaryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
