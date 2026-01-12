
import React, { useState, useRef } from 'react';
import { AppState, UserProfile, NotificationSettings, ChildData } from '../types';

interface SettingsProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
  onResetData: () => void;
  onShowSql: () => void;
  syncStatus: string;
}

type SettingsTab = 'profile' | 'child' | 'preferences' | 'notifications' | 'finance' | 'privacy';

export const Settings: React.FC<SettingsProps> = ({ state, onUpdateState, onResetData, onShowSql, syncStatus }) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('profile');
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const childFileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  const user = state.user || { name: '', email: '', phone: '', avatar: '' };
  const child = state.child || { name: '', birthDate: '', photo: '' };
  const settings = state.settings || { 
    theme: 'dark', 
    currency: 'BRL', 
    dateFormat: 'DD/MM/YYYY', 
    spendingLimit: 3000,
    notifications: { 
      push: true, 
      email: true, 
      whatsapp: false, 
      alerts: { lowBalance: true, billDue: true, newIncome: true } 
    } 
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    onUpdateState({ user: { ...user, ...data } });
  };

  const updateChild = (data: Partial<ChildData>) => {
    onUpdateState({ child: { ...child, ...data } });
  };

  const updateGeneral = (data: any) => {
    onUpdateState({ settings: { ...settings, ...data } });
  };

  const updateNotifications = (data: Partial<NotificationSettings>) => {
    onUpdateState({ 
      settings: { 
        ...settings, 
        notifications: { ...settings.notifications, ...data } 
      } 
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'user' | 'child') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (target === 'user') updateProfile({ avatar: base64String });
        else updateChild({ photo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "family_finance_backup_completo.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          onUpdateState(json);
          alert("Todos os dados foram restaurados com sucesso!");
        } catch (err) {
          alert("Erro: O arquivo enviado não é um backup JSON válido.");
        }
      };
      reader.readAsText(file);
    }
  };

  const SidebarItem = ({ id, label, icon }: { id: SettingsTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveSubTab(id)}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
        activeSubTab === id 
        ? 'bg-indigo-600 text-white shadow-xl translate-x-2' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-8 duration-700">
      <input type="file" ref={userFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'user')} />
      <input type="file" ref={childFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'child')} />
      <input type="file" ref={jsonImportRef} className="hidden" accept=".json" onChange={handleImport} />

      <div className="w-full lg:w-72 space-y-2 shrink-0">
        <SidebarItem id="profile" label="Seu Perfil" icon={<UserIcon />} />
        <SidebarItem id="child" label="Perfil da Criança" icon={<HeartIcon />} />
        <SidebarItem id="preferences" label="Aparência" icon={<PrefIcon />} />
        <SidebarItem id="notifications" label="Notificações" icon={<BellIcon />} />
        <SidebarItem id="finance" label="Finanças" icon={<CoinIcon />} />
        <SidebarItem id="privacy" label="Dados & Nuvem" icon={<ShieldIcon />} />
      </div>

      <div className="flex-1 glass p-8 lg:p-12 rounded-[3rem] shadow-2xl border border-white/10 dark:border-slate-800 min-h-[650px] bg-white/5 overflow-hidden">
        
        {activeSubTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Seu Perfil</h3>
              <p className="text-sm text-slate-500 mt-1">Gerencie suas informações pessoais e foto de perfil.</p>
            </header>
            
            <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-white/5">
              <div onClick={() => userFileInputRef.current?.click()} className="relative cursor-pointer group">
                <div className="w-32 h-32 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-indigo-500 text-4xl font-black overflow-hidden border-4 border-white/10 shadow-2xl transition-all group-hover:scale-105 group-hover:border-indigo-500/50">
                  {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : user.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-slate-900">
                  <CameraIcon size={16} />
                </div>
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-white">{user.name || 'Nome Completo'}</h4>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{user.email || 'email@exemplo.com'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputGroup label="Nome Completo" value={user.name} onChange={(v) => updateProfile({ name: v })} />
              <InputGroup label="E-mail" value={user.email} onChange={(v) => updateProfile({ email: v })} />
              <InputGroup label="Telefone" value={user.phone} onChange={(v) => updateProfile({ phone: v })} />
            </div>
          </div>
        )}

        {activeSubTab === 'child' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Perfil da Criança</h3>
              <p className="text-sm text-slate-500 mt-1">Informações essenciais para a gestão da coparentalidade.</p>
            </header>

            <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-white/5">
              <div onClick={() => childFileInputRef.current?.click()} className="relative cursor-pointer group">
                <div className="w-32 h-32 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 text-4xl font-black overflow-hidden border-4 border-white/10 shadow-2xl transition-all group-hover:scale-105 group-hover:border-rose-500/50">
                  {child.photo ? <img src={child.photo} alt="Alice" className="w-full h-full object-cover" /> : child.name?.charAt(0) || 'A'}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-slate-900">
                  <CameraIcon size={16} />
                </div>
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-white">{child.name}</h4>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Nascimento: {child.birthDate || 'Não definida'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputGroup label="Nome da Criança" value={child.name} onChange={(v) => updateChild({ name: v })} />
              <InputGroup label="Data de Nascimento" type="date" value={child.birthDate} onChange={(v) => updateChild({ birthDate: v })} />
              <InputGroup label="Pediatra / Contato" value={child.pediatrician || ''} onChange={(v) => updateChild({ pediatrician: v })} />
              <InputGroup label="Escola / Instituição" value={child.school || ''} onChange={(v) => updateChild({ school: v })} />
            </div>
          </div>
        )}

        {activeSubTab === 'preferences' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Preferências</h3>
              <p className="text-sm text-slate-500 mt-1">Personalize a interface e configurações regionais.</p>
            </header>

             <div className="grid grid-cols-1 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tema da Interface</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'auto'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => updateGeneral({ theme: t })} 
                        className={`py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                          settings.theme === t 
                          ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400 shadow-lg' 
                          : 'border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Moeda Padrão" value={settings.currency} onChange={(v) => updateGeneral({ currency: v })} />
                  <InputGroup label="Formato de Data" value={settings.dateFormat} onChange={(v) => updateGeneral({ dateFormat: v })} />
                </div>
             </div>
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Notificações</h3>
              <p className="text-sm text-slate-500 mt-1">Escolha como e quando deseja ser alertado.</p>
            </header>

            <div className="space-y-6">
              <ToggleGroup label="Canais de Comunicação">
                <ToggleItem label="Notificações Push" description="Alertas em tempo real no dispositivo." enabled={settings.notifications.push} onChange={(v) => updateNotifications({ push: v })} />
                <ToggleItem label="E-mail" description="Resumos e avisos importantes por e-mail." enabled={settings.notifications.email} onChange={(v) => updateNotifications({ email: v })} />
                <ToggleItem label="WhatsApp Business" description="Avisos de vencimento pelo WhatsApp." enabled={settings.notifications.whatsapp} onChange={(v) => updateNotifications({ whatsapp: v })} />
              </ToggleGroup>
            </div>
          </div>
        )}

        {activeSubTab === 'finance' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Regras Financeiras</h3>
              <p className="text-sm text-slate-500 mt-1">Configure limites e detalhes automáticos da pensão.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InputGroup label="Valor da Pensão (R$)" type="number" value={state.monthlyPensionAmount.toString()} onChange={(v) => onUpdateState({ monthlyPensionAmount: parseFloat(v) || 0 })} />
              <InputGroup label="Teto de Gastos (R$)" type="number" value={settings.spendingLimit.toString()} onChange={(v) => updateGeneral({ spendingLimit: parseFloat(v) || 0 })} />
            </div>
          </div>
        )}

        {activeSubTab === 'privacy' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
             <header className="flex justify-between items-center">
               <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dados & Nuvem</h3>
               <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase ${syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                 {syncStatus === 'synced' ? 'Nuvem Sincronizada' : 'Sincronizando...'}
               </span>
             </header>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] space-y-4">
                   <ShieldIcon />
                   <h4 className="font-black text-white text-lg">Segurança Digital</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">Seus dados financeiros são protegidos com criptografia de ponta a ponta no Supabase.</p>
                   <button onClick={onShowSql} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Logs de Sincronia</button>
                </div>

                <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-[2.5rem] space-y-4">
                   <TrashIcon />
                   <h4 className="font-black text-white text-lg">Limpeza de Dados</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">Apaga todos os registros deste dispositivo para reiniciar as configurações.</p>
                   <button onClick={onResetData} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Zerar Tudo Agora</button>
                </div>
             </div>
             
             <div className="p-10 bg-black/40 rounded-[3rem] border border-white/5 text-center space-y-6">
                <div className="flex justify-center gap-4">
                  <button onClick={handleBackup} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase transition">Criar Backup JSON</button>
                  <button onClick={() => jsonImportRef.current?.click()} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase transition">Restaurar Backup</button>
                </div>
                <div className="pt-4 opacity-40">
                   <p className="text-[10px] font-bold text-slate-500">FAMILY FINANCE & COPARENTALIDADE - VERSÃO 3.6.0-PRO</p>
                   <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black mt-1">Protegido com Criptografia AES-256 e SSL</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} step="any" value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-5 bg-black/20 border border-white/10 rounded-2xl font-bold text-white focus:border-indigo-500 outline-none transition-all" />
  </div>
);

const ToggleGroup = ({ label, children }: any) => (
  <div className="space-y-4">
    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</h4>
    <div className="bg-black/20 border border-white/5 rounded-[2.5rem] overflow-hidden">
      {children}
    </div>
  </div>
);

const ToggleItem = ({ label, description, enabled, onChange }: any) => (
  <div className="flex items-center justify-between p-7 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
    <div className="pr-4">
      <p className="font-black text-white text-sm">{label}</p>
      <p className="text-[11px] text-slate-500 mt-1">{description}</p>
    </div>
    <button onClick={() => onChange(!enabled)} className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-slate-800'}`}>
      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${enabled ? 'left-7' : 'left-1'}`}></div>
    </button>
  </div>
);

const UserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const HeartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const BellIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const ShieldIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const PrefIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>;
const CoinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
const CameraIcon = ({ size = 20 }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const TrashIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
