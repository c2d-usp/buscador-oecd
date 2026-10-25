// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Busca from './pages/Busca';
import Comparacao from './pages/Comparacao';
import Visualizacao from './pages/Visualizacao';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import MyFolders from './pages/MyFolders';
import FolderView from './pages/FolderView';
import MyResults from './pages/MyResults';

import Navbar from './components/Navbar';

// Páginas que dependem das pastas/dados do usuário: sem login, redireciona para /login
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          {/* Rotas principais */}
          <Route path="/" element={<Home />} />
          <Route path="/busca" element={<Busca />} />
          <Route path="/comparacao" element={<RequireAuth><Comparacao /></RequireAuth>} />
          <Route path="/visualizacao" element={<RequireAuth><Visualizacao /></RequireAuth>} />

          {/* Autenticação e perfil */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Pastas e Resultados */}
          <Route path="/folders" element={<RequireAuth><MyFolders /></RequireAuth>} />
          <Route path="/folders/:id" element={<RequireAuth><FolderView /></RequireAuth>} />
          <Route path="/results" element={<RequireAuth><MyResults /></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;