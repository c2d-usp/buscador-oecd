import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Search, Scale, LayoutGrid, ArrowRight } from 'lucide-react';

const Home = () => {
  return (
    <div
      className="min-h-screen w-full relative flex flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#fef3c7_0,_transparent_35%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e1b4b_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#451a03_0,_transparent_35%),linear-gradient(to_bottom_right,_#0f172a,_#111827)] dark:text-slate-200 transition-colors duration-300"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`body::-webkit-scrollbar { display: none; }`}</style>

      {/* Elemento Decorativo Central de Fundo (Rosa dos Ventos Abstrata) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] dark:opacity-[0.02] text-slate-950 dark:text-white transition-opacity">
        <Compass size={600} strokeWidth={1} className="animate-[spin_180s_linear_infinite]" />
      </div>

      {/* Conteúdo Principal */}
      <main className="w-full max-w-7xl mx-auto px-6 pt-0 pb-6 md:px-8 flex-1 flex flex-col items-center justify-start z-10">
        {/* Seção Hero */}
        <div className="text-center max-w-3xl mb-6 md:mb-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl md:text-6xl dark:text-white leading-tight">
            <span className="block">Navegue pelo Ecossistema</span>
            <span className="block mt-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 dark:from-indigo-400 dark:via-purple-400 dark:to-amber-400 bg-clip-text text-transparent mx-auto w-fit">
              Windrose
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Sua bússola para explorar o catálogo da OECD.ai.
          </p>
        </div>

        {/* Grid de Opções (Bússolas direcionais) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          {/* CARD 1: BUSCA (Aponta para o Noroeste / Canto Superior Esquerdo) */}
          <Link
            to="/busca"
            className="group relative rounded-[2rem] border border-white/60 bg-white/40 p-8 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 hover:shadow-indigo-500/5 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 flex flex-col justify-between min-h-[250px]"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Search size={24} />
                </div>
                <Compass
                  size={20}
                  className="text-slate-400 transition-transform duration-500 -rotate-45 group-hover:rotate-0 group-hover:text-indigo-500"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Busca Avançada
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Catálogo com as ferramentas e métricas do repositório da OECD.ai.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              Explorar catálogo
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* CARD 2: COMPARAÇÃO (Aponta para o Norte / Centro Superior) */}
          <Link
            to="/comparacao"
            className="group relative rounded-[2rem] border border-white/60 bg-white/40 p-8 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 hover:shadow-purple-500/5 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 flex flex-col justify-between min-h-[250px]"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                  <Scale size={24} />
                </div>
                <Compass
                  size={20}
                  className="text-slate-400 transition-transform duration-500 rotate-0 group-hover:rotate-180 group-hover:text-purple-500"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Comparação Lado a Lado
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Ranquamento de ferramentas utilizando uma metodologia.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
              Comparar frameworks
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* CARD 3: VISUALIZAÇÃO (Aponta para o Nordeste / Canto Superior Direito) */}
          <Link
            to="/visualizacao"
            className="group relative rounded-[2rem] border border-white/60 bg-white/40 p-8 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 hover:shadow-amber-500/5 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 flex flex-col justify-between min-h-[250px]"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <LayoutGrid size={24} />
                </div>
                <Compass
                  size={20}
                  className="text-slate-400 transition-transform duration-500 rotate-45 group-hover:rotate-90 group-hover:text-amber-500"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Visualização de Dados
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Plotagem automática de dashboards para as ferramentas ou métricas.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
              Ver visão geral
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer / Rodapé */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 md:px-8 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/40 dark:border-slate-800/40 z-10">
        <p>© 2026 Windrose Platform. Desenvolvido para catalogação inteligente de ecossistemas tecnológicos.</p>
      </footer>
    </div>
  );
};

export default Home;