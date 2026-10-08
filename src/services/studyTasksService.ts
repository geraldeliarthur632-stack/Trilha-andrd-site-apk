import { StudyTask, DailyStudyReminderConfig, DayOfWeek } from '../types';

const TASKS_STORAGE_KEY = 'estudahud_study_tasks_v1';
const DAILY_REMINDER_CONFIG_KEY = 'estudahud_daily_study_reminder_config_v1';

export const DEFAULT_DAILY_REMINDER_CONFIG: DailyStudyReminderConfig = {
  enabled: false, // Default is disabled so the app does not trigger anything automatically
  time: '19:00', // 19:00 reminder when enabled by the user
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // Every day
  customMessage: 'Hora de estudar! Mantenha sua rotina ativa e conquiste mais XP na Trilha do Saber 🚀',
  soundAlert: true,
  voiceAlert: false,
};

// Legacy sample task titles to purge if previously saved in localStorage
const LEGACY_SAMPLE_TITLES = new Set([
  'Revisar conteúdo de Matemática no Caderno',
  'Resolver 5 exercícios na Jornada BNCC',
  'Ler o resumo semanal de Ciências',
]);

class StudyTasksService {
  private tasks: StudyTask[] = [];
  private dailyConfig: DailyStudyReminderConfig = { ...DEFAULT_DAILY_REMINDER_CONFIG };

  constructor() {
    this.loadTasks();
    this.loadDailyConfig();
  }

  public loadTasks(): StudyTask[] {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(TASKS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filter out any legacy automatic sample tasks: only user-created tasks remain
            const userOnlyTasks = parsed.filter(
              (t: StudyTask) => t && t.title && !LEGACY_SAMPLE_TITLES.has(t.title)
            );
            if (userOnlyTasks.length !== parsed.length) {
              this.saveTasks(userOnlyTasks);
            } else {
              this.tasks = userOnlyTasks;
            }
            return this.tasks;
          }
        }
      }
    } catch {}

    // App never creates any task automatically - starts completely empty
    this.tasks = [];
    return this.tasks;
  }

  public saveTasks(tasks: StudyTask[]): void {
    this.tasks = tasks;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        window.dispatchEvent(new CustomEvent('estudahud_tasks_updated', { detail: { tasks } }));
      }
    } catch {}
  }

  public getTasks(): StudyTask[] {
    return [...this.tasks].sort((a, b) => {
      // Pending first, then by priority (high > medium > low), then by createdAt
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (diff !== 0) return diff;
      return b.createdAt - a.createdAt;
    });
  }

  public addTask(data: Omit<StudyTask, 'id' | 'createdAt' | 'completed'>): StudyTask {
    const newTask: StudyTask = {
      ...data,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completed: false,
      createdAt: Date.now(),
    };
    const updated = [newTask, ...this.tasks];
    this.saveTasks(updated);
    return newTask;
  }

  public toggleTask(id: string): { task: StudyTask | null; earnedXp: boolean } {
    let earnedXp = false;
    let foundTask: StudyTask | null = null;

    const updated = this.tasks.map((task) => {
      if (task.id === id) {
        const nextCompleted = !task.completed;
        if (nextCompleted) {
          earnedXp = true;
        }
        foundTask = {
          ...task,
          completed: nextCompleted,
          completedAt: nextCompleted ? Date.now() : undefined,
        };
        return foundTask;
      }
      return task;
    });

    this.saveTasks(updated);
    return { task: foundTask, earnedXp };
  }

  public updateTask(updatedTask: StudyTask): void {
    const updated = this.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    this.saveTasks(updated);
  }

  public deleteTask(id: string): void {
    const updated = this.tasks.filter((t) => t.id !== id);
    this.saveTasks(updated);
  }

  public clearCompleted(): void {
    const updated = this.tasks.filter((t) => !t.completed);
    this.saveTasks(updated);
  }

  // Daily Reminder Config
  public loadDailyConfig(): DailyStudyReminderConfig {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(DAILY_REMINDER_CONFIG_KEY);
        if (saved) {
          this.dailyConfig = { ...DEFAULT_DAILY_REMINDER_CONFIG, ...JSON.parse(saved) };
          return this.dailyConfig;
        }
      }
    } catch {}
    this.dailyConfig = { ...DEFAULT_DAILY_REMINDER_CONFIG };
    return this.dailyConfig;
  }

  public saveDailyConfig(partial: Partial<DailyStudyReminderConfig>): DailyStudyReminderConfig {
    this.dailyConfig = { ...this.dailyConfig, ...partial };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DAILY_REMINDER_CONFIG_KEY, JSON.stringify(this.dailyConfig));
        window.dispatchEvent(
          new CustomEvent('estudahud_daily_reminder_updated', {
            detail: { config: this.dailyConfig },
          })
        );
      }
    } catch {}
    return this.dailyConfig;
  }

  public getDailyConfig(): DailyStudyReminderConfig {
    return { ...this.dailyConfig };
  }

  public hasDailyReminderTriggeredToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyConfig.lastTriggeredDate === today;
  }

  public markDailyReminderTriggeredToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.saveDailyConfig({ lastTriggeredDate: today });
  }
}

export const studyTasksService = new StudyTasksService();
