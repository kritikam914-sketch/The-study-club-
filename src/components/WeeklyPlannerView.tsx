import { useState, type DragEvent, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Play, Plus, Share2, Trash2 } from 'lucide-react';
import {
  CARTOON_IMAGES,
  DAYS_OF_WEEK,
  DAY_PALETTES,
  POINTS_PER_HOUR,
  SUBJECT_ACCENTS,
  SUBJECT_OPTIONS,
  getTodayDayKey,
} from '../constants';
import type { DayKey, StudyTask, TaskPriority } from '../types';
import { CartoonImg } from './CartoonImg';

interface WeeklyPlannerViewProps {
  tasks: StudyTask[];
  onAddTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'completed'>) => void;
  onToggleTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newDay: DayKey) => void;
  onDeleteTask: (taskId: string) => void;
  onFocusTask: (taskId: string) => void;
  onOpenShareModal: () => void;
}

export function WeeklyPlannerView({
  tasks,
  onAddTask,
  onToggleTask,
  onMoveTask,
  onDeleteTask,
  onFocusTask,
  onOpenShareModal,
}: WeeklyPlannerViewProps) {
  const todayKey = getTodayDayKey();
  const [addingDay, setAddingDay] = useState<DayKey | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubject, setDraftSubject] = useState(SUBJECT_OPTIONS[0]);
  const [draftMinutes, setDraftMinutes] = useState(60);
  const [draftPriority, setDraftPriority] = useState<TaskPriority>('medium');
  const [dragOverDay, setDragOverDay] = useState<DayKey | null>(null);

  const allColumns: Array<{ key: DayKey; label: string; short: string }> = [
    ...DAYS_OF_WEEK,
    { key: 'backlog', label: 'Anytime Backlog', short: 'Backlog' },
  ];

  const weeklyTasks = tasks.filter((t) => t.day !== 'backlog');
  const totalWeeklyTasks = weeklyTasks.length;
  const completedWeeklyTasks = weeklyTasks.filter((t) => t.completed).length;
  const plannedMinutes = weeklyTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const plannedHours = Math.round((plannedMinutes / 60) * 10) / 10;
  const potentialPoints = Math.floor(plannedMinutes / 60) * POINTS_PER_HOUR;

  const handleQuickAdd = (e: FormEvent, day: DayKey) => {
    e.preventDefault();
    const trimmed = draftTitle.trim();
    if (!trimmed) return;
    onAddTask({
      title: trimmed,
      subject: draftSubject,
      day,
      estimatedMinutes: draftMinutes,
      priority: draftPriority,
    });
    setDraftTitle('');
    setAddingDay(null);
  };

  const handleDragStart = (e: DragEvent<HTMLElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLElement>, targetDay: DayKey) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveTask(taskId, targetDay);
    }
    setDragOverDay(null);
  };

  const stepDay = (current: DayKey, delta: -1 | 1): DayKey | null => {
    const order = allColumns.map((c) => c.key);
    const idx = order.indexOf(current);
    if (idx === -1) return null;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= order.length) return null;
    return order[nextIdx];
  };

  return (
    <div className="space-y-6">
      {/* Header & Weekly Metrics Strip */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <CartoonImg
            src={CARTOON_IMAGES.plannerBunny}
            alt="Cheerful bunny holding a weekly notebook and highlighter"
            className="w-16 h-16"
          />
          <div>
            <p className="text-xs font-medium text-[var(--ink-faint)]">Monday through Sunday Schedule</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
              Weekly Study Planner
            </h1>
            <p className="text-sm text-[var(--ink-muted)] mt-0.5">
              Drag tasks across days or step them left and right to balance your study load.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Weekly Progress</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[var(--ink)]">
              {completedWeeklyTasks}/{totalWeeklyTasks}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Planned Focus</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[var(--ink)]">{plannedHours} hrs</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Point Potential</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[var(--accent)]">+{potentialPoints} pts</p>
          </div>
          <button
            type="button"
            onClick={onOpenShareModal}
            className="min-h-[42px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-white bg-[var(--ink)] hover:opacity-90 rounded-xl transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Share Week Plan
          </button>
        </div>
      </section>

      {/* 7-Day Grid + Backlog */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {allColumns.map((col) => {
          const dayTasks = tasks
            .filter((t) => t.day === col.key)
            .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt);
          const dayMinutes = dayTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
          const isToday = col.key === todayKey;
          const isDragTarget = dragOverDay === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverDay !== col.key) setDragOverDay(col.key);
              }}
              onDragLeave={() => {
                if (dragOverDay === col.key) setDragOverDay(null);
              }}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`flex flex-col bg-[var(--surface)] border rounded-2xl p-4 min-h-[280px] transition-colors ${
                isDragTarget
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40'
                  : isToday
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--border)]'
              }`}
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between gap-2 p-3 -mx-1 -mt-1 mb-3 rounded-xl border border-[var(--border)]"
                style={{ backgroundColor: DAY_PALETTES[col.key].headerBg }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--ink)]">{col.label}</h2>
                    {isToday && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: DAY_PALETTES[col.key].accent }}
                      >
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'} · {dayMinutes}m planned
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAddingDay(addingDay === col.key ? null : col.key);
                    setDraftTitle('');
                  }}
                  aria-label={`Add task to ${col.label}`}
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Quick Add */}
              {addingDay === col.key && (
                <form onSubmit={(e) => handleQuickAdd(e, col.key)} className="mb-3 pb-3 border-b border-[var(--border)] space-y-2">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder={`Task for ${col.short}...`}
                    autoFocus
                    maxLength={120}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <select
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      className="min-h-[34px] px-2 text-xs bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)]"
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draftMinutes}
                      onChange={(e) => setDraftMinutes(Number(e.target.value))}
                      className="min-h-[34px] px-2 text-xs bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)]"
                    >
                      <option value={25}>25m</option>
                      <option value={45}>45m</option>
                      <option value={60}>60m</option>
                      <option value={90}>90m</option>
                    </select>
                    <select
                      value={draftPriority}
                      onChange={(e) => setDraftPriority(e.target.value as TaskPriority)}
                      className="min-h-[34px] px-2 text-xs bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)]"
                    >
                      <option value="high">High</option>
                      <option value="medium">Med</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[34px] px-3 py-1 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingDay(null)}
                      className="min-h-[34px] px-3 py-1 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Task Items */}
              <div className="flex-1 space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-[var(--ink-faint)] py-8 text-center">
                    Drop a task here or click + to plan {col.short}.
                  </p>
                ) : (
                  dayTasks.map((task) => {
                    const prevDay = stepDay(col.key, -1);
                    const nextDay = stepDay(col.key, 1);
                    const subjectColor = SUBJECT_ACCENTS[task.subject] || '#475569';

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="group p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => onToggleTask(task.id)}
                            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                              task.completed
                                ? 'bg-[var(--success)] border-[var(--success)] text-white'
                                : 'bg-[var(--surface)] border-[var(--border-strong)] hover:border-[var(--accent)]'
                            }`}
                          >
                            {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-semibold leading-snug ${
                                task.completed ? 'line-through text-[var(--ink-faint)]' : 'text-[var(--ink)]'
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[var(--ink-faint)]">
                              <span style={{ color: subjectColor }} className="font-medium">
                                {task.subject}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center gap-1">
                            {prevDay && (
                              <button
                                type="button"
                                onClick={() => onMoveTask(task.id, prevDay)}
                                title={`Move to ${prevDay}`}
                                aria-label={`Move "${task.title}" to previous day`}
                                className="p-1 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {nextDay && (
                              <button
                                type="button"
                                onClick={() => onMoveTask(task.id, nextDay)}
                                title={`Move to ${nextDay}`}
                                aria-label={`Move "${task.title}" to next day`}
                                className="p-1 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {!task.completed && (
                              <button
                                type="button"
                                onClick={() => onFocusTask(task.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Focus
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              aria-label={`Delete "${task.title}"`}
                              className="p-1 rounded text-[var(--ink-faint)] hover:text-[var(--danger)] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
