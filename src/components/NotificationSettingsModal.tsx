import React, { useEffect, useState } from 'react';
import { X, Bell, BellOff, Flame, Send, CheckCircle2 } from 'lucide-react';
import { NotificationPrefs, getNotificationPrefs, enableDailyReminders, disableDailyReminders, updateStreakReminderPref, isPushSupported, sendTestNotification } from '../services/notifications/pushClient';

interface NotificationSettingsModalProps { onClose: () => void; }
const HOUR_OPTIONS = [8, 12, 15, 18, 19, 20, 21, 22];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [supported, setSupported] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(19);

  const reloadPrefs = async () => {
    const updated = await getNotificationPrefs();
    setPrefs(updated);
    setSelectedHour(updated.reminderHourLocal);
  };

  useEffect(() => { (async () => { setSupported(await isPushSupported()); await reloadPrefs(); })(); }, []);

  const handleToggleDaily = async () => {
    if (!prefs) return;
    setLoadingAction('daily'); setStatusMessage(null);
    try {
      const result = prefs.dailyReminderEnabled ? await disableDailyReminders() : await enableDailyReminders(selectedHour);
      setStatusMessage(result.message);
      await reloadPrefs();
    } catch (err: any) { setStatusMessage(err?.message || 'Não foi possível atualizar os lembretes.'); }
    finally { setLoadingAction(null); }
  };

  const handleApplyNewHour = async () => {
    if (!prefs) return;
    setLoadingAction('hour'); setStatusMessage(null);
    try {
      const result = await enableDailyReminders(selectedHour);
      setStatusMessage(result.message);
      if (result.success) await reloadPrefs();
    } catch (err: any) { setStatusMessage(err?.message || 'Não foi possível atualizar o horário.'); }
    finally { setLoadingAction(null); }
  };

  const handleToggleStreak = async () => {
    if (!prefs) return;
    const next = !prefs.streakReminderEnabled;
    setLoadingAction('streak'); setStatusMessage(null);
    try {
      const result = await updateStreakReminderPref(next);
      setStatusMessage(result.message);
      if (result.success) await reloadPrefs();
    } catch (err: any) { setStatusMessage(err?.message || 'Não foi possível atualizar a sequência.'); }
    finally { setLoadingAction(null); }
  };

  const handleTest = async () => {
    setLoadingAction('test'); setStatusMessage(null);
    try { const result = await sendTestNotification(); setStatusMessage(result.message); }
    catch (err: any) { setStatusMessage(err?.message || 'Não foi possível enviar a notificação de teste.'); }
    finally { setLoadingAction(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30"><Bell className="w-5 h-5" /></div><div><h3 className="text-sm font-extrabold text-white">Lembretes de Revisão</h3><p className="text-[11px] text-[#8c91a0]">Configure, altere e teste seus lembretes</p></div></div><button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-4 h-4" /></button></div>
        {!supported && <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">Notificações não estão disponíveis neste ambiente.</p>}

        {supported && prefs && <>
          <div className="p-4 rounded-2xl bg-[#122131] border border-[#424754]/30 space-y-4">
            <div className="flex items-center justify-between"><div><div className="text-xs font-bold text-white">Lembrete diário de revisão</div><div className="text-[10px] text-[#8c91a0]">Avisa quando você tem cartões para revisar</div></div><button type="button" onClick={handleToggleDaily} disabled={loadingAction !== null} aria-pressed={prefs.dailyReminderEnabled} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer disabled:opacity-50 ${prefs.dailyReminderEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs.dailyReminderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
            <div><div className="text-[10px] text-[#8c91a0] mb-1.5">Horário preferido</div><div className="flex flex-wrap gap-1.5">{HOUR_OPTIONS.map((h) => <button key={h} type="button" onClick={() => setSelectedHour(h)} disabled={loadingAction !== null} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all disabled:opacity-50 ${selectedHour === h ? 'bg-blue-600 text-white ring-2 ring-blue-400/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{h}h</button>)}</div>{selectedHour !== prefs.reminderHourLocal && <button type="button" onClick={handleApplyNewHour} disabled={loadingAction !== null} className="mt-2.5 w-full py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-[11px] font-bold text-blue-300 hover:bg-blue-500/25 cursor-pointer disabled:opacity-50">{loadingAction === 'hour' ? 'Salvando horário…' : `Salvar horário ${selectedHour}:00`}</button>}</div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#122131] border border-[#424754]/30"><div className="flex items-center gap-2.5"><Flame className="w-4 h-4 text-orange-400" /><div><div className="text-xs font-bold text-white">Aviso de sequência em risco</div><div className="text-[10px] text-[#8c91a0]">Controla o lembrete de streak no sistema de notificações</div></div></div><button type="button" onClick={handleToggleStreak} disabled={loadingAction !== null} aria-pressed={prefs.streakReminderEnabled} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer disabled:opacity-50 ${prefs.streakReminderEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs.streakReminderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>

          <button type="button" onClick={handleTest} disabled={loadingAction !== null} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-[#424754]/50 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"><Send className="w-4 h-4 text-blue-400" />{loadingAction === 'test' ? 'Enviando…' : 'Testar notificação agora'}</button>
        </>}

        {statusMessage && <div className="flex items-start gap-2 p-3 rounded-xl bg-[#122131] border border-[#424754]/30 text-[11px] text-[#c2c6d6]"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{statusMessage}</div>}
      </div>
    </div>
  );
};
