import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  BarChart3, PieChart as PieChartIcon, Folder, AlertCircle, TrendingUp,
  Layers, Briefcase, Cpu, Globe, FileText, Shield, Users, Activity,
  Database, ChevronDown, Calendar, MapPin, Target, Code, Key, 
  Compass, Award, Zap, Server, Camera, Loader2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from "recharts";
import { Chart } from "react-google-charts";
import html2canvas from "html2canvas";

// Paleta de cores diversificada e moderna
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#d946ef'];

// Tooltip Customizado para o Recharts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataName = payload[0].name || payload[0].payload.name;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl z-50">
        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{dataName}</p>
        <p className="text-amber-600 dark:text-amber-400 font-bold">
          {payload[0].value} {payload[0].value === 1 ? 'registro' : 'registros'}
        </p>
      </div>
    );
  }
  return null;
};

// Subcomponente de Layout para os Gráficos (isRecharts controla o wrapper do ResponsiveContainer)
const ChartCard = ({ title, icon: Icon, iconColor, children, height = "h-[400px]", isRecharts = true }) => (
  <div className={`bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-6 rounded-3xl shadow-sm backdrop-blur-xl flex flex-col ${height}`}>
    <h4 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200">
      <Icon size={18} className={iconColor} /> {title}
    </h4>
    <div className="flex-1 w-full relative">
      {isRecharts ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : (
        children
      )}
    </div>
  </div>
);

