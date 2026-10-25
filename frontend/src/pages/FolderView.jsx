import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import ToolCard from "../components/ToolCard";
import MetricCard from "../components/MetricCard";
import ToolModal from "../components/ToolModal";
import MetricModal from "../components/MetricModal";
import { ArrowLeft, FolderOpen, Inbox, AlertCircle } from "lucide-react";

const FolderView = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/folders/${id}/items`);
      setItems(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os itens desta pasta.");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="min-h-screen w-full relative bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#fef3c7_0,_transparent_35%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e1b4b_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#451a03_0,_transparent_35%),linear-gradient(to_bottom_right,_#0f172a,_#111827)] dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto px-6 py-10 z-10 relative">
        
        {/* Header com Botão de Voltar */}
        <div className="rounded-[2rem] border border-white/60 bg-white/40 p-6 md:p-8 mb-10 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40 transition-all">
          <div className="mb-6">
            <Link 
              to="/folders" 
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar para Minhas Pastas
            </Link>
          </div>
          
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <FolderOpen className="text-indigo-600 dark:text-indigo-400" size={32} />
              Conteúdo da Pasta
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Aqui encontra todos os frameworks, ferramentas e métricas que guardou nesta pasta.
            </p>
          </div>
        </div>

        {/* Tratamento de Erro */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-8 bg-red-50/50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded-2xl text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Área de Conteúdo */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <FolderOpen size={40} className="opacity-50" />
              <p className="font-medium">A carregar conteúdos...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center border-2 border-dashed border-slate-300 dark:border-slate-700/60 rounded-[2rem] bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
              <Inbox size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Pasta Vazia</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              Ainda não guardou nenhum item nesta pasta. Explore o catálogo para adicionar ferramentas e métricas aqui.
            </p>
            <Link 
              to="/busca" 
              className="mt-6 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((saved) => {
              if (!saved.detail) return null;
              return saved.item_type === "tool" ? (
                <ToolCard key={saved.id} tool={saved.detail} onClick={setSelectedTool} />
              ) : (
                <MetricCard key={saved.id} metric={saved.detail} onClick={setSelectedMetric} />
              );
            })}
          </div>
        )}
      </div>

      <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
      <MetricModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
    </div>
  );
};

export default FolderView;