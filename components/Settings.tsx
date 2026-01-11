
import React, { useState } from 'react';
import { AppState, UserProfile, NotificationSettings } from '../types';

interface SettingsProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
  onResetData: () => void;
  onShowSql: () => void;
  syncStatus: string;
}

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'security' | 'finance' | 'privacy' | 'support';

export const Settings: React.FC<SettingsProps> = ({ state, onUpdateState, onResetData, onShowSql, syncStatus }) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('profile');

  // Segurança para evitar crash se o estado vier incompleto
  const user = state.user || { name: 'Visitante', email: '', phone: '' };
  const settings = state.settings || { theme: 'light', currency: 'BRL', dateFormat: 'DD/MM/YYYY', notifications: { push: true, email: true, whatsapp: false, alerts: { lowBalance: true, billDue: true, newIncome: true } } };

  const updateProfile = (data: Partial<UserProfile>) => {
    onUpdateState({ user: { ...user, ...data } });
  };

  const updateNotifications = (data: Partial<NotificationSettings>) => {
    onUpdateState({ 
      settings: { 
        ...settings, 
        notifications: { ...settings.notifications, ...data } 
      } 
    });
  };

  const updateGeneral = (data: any) => {
    onUpdateState({ settings: { ...settings, ...data } });
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

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-8 duration-700">
      {/* Settings Navigation */}
      <div className="w-full lg:w-72 space-y-2">
        <SidebarItem id="profile" label="Perfil" icon={<UserIcon />} />
        <SidebarItem id="preferences" label="Preferências" icon={<PrefIcon />} />
        <SidebarItem id="notifications" label="Notificações" icon={<BellIcon />} />
        <SidebarItem id="security" label="Segurança" icon={<LockIcon />} />
        <SidebarItem id="finance" label="Financeiro" icon={<CoinIcon />} />
        <SidebarItem id="privacy" label="Privacidade" icon={<ShieldIcon />} />
        <SidebarItem id="support" label="Suporte" icon={<HelpIcon />} />
      </div>

      {/* Settings Content */}
      <div className="flex-1 glass p-8 lg:p-12 rounded-[2.5rem] shadow-xl border border-white/40 dark:border-slate-800 min-h-[600px]">
        
        {activeSubTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dados Pessoais</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Gerencie sua identidade no aplicativo</p>
            </header>
            
            <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
              <div className="relative group">
                <div className="w-24 h-24 bg-indigo-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-500 text-3xl font-black overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-110 transition active:scale-95">
                  <EditIcon size={14} />
                </button>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xl font-black text-slate-800 dark:text-white">{user.name}</h4>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={user.name} 
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input 
                  type="email" 
                  value={user.email} 
                  onChange={(e) => updateProfile({ email: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                <input 
                  type="text" 
                  value={user.phone} 
                  onChange={(e) => updateProfile({ phone: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>
            <button className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
              Salvar Alterações
            </button>
          </div>
        )}

        {activeSubTab === 'preferences' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Personalização</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Ajuste o visual e formato de dados</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema</label>
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moeda Padrão</label>
                <select 
                  value={settings.currency}
                  onChange={(e) => updateGeneral({ currency: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold appearance-none text-slate-800 dark:text-white"
                >
                  <option value="BRL">Real (BRL)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato de Data</label>
                <select 
                  value={settings.dateFormat}
                  onChange={(e) => updateGeneral({ dateFormat: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold appearance-none text-slate-800 dark:text-white"
                >
                  <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                  <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Alertas</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Configure como e quando ser avisado</p>
            </header>

            <div className="space-y-4">
              <ToggleRow 
                label="Notificações Push" 
                active={settings.notifications?.push} 
                onToggle={(v) => updateNotifications({ push: v })} 
              />
              <ToggleRow 
                label="E-mails Semanais" 
                active={settings.notifications?.email} 
                onToggle={(v) => updateNotifications({ email: v })} 
              />
              <ToggleRow 
                label="WhatsApp (Alertas Críticos)" 
                active={settings.notifications?.whatsapp} 
                onToggle={(v) => updateNotifications({ whatsapp: v })} 
              />
            </div>

            <div className="pt-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Tipos de Alerta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.notifications?.alerts || {}).map(([key, val]) => (
                   <label key={key} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer hover:bg-slate-100 transition">
                      <input 
                        type="checkbox" 
                        checked={val} 
                        onChange={(e) => {
                          const newAlerts = { ...settings.notifications.alerts, [key]: e.target.checked };
                          updateNotifications({ alerts: newAlerts });
                        }}
                        className="w-5 h-5 rounded-lg border-none text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                        {key === 'lowBalance' ? 'Saldo Baixo' : key === 'billDue' ? 'Contas a Vencer' : 'Novas Receitas'}
                      </span>
                   </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'security' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Segurança</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Proteja seus dados financeiros</p>
            </header>
            <div className="space-y-6">
               <button className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl hover:shadow-lg transition">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl"><LockIcon size={18} /></div>
                    <div className="text-left">
                       <p className="font-bold text-slate-800 dark:text-white">Alterar Senha</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Última alteração: 3 meses atrás</p>
                    </div>
                  </div>
                  <ChevronRightIcon />
               </button>
               <button className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl hover:shadow-lg transition">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><ShieldIcon size={18} /></div>
                    <div className="text-left">
                       <p className="font-bold text-slate-800 dark:text-white">Autenticação 2FA</p>
                       <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Ativo</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-emerald-500 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div></div>
               </button>
            </div>
          </div>
        )}

        {activeSubTab === 'finance' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Metas e Limites</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Defina seus parâmetros de gastos</p>
            </header>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite Mensal de Gastos (R$)</label>
                <input 
                  type="number" 
                  value={settings.spendingLimit}
                  onChange={(e) => updateGeneral({ spendingLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-none rounded-3xl text-3xl font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-center space-y-4">
                <p className="font-bold text-slate-400 text-sm">Categorias Personalizadas</p>
                <div className="flex flex-wrap justify-center gap-2">
                   {['Aluguel', 'Freelance', 'Cursos'].map(tag => (
                     <span key={tag} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                       {tag}
                     </span>
                   ))}
                   <button className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'privacy' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Privacidade e Dados</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Controle o que acontece com suas informações</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button onClick={() => alert("Exportando CSV...")} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-left border border-slate-100 dark:border-slate-700 hover:bg-white transition-all shadow-sm group">
                  <p className="font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">Exportar Dados (CSV)</p>
                  <p className="text-xs text-slate-400 mt-1">Baixe todo seu histórico financeiro</p>
               </button>
               <button onClick={onShowSql} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-left border border-slate-100 dark:border-slate-700 hover:bg-white transition-all shadow-sm group">
                  <p className="font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">Ver Script de Banco</p>
                  <p className="text-xs text-slate-400 mt-1">Script SQL para criar sua tabela Supabase</p>
               </button>
               <button onClick={onResetData} className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-3xl text-left border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-all shadow-sm md:col-span-2 group">
                  <p className="font-black text-rose-600">Excluir Todos os Dados</p>
                  <p className="text-xs text-rose-400 mt-1">Ação irreversível. Apaga conta e dados da nuvem.</p>
               </button>
            </div>
          </div>
        )}

        {activeSubTab === 'support' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <header>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Suporte</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Estamos aqui para ajudar você</p>
            </header>
            <div className="space-y-4">
               <div className="p-8 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                  <h4 className="text-xl font-black mb-2">Precisa de ajuda?</h4>
                  <p className="text-indigo-100 text-sm opacity-80 mb-6">Fale com nosso time ou acesse nossa central de tutoriais rápidos.</p>
                  <div className="flex gap-3">
                     <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition">Chat ao Vivo</button>
                     <button className="px-6 py-3 bg-indigo-500/50 text-white rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-400 hover:bg-indigo-500 transition">Central</button>
                  </div>
               </div>
               <div className="flex justify-between items-center px-8 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Versão do Aplicativo</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">v2.4.0-Pro</span>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const ToggleRow = ({ label, active, onToggle }: { label: string, active: boolean, onToggle: (v: boolean) => void }) => (
  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
    <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
    <button 
      onClick={() => onToggle(!active)}
      className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${active ? 'right-1' : 'left-1'}`}></div>
    </button>
  </div>
);

const UserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const BellIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const LockIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const ShieldIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const PrefIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const CoinIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
const HelpIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const EditIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ChevronRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