const Visualizacao = () => {
  const { api } = useAuth();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [items, setItems] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const dropdownRef = useRef(null);
  const dashboardRef = useRef(null); // Ref para capturar o Dashboard

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
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
        setError("Não foi possível carregar as pastas para visualização.");
      } finally {
        setLoadingFolders(false);
      }
    };
    fetchFolders();
  }, [api]);

  const fetchFolderItems = useCallback(async (folderId) => {
    if (!folderId) return;
    try {
      setLoadingItems(true);
      const res = await api.get(`/api/folders/${folderId}/items`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setError("Erro ao buscar os insights da pasta selecionada.");
    } finally {
      setLoadingItems(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedFolderId) {
      fetchFolderItems(selectedFolderId);
    }
  }, [selectedFolderId, fetchFolderItems]);

  const folderType = useMemo(() => {
    if (items.length === 0) return null;
    return items[0].item_type;
  }, [items]);

  const getFieldDistribution = useCallback((fieldName) => {
    const counts = {};
    items.forEach(item => {
      const valueStr = item.detail?.[fieldName];
      if (valueStr && valueStr !== "N/A" && valueStr.trim() !== "") {
        valueStr.split(",").forEach(val => {
          const cleaned = val.trim();
          if (cleaned && cleaned !== "N/A") {
            counts[cleaned] = (counts[cleaned] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [items]);

  // Analytics focado nas Ferramentas
  const toolsAnalytics = useMemo(() => {
    if (folderType !== "tool") return null;

    // Lógica para a Timeline de Uploads/Atualizações
    const dateCounts = {};
    items.forEach(item => {
      const d = item.detail?.date;
      if (d && d !== "N/A") {
        const match = d.match(/^(\d{4}-\d{2})/); // Extrai apenas YYYY-MM
        if (match) {
          const yearMonth = match[1];
          dateCounts[yearMonth] = (dateCounts[yearMonth] || 0) + 1;
        }
      }
    });
    const timeline = Object.entries(dateCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));

    const countries = getFieldDistribution("country");
    const sectors = getFieldDistribution("target_sectors");
    const languages = getFieldDistribution("programming_languages");
    const geoScope = getFieldDistribution("geographical_scope");

    // Formatação específica para o Google GeoChart (Países Origem)
    const geoCountriesData = [
      ["País", "Ferramentas"],
      ...countries.map(c => [c.name === "Global" ? "World" : c.name, c.value])
    ];

    // Formatação específica para o Google GeoChart (Escopo)
    const geoScopeData = [
      ["Região/País", "Atuação"],
      ...geoScope.map(c => [c.name === "Global" ? "World" : c.name, c.value])
    ];

    return {
      total: items.length,
      timeline,
      geoCountriesData: geoCountriesData.length > 1 ? geoCountriesData : [["País", "Ferramentas"], ["Nenhum", 0]],
      geoScopeData: geoScopeData.length > 1 ? geoScopeData : [["Região/País", "Atuação"], ["Nenhum", 0]],
      maturity: getFieldDistribution("maturity"),
      usageRights: getFieldDistribution("usage_rights"),
      stages: getFieldDistribution("lifecycle_stages"),
      stakeholders: getFieldDistribution("stakeholder_group"),
      toolTypes: getFieldDistribution("tool_types").slice(0, 8),
      approaches: getFieldDistribution("type_of_approach"),
      sectors: sectors.slice(0, 8),
      targetUsers: getFieldDistribution("target_users").slice(0, 8),
      languages: languages.slice(0, 8),
      platforms: getFieldDistribution("technology_platforms").slice(0, 8),
      objectives: getFieldDistribution("objectives").slice(0, 8),
    };
  }, [folderType, items, getFieldDistribution]);

  // Analytics focado nas Métricas
  const metricsAnalytics = useMemo(() => {
    if (folderType !== "metric") return null;
    return {
      total: items.length,
      types: getFieldDistribution("metric_types"),
      purposes: getFieldDistribution("purposes").slice(0, 6),
      users: getFieldDistribution("target_users"),
      riskStages: getFieldDistribution("risk_management_stage"),
      sectors: getFieldDistribution("target_sectors").slice(0, 6)
    };
  }, [folderType, items.length, getFieldDistribution]);

  const selectedFolder = folders.find(f => f.id.toString() === selectedFolderId);

  const handleExportPNG = async () => {
    if (!dashboardRef.current || !selectedFolder) return;
    
    try {
      setIsExporting(true);
      setError("");
      
      // Fecha o dropdown caso esteja aberto para não poluir a imagem
      setIsDropdownOpen(false);

      // Timeout rápido para garantir que a UI reagiu ao fechamento do dropdown
      await new Promise(resolve => setTimeout(resolve, 100));

      const isDarkMode = document.documentElement.classList.contains('dark');
      
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // Aumenta a resolução para um PNG bem limpo e definido
        useCORS: true, // Necessário para mapas do Google Charts
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', // Fundo dinâmico baseado no tema
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight
      });

      // toBlob usa callback: a Promise faz erros do upload caírem no catch abaixo
      // e mantém o "Gerando PNG..." até o arquivo ser salvo
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Falha ao processar os pixels da imagem.");

      const formData = new FormData();
      const safeFolderName = selectedFolder.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Dashboard_${safeFolderName}_${Date.now()}.png`;

      formData.append("file", blob, filename);

      // Dispara pra mesma rota que gerencia os arquivos do usuário
      await api.post("/api/results", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Alerta de sucesso simplificado (substitua por um Toast se preferir)
      alert(`Sucesso! O resumo "${filename}" foi salvo nos seus Resultados.`);

    } catch (err) {
      console.error(err);
      setError("Erro ao gerar ou salvar a imagem do dashboard.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loadingFolders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse text-amber-600 dark:text-amber-400 font-medium">
          Carregando ambiente de análise...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_transparent_30%),radial-gradient(circle_at_top_right,_#fef3c7_0,_transparent_28%),linear-gradient(to_bottom_right,_#f8fafc,_#fffbeb)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#431407_0,_transparent_30%),radial-gradient(circle_at_top_right,_#451a03_0,_transparent_28%),linear-gradient(to_bottom_right,_#0f172a,_#1e1b4b)] dark:text-slate-200"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`body::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1">
          {/* Adicionando a referência ao container principal que será capturado */}
          <div ref={dashboardRef} className="flex flex-col">
            
            <header className="relative z-40 border-b border-slate-200/60 px-6 py-6 backdrop-blur-xl md:px-8 dark:border-slate-700/60 bg-transparent">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl dark:text-white">
                      Análise de{' '}
                      <span className="underline underline-offset-4 decoration-4 transition-colors text-amber-600 decoration-amber-300 dark:text-amber-400 dark:decoration-amber-700">
                        Dados
                      </span>
                    </h2>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base dark:text-slate-400">
                    Métricas e visualizações automáticas baseadas nas suas pastas.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleExportPNG}
                    disabled={isExporting || items.length === 0}
                    className="group flex flex-col items-center justify-center min-w-[150px] rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950 dark:to-emerald-950 p-4 shadow-sm transition-all hover:shadow-md hover:border-green-300 dark:hover:border-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Exportar gráficos como PNG para os seus Resultados"
                  >
                    <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                      {isExporting ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} className="transition-transform group-hover:scale-110" />}
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isExporting ? "Gerando PNG..." : "Salvar Resumo"}
                    </span>
                  </button>

                  <div className="min-w-[260px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Pasta Atual
                    </p>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500 rounded-xl px-4 py-2.5 text-left transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Folder className="text-amber-600 group-hover:text-amber-600 transition-colors shrink-0" size={18} />
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {selectedFolder ? selectedFolder.name : "Selecione uma pasta..."}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto py-1">
                          {folders.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500 text-center">Nenhuma pasta encontrada.</p>
                          ) : (
                            folders.map(f => (
                              <button
                                key={f.id}
                                onClick={() => { setSelectedFolderId(f.id.toString()); setIsDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 ${
                                  selectedFolderId === f.id.toString() ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold' : 'text-slate-600 dark:text-slate-300 font-medium'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${selectedFolderId === f.id.toString() ? 'bg-amber-500' : 'bg-transparent'}`} />
                                {f.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-[150px] rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950 dark:to-yellow-950 p-4 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 mb-1">
                      Registros
                    </p>
                    <p className="text-3xl font-black text-slate-950 dark:text-white">
                      {items.length}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            <div className="px-6 py-8 md:px-8 relative z-10">
              {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded-3xl text-sm font-medium shadow-sm">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              {loadingItems ? (
                <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-24 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mx-auto mb-4 flex h-16 w-16 animate-bounce items-center justify-center rounded-3xl bg-emerald-100 text-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <TrendingUp size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Processando matriz de dados...</h3>
                </div>
              ) : items.length === 0 ? (
                <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Database size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Repositório Vazio</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">Adicione ferramentas ou métricas nesta pasta para gerar gráficos.</p>
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  
                  {/* =========================================
                      DASHBOARD DE FERRAMENTAS (OECD.ai / Completo)
                  ========================================= */}
                  {folderType === "tool" && toolsAnalytics && (
                    <div className="space-y-8">

                      {/* Linha 1: Timeline - Área Total */}
                      <ChartCard title="Evolução Temporal de Adição (Timeline)" icon={Calendar} iconColor="text-orange-500" height="h-[320px]">
                        <AreaChart data={toolsAnalytics.timeline} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTimeline)" />
                        </AreaChart>
                      </ChartCard>

                      {/* Linha 2: Distribuição Geográfica com GOOGLE CHARTS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Mapa Geográfico (Países de Origem)" icon={MapPin} iconColor="text-blue-500" isRecharts={false}>
                          <Chart
                            chartType="GeoChart"
                            width="100%"
                            height="100%"
                            data={toolsAnalytics.geoCountriesData}
                            options={{
                              backgroundColor: 'transparent',
                              datalessRegionColor: '#cbd5e1', // Slate-300 (neutro para light/dark)
                              colorAxis: { colors: ['#93c5fd', '#3b82f6', '#1e3a8a'] }, // Gradiente azul
                              legend: { textStyle: { color: '#64748b', fontSize: 12 } },
                              tooltip: { isHtml: true }
                            }}
                          />
                        </ChartCard>
                        
                        <ChartCard title="Escopo Geográfico de Atuação" icon={Compass} iconColor="text-teal-500" isRecharts={false}>
                          <Chart
                            chartType="GeoChart"
                            width="100%"
                            height="100%"
                            data={toolsAnalytics.geoScopeData}
                            options={{
                              backgroundColor: 'transparent',
                              datalessRegionColor: '#cbd5e1', 
                              colorAxis: { colors: ['#99f6e4', '#14b8a6', '#115e59'] }, // Gradiente Teal/Esmeralda
                              legend: { textStyle: { color: '#64748b', fontSize: 12 } },
                              tooltip: { isHtml: true }
                            }}
                          />
                        </ChartCard>
                      </div>

                      {/* Linha 3: Maturidade e Licenciamento */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Maturidade das Soluções" icon={Layers} iconColor="text-violet-500">
                          <PieChart>
                            <Pie data={toolsAnalytics.maturity} cx="50%" cy="50%" innerRadius={0} outerRadius={110} paddingAngle={2} dataKey="value" label={({name}) => name} labelLine={false}>
                              {toolsAnalytics.maturity.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ChartCard>
                        <ChartCard title="Direitos de Uso (Licenciamento)" icon={Key} iconColor="text-amber-500">
                          <PieChart>
                            <Pie data={toolsAnalytics.usageRights} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" label={({name}) => name}>
                              {toolsAnalytics.usageRights.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ChartCard>
                      </div>

                      {/* Linha 4: Lifecycle e Stakeholders */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Cobertura do Ciclo de Vida da IA" icon={Zap} iconColor="text-yellow-400">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={toolsAnalytics.stages}>
                            <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Ferramentas" dataKey="value" stroke="#eab308" fill="#eab308" fillOpacity={0.5} />
                            <Tooltip content={<CustomTooltip />} />
                          </RadarChart>
                        </ChartCard>
                        <ChartCard title="Grupos de Stakeholders" icon={Users} iconColor="text-pink-500">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={toolsAnalytics.stakeholders}>
                            <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Stakeholders" dataKey="value" stroke="#ec4899" fill="#ec4899" fillOpacity={0.5} />
                            <Tooltip content={<CustomTooltip />} />
                          </RadarChart>
                        </ChartCard>
                      </div>

                      {/* Linha 5: Tipos e Abordagem */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Categorias e Tipos de Ferramenta" icon={Folder} iconColor="text-emerald-500">
                          <BarChart data={toolsAnalytics.toolTypes} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={140} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                              {toolsAnalytics.toolTypes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ChartCard>
                        <ChartCard title="Abordagens Metodológicas" icon={Target} iconColor="text-red-500">
                          <PieChart>
                            <Pie data={toolsAnalytics.approaches} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({name}) => name} labelLine={true}>
                              {toolsAnalytics.approaches.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ChartCard>
                      </div>

                      {/* Linha 6: Linguagens e Plataformas */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Linguagens de Programação" icon={Code} iconColor="text-indigo-500">
                          <BarChart data={toolsAnalytics.languages} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                              {toolsAnalytics.languages.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 7) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ChartCard>
                        <ChartCard title="Plataformas Tecnológicas" icon={Server} iconColor="text-slate-500">
                          <BarChart data={toolsAnalytics.platforms} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                              {toolsAnalytics.platforms.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ChartCard>
                      </div>

                      {/* Linha 7: Setores e Usuários Alvo */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Setores de Indústria Focados" icon={Briefcase} iconColor="text-cyan-500">
                          <BarChart data={toolsAnalytics.sectors} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={130} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                              {toolsAnalytics.sectors.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 6) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ChartCard>
                        <ChartCard title="Usuários Finais Alvo" icon={Award} iconColor="text-fuchsia-500">
                          <BarChart data={toolsAnalytics.targetUsers} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={130} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                              {toolsAnalytics.targetUsers.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 8) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ChartCard>
                      </div>

                    </div>
                  )}

                  {/* =========================================
                      DASHBOARD DE MÉTRICAS (MANTIDO ORIGINALMENTE)
                  ========================================= */}
                  {folderType === "metric" && metricsAnalytics && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Composição por Tipo" icon={FileText} iconColor="text-sky-500">
                          <PieChart>
                            <Pie data={metricsAnalytics.types} cx="50%" cy="50%" outerRadius={110} dataKey="value" labelLine={true} label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                              {metricsAnalytics.types.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ChartCard>
                        <ChartCard title="Stakeholders e Audiência" icon={Users} iconColor="text-fuchsia-500">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metricsAnalytics.users}>
                            <PolarGrid stroke="#cbd5e1" />
                            <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Métricas" dataKey="value" stroke="#ec4899" fill="#ec4899" fillOpacity={0.5} />
                            <Tooltip content={<CustomTooltip />} />
                          </RadarChart>
                        </ChartCard>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Propósitos e Compliance" icon={Shield} iconColor="text-emerald-500">
                          <BarChart data={metricsAnalytics.purposes} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                              {metricsAnalytics.purposes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ChartCard>
                        <ChartCard title="Fases de Gerenciamento de Risco" icon={Activity} iconColor="text-rose-500">
                          <PieChart>
                            <Pie data={metricsAnalytics.riskStages} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({name}) => name}>
                              {metricsAnalytics.riskStages.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ChartCard>
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

export default Visualizacao;