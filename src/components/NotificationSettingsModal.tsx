import React, { useEffect, useState } from 'react';
import { X, Bell, BellOff, Flame, Send, Loader2 } from 'lucide-react';
import {
  NotificationPrefs,
  getNotificationPrefs,
  enableDailyReminders,
  disableDailyReminders,
  updateStreakReminderPref,
  sendTestNotification,
  isPushSupported,
} from '../services/notifications/pushClient';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

const HOUR_OPTIONS = [8, 12, 15, 18, 19, 20, 21, 22];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(19);

  useEffect(() => {
    (async () => {
      setSupported(await isPushSupported());
      const p = await getNotificationPrefs();
      setPrefs(p);
      setSelectedHour(p.reminderHourLocal);
    })();
  }, []);

  const handleToggleDaily = async () => {
    if (!prefs) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      if (prefs.dailyReminderEnabled) {
        await disableDailyReminders();
        setPrefs({ ...prefs, dailyReminderEnabled: false });
        setStatusMessage('Lembretes diários desativados.');
      } else {
        const result = await enableDailyReminders(selectedHour);
        setStatusMessage(result.message);
        if (result.success) {
          const updated = await getNotificationPrefs();
          setPrefs(updated);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStreak = async () => {
    if (!prefs) return;
    const next = !prefs.streakReminderEnabled;
    setPrefs({ ...prefs, streakReminderEnabled: next });
    await updateStreakReminderPref(next);
  };

  const handleTest = async () => {
    setLoading(true);
    setStatusMessage(null);
    const result = await sendTestNotification();
    setStatusMessage(result.message);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Lembretes de Revisão</h3>
              <p className="text-[11px] text-[#8c91a0]">Não deixe seus cartões acumularem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!supported && (
          <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Notificações push não são suportadas neste navegador/dispositivo.
          </p>
        )}

        {supported && prefs && (
          <>
            {/* Daily reminder toggle */}
            <div className="p-4 rounded-2xl bg-[#122131] border border-[#424754]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Lembrete diário de revisão</div>
                  <div className="text-[10px] text-[#8c91a0]">Avisa quando você tem cartões vencidos</div>
                </div>
                <button
                  onClick={handleToggleDaily}
                  disabled={loading}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer disabled:opacity-50 ${
                    prefs.dailyReminderEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      prefs.dailyReminderEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <div className="text-[10px] text-[#8c91a0] mb-1.5">Horário preferido</div>
                <div className="flex flex-wrap gap-1.5">
                  {HOUR_OPTIONS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setSelectedHour(h)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        selectedHour === h
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                {selectedHour !== prefs.reminderHourLocal && prefs.dailyReminderEnabled && (
                  <button
                    onClick={handleToggleDaily}
                    className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Aplicar novo horário ({selectedHour}h)
                  </button>
                )}
              </div>
            </div>

            {/* Streak reminder toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#122131] border border-[#424754]/30">
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-xs font-bold text-white">Aviso de sequência em risco</div>
                  <div className="text-[10px] text-[#8c91a0]">Avisa se sua streak vai quebrar hoje</div>
                </div>
              </div>
              <button
                onClick={handleToggleStreak}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                  prefs.streakReminderEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs.streakReminderEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {prefs.dailyReminderEnabled && (
              <button
                onClick={handleTest}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar notificação de teste
              </button>
            )}
          </>
        )}

        {statusMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#122131] border border-[#424754]/30 text-[11px] text-[#c2c6d6]">
            {prefs?.dailyReminderEnabled ? (
              <Bell className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            )}
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};
