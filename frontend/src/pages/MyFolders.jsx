import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Folder, Plus, Trash2, FolderOpen, ArrowRight, AlertCircle } from "lucide-react";

const MyFolders = () => {
  const { api } = useAuth();
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/folders");
      setFolders(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar suas pastas.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { 
    fetchFolders(); 
  }, [fetchFolders]);

  const createFolder = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/api/folders", { name: name.trim() });
      setName("");
      await fetchFolders();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar a nova pasta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteFolder = async (id, folderName) => {
    if (!window.confirm(`Tem certeza que deseja excluir a pasta "${folderName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.delete(`/api/folders/${id}`);
      await fetchFolders();
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir a pasta.");
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#fef3c7_0,_transparent_35%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e1b4b_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#451a03_0,_transparent_35%),linear-gradient(to_bottom_right,_#0f172a,_#111827)] dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto px-6 py-10 z-10 relative">
        
        {/* Header & Formulário de Criação */}
        <div className="rounded-[2rem] border border-white/60 bg-white/40 p-6 md:p-8 mb-10 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <FolderOpen className="text-indigo-600 dark:text-indigo-400" size={32} />
              Minhas Pastas
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Organize seus frameworks, métricas e ferramentas favoritas em espaços personalizados.
            </p>
          </div>
          
          <form onSubmit={createFolder} className="flex w-full md:w-auto gap-3">
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nome da nova pasta" 
              required 
              disabled={isSubmitting}
              className="flex-1 md:w-72 px-4 py-3 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
            />
            <button 
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{isSubmitting ? "Criando..." : "Criar Pasta"}</span>
            </button>
          </form>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-8 bg-red-50/50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded-2xl text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Grid de Pastas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <Folder size={40} className="opacity-50" />
              <p className="font-medium">Carregando suas pastas...</p>
            </div>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center border-2 border-dashed border-slate-300 dark:border-slate-700/60 rounded-[2rem] bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
              <FolderOpen size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Nenhuma pasta encontrada</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              Você ainda não criou nenhuma pasta. Use o campo acima para organizar seus recursos.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.map((f) => (
              <li key={f.id} className="group relative rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 hover:shadow-indigo-500/5 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 flex flex-col justify-between min-h-[180px]">
                
                <Link to={`/folders/${f.id}`} className="block flex-1 outline-none">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 transition-transform group-hover:scale-110">
                      <Folder size={24} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate pr-4">
                    {f.name}
                  </h3>
                </Link>
                
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <Link 
                    to={`/folders/${f.id}`} 
                    className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors outline-none"
                  >
                    Abrir
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  
                  <button 
                    onClick={() => deleteFolder(f.id, f.name)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                    title="Excluir pasta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyFolders;