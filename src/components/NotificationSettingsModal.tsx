import React, { useEffect, useState } from 'react';
import { X, Bell, Flame, Send, CheckCircle2, Check, Loader2 } from 'lucide-react';
import {
  NotificationPrefs,
  getNotificationPrefs,
  enableDailyReminders,
  disableDailyReminders,
  updateStreakReminderPref,
  isPushSupported,
  sendTestNotification,
} from '../services/notifications/pushClient';

interface NotificationSettingsModalProps { onClose: () => void; }
const HOUR_OPTIONS = [8, 12, 15, 18, 19, 20, 21, 22];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [streakEnabled, setStreakEnabled] = useState(false);
  const [selectedHour, setSelectedHour] = useState(19);
  const [supported, setSupported] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pushSupported, loadedPrefs] = await Promise.all([isPushSupported(), getNotificationPrefs()]);
        if (!active) return;
        setSupported(pushSupported);
        setPrefs(loadedPrefs);
        setDailyEnabled(Boolean(loadedPrefs.dailyReminderEnabled));
        setStreakEnabled(Boolean(loadedPrefs.streakReminderEnabled));
        setSelectedHour(loadedPrefs.reminderHourLocal);
      } catch {
        if (active) setSupported(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleToggleDaily = () => {
    if (!prefs || loadingAction === 'daily') return;
    const previous = dailyEnabled;
    const next = !previous;
    setDailyEnabled(next); // atualização visual imediata; não depende do Firestore
    setLoadingAction('daily');
    setStatusMessage(null);

    void (async () => {
      try {
        const result = next
          ? await enableDailyReminders(selectedHour)
          : await disableDailyReminders();
        setStatusMessage(result.message);
        if (!result.success) {
          setDailyEnabled(previous);
        } else {
          setPrefs((p) => p ? { ...p, dailyReminderEnabled: next } : null);
        }
      } catch (err: any) {
        setDailyEnabled(previous);
        setStatusMessage(err?.message || 'Não foi possível atualizar o lembrete diário.');
      } finally {
        setLoadingAction(null);
      }
    })();
  };

  const handleToggleStreak = () => {
    if (!prefs || loadingAction === 'streak') return;
    const previous = streakEnabled;
    const next = !previous;
    setStreakEnabled(next); // atualização visual imediata
    setLoadingAction('streak');
    setStatusMessage(null);

    void (async () => {
      try {
        const result = await updateStreakReminderPref(next);
        setStatusMessage(result.message);
        if (!result.success) {
          setStreakEnabled(previous);
        } else {
          setPrefs((p) => p ? { ...p, streakReminderEnabled: next } : null);
        }
      } catch (err: any) {
        setStreakEnabled(previous);
        setStatusMessage(err?.message || 'Não foi possível atualizar o aviso de sequência.');
      } finally {
        setLoadingAction(null);
      }
    })();
  };

  const handleApplyNewHour = () => {
    if (!prefs || loadingAction) return;
    const previousHour = selectedHour;
    const previousEnabled = dailyEnabled;
    setDailyEnabled(true);
    setLoadingAction('hour');
    setStatusMessage(null);

    void (async () => {
      try {
        const result = await enableDailyReminders(selectedHour);
        setStatusMessage(result.message);
        if (!result.success) {
          setSelectedHour(previousHour);
          setDailyEnabled(previousEnabled);
        } else {
          setPrefs((p) => p ? { ...p, reminderHourLocal: selectedHour, dailyReminderEnabled: true } : null);
        }
      } catch (err: any) {
        setSelectedHour(previousHour);
        setDailyEnabled(previousEnabled);
        setStatusMessage(err?.message || 'Não foi possível atualizar o horário.');
      } finally {
        setLoadingAction(null);
      }
    })();
  };

  const handleTest = () => {
    if (loadingAction) return;
    setLoadingAction('test');
    setStatusMessage(null);
    void (async () => {
      try {
        const result = await sendTestNotification();
        setStatusMessage(result.message);
      } catch (err: any) {
        setStatusMessage(err?.message || 'Não foi possível enviar a notificação de teste.');
      } finally {
        setLoadingAction(null);
      }
    })();
  };

  const controlButton = (checked: boolean, action: 'daily' | 'streak', label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loadingAction !== null}
      aria-pressed={checked}
      aria-label={`${label}: ${checked ? 'ativado' : 'desativado'}`}
      className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all cursor-pointer disabled:opacity-60 ${
        checked
          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm'
          : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {loadingAction === action ? <Loader2 className="w-5 h-5 animate-spin" /> : checked ? <Check className="w-6 h-6" strokeWidth={3} /> : <span className="w-4 h-4 rounded-md border-2 border-current" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100"><Bell className="w-5 h-5" /></div>
            <div><h3 className="text-sm font-extrabold text-slate-900">Lembretes de Revisão</h3><p className="text-[11px] text-slate-500">Configure, altere e teste seus lembretes</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer" aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>

        {!supported && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Notificações não estão disponíveis neste ambiente.</p>}

        {supported && prefs && <>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-xs font-bold text-slate-900">Lembrete diário de revisão</div><div className="text-[10px] text-slate-500">Avisa quando você tem cartões para revisar</div></div>
              {controlButton(dailyEnabled, 'daily', 'Lembrete diário de revisão', handleToggleDaily)}
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">Horário preferido</div>
              <div className="flex flex-wrap gap-1.5">
                {HOUR_OPTIONS.map((h) => <button key={h} type="button" onClick={() => setSelectedHour(h)} disabled={loadingAction !== null} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all disabled:opacity-50 ${selectedHour === h ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{h}h</button>)}
              </div>
              {selectedHour !== prefs.reminderHourLocal && <button type="button" onClick={handleApplyNewHour} disabled={loadingAction !== null} className="mt-2.5 w-full py-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer disabled:opacity-50">{loadingAction === 'hour' ? 'Salvando horário…' : `Salvar horário ${selectedHour}:00`}</button>}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5"><Flame className="w-4 h-4 text-orange-500" /><div><div className="text-xs font-bold text-slate-900">Aviso de sequência em risco</div><div className="text-[10px] text-slate-500">Controla o lembrete de streak no sistema de notificações</div></div></div>
            {controlButton(streakEnabled, 'streak', 'Aviso de sequência em risco', handleToggleStreak)}
          </div>

          <button type="button" onClick={handleTest} disabled={loadingAction !== null} className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"><Send className="w-4 h-4 text-blue-600" />{loadingAction === 'test' ? 'Enviando…' : 'Testar notificação agora'}</button>
        </>}

        {statusMessage && <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />{statusMessage}</div>}
      </div>
    </div>
  );
};
