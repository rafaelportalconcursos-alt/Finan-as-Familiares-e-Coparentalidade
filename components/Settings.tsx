
import React, { useState, useRef } from 'react';
import { AppState, UserProfile, NotificationSettings, ChildData } from '../types';

interface SettingsProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
  onResetData: () => void;
  onShowSql: () => void;
  syncStatus: string;
}

type SettingsTab = 'profile' | 'child' | 'preferences' | 'notifications' | 'security' | 'finance' | 'privacy' | 'support';

export const Settings: React.FC<SettingsProps> = ({ state, onUpdateState, onResetData, onShowSql, syncStatus }) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('profile');
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const childFileInputRef = useRef<HTMLInputElement>(null);

  const user = state.user || { name: 'Visitante', email: '', phone: '', avatar: '' };
  const child = state.child || { name: 'Criança', birthDate: '2020-01-01', photo: '' };
  const settings = state.settings || { theme: 'light', currency: 'BRL', dateFormat: 'DD/MM/YYYY', notifications: { push: true, email: true, whatsapp: false, alerts: { lowBalance: true, billDue: true, newIncome: true } } };

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

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Este navegador não suporta notificações de sistema.");
      return false;
    }
    
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      alert("As notificações estão bloqueadas. Por favor, ative-as nas configurações do site (ícone de cadeado).");
      return false;
    }

    setIsRequestingPush(true);
    try {
      // Suporte para iOS/Safari antigo e navegadores modernos
      const permission = await new Promise<NotificationPermission>((resolve) => {
        const result = Notification.requestPermission(resolve);
        if (result) {
          result.then(resolve);
        }
      });
      
      return permission === "granted";
    } catch (e) {
      console.error("Erro ao solicitar permissão", e);
      return false;
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handlePushToggle = async () => {
    const isCurrentlyEnabled = settings.notifications.push;
    
    if (!isCurrentlyEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        updateNotifications({ push: true });
      }
    } else {
      updateNotifications({ push: false });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'user' | 'child') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem é muito grande. Escolha uma foto de até 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (target === 'user') {
          updateProfile({ avatar: base64String });
        } else {
          updateChild({ photo: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const SidebarItem = ({ id, label, icon }: { id: SettingsTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveSubTab(id)}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
        activeSubTab === id 
        ? 'bg-indigo-600 text-white shadow-lg translate-x-2' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const SettingRow = ({ active, onToggle, label, description, icon, locked = false }: any) => (
    <div 
      onClick={!locked ? onToggle : undefined}
      className={`group flex items-center justify-between p-5 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer select-none active:scale-[0.98] ${locked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-black text-slate-900 dark:text-white tracking-tight">{label}</span>
          <span className="text-[10px] font-medium text-slate-400 leading-tight pr-4">{description}</span>
        </div>
      </div>
      <div 
        className={`w-14 h-8 rounded-full relative transition-all duration-500 flex items-center px-1.5 ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-sm transform ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-8 duration-700">
      <input type="file" ref={userFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'user')} />
      <input type="file" ref={childFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'child')} />

      <div className="w-full lg:w-72 space-y-2">
        <SidebarItem id="profile" label="Seu Perfil" icon={<UserIcon />} />
        <SidebarItem id="child" label="Perfil da Criança" icon={<HeartIcon />} />
        <SidebarItem id="preferences" label="Aparência" icon={<PrefIcon />} />
        <SidebarItem id="notifications" label="Notificações" icon={<BellIcon />} />
        <SidebarItem id="finance" label="Finanças" icon={<CoinIcon />} />
        <SidebarItem id="privacy" label="Dados & Nuvem" icon={<ShieldIcon />} />
      </div>

      <div className="flex-1 glass p-6 lg:p-12 rounded-[2.5rem] shadow-xl border border-white/40 dark:border-slate-800 min-h-[600px]">
        
        {activeSubTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Seu Perfil</h3>
            </header>
            <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
              <div onClick={() => userFileInputRef.current?.click()} className="relative cursor-pointer group">
                <div className="w-32 h-32 bg-indigo-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-indigo-500 text-4xl font-black overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl transition-transform group-hover:scale-105">
                  {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : user.name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">{user.name}</h4>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <input type="text" value={user.name} onChange={(e) => updateProfile({ name: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-800 dark:text-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input type="email" value={user.email} onChange={(e) => updateProfile({ email: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-800 dark:text-white" />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Notificações</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Ative o Push para receber avisos em tempo real.</p>
            </header>
            
            <div className="grid grid-cols-1 gap-4">
              <SettingRow 
                label="Notificações Push" 
                description="Receber avisos do sistema direto no dispositivo."
                active={settings.notifications.push} 
                onToggle={handlePushToggle}
                icon={<BellIcon />}
              />
              <SettingRow 
                label="Alertas de Vencimento" 
                description="Lembrar 2 dias antes do prazo da pensão."
                active={settings.notifications.alerts.billDue} 
                onToggle={() => updateNotifications({ alerts: { ...settings.notifications.alerts, billDue: !settings.notifications.alerts.billDue } })}
                icon={<ClockIcon size={20} />}
              />
              <SettingRow 
                label="Haptic Feedback (Vibração)" 
                description="Vibrar o celular ao receber um aviso (Automático)."
                active={true} 
                onToggle={() => {}}
                icon={<PhoneIcon size={20} />}
              />
            </div>

            {isRequestingPush && (
              <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-200 dark:border-indigo-800 animate-pulse text-center">
                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Aguardando permissão do navegador...
                </p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'finance' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Finanças</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor da Pensão (R$)</label>
                <input type="number" value={state.monthlyPensionAmount} onChange={(e) => onUpdateState({ monthlyPensionAmount: parseFloat(e.target.value) || 0 })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-800 dark:text-white" />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'preferences' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Experiência</h3></header>
             <div className="grid grid-cols-3 gap-3">
                {['light', 'dark', 'auto'].map(t => (
                  <button key={t} onClick={() => updateGeneral({ theme: t })} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${settings.theme === t ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                    {t}
                  </button>
                ))}
             </div>
          </div>
        )}

        {activeSubTab === 'privacy' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dados</h3></header>
             <button onClick={onResetData} className="w-full p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-rose-600 text-[10px] font-black uppercase tracking-widest">Zerar Dados Locais</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Ícones simplificados
const UserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const HeartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const BellIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const ShieldIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const PrefIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const CoinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
const PhoneIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="12" height="20" x="6" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>;
const ClockIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
