import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Folder, AlertCircle, TrendingUp, Database, ChevronDown, 
  Settings, Sliders, Trophy, ArrowLeft, ArrowRight, CheckCircle, 
  Target, BarChart2, Star, LayoutGrid, Info, Camera, Loader2, RotateCcw,
  ChevronUp,
} from "lucide-react";
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Cell, ZAxis
} from "recharts";
import html2canvas from "html2canvas";

// Paleta de cores para o gráfico
const COLORS = ['#8b5cf6', '#d946ef', '#ec4899', '#6366f1', '#a855f7', '#14b8a6', '#f59e0b', '#3b82f6'];

// Pesos definidos para o modelo WSM
const WEIGHTS = {
  maturidade: 0.0436,
  escopo: 0.0888,
  integracao: 0.2017,
  contexto: 0.2017,
  chave: 0.4641,
};

// Subcomponente de Layout para Gráficos
const ChartCard = ({ title, icon: Icon, iconColor, children, height = "h-[450px]" }) => (
  <div className={`bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-6 rounded-3xl shadow-sm backdrop-blur-xl flex flex-col ${height}`}>
    <h4 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200">
      <Icon size={18} className={iconColor} /> {title}
    </h4>
    <div className="flex-1 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

// Tooltip customizado para o Scatter Chart
const MatrixTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl z-50 min-w-[200px]">
        <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
          {data.title || "Item Avaliado"}
        </p>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Nota Total:</span>
            <span className="font-bold text-violet-600 dark:text-violet-400">{data.total.toFixed(2)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Eixo X (Chave):</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{data.x.toFixed(2)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Eixo Y (Outros):</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{data.y.toFixed(2)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const ScoreInput = ({ value, onChange, max }) => {
  // Lógica para não deixar passar do máximo nem cair abaixo de zero
  const handleIncrement = () => onChange(Math.min(max, Number(value) + 1));
  const handleDecrement = () => onChange(Math.max(0, Number(value) - 1));

  return (
    <div className="relative w-full">
      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // O truque está nestas últimas classes que escondem o visual nativo:
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pr-8 text-center font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
      />
      
      {/* Container das setinhas customizadas (Roxas e Clean) */}
      <div className="absolute right-1 top-1 bottom-1 flex flex-col justify-center gap-[2px]">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="text-violet-500 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50 rounded flex items-center justify-center p-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp size={14} strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= 0}
          className="text-violet-500 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50 rounded flex items-center justify-center p-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

const Comparacao = () => {
  const { api } = useAuth();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [items, setItems] = useState([]);
  
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false); // Feedback visual de salvamento
  
  const dropdownRef = useRef(null);
  const dashboardRef = useRef(null);
  const saveTimeoutRef = useRef(null); // Ref para o Debounce do Auto-Save

  // Estados de Fluxo da Comparação
  const [step, setStep] = useState(1); 
  
  // Estados de Configuração
  const [maxScore, setMaxScore] = useState(10);
  const [customCriterion, setCustomCriterion] = useState("Alinhamento Estratégico");
  
  // Estado das Notas
  const [evaluations, setEvaluations] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoadingFolders(true);
        const res = await api.get("/api/folders");
        setFolders(res.data);
        if (res.data.length > 0) {
          setSelectedFolderId(res.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar as pastas.");
      } finally {
        setLoadingFolders(false);
      }
    };
    fetchFolders();
  }, [api]);

  // Carrega itens e o progresso do Backend em vez do LocalStorage
  const fetchFolderItems = useCallback(async (folderId) => {
    if (!folderId) return;
    try {
      setLoadingItems(true);
      const res = await api.get(`/api/folders/${folderId}/items`);
      setItems(res.data);
      
      const initialEvals = {};
      res.data.forEach(item => {
        initialEvals[item.id] = { crit1: 0, crit2: 0, crit3: 0, crit4: 0, crit5: 0 };
      });
      
      try {
        // Busca do servidor o progresso salvo
        const stateRes = await api.get(`/api/folders/${folderId}/comparison`);
        const savedState = stateRes.data;

        if (savedState && Object.keys(savedState).length > 0) {
          const mergedEvals = { ...initialEvals, ...(savedState.evaluations || {}) };
          setEvaluations(mergedEvals);
          setStep(savedState.step || 1);
          setMaxScore(savedState.maxScore || 10);
          setCustomCriterion(savedState.customCriterion || "Alinhamento Estratégico");
        } else {
          setEvaluations(initialEvals);
          setStep(1);
          setMaxScore(10);
          setCustomCriterion("Alinhamento Estratégico");
        }
      } catch (err) {
        console.error("Progresso não encontrado, iniciando um novo.", err);
        setEvaluations(initialEvals);
        setStep(1);
      }

    } catch (err) {
      console.error(err);
      setError("Erro ao buscar os itens da pasta selecionada.");
    } finally {
      setLoadingItems(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedFolderId) fetchFolderItems(selectedFolderId);
  }, [selectedFolderId, fetchFolderItems]);

  // AUTO-SAVE no Servidor usando Debounce (Aguardar 1 seg após o usuário parar de interagir)
  useEffect(() => {
    if (selectedFolderId && !loadingItems && items.length > 0) {
      const stateToSave = { evaluations, step, maxScore, customCriterion };
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsSavingProgress(true);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await api.put(`/api/folders/${selectedFolderId}/comparison`, stateToSave);
        } catch (err) {
          console.error("Falha no salvamento automático:", err);
        } finally {
          setIsSavingProgress(false);
        }
      }, 1000); // 1000ms = 1 segundo de atraso
    }
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [evaluations, step, maxScore, customCriterion, selectedFolderId, loadingItems, items, api]);


  const handleScoreChange = (itemId, criterion, value) => {
    const numValue = Math.max(0, Math.min(maxScore, Number(value)));
    setEvaluations(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [criterion]: numValue }
    }));
  };

  const handleResetProgress = async () => {
    if (window.confirm("Tem certeza que deseja limpar todo o progresso de avaliações desta pasta do servidor?")) {
      try {
        await api.delete(`/api/folders/${selectedFolderId}/comparison`);
        const initialEvals = {};
        items.forEach(item => {
          initialEvals[item.id] = { crit1: 0, crit2: 0, crit3: 0, crit4: 0, crit5: 0 };
        });
        setEvaluations(initialEvals);
        setStep(1);
        setMaxScore(10);
        setCustomCriterion("Alinhamento Estratégico");
      } catch (err) {
        console.error(err);
        alert("Erro ao tentar limpar o progresso no servidor.");
      }
    }
  };

  const selectedFolder = folders.find(f => f.id.toString() === selectedFolderId);

  const handleExportPNG = async () => {
    if (!dashboardRef.current || !selectedFolder) return;
    
    try {
      setIsExporting(true);
      setError("");
      
      setIsDropdownOpen(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      const isDarkMode = document.documentElement.classList.contains('dark');
      
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight
      });

      // toBlob usa callback: a Promise faz erros do upload caírem no catch abaixo
      // e mantém o "Gerando PNG..." até o arquivo ser salvo
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Falha ao processar os pixels da imagem.");

      const formData = new FormData();
      const safeFolderName = selectedFolder.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Matriz_${safeFolderName}_${Date.now()}.png`;

      formData.append("file", blob, filename);

      await api.post("/api/results", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert(`Sucesso! A matriz "${filename}" foi salva nos seus Resultados.`);

    } catch (err) {
      console.error(err);
      setError("Erro ao gerar ou salvar a imagem da matriz.");
    } finally {
      setIsExporting(false);
    }
  };

  const resultsData = useMemo(() => {
    if (items.length === 0 || step !== 3) return { list: [], xMean: 0, yMean: 0 };

    let totalX = 0;
    let totalY = 0;

    const list = items.map(item => {
      const ev = evaluations[item.id] || { crit1: 0, crit2: 0, crit3: 0, crit4: 0, crit5: 0 };
      
      const yScore = 
        (ev.crit1 * WEIGHTS.maturidade) + 
        (ev.crit2 * WEIGHTS.escopo) + 
        (ev.crit3 * WEIGHTS.integracao) + 
        (ev.crit4 * WEIGHTS.contexto);
      
      const xScore = ev.crit5 * WEIGHTS.chave;
      const total = xScore + yScore;

      totalX += xScore;
      totalY += yScore;

      return {
        ...item,
        title: item.detail?.title || `Item ${item.id}`,
        x: xScore,
        y: yScore,
        total: total,
        ev
      };
    }).sort((a, b) => b.total - a.total);

    const xMean = items.length > 0 ? totalX / items.length : 0;
    const yMean = items.length > 0 ? totalY / items.length : 0;

    return { list, xMean, yMean };
  }, [items, evaluations, step]);


  if (loadingFolders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse text-violet-600 dark:text-violet-400 font-medium">
          Preparando ambiente de avaliação...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f3e8ff_0,_transparent_30%),radial-gradient(circle_at_top_right,_#fae8ff_0,_transparent_28%),linear-gradient(to_bottom_right,_#f8fafc,_#f5f3ff)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#3b0764_0,_transparent_30%),radial-gradient(circle_at_top_right,_#4a044e_0,_transparent_28%),linear-gradient(to_bottom_right,_#0f172a,_#1e1b4b)] dark:text-slate-200"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`body::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1">
          <div className="flex flex-col" ref={dashboardRef}>
            
            {/* ================= HEADER ================= */}
            <header className="relative z-40 border-b border-white/60 px-6 py-6 backdrop-blur-xl md:px-8 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl dark:text-white flex items-center gap-3">
                      <span>
                        Matriz de{' '}
                        <span className="underline underline-offset-4 decoration-4 transition-colors text-violet-600 decoration-violet-300 dark:text-violet-400 dark:decoration-violet-700">
                          Comparação
                        </span>
                      </span>
                      {/* Indicador de Nuvem / Auto-Save */}
                      <div className="ml-2 text-xs flex items-center gap-1 font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                        {isSavingProgress ? (
                           <><Loader2 size={12} className="animate-spin" /> Salvando na nuvem...</>
                        ) : (
                           <><CheckCircle size={12} className="text-green-500" /> Salvo na nuvem</>
                        )}
                      </div>
                    </h2>
                  </div>
                  <div className="mt-2 flex items-center gap-2 max-w-2xl">
                    <p className="text-sm leading-6 text-slate-600 md:text-base dark:text-slate-400">
                      Avalie ferramentas ou métricas com base no modelo Weighted Sum Model (WSM).
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  
                  {/* Botão de Exportação de Matriz */}
                  {step === 3 && (
                    <button
                      onClick={handleExportPNG}
                      disabled={isExporting || items.length === 0}
                      className="group flex flex-col items-center justify-center min-w-[150px] rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950 dark:to-emerald-950 p-4 shadow-sm transition-all hover:shadow-md hover:border-green-300 dark:hover:border-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Exportar matriz como PNG para os seus Resultados"
                    >
                      <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                        {isExporting ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} className="transition-transform group-hover:scale-110" />}
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isExporting ? "Gerando PNG..." : "Salvar Matriz"}
                      </span>
                    </button>
                  )}

                  {/* Dropdown de Pastas */}
                  <div className="min-w-[260px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Pasta Base
                    </p>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-500 rounded-xl px-4 py-2.5 text-left transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Folder className="text-violet-600 group-hover:text-violet-600 transition-colors shrink-0" size={18} />
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {selectedFolder ? selectedFolder.name : "Selecione..."}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto py-1">
                          {folders.map(f => (
                            <button
                              key={f.id}
                              onClick={() => { setSelectedFolderId(f.id.toString()); setIsDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 ${
                                selectedFolderId === f.id.toString() ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold' : 'text-slate-600 dark:text-slate-300 font-medium'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${selectedFolderId === f.id.toString() ? 'bg-violet-500' : 'bg-transparent'}`} />
                              {f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Etapa Status */}
                  <div className="min-w-[150px] rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:border-violet-800 dark:from-violet-950 dark:to-fuchsia-950 p-4 shadow-sm flex flex-col justify-center items-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                      Progresso
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                      Passo {step} <span className="text-sm font-medium text-violet-500">de 3</span>
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* ================= CONTEÚDO PRINCIPAL ================= */}
            <div className="px-6 py-8 md:px-8 relative z-10">
              {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded-3xl text-sm font-medium shadow-sm">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              {loadingItems ? (
                <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-24 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mx-auto mb-4 flex h-16 w-16 animate-bounce items-center justify-center rounded-3xl bg-violet-100 text-violet-500 dark:bg-violet-900/40 dark:text-violet-400">
                    <Database size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Carregando itens...</h3>
                </div>
              ) : items.length === 0 ? (
                <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Database size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pasta Vazia</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">Adicione itens na pasta selecionada para iniciar uma comparação.</p>
                </div>
              ) : (
                <div className="animate-fade-in-up max-w-7xl mx-auto">
                  
                  {/* ================= PASSO 1: SETUP ================= */}
                  {step === 1 && (
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 rounded-2xl">
                            <Settings size={28} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Configurar Avaliação</h3>
                            <p className="text-slate-500 dark:text-slate-400">Defina os parâmetros do seu modelo de ranqueamento.</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Target size={16} className="text-violet-500" /> Critério Chave (Peso: 46,41%)
                          </label>
                          <input 
                            type="text" 
                            value={customCriterion}
                            onChange={(e) => setCustomCriterion(e.target.value)}
                            placeholder="Ex: Alinhamento Estratégico, Custo-Benefício..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                          <p className="text-xs text-slate-500">Este será o eixo X da sua matriz final.</p>
                        </div>

                        <div className="space-y-3">
                          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Sliders size={16} className="text-fuchsia-500" /> Intervalo de Nota (Máx)
                          </label>
                          <select 
                            value={maxScore}
                            onChange={(e) => setMaxScore(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                          >
                            <option value={2}>0 a 2</option>
                            <option value={5}>0 a 5</option>
                            <option value={10}>0 a 10</option>
                            <option value={100}>0 a 100</option>
                          </select>
                          <p className="text-xs text-slate-500">Define o valor máximo que pode ser dado a um critério.</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button 
                          onClick={handleResetProgress}
                          className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                        >
                          <RotateCcw size={16} /> Limpar Progresso
                        </button>
                        <button 
                          onClick={() => setStep(2)}
                          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md shadow-violet-500/20 hover:shadow-violet-500/40"
                        >
                          Iniciar Avaliações <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ================= PASSO 2: AVALIAÇÃO ================= */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Star className="text-amber-500 fill-amber-500" size={24} /> 
                            Atribuir Notas
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Escala selecionada: <strong>0 a {maxScore}</strong>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button 
                            onClick={handleResetProgress}
                            className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Limpar Progresso"
                          >
                            <RotateCcw size={20} />
                          </button>
                          <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold">
                            Voltar
                          </button>
                          <button 
                            onClick={() => setStep(3)}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm"
                          >
                            Gerar Ranking <BarChart2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {items.map((item, index) => (
                          <div key={item.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
                            <div className="mb-6 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                                {index + 1}
                              </div>
                              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {item.detail?.title || `Item ${item.id}`}
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              {/* Criterios Base */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex flex-col">
                                  <span>Maturidade</span>
                                  <span className="text-[10px] text-violet-500">Peso: 4,36%</span>
                                </label>
                                <ScoreInput 
                                  max={maxScore}
                                  value={evaluations[item.id]?.crit1 ?? 0}
                                  onChange={(val) => handleScoreChange(item.id, 'crit1', val)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex flex-col">
                                  <span>Escopo Geográfico</span>
                                  <span className="text-[10px] text-violet-500">Peso: 8,88%</span>
                                </label>
                                <ScoreInput 
                                  max={maxScore}
                                  value={evaluations[item.id]?.crit2 ?? 0}
                                  onChange={(val) => handleScoreChange(item.id, 'crit2', val)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex flex-col">
                                  <span className="truncate">Integ. & Transparência</span>
                                  <span className="text-[10px] text-violet-500">Peso: 20,17%</span>
                                </label>
                                <ScoreInput 
                                  max={maxScore}
                                  value={evaluations[item.id]?.crit3 ?? 0}
                                  onChange={(val) => handleScoreChange(item.id, 'crit3', val)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex flex-col">
                                  <span>Contexto</span>
                                  <span className="text-[10px] text-violet-500">Peso: 20,17%</span>
                                </label>
                                <ScoreInput 
                                  max={maxScore}
                                  value={evaluations[item.id]?.crit4 ?? 0}
                                  onChange={(val) => handleScoreChange(item.id, 'crit4', val)}
                                />
                              </div>
                              
                              {/* Critério Chave */}
                              <div className="space-y-2 relative">
                                <div className="absolute -inset-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl -z-10 border border-violet-100 dark:border-violet-800"></div>
                                <label className="text-xs font-bold text-violet-700 dark:text-violet-300 flex flex-col">
                                  <span className="truncate" title={customCriterion}>{customCriterion}</span>
                                  <span className="text-[10px] text-fuchsia-500">Peso: 46,41% (Chave)</span>
                                </label>
                                <ScoreInput 
                                  max={maxScore}
                                  value={evaluations[item.id]?.crit5 ?? 0}
                                  onChange={(val) => handleScoreChange(item.id, 'crit5', val)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ================= PASSO 3: RESULTADOS ================= */}
                  {step === 3 && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <Trophy className="text-amber-500" /> Resultados do Ranqueamento
                        </h3>
                        <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold transition-all shadow-sm">
                          <ArrowLeft size={16} /> Ajustar Notas
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Lista de Ranking com Scroll Melhorado */}
                        <div className="lg:col-span-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-violet-400 hover:[&::-webkit-scrollbar-thumb]:bg-violet-500 [&::-webkit-scrollbar-thumb]:rounded-full">
                          <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <LayoutGrid size={16} /> Posições (Total)
                          </h4>
                          <div className="space-y-3">
                            {resultsData.list.map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full font-black text-sm ${
                                  idx === 0 ? 'bg-amber-100 text-amber-600 border border-amber-300' :
                                  idx === 1 ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                                  'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm">
                                    {item.title}
                                  </p>
                                  <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span>X: {item.x.toFixed(1)}</span>
                                    <span>Y: {item.y.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div className="font-black text-violet-600 dark:text-violet-400">
                                  {item.total.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Matriz 2x2 */}
                        <div className="lg:col-span-2">
                          <ChartCard title="Matriz de Desempenho (2x2)" icon={Target} iconColor="text-fuchsia-500" height="h-[500px]">
                            <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-400 opacity-50 uppercase pointer-events-none">Líderes</div>
                            <div className="absolute bottom-6 left-12 text-[10px] font-bold text-slate-400 opacity-50 uppercase pointer-events-none">Baixo Potencial</div>
                            
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.3} />
                              
                              <XAxis 
                                type="number" 
                                dataKey="x" 
                                name={customCriterion} 
                                domain={[0, maxScore * WEIGHTS.chave]} 
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickCount={6}
                                label={{ value: `${customCriterion} (Eixo X)`, position: 'bottom', offset: 0, fill: '#64748b', fontSize: 12 }}
                              />
                              <YAxis 
                                type="number" 
                                dataKey="y" 
                                name="Outros Critérios" 
                                domain={[0, maxScore * (WEIGHTS.maturidade + WEIGHTS.escopo + WEIGHTS.integracao + WEIGHTS.contexto)]} 
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickCount={6}
                                label={{ value: 'Soma: Maturidade, Escopo, Integ., Contexto (Eixo Y)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 12 }}
                              />
                              <ZAxis type="number" range={[100, 400]} />
                              
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<MatrixTooltip />} />
                              
                              <ReferenceLine x={resultsData.xMean} stroke="#8b5cf6" strokeOpacity={0.6} strokeDasharray="5 5" />
                              <ReferenceLine y={resultsData.yMean} stroke="#8b5cf6" strokeOpacity={0.6} strokeDasharray="5 5" />

                              <Scatter name="Itens" data={resultsData.list}>
                                {resultsData.list.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    fillOpacity={0.8}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                  />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ChartCard>
                          <div className="mt-4 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <Info size={18} className="text-violet-500 shrink-0 mt-0.5" />
                            <p>
                              As linhas tracejadas representam a média das pontuações nos eixos X e Y. Itens no quadrante <strong>superior direito</strong> são os mais bem avaliados globalmente, combinando alta pontuação no critério chave ({customCriterion}) e nos demais critérios.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Comparacao;