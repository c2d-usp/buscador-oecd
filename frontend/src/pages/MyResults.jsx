import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  FileText, Trash2, Download, AlertCircle, FileJson, 
  Image as ImageIcon, Table, File, UploadCloud, Loader2
} from "lucide-react";

const MyResults = () => {
  const { api } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/results");
      setResults(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar seus resultados.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { 
    fetchResults(); 
  }, [fetchResults]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Nota: o Axios (que você provavelmente usa no 'api') lida com FormData automaticamente
      await api.post("/api/results", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await fetchResults();
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar o resultado.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteResult = async (id, filename) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${filename}"?`)) return;

    try {
      await api.delete(`/api/results/${id}`);
      await fetchResults();
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir o resultado.");
    }
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'json': return <FileJson size={28} className="text-amber-500" />;
      case 'csv': 
      case 'xlsx': return <Table size={28} className="text-emerald-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg': return <ImageIcon size={28} className="text-blue-500" />;
      case 'txt': return <FileText size={28} className="text-slate-500" />;
      default: return <File size={28} className="text-indigo-500" />;
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#fef3c7_0,_transparent_35%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e1b4b_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#451a03_0,_transparent_35%),linear-gradient(to_bottom_right,_#0f172a,_#111827)] dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto px-6 py-10 z-10 relative">
        
        {/* Header & Upload */}
        <div className="rounded-[2rem] border border-white/60 bg-white/40 p-6 md:p-8 mb-10 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <FileText className="text-indigo-600 dark:text-indigo-400" size={32} />
              Meus Resultados
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Gerencie arquivos, visualizações exportadas e relatórios gerados pela plataforma.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload} 
              className="hidden" 
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              <span className="hidden sm:inline">{isUploading ? "Salvando..." : "Upload Manual"}</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-8 bg-red-50/50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded-2xl text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Grid de Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <FileText size={40} className="opacity-50" />
              <p className="font-medium">Carregando seus arquivos...</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center border-2 border-dashed border-slate-300 dark:border-slate-700/60 rounded-[2rem] bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Nenhum resultado salvo</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              Você ainda não gerou ou salvou nenhum resultado. Exporte gráficos ou faça o upload manual.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((r) => (
              <li key={r.id} className="group relative rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 hover:shadow-indigo-500/5 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 flex flex-col justify-between min-h-[180px]">
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-transform group-hover:scale-110 shadow-sm border border-slate-100 dark:border-slate-700">
                      {getFileIcon(r.file_type)}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate" title={r.filename}>
                    {r.filename}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-semibold">
                    {r.file_type} • {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <a 
                    href={`${import.meta.env.VITE_API_URL}${r.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    Baixar
                    <Download size={14} className="transition-transform group-hover:-translate-y-0.5" />
                  </a>
                  
                  <button 
                    onClick={() => deleteResult(r.id, r.filename)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                    title="Excluir arquivo"
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

export default MyResults;