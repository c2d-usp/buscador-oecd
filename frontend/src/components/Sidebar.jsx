import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Filter, ChevronDown, Database, X } from 'lucide-react';
import { TOOLS_SORT_OPTIONS, METRICS_SORT_OPTIONS } from '../constants/sortOptions';
import { normalizeText } from '../utils/helpers';

const FilterCheckboxGroup = ({ label, selected, options, onChange, accent = 'indigo' }) => {
  const cleanOptions = (options || []).filter((o) => o !== 'Todos');
  const count = selected.length;

  const colorClasses = accent === 'orange'
    ? {
        badge: 'bg-orange-500',
        checkboxOn: 'border-orange-600 bg-orange-600 shadow-orange-200 dark:border-orange-500 dark:bg-orange-500',
        checkboxOff: 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800',
        textOn: 'text-slate-800 dark:text-slate-100',
        textOff: 'text-slate-600 dark:text-slate-400',
      }
    : {
        badge: 'bg-indigo-500',
        checkboxOn: 'border-indigo-600 bg-indigo-600 shadow-indigo-200 dark:border-indigo-500 dark:bg-indigo-500',
        checkboxOff: 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800',
        textOn: 'text-slate-800 dark:text-slate-100',
        textOff: 'text-slate-600 dark:text-slate-400',
      };

  const scrollbarClass = accent === 'orange'
    ? '[&::-webkit-scrollbar-thumb]:bg-orange-400 hover:[&::-webkit-scrollbar-thumb]:bg-orange-500'
    : '[&::-webkit-scrollbar-thumb]:bg-indigo-400 hover:[&::-webkit-scrollbar-thumb]:bg-indigo-500';

  return (
    <details className="group/cb [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer select-none items-center justify-between rounded-xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </span>
          {count > 0 && (
            <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full ${colorClasses.badge} px-1 text-[9px] font-bold text-white`}>
              {count}
            </span>
          )}
        </span>
        <ChevronDown size={13} className="text-slate-400 transition duration-200 group-open/cb:rotate-180 dark:text-slate-500" />
      </summary>

      <div className={`mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${scrollbarClass} [&::-webkit-scrollbar-thumb]:rounded-full`}>
        {cleanOptions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">Nenhuma opção disponível</p>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {cleanOptions.map((opt) => {
              const isChecked = selected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => onChange(opt)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      isChecked ? colorClasses.checkboxOn : colorClasses.checkboxOff
                    }`}
                  >
                    {isChecked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={`text-xs leading-tight transition ${isChecked ? `font-semibold ${colorClasses.textOn}` : colorClasses.textOff}`}>
                    {opt}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
};

const Sidebar = ({
  mode,
  searchTerm,
  setSearchTerm,
  pendingFilters,
  handleFilterChange,
  pendingTypeApproaches,
  toggleTypeApproach,
  pendingFilterCount,
  exclusiveMode,
  toggleExclusiveMode,
  selectedSort,
  setSelectedSort,
  handleSearch,
  handleClear,
  handleKeyDown,
  filtersData,
  availableTypeApproaches,
  metricsPendingFilters,
  handleMetricsFilterChange,
  metricsExclusiveMode,
  toggleMetricsExclusiveMode,
  metricsSelectedSort,
  setMetricsSelectedSort,
}) => {
  // Estados para a ferramenta de Atualização
  const [updateModal, setUpdateModal] = useState(null); // null | 'password' | 'token' | 'progress'
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [updateLogs, setUpdateLogs] = useState('');
  const logsEndRef = useRef(null);

  // Scroll automático para as logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [updateLogs]);

  const handlePasswordSubmit = () => {
    if (authPassword === '1943') {
      setAuthError('');
      setAuthPassword('');
      setUpdateModal('token');
    } else {
      setAuthError('Senha incorreta!');
    }
  };

  const handleStartUpdate = async () => {
    if (!githubToken.trim()) {
      setAuthError('Insira o token do GitHub.');
      return;
    }
    setAuthError('');
    setUpdateModal('progress');
    setUpdateLogs('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      
      const backendUrl = `${API_BASE_URL}/update_db`;

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '1943', token: githubToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setUpdateLogs(`Falha: ${errorData.error || 'Erro desconhecido'}`);
        return;
      }

      // Leitura da stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setUpdateLogs((prev) => prev + decoder.decode(value));
      }
      setGithubToken('');
    } catch (err) {
      setUpdateLogs((prev) => prev + `\n\nErro de conexão com servidor: ${err.message}`);
    }
  };

  const closeUpdateModal = () => {
    setUpdateModal(null);
    setAuthPassword('');
    setGithubToken('');
    setAuthError('');
  };

  const isTools = mode === 'tools';
  const sortOptions = isTools ? TOOLS_SORT_OPTIONS : METRICS_SORT_OPTIONS;
  const currentSort = isTools ? selectedSort : metricsSelectedSort;
  const onSortChange = isTools ? setSelectedSort : setMetricsSelectedSort;
  const currentExclusive = isTools ? exclusiveMode : metricsExclusiveMode;
  const toggleExclusive = isTools ? toggleExclusiveMode : toggleMetricsExclusiveMode;

  const focusClasses = isTools
    ? 'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900'
    : 'focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:focus:border-orange-500 dark:focus:ring-orange-900';

  return (
    <>
      <aside className="w-full lg:max-w-[340px] shrink-0 border-r border-white/60 bg-white/70 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
        {/* Header */}
        <div
          className={`relative overflow-hidden px-6 py-7 ${
            isTools
              ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950'
              : 'bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_white_0,_transparent_32%)] opacity-25" />
          <div className="relative">
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
              Windrose - AI
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300 dark:text-slate-400">
              {isTools
                ? 'Plataforma de busca desenvolvida para explorar, analisar e descobrir ferramentas do ecossistema OECD.AI'
                : 'Plataforma de busca para explorar e analisar métricas do ecossistema OECD.AI'}
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-5 py-5">
          {/* Busca */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Ferramenta, organização, tema..."
                className={`w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:bg-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-900 ${focusClasses}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              onClick={handleSearch}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 ${
                isTools
                  ? 'bg-slate-950 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500'
                  : 'bg-slate-950 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500'
              }`}
            >
              <Search size={16} /> Buscar agora
            </button>
          </div>

          {/* Filtros */}
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <div className={`rounded-2xl p-2 ${isTools ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'}`}>
                <Filter size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Filtros</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Refine os resultados</p>
              </div>

              <button
                type="button"
                onClick={toggleExclusive}
                title={
                  currentExclusive
                    ? 'Modo E (exclusivo): itens devem ter TODOS os valores selecionados. Clique para voltar ao modo OU.'
                    : 'Modo OU: itens podem ter QUALQUER valor selecionado. Clique para ativar modo E (exclusivo).'
                }
                className="flex items-center gap-2"
                aria-pressed={currentExclusive}
              >
                <span
                  className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    currentExclusive ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      currentExclusive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </span>
                <span
                  className={`text-[10px] font-bold tracking-wider transition-colors duration-200 ${
                    currentExclusive ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {currentExclusive ? 'E' : 'OU'}
                </span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Ordenação */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ordenar por
                </label>
                <select
                  className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-900 ${focusClasses}`}
                  value={currentSort}
                  onChange={(e) => onSortChange(e.target.value)}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {isTools ? (
                <>
                  {/* Type of Approach chips */}
                  <div className="pt-2">
                    <div className="mb-2 flex items-end justify-between gap-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Type of Approach
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTypeApproaches.length === 0 ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Carregando tipos...</span>
                      ) : (
                        availableTypeApproaches.map((type) => {
                          const isActive = pendingTypeApproaches.some(
                            (item) => normalizeText(item) === normalizeText(type)
                          );
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleTypeApproach(type)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                isActive
                                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-500'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950'
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Detalhes Técnicos */}
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer select-none items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      <span className="flex items-center gap-2">
                        Detalhes Técnicos
                        {(() => {
                          const n = [
                            ...(pendingFilters.maturity || []),
                            ...(pendingFilters.programming_languages || []),
                            ...(pendingFilters.technology_platforms || []),
                            ...(pendingFilters.lifecycle_stages || []),
                            ...(pendingFilters.tool_types || [])
                          ].length;
                          return n > 0 ? (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
                              {n}
                            </span>
                          ) : null;
                        })()}
                      </span>
                      <ChevronDown size={16} className="transition duration-300 group-open:rotate-180" />
                    </summary>

                    <div className="mt-3 space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                      <FilterCheckboxGroup label="Maturidade" selected={pendingFilters.maturity || []} options={filtersData.maturity} onChange={(val) => handleFilterChange('maturity', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Linguagem de Prog." selected={pendingFilters.programming_languages || []} options={filtersData.programming_languages} onChange={(val) => handleFilterChange('programming_languages', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Plataformas Tecnológicas" selected={pendingFilters.technology_platforms || []} options={filtersData.technology_platforms} onChange={(val) => handleFilterChange('technology_platforms', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Estágio do Ciclo de Vida" selected={pendingFilters.lifecycle_stages || []} options={filtersData.lifecycle_stages} onChange={(val) => handleFilterChange('lifecycle_stages', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Tipo de ferramenta" selected={pendingFilters.tool_types || []} options={filtersData.tool_types} onChange={(val) => handleFilterChange('tool_types', val)} accent="indigo" />
                    </div>
                  </details>

                  {/* Escopo e Público */}
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer select-none items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      <span className="flex items-center gap-2">
                        Escopo e Público
                        {(() => {
                          const n = [
                            ...(pendingFilters.objectives || []),
                            ...(pendingFilters.target_sectors || []),
                            ...(pendingFilters.target_users || []),
                            ...(pendingFilters.geographical_scope || []),
                          ].length;
                          return n > 0 ? (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
                              {n}
                            </span>
                          ) : null;
                        })()}
                      </span>
                      <ChevronDown size={16} className="transition duration-300 group-open:rotate-180" />
                    </summary>

                    <div className="mt-3 space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                      <FilterCheckboxGroup label="Objetivos" selected={pendingFilters.objectives || []} options={filtersData.objectives} onChange={(val) => handleFilterChange('objectives', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Setores Alvo" selected={pendingFilters.target_sectors || []} options={filtersData.target_sectors} onChange={(val) => handleFilterChange('target_sectors', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Usuários Alvo" selected={pendingFilters.target_users || []} options={filtersData.target_users} onChange={(val) => handleFilterChange('target_users', val)} accent="indigo" />
                      <FilterCheckboxGroup label="Escopo Geográfico" selected={pendingFilters.geographical_scope || []} options={filtersData.geographical_scope} onChange={(val) => handleFilterChange('geographical_scope', val)} accent="indigo" />
                    </div>
                  </details>
                </>
              ) : (
                /* Métricas filters */
                <>
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer select-none items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-600 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800">
                      <span className="flex items-center gap-2">
                        Filtros de Métrica
                        {(() => {
                          if (!metricsPendingFilters) return null;
                          const n = Object.values(metricsPendingFilters).reduce(
                            (acc, arr) => acc + (arr ? arr.length : 0),
                            0
                          );
                          return n > 0 ? (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                              {n}
                            </span>
                          ) : null;
                        })()}
                      </span>
                      <ChevronDown size={16} className="transition duration-300 group-open:rotate-180" />
                    </summary>

                    <div className="mt-3 space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                      <FilterCheckboxGroup label="Tipos de Métrica" selected={metricsPendingFilters?.metric_types || []} options={filtersData.metric_types} onChange={(val) => handleMetricsFilterChange('metric_types', val)} accent="orange" />
                      <FilterCheckboxGroup label="Objetivos" selected={metricsPendingFilters?.objectives || []} options={filtersData.objectives} onChange={(val) => handleMetricsFilterChange('objectives', val)} accent="orange" />
                      <FilterCheckboxGroup label="Propósitos" selected={metricsPendingFilters?.purposes || []} options={filtersData.purposes} onChange={(val) => handleMetricsFilterChange('purposes', val)} accent="orange" />
                      <FilterCheckboxGroup label="Usuários Alvo" selected={metricsPendingFilters?.target_users || []} options={filtersData.target_users} onChange={(val) => handleMetricsFilterChange('target_users', val)} accent="orange" />
                      <FilterCheckboxGroup label="Setores Alvo" selected={metricsPendingFilters?.target_sectors || []} options={filtersData.target_sectors} onChange={(val) => handleMetricsFilterChange('target_sectors', val)} accent="orange" />
                      <FilterCheckboxGroup label="Estágios do Ciclo de Vida" selected={metricsPendingFilters?.lifecycle_stages || []} options={filtersData.lifecycle_stages} onChange={(val) => handleMetricsFilterChange('lifecycle_stages', val)} accent="orange" />
                      <FilterCheckboxGroup label="Direitos de Uso" selected={metricsPendingFilters?.usage_rights || []} options={filtersData.usage_rights} onChange={(val) => handleMetricsFilterChange('usage_rights', val)} accent="orange" />
                      <FilterCheckboxGroup label="Estágio de Gestão de Riscos" selected={metricsPendingFilters?.risk_management_stage || []} options={filtersData.risk_management_stage} onChange={(val) => handleMetricsFilterChange('risk_management_stage', val)} accent="orange" />
                    </div>
                  </details>
                </>
              )}
            </div>

            {/* Botões de ação */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Limpar
              </button>
              <button
                onClick={handleSearch}
                className={`relative flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 ${
                  isTools
                    ? 'bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400'
                    : 'bg-orange-600 hover:bg-orange-500 dark:bg-amber-500 dark:hover:bg-amber-400'
                }`}
              >
                Aplicar
                {pendingFilterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900 shadow dark:bg-amber-500">
                    {pendingFilterCount}
                  </span>
                )}
              </button>
            </div>
            
            {/* NOVO: Botão de Atualização do Banco */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setUpdateModal('password')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-900"
              >
                <Database size={16} />
                Atualizar Banco de Dados
              </button>
            </div>
            
          </div>
        </div>
      </aside>

      {/* Modais flutuantes do fluxo de atualização */}
      {updateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <button 
              onClick={closeUpdateModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>

            {updateModal === 'password' && (
              <div>
                <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Autenticação Necessária</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Insira a senha de segurança para continuar.</p>
                <input
                  type="password"
                  placeholder="Senha"
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  autoFocus
                />
                {authError && <p className="mb-4 text-xs font-semibold text-red-500">{authError}</p>}
                <button
                  onClick={handlePasswordSubmit}
                  className="mt-2 w-full rounded-xl bg-purple-600 p-3 font-semibold text-white hover:bg-purple-500"
                >
                  Verificar
                </button>
              </div>
            )}

            {updateModal === 'token' && (
              <div>
                <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Chave do GitHub</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">O processo de atualização precisa de um Personal Access Token do GitHub.</p>
                <input
                  type="text"
                  placeholder="ghp_xxxxxxxxxxxx..."
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartUpdate()}
                  autoFocus
                />
                {authError && <p className="mb-4 text-xs font-semibold text-red-500">{authError}</p>}
                <button
                  onClick={handleStartUpdate}
                  className="mt-2 w-full rounded-xl bg-purple-600 p-3 font-semibold text-white hover:bg-purple-500"
                >
                  Iniciar Atualização
                </button>
              </div>
            )}

            {updateModal === 'progress' && (
              <div className="flex flex-col h-full max-h-[70vh]">
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Progresso da Atualização</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Rodando scripts em segundo plano...</p>
                
                <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-green-400 shadow-inner">
                  <pre className="whitespace-pre-wrap leading-relaxed">{updateLogs}</pre>
                  <div ref={logsEndRef} />
                </div>

                <button
                  onClick={closeUpdateModal}
                  className="mt-4 w-full rounded-xl bg-slate-200 p-3 font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                >
                  Fechar Janela
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
