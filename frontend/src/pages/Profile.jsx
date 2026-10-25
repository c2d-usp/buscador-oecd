import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Camera, Save, LogOut, CheckCircle, AlertCircle } from "lucide-react";

const Profile = () => {
  const { user, api, logout, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [pic, setPic] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    const form = new FormData();
    form.append("full_name", fullName);
    form.append("bio", bio);
    if (pic) form.append("profile_pic", pic);

    try {
      await api.put("/api/users/me", form);
      if (refreshUser) await refreshUser();
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erro ao atualizar perfil. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen w-full flex justify-center items-center relative bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#fef3c7_0,_transparent_35%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e1b4b_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#451a03_0,_transparent_35%),linear-gradient(to_bottom_right,_#0f172a,_#111827)] dark:text-slate-200 transition-colors duration-300">
      <div className="animate-pulse flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <User size={32} className="opacity-50" />
        <p>Carregando perfil...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#fef3c7_0,_transparent_35%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#1e1b4b_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#451a03_0,_transparent_35%),linear-gradient(to_bottom_right,_#0f172a,_#111827)] dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto pt-10 px-6 pb-12 z-10 relative">
        <div className="rounded-[2rem] border border-white/60 bg-white/40 p-8 sm:p-10 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/40 transition-all">
          
          <div className="flex flex-col items-center mb-10">
            <div className="relative group mb-6">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 shadow-md">
                <img 
                  src={
                    user.profile_pic_url 
                      ? `${import.meta.env.VITE_API_URL}${user.profile_pic_url}` 
                      : "/default-avatar.svg"
                  } 
                  alt="Avatar do utilizador" 
                  className="w-full h-full object-cover rounded-full border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg border-2 border-white dark:border-slate-900 cursor-pointer hover:bg-indigo-700 transition-colors">
                <Camera size={16} />
                <input 
                  type="file" 
                  onChange={(e) => setPic(e.target.files[0])} 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Alterar foto de perfil"
                />
              </div>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              O Meu Perfil
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Gerencie suas informações pessoais e preferências
            </p>
          </div>

          {message.text && (
            <div className={`flex items-center gap-3 p-4 mb-8 rounded-2xl text-sm font-medium border ${message.type === 'success' ? 'bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50/50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nome Completo
              </label>
              <input 
                type="text"
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="O seu nome completo" 
                className="w-full px-4 py-3 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Biografia
              </label>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Conte um pouco sobre a sua trajetória e interesses..." 
                rows="4"
                className="w-full px-4 py-3 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>

            <div className="pt-8 mt-8 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row gap-4">
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {loading ? "A guardar..." : "Guardar alterações"}
              </button>
              
              <button 
                type="button" 
                onClick={logout}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/60 dark:bg-slate-800/60 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
              >
                <LogOut size={18} />
                Sair da conta
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;