import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, ChevronDown, User, Folder, LogOut, FileText } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/60 bg-white/40 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        
        {/* Logo / Nome do site */}
        <Link 
          to="/" 
          className="group flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 dark:text-white"
        >
          <Compass className="text-indigo-600 transition-transform duration-500 group-hover:rotate-45 dark:text-indigo-400" size={28} />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-amber-400">
            WINDROSE
          </span>
        </Link>

        {/* Links principais (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            to="/busca" 
            className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            Busca
          </Link>
          <Link 
            to="/comparacao" 
            className="text-sm font-semibold text-slate-600 transition-colors hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400"
          >
            Comparação
          </Link>
          <Link 
            to="/visualizacao" 
            className="text-sm font-semibold text-slate-600 transition-colors hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
          >
            Visualização
          </Link>
        </nav>

        {/* Área do usuário */}
        <div className="relative flex items-center gap-4">
          {user ? (
            <div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/50 py-1.5 pl-1.5 pr-3 transition-all hover:bg-white hover:shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <img
                  src={
                    user.profile_pic_url 
                      ? `${import.meta.env.VITE_API_URL}${user.profile_pic_url}` 
                      : '/default-avatar.svg'
                  }
                  alt={`Avatar de ${user.username}`}
                  className="h-8 w-8 rounded-full object-cover shadow-sm"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {user.username}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Overlay transparente para fechar o menu ao clicar fora */}
              {menuOpen && (
                <div 
                  className="fixed inset-0 z-[90]" 
                  onClick={() => setMenuOpen(false)}
                ></div>
              )}

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 z-[100] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700/60 dark:bg-slate-900">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Logado como</p>
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.username}</p>
                  </div>
                  
                  <Link 
                    to="/profile" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"
                  >
                    <User size={16} />
                    Editar Perfil
                  </Link>
                  <Link 
                    to="/folders" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"
                  >
                    <Folder size={16} />
                    Minhas Pastas
                  </Link>

                  <Link 
                    to="/results" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"
                  >
                    <FileText size={16} />
                    Meus Resultados
                  </Link>
                  
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                  
                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }} 
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                to="/login" 
                className="hidden px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:block"
              >
                Entrar
              </Link>
              <Link 
                to="/signup" 
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </div>
        
      </div>
    </header>
  );
};

export default Navbar;