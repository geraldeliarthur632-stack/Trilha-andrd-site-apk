import React, { useState, useEffect } from 'react';
import { UserProfile, StudyTask, TaskPriority, SubjectId, DayOfWeek } from '../../types';
import { SUBJECTS } from '../../data/curriculumData';
import { studyTasksService } from '../../services/studyTasksService';
import { notificationService } from '../../services/notificationService';
import { soundEffects } from '../../services/soundEffects';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Bell,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  Check,
  Edit2,
  BookOpen,
  Flame,
  Volume2,
  X,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { SubjectIcon } from '../SubjectIcon';

interface StudyTasksModeProps {
  user: UserProfile;
  onBack: () => void;
  onEarnPoints?: (points: number) => void;
}

const DAYS_OF_WEEK_LABELS: { id: DayOfWeek; label: string }[] = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

export const StudyTasksMode: React.FC<StudyTasksModeProps> = ({
  user,
  onBack,
  onEarnPoints,
}) => {
  const [tasks, setTasks] = useState<StudyTask[]>(() => studyTasksService.getTasks());
  const [dailyConfig, setDailyConfig] = useState(() => studyTasksService.getDailyConfig());
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationService.getPermissionStatus()
  );
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectId, setFormSubjectId] = useState<string>('matematica');
  const [formDueDate, setFormDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formDueTime, setFormDueTime] = useState<string>('16:00');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formReminderEnabled, setFormReminderEnabled] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // Daily Reminder Form State
  const [dailyTime, setDailyTime] = useState(dailyConfig.time);
  const [dailyDays, setDailyDays] = useState<DayOfWeek[]>(dailyConfig.daysOfWeek);
  const [dailyEnabled, setDailyEnabled] = useState(dailyConfig.enabled);

  useEffect(() => {
    const handleUpdate = () => {
      setTasks(studyTasksService.getTasks());
      setDailyConfig(studyTasksService.getDailyConfig());
    };
    window.addEventListener('estudahud_tasks_updated', handleUpdate);
    window.addEventListener('estudahud_daily_reminder_updated', handleUpdate);
    return () => {
      window.removeEventListener('estudahud_tasks_updated', handleUpdate);
      window.removeEventListener('estudahud_daily_reminder_updated', handleUpdate);
    };
  }, []);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'pending' && task.completed) return false;
    if (activeFilter === 'completed' && !task.completed) return false;
    if (selectedSubjectFilter !== 'all' && task.subjectId !== selectedSubjectFilter) return false;
    return true;
  });

  const handleToggleTask = (task: StudyTask) => {
    soundEffects.playClick();
    const result = studyTasksService.toggleTask(task.id);
    setTasks(studyTasksService.getTasks());

    if (result.earnedXp) {
      try {
        soundEffects.playLevelUp();
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
      onEarnPoints?.(15);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    soundEffects.playClick();
    const foundSubject = SUBJECTS.find((s) => s.id === formSubjectId);
    const subjectName = foundSubject ? foundSubject.name : 'Geral';

    studyTasksService.addTask({
      title: formTitle.trim(),
      subjectId: formSubjectId,
      subjectName,
      dueDate: formDueDate || undefined,
      dueTime: formDueTime || undefined,
      priority: formPriority,
      reminderEnabled: formReminderEnabled,
      notes: formNotes.trim() || undefined,
    });

    setTasks(studyTasksService.getTasks());
    setFormTitle('');
    setFormNotes('');
    setIsAddingTask(false);

    try {
      soundEffects.playStudyReminderChime();
    } catch {}
  };

  const handleDeleteTask = (id: string) => {
    soundEffects.playClick();
    studyTasksService.deleteTask(id);
    setTasks(studyTasksService.getTasks());
  };

  const handleClearCompleted = () => {
    soundEffects.playClick();
    studyTasksService.clearCompleted();
    setTasks(studyTasksService.getTasks());
  };

  const handleSaveDailyReminder = (newEnabled?: boolean, newTime?: string, newDays?: DayOfWeek[]) => {
    soundEffects.playClick();
    const updated = studyTasksService.saveDailyConfig({
      enabled: typeof newEnabled === 'boolean' ? newEnabled : dailyEnabled,
      time: newTime || dailyTime,
      daysOfWeek: newDays || dailyDays,
    });
    setDailyConfig(updated);
    setDailyEnabled(updated.enabled);
    setDailyTime(updated.time);
    setDailyDays(updated.daysOfWeek);
  };

  const handleRequestNotificationPermission = async () => {
    soundEffects.playClick();
    const granted = await notificationService.requestNotificationPermission();
    setNotificationPermission(notificationService.getPermissionStatus());
    if (granted) {
      notificationService.triggerDailyStudyReminder(true);
    }
  };

  const handleTestNotification = () => {
    soundEffects.playClick();
    notificationService.triggerDailyStudyReminder(true);
    setTestNotificationFeedback('Notificação de teste enviada com sucesso! 🔔');
    setTimeout(() => setTestNotificationFeedback(null), 4000);
  };

  const toggleDaySelection = (day: DayOfWeek) => {
    let nextDays: DayOfWeek[];
    if (dailyDays.includes(day)) {
      if (dailyDays.length === 1) return; // keep at least 1 day
      nextDays = dailyDays.filter((d) => d !== day);
    } else {
      nextDays = [...dailyDays, day];
    }
    setDailyDays(nextDays);
    handleSaveDailyReminder(undefined, undefined, nextDays);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">Alta</span>;
      case 'medium':
        return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Média</span>;
      case 'low':
        return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Baixa</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 text-slate-900 max-w-lg mx-auto w-full relative pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-20 shadow-xs">
        <button
          onClick={() => {
            soundEffects.playClick();
            onBack();
          }}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
          title="Voltar ao início"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
            ✓
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">Afazeres & Lembretes</h1>
            <p className="text-[10px] text-slate-500 font-medium">100% manual • Somente você adiciona</p>
          </div>
        </div>

        <button
          onClick={() => {
            soundEffects.playClick();
            setIsAddingTask(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Progress Stats Card */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Metas do Dia
              </span>
              <h2 className="text-base font-black text-slate-900">
                {completedTasks} de {totalTasks} concluídas
              </h2>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-indigo-600">{progressPercent}%</span>
              <span className="text-[10px] text-emerald-600 font-bold block">
                +{completedTasks * 15} XP ganhos
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lembrete Diário de Estudar (Daily Reminder Card) */}
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-white rounded-3xl p-4 border border-indigo-200 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>Lembrete Diário de Estudo</span>
                  {dailyEnabled && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Receba notificação no seu aparelho para nunca esquecer de estudar!
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => {
                const nextState = !dailyEnabled;
                setDailyEnabled(nextState);
                handleSaveDailyReminder(nextState);
              }}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                dailyEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              title={dailyEnabled ? 'Desativar lembrete' : 'Ativar lembrete'}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  dailyEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Config Controls */}
          <div className="space-y-3 pt-2 border-t border-indigo-100/80">
            {/* Time Picker & Quick Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">Horário diário:</span>
                <input
                  type="time"
                  value={dailyTime}
                  onChange={(e) => {
                    setDailyTime(e.target.value);
                    handleSaveDailyReminder(undefined, e.target.value);
                  }}
                  className="bg-white border border-indigo-200 rounded-xl px-2 py-1 text-xs font-black text-indigo-900 shadow-2xs outline-hidden focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* Quick Time Presets */}
              <div className="flex items-center gap-1">
                {['14:00', '18:00', '19:30', '20:30'].map((timePreset) => (
                  <button
                    key={timePreset}
                    onClick={() => {
                      setDailyTime(timePreset);
                      handleSaveDailyReminder(undefined, timePreset);
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                      dailyTime === timePreset
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-indigo-100 hover:bg-indigo-50'
                    }`}
                  >
                    {timePreset}
                  </button>
                ))}
              </div>
            </div>

            {/* Days of Week Selector */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600">Dias:</span>
              <div className="flex items-center gap-1">
                {DAYS_OF_WEEK_LABELS.map(({ id, label }) => {
                  const isSelected = dailyDays.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleDaySelection(id)}
                      className={`w-7 h-7 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600'
                      }`}
                      title={label}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Notification & Permission Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={handleRequestNotificationPermission}
                  className="text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Permitir Notificações no Aparelho</span>
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Notificações Ativas
                </span>
              )}

              <button
                onClick={handleTestNotification}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                title="Dispara alarme sonoro e notificação de teste"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Testar Notificação Agora</span>
              </button>
            </div>

            {testNotificationFeedback && (
              <div className="p-2 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-xl flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>{testNotificationFeedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal / Add Task Form */}
        {isAddingTask && (
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-3xl p-4 border border-indigo-300 shadow-md space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Adicionar Novo Afazer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Title */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                O que você precisa fazer? *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Fazer exercícios da página 42..."
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-hidden"
              />
            </div>

            {/* Subject Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Matéria escolar
              </label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-hidden"
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date, Time & Priority Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Data de entrega
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-2xl px-3 py-1.5 text-xs text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Horário do Lembrete
                </label>
                <input
                  type="time"
                  value={formDueTime}
                  onChange={(e) => setFormDueTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-2xl px-3 py-1.5 text-xs text-slate-900 outline-hidden"
                />
              </div>
            </div>

            {/* Priority and Reminder Checkbox */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Prioridade
                </label>
                <div className="flex items-center gap-1">
                  {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormPriority(p)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-xl transition cursor-pointer ${
                        formPriority === p
                          ? p === 'high'
                            ? 'bg-rose-600 text-white'
                            : p === 'medium'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={formReminderEnabled}
                  onChange={(e) => setFormReminderEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Mandar Notificação</span>
              </label>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Observações / Dicas (opcional)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Não esquecer de conferir o gabarito..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-2xl px-3 py-1.5 text-xs text-slate-900 outline-hidden"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
              >
                Salvar Afazer
              </button>
            </div>
          </form>
        )}

        {/* Filter Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => {
                soundEffects.playClick();
                setActiveFilter('all');
              }}
              className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({totalTasks})
            </button>
            <button
              onClick={() => {
                soundEffects.playClick();
                setActiveFilter('pending');
              }}
              className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                activeFilter === 'pending'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pendentes ({pendingTasks})
            </button>
            <button
              onClick={() => {
                soundEffects.playClick();
                setActiveFilter('completed');
              }}
              className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Feitas ({completedTasks})
            </button>
          </div>

          {completedTasks > 0 && (
            <button
              onClick={handleClearCompleted}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer p-1 flex items-center gap-1"
              title="Remover tarefas concluídas"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar Feitas</span>
            </button>
          )}
        </div>

        {/* Tasks List */}
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-xl">
                {activeFilter === 'completed' ? '🎉' : '📝'}
              </div>
              <h3 className="text-sm font-black text-slate-800">
                {activeFilter === 'completed'
                  ? 'Nenhuma tarefa concluída ainda'
                  : 'Nenhum afazer cadastrado'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {activeFilter === 'completed'
                  ? 'Marque suas tarefas como feitas conforme for estudando para ganhar pontos e XP!'
                  : 'Sua lista está limpa! O aplicativo não adiciona nada automático — somente você pode colocar seus afazeres e planejar seus estudos.'}
              </p>
              {activeFilter !== 'completed' && (
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Meu Afazer</span>
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => {
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl p-3.5 border transition-all duration-200 shadow-2xs flex items-start gap-3 group ${
                    task.completed
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {/* Complete Checkbox */}
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="mt-0.5 text-slate-300 hover:text-emerald-600 transition cursor-pointer shrink-0"
                    title={task.completed ? 'Marcar como não feita' : 'Marcar como concluída'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100 animate-scaleIn" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <SubjectIcon subjectId={task.subjectId} className="w-3 h-3" />
                        <span>{task.subjectName}</span>
                      </span>

                      {getPriorityBadge(task.priority)}

                      {task.reminderEnabled && task.dueTime && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bell className="w-2.5 h-2.5" />
                          <span>{task.dueTime}</span>
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-xs font-black transition-all leading-snug ${
                        task.completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {task.notes}
                      </p>
                    )}

                    {task.dueDate && (
                      <span className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>Para {task.dueDate.split('-').reverse().join('/')}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                    title="Excluir afazer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
