import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Plus, Folder, Check } from 'lucide-react';

const SaveButton = ({ itemType, itemId, allItems = [] }) => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveBatch, setSaveBatch] = useState(false); // Alterna entre salvar um ou em lote

  const handleOpen = async (e) => {
    e.stopPropagation(); // Evita o clique indesejado de disparar o modal de detalhes do card
    if (!user) {
      navigate('/login');
      return;
    }
    setShowModal(true);
    setError('');
    try {
      const res = await api.get('/api/folders');
      setFolders(res.data);
    } catch (err) {
      setError('Erro ao carregar pastas');
    }
  };

  const handleSave = async (folderId, e) => {
    e.stopPropagation();
    setLoading(true);
    setError('');
    try {
      if (saveBatch && allItems.length > 0) {
        // Fluxo de salvamento em lote
        const itemIds = allItems.map(item => item.id).join(',');
        await api.post('/api/saves/batch', new URLSearchParams({
          item_type: itemType,
          folder_id: folderId,
          item_ids: itemIds
        }));
      } else {
        // Fluxo padrão unitário
        await api.post('/api/saves', new URLSearchParams({
          item_type: itemType,
          item_id: itemId,
          folder_id: folderId
        }));
      }
      
      setSaved(true);
      setShowModal(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.stopPropagation();
    if (!newFolderName.trim()) return;
    try {
      await api.post('/api/folders', new URLSearchParams({ name: newFolderName.trim() }));
      const res = await api.get('/api/folders');
      setFolders(res.data);
      setNewFolderName('');
      setError('');
    } catch (err) {
      setError('Erro ao criar pasta');
    }
  };

  return (
    <div className="absolute bottom-5 right-5 z-10">
      <button
        onClick={handleOpen}
        className={`p-2 rounded-full transition-colors border shadow-sm dark:border-slate-700 ${
          saved
            ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200'
            : 'text-slate-400 bg-white dark:bg-slate-800 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200'
        }`}
        title={user ? 'Salvar itens' : 'Faça login para salvar'}
      >
        {saved ? <Check size={18} /> : <Bookmark size={18} />}
      </button>

      {showModal && (
        <div className="absolute bottom-12 right-0 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 z-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Salvar em...
            </h4>
            <button
              onClick={() => setShowModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none font-bold"
            >
              &times;
            </button>
          </div>

          {/* Abas de Escopo: Só renderiza se houver mais de 1 item no total */}
          {allItems && allItems.length > 1 && (
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-0.5 mb-3 text-xs">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSaveBatch(false); }}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  !saveBatch
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Apenas este
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSaveBatch(true); }}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  saveBatch
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Todos ({allItems.length})
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

          <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
            {folders.length === 0 && (
              <p className="text-xs text-slate-400 px-3 py-2">Nenhuma pasta ainda.</p>
            )}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={(e) => handleSave(folder.id, e)}
                disabled={loading}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <Folder size={14} className="text-slate-400" />
                <span className="flex-1 truncate">{folder.name}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nova pasta..."
                className="flex-1 text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveButton;