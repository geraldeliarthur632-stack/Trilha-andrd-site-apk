import React, { useState, useEffect } from 'react';
import { Bell, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface ReminderAlertDetail {
  title: string;
  body: string;
  options?: any;
  timestamp: number;
}

interface StudyReminderBannerProps {
  onOpenTasks?: () => void;
}

export const StudyReminderBanner: React.FC<StudyReminderBannerProps> = ({ onOpenTasks }) => {
  const [alert, setAlert] = useState<ReminderAlertDetail | null>(null);

  useEffect(() => {
    const handleNotification = (e: any) => {
      if (e?.detail) {
        setAlert(e.detail);
        try {
          soundEffects.playStudyReminderChime();
        } catch {}
      }
    };

    window.addEventListener('estudahud_notification_alert', handleNotification);
    return () => {
      window.removeEventListener('estudahud_notification_alert', handleNotification);
    };
  }, []);

  if (!alert) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-bounce-in">
      <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-2xl border border-indigo-500/50 flex items-start gap-3 backdrop-blur-lg">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Bell className="w-5 h-5 animate-wiggle" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-xs font-black text-white truncate">{alert.title}</h4>
            <button
              onClick={() => setAlert(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-3">
            {alert.body}
          </p>

          <div className="flex items-center gap-2">
            {onOpenTasks && (
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setAlert(null);
                  onOpenTasks();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <span>Ver Afazeres</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => setAlert(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
