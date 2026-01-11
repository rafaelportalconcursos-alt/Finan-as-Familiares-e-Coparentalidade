
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

  // Função para pedir permissão de notificação no celular/browser
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("FamilyFinance Ativo", { body: "Você receberá alertas importantes aqui." });
      return true;
    }
    return false;
  };

  const handlePushToggle = async () => {
    const isCurrentlyEnabled = settings.notifications.push;
    if (!isCurrentlyEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        updateNotifications({ push: true });
      } else {
        alert("Para receber alertas, você precisa autorizar as notificações nas configurações do seu celular/navegador.");
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
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-2' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const Toggle = ({ active, onToggle, label }: { active: boolean, onToggle: () => void, label: string }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`}></div>
      </button>
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

      <div className="flex-1 glass p-8 lg:p-12 rounded-[2.5rem] shadow-xl border border-white/40 dark:border-slate-800 min-h-[600px]">
        
        {activeSubTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Seu Perfil</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Sua foto e informações básicas de contato</p>
            </header>
            
            <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
              <div 
                onClick={() => userFileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <div className="w-32 h-32 bg-indigo-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-indigo-500 text-4xl font-black overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl transition-transform group-hover:scale-105">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0) || 'U'
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <CameraIcon size={24} className="text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-full shadow-lg">
                  <EditIcon size={14} />
                </div>
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">{user.name}</h4>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{user.email}</p>
                <button 
                  onClick={() => updateProfile({ avatar: '' })}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline mt-2"
                >
                  Remover Foto
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <input 
                  type="text" 
                  value={user.name} 
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  value={user.phone} 
                  onChange={(e) => updateProfile({ phone: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail / Gmail</label>
                <input 
                  type="email" 
                  value={user.email} 
                  onChange={(e) => updateProfile({ email: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'child' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Perfil de {child.name}</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Informações essenciais para o dia a dia e emergências</p>
            </header>

            <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
              <div 
                onClick={() => childFileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <div className="w-32 h-32 bg-rose-100 dark:bg-rose-900/20 rounded-[2.5rem] flex items-center justify-center text-rose-500 text-4xl font-black overflow-hidden border-4 border-white dark:border-slate-700 shadow-2xl transition-transform group-hover:scale-105">
                  {child.photo ? (
                    <img src={child.photo} alt="Foto da Criança" className="w-full h-full object-cover" />
                  ) : (
                    child.name?.charAt(0) || 'C'
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <CameraIcon size={24} className="text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 bg-rose-600 text-white rounded-full shadow-lg">
                  <EditIcon size={14} />
                </div>
              </div>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">{child.name}</h4>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Identidade Visual da Filha</p>
                <button 
                  onClick={() => updateChild({ photo: '' })}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline mt-2"
                >
                  Remover Foto
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Criança</label>
                <input 
                  type="text" 
                  value={child.name} 
                  onChange={(e) => updateChild({ name: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nascimento</label>
                <input 
                  type="date" 
                  value={child.birthDate} 
                  onChange={(e) => updateChild({ birthDate: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pediatra / Contato</label>
                <input 
                  type="text" 
                  value={child.pediatrician || ''} 
                  placeholder="Ex: Dra. Helena - (11) 9..."
                  onChange={(e) => updateChild({ pediatrician: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Notificações</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Configure os alertas do FamilyFinance no seu celular</p>
            </header>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Canais Ativos</h4>
                <Toggle active={settings.notifications.push} onToggle={handlePushToggle} label="Notificações Push (Requer Permissão)" />
                <Toggle active={settings.notifications.email} onToggle={() => updateNotifications({ email: !settings.notifications.email })} label="Alertas por E-mail" />
                <Toggle active={settings.notifications.whatsapp} onToggle={() => updateNotifications({ whatsapp: !settings.notifications.whatsapp })} label="Avisos via WhatsApp (Beta)" />
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tipos de Alerta</h4>
                <Toggle active={settings.notifications.alerts.billDue} onToggle={() => updateNotifications({ alerts: { ...settings.notifications.alerts, billDue: !settings.notifications.alerts.billDue } })} label="Vencimento de Pensão e Contas" />
                <Toggle active={settings.notifications.alerts.lowBalance} onToggle={() => updateNotifications({ alerts: { ...settings.notifications.alerts, lowBalance: !settings.notifications.alerts.lowBalance } })} label="Aviso de Saldo Baixo" />
                <Toggle active={settings.notifications.alerts.newIncome} onToggle={() => updateNotifications({ alerts: { ...settings.notifications.alerts, newIncome: !settings.notifications.alerts.newIncome } })} label="Confirmação de Receitas" />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'finance' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gestão Financeira</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Parâmetros para o cálculo automático de gastos e Alice</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor da Pensão Mensal (R$)</label>
                <input 
                  type="number" 
                  value={state.monthlyPensionAmount} 
                  onChange={(e) => onUpdateState({ monthlyPensionAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dia Fixo de Vencimento</label>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={state.pensionDueDate} 
                  onChange={(e) => onUpdateState({ pensionDueDate: parseInt(e.target.value) || 1 })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite Máximo de Gastos por Mês (R$)</label>
                <input 
                  type="number" 
                  value={settings.spendingLimit} 
                  onChange={(e) => updateGeneral({ spendingLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 font-medium px-2">O assistente irá sugerir economia quando atingir 80% deste valor.</p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'preferences' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Experiência Visual</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Ajuste as cores e o comportamento da interface</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema Principal</label>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'auto'].map(t => (
                    <button 
                      key={t}
                      onClick={() => updateGeneral({ theme: t })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                        settings.theme === t 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                        : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'privacy' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sincronização & Nuvem</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Gerencie a conexão com o servidor Supabase</p>
            </header>
            <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/30">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl"><ShieldIcon size={20} /></div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white">Estado da Sincronização</h4>
                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{syncStatus === 'synced' ? 'Backup Concluído' : 'Sincronizando...'}</p>
                  </div>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed mb-6">O botão flutuante no canto da tela força uma atualização imediata do banco de dados, ideal para quando você anexa fotos pesadas.</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button onClick={onShowSql} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition">Ver Log Técnico</button>
                 <button onClick={onResetData} className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition">Resetar App</button>
               </div>
            </div>
          </div>
        )}

        {['security', 'support'].includes(activeSubTab) && (
           <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 opacity-50">
             <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full"><SettingsIcon size={32} /></div>
             <p className="font-bold text-sm">Em breve na versão Pro</p>
           </div>
        )}

      </div>
    </div>
  );
};

const UserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const HeartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const BellIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const ShieldIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const PrefIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const CoinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
const EditIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const CameraIcon = ({ size, className }: { size: number, className?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
const SettingsIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>;
