import React, { useState, useEffect, useMemo } from 'react';
import { Database, Sun, Moon } from 'lucide-react';
import { useTools } from '../hooks/useTools';
import { useFilters } from '../hooks/useFilters';
import { useMetrics } from '../hooks/useMetrics';
import { useMetricsFilters } from '../hooks/useMetricsFilters';
import Sidebar from '../components/Sidebar';
import ToolCard from '../components/ToolCard';
import MetricCard from '../components/MetricCard';
import ToolModal from '../components/ToolModal';
import MetricModal from '../components/MetricModal';
import Pagination from '../components/Pagination';
import { normalizeText, splitValues, parseDateValue } from '../utils/helpers';

const itemsPerPage = 9;

const initialToolsFiltersState = {
  objectives: [],
  programming_languages: [],
  technology_platforms: [],
  maturity: [],
  lifecycle_stages: [],
  target_sectors: [],
  target_users: [],
  geographical_scope: [],
  tool_types: [],
};

const initialMetricsFiltersState = {
  metric_types: [],
  objectives: [],
  purposes: [],
  target_users: [],
  target_sectors: [],
  lifecycle_stages: [],
  usage_rights: [],
  risk_management_stage: [],
};

function App() {
  const { tools, fetchTools } = useTools();
  const { filtersData: toolsFiltersData } = useFilters();
  const { metrics, fetchMetrics } = useMetrics();
  const { filtersData: metricsFiltersData } = useMetricsFilters();

  const [mode, setMode] = useState('tools');

  // Tools states
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingToolsFilters, setPendingToolsFilters] = useState(initialToolsFiltersState);
  const [pendingTypeApproaches, setPendingTypeApproaches] = useState([]);
  const [appliedToolsFilters, setAppliedToolsFilters] = useState(initialToolsFiltersState);
  const [appliedTypeApproaches, setAppliedTypeApproaches] = useState([]);
  const [exclusiveMode, setExclusiveMode] = useState(false);
  const [selectedSort, setSelectedSort] = useState('publication_date_desc');
  const [selectedTool, setSelectedTool] = useState(null);

  // Metrics states
  const [metricsSearchTerm, setMetricsSearchTerm] = useState('');
  const [pendingMetricsFilters, setPendingMetricsFilters] = useState(initialMetricsFiltersState);
  const [appliedMetricsFilters, setAppliedMetricsFilters] = useState(initialMetricsFiltersState);
  const [metricsExclusiveMode, setMetricsExclusiveMode] = useState(false);
  const [metricsSelectedSort, setMetricsSelectedSort] = useState('relevance_desc');
  const [selectedMetric, setSelectedMetric] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const isTools = mode === 'tools';

  useEffect(() => {
    // Ao alternar o catálogo, refaz a busca com o termo daquele modo (o mesmo exibido na caixa de busca)
    if (isTools) {
      fetchTools(searchTerm.trim() !== '' ? { search: searchTerm } : {});
    } else {
      fetchMetrics(metricsSearchTerm.trim() !== '' ? { search: metricsSearchTerm } : {});
    }
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // ---- Tools handlers ----
  const handleToolsFilterChange = (key, value) => {
    setPendingToolsFilters(prev => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      return { ...prev, [key]: exists ? current.filter(v => v !== value) : [...current, value] };
    });
  };

  const toggleTypeApproach = (typeValue) => {
    setPendingTypeApproaches(prev => {
      const normalized = normalizeText(typeValue);
      const exists = prev.some(item => normalizeText(item) === normalized);
      return exists ? prev.filter(item => normalizeText(item) !== normalized) : [...prev, typeValue];
    });
  };

  // ---- Metrics handlers ----
  const handleMetricsFilterChange = (key, value) => {
    setPendingMetricsFilters(prev => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      return { ...prev, [key]: exists ? current.filter(v => v !== value) : [...current, value] };
    });
  };

  // ---- Search handlers ----
  const handleSearchTools = () => {
    const params = {};
    if (searchTerm.trim() !== '') params.search = searchTerm;
    setAppliedToolsFilters({ ...pendingToolsFilters });
    setAppliedTypeApproaches([...pendingTypeApproaches]);
    setCurrentPage(1);
    fetchTools(params);
  };

  const handleSearchMetrics = () => {
    const params = {};
    if (metricsSearchTerm.trim() !== '') params.search = metricsSearchTerm;
    setAppliedMetricsFilters({ ...pendingMetricsFilters });
    setCurrentPage(1);
    fetchMetrics(params);
  };

  const handleClear = () => {
    if (isTools) {
      setSearchTerm('');
      setPendingToolsFilters(initialToolsFiltersState);
      setPendingTypeApproaches([]);
      setAppliedToolsFilters(initialToolsFiltersState);
      setAppliedTypeApproaches([]);
      setSelectedSort('publication_date_desc');
      setCurrentPage(1);
      fetchTools({});
    } else {
      setMetricsSearchTerm('');
      setPendingMetricsFilters(initialMetricsFiltersState);
      setAppliedMetricsFilters(initialMetricsFiltersState);
      setMetricsSelectedSort('relevance_desc');
      setCurrentPage(1);
      fetchMetrics({});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') isTools ? handleSearchTools() : handleSearchMetrics();
  };

  // ---- Filtered & Sorted Data ----
  const dataItems = isTools ? tools : metrics;
  const appliedFilters = isTools ? appliedToolsFilters : appliedMetricsFilters;
  const appliedTypeApproachesList = isTools ? appliedTypeApproaches : [];
  const exclusive = isTools ? exclusiveMode : metricsExclusiveMode;
  const sortValue = isTools ? selectedSort : metricsSelectedSort;

  const filteredItems = useMemo(() => {
    return dataItems.filter(item => {
      if (isTools && appliedTypeApproachesList.length > 0) {
        const itemTypes = splitValues(item?.type_of_approach).map(normalizeText);
        const match = exclusive
          ? appliedTypeApproachesList.every(t => itemTypes.includes(normalizeText(t)))
          : appliedTypeApproachesList.some(t => itemTypes.includes(normalizeText(t)));
        if (!match) return false;
      }

      for (const [key, values] of Object.entries(appliedFilters)) {
        if (!values || values.length === 0) continue;
        const itemValues = splitValues(item?.[key]).map(v => normalizeText(v));
        const match = exclusive
          ? values.every(v => itemValues.includes(normalizeText(v)))
          : values.some(v => itemValues.includes(normalizeText(v)));
        if (!match) return false;
      }
      return true;
    });
  }, [dataItems, appliedFilters, appliedTypeApproachesList, exclusive, isTools]);

  // Ao ordenar por último push, itens sem data do GitHub saem da lista (no "▲" eles viriam primeiro)
  const filteredByGitHubTools = useMemo(() => {
    if (sortValue !== 'github_asc' && sortValue !== 'github_desc') {
      return filteredItems;
    }
    return filteredItems.filter(item => {
      const pushDate = item?.github_last_push;
      if (!pushDate || pushDate === 'N/A') return false;
      const dateValue = parseDateValue(pushDate);
      return dateValue !== 0 && !isNaN(dateValue);
    });
  }, [filteredItems, sortValue]);

  const sortedItems = useMemo(() => {
    const list = [...filteredByGitHubTools];

    list.sort((a, b) => {
      const titleA = (a?.title || '').toString().trim();
      const titleB = (b?.title || '').toString().trim();
      const dateA = parseDateValue(a?.date);
      const dateB = parseDateValue(b?.date);
      const gitA = parseDateValue(a?.github_last_push);
      const gitB = parseDateValue(b?.github_last_push);
      const relevanceA = parseInt(a?.relevance, 10) || 0;
      const relevanceB = parseInt(b?.relevance, 10) || 0;

      switch (sortValue) {
        case 'publication_date_asc': return dateA - dateB;
        case 'publication_date_desc': return dateB - dateA;
        case 'github_asc': return gitA - gitB;
        case 'github_desc': return gitB - gitA;
        case 'name_asc': return titleA.localeCompare(titleB, 'pt-BR', { sensitivity: 'base', numeric: true });
        case 'name_desc': return titleB.localeCompare(titleA, 'pt-BR', { sensitivity: 'base', numeric: true });
        case 'relevance_asc': return relevanceA - relevanceB;
        case 'relevance_desc': return relevanceB - relevanceA;
        default: return 0;
      }
    });
    return list;
  }, [filteredByGitHubTools, sortValue]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  const firstItem = sortedItems.length === 0 ? 0 : startIndex + 1;
  const lastItem = Math.min(startIndex + itemsPerPage, sortedItems.length);

  const activeFilterCount = useMemo(() => {
    let count = Object.values(appliedFilters).reduce((acc, v) => acc + (v ? v.length : 0), 0);
    if (isTools) count += appliedTypeApproachesList.length;
    return count;
  }, [appliedFilters, appliedTypeApproachesList, isTools]);

  const pendingFilterCount = useMemo(() => {
    if (isTools) {
      let changes = 0;
      for (const key of Object.keys(initialToolsFiltersState)) {
        const pending = pendingToolsFilters[key] || [];
        const applied = appliedToolsFilters[key] || [];
        const added = pending.filter(item => !applied.includes(item)).length;
        const removed = applied.filter(item => !pending.includes(item)).length;
        changes += added + removed;
      }
      const addedTypes = pendingTypeApproaches.filter(item => !appliedTypeApproaches.includes(item)).length;
      const removedTypes = appliedTypeApproaches.filter(item => !pendingTypeApproaches.includes(item)).length;
      changes += addedTypes + removedTypes;
      return changes;
    } else {
      let changes = 0;
      for (const key of Object.keys(initialMetricsFiltersState)) {
        const pending = pendingMetricsFilters[key] || [];
        const applied = appliedMetricsFilters[key] || [];
        const added = pending.filter(item => !applied.includes(item)).length;
        const removed = applied.filter(item => !pending.includes(item)).length;
        changes += added + removed;
      }
      return changes;
    }
  }, [isTools, pendingToolsFilters, appliedToolsFilters, pendingTypeApproaches, appliedTypeApproaches, pendingMetricsFilters, appliedMetricsFilters]);

  const availableTypeApproaches = useMemo(() => {
    const fromFilters = toolsFiltersData.type_of_approach || [];
    if (fromFilters.length > 0) return fromFilters;
    const unique = new Set();
    tools.forEach(tool => splitValues(tool?.type_of_approach).forEach(item => unique.add(item)));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [toolsFiltersData.type_of_approach, tools]);

  const handlePageChange = (page) => setCurrentPage(page);
  const paginationAccent = isTools ? 'indigo' : 'orange';

  return (
    <div
      className={`min-h-screen ${
        isTools
          ? 'bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_30%),radial-gradient(circle_at_top_right,_#fce7f3_0,_transparent_28%),linear-gradient(to_bottom_right,_#f8fafc,_#eef2ff)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e293b_0,_transparent_30%),radial-gradient(circle_at_top_right,_#312e81_0,_transparent_28%),linear-gradient(to_bottom_right,_#0f172a,_#1e1b4b)]'
          : 'bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_transparent_30%),radial-gradient(circle_at_top_right,_#fef3c7_0,_transparent_28%),linear-gradient(to_bottom_right,_#f8fafc,_#fffbeb)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#431407_0,_transparent_30%),radial-gradient(circle_at_top_right,_#451a03_0,_transparent_28%),linear-gradient(to_bottom_right,_#0f172a,_#1e1b4b)]'
      } dark:text-slate-200`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`body::-webkit-scrollbar { display: none; }`}</style>
      <div className="flex flex-col lg:flex-row">
        <Sidebar
          mode={mode}
          searchTerm={isTools ? searchTerm : metricsSearchTerm}
          setSearchTerm={isTools ? setSearchTerm : setMetricsSearchTerm}
          pendingFilters={isTools ? pendingToolsFilters : pendingMetricsFilters}
          handleFilterChange={isTools ? handleToolsFilterChange : handleMetricsFilterChange}
          pendingTypeApproaches={isTools ? pendingTypeApproaches : []}
          toggleTypeApproach={isTools ? toggleTypeApproach : undefined}
          pendingFilterCount={pendingFilterCount}
          exclusiveMode={isTools ? exclusiveMode : metricsExclusiveMode}
          toggleExclusiveMode={isTools ? () => setExclusiveMode(prev => !prev) : () => setMetricsExclusiveMode(prev => !prev)}
          selectedSort={isTools ? selectedSort : metricsSelectedSort}
          setSelectedSort={isTools ? setSelectedSort : setMetricsSelectedSort}
          handleSearch={isTools ? handleSearchTools : handleSearchMetrics}
          handleClear={handleClear}
          handleKeyDown={handleKeyDown}
          filtersData={isTools ? toolsFiltersData : metricsFiltersData}
          availableTypeApproaches={isTools ? availableTypeApproaches : []}
          metricsPendingFilters={!isTools ? pendingMetricsFilters : null}
          handleMetricsFilterChange={!isTools ? handleMetricsFilterChange : null}
          metricsExclusiveMode={!isTools ? metricsExclusiveMode : null}
          toggleMetricsExclusiveMode={!isTools ? () => setMetricsExclusiveMode(prev => !prev) : null}
          metricsSelectedSort={!isTools ? metricsSelectedSort : null}
          setMetricsSelectedSort={!isTools ? setMetricsSelectedSort : null}
        />

        <main className="flex-1">
          <div className="flex flex-col">
            <header
              className={`border-b border-white/60 px-6 py-6 backdrop-blur-xl md:px-8 dark:border-slate-700/60 ${
                isTools
                  ? 'bg-white/50 dark:bg-slate-900/50'
                  : 'bg-white/70 dark:bg-slate-900/70'
              }`}
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Database size={14} />
                    Visualização de catálogo
                  </div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl dark:text-white">
                      Catálogo de{' '}
                      <button
                        onClick={() => {
                          setMode(mode === 'tools' ? 'metrics' : 'tools');
                          setCurrentPage(1);
                        }}
                        className={`underline underline-offset-4 decoration-4 transition-colors ${
                          isTools
                            ? 'text-indigo-600 decoration-indigo-300 hover:text-indigo-700 dark:text-indigo-400 dark:decoration-indigo-700'
                            : 'text-amber-600 decoration-amber-300 hover:text-amber-700 dark:text-amber-400 dark:decoration-amber-700'
                        }`}
                      >
                        {isTools ? 'Ferramentas' : 'Métricas'}
                      </button>
                    </h2>
                    <button
                      onClick={toggleTheme}
                      className="rounded-full p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-transform"
                      title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
                    >
                      {theme === 'light' ? (
                        <Moon size={20} className="text-slate-700 dark:text-slate-300" />
                      ) : (
                        <Sun size={20} className="text-amber-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base dark:text-slate-400">
                    {isTools
                      ? 'Uma interface refinada para explorar ferramentas, aplicar filtros e abrir detalhes com clareza.'
                      : 'Explore métricas de IA, aplique filtros específicos e veja detalhes com foco.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-[150px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resultados</p>
                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{sortedItems.length}</p>
                  </div>
                  <div
                    className={`min-w-[150px] rounded-3xl border p-4 shadow-sm ${
                      isTools
                        ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 dark:border-indigo-800 dark:from-indigo-950 dark:to-sky-950'
                        : 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950 dark:to-yellow-950'
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-wider ${isTools ? 'text-indigo-600 dark:text-indigo-300' : 'text-amber-600 dark:text-amber-300'}`}>
                      Filtros ativos
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{activeFilterCount}</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="px-6 py-6 md:px-8">
              {sortedItems.length === 0 ? (
                <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Database size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Nenhuma {isTools ? 'ferramenta' : 'métrica'} encontrada
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Tente outra palavra-chave, remova alguns filtros ou selecione menos opções.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                    {paginatedItems.map(item =>
                      isTools ? (
                        <ToolCard key={item.id} tool={item} onClick={setSelectedTool} allItems={sortedItems} />
                      ) : (
                        <MetricCard key={item.id} metric={item} onClick={setSelectedMetric} allItems={sortedItems} />
                      )
                    )}
                  </div>
                  <Pagination
                    currentPage={safeCurrentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    accent={paginationAccent}
                  />
                  <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                    Mostrando {firstItem} a {lastItem} de {sortedItems.length} resultados
                  </p>
                </>
              )}
            </div>
          </div>
        </main>

        {isTools ? (
          <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
        ) : (
          <MetricModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
        )}
      </div>
    </div>
  );
}

export default App;