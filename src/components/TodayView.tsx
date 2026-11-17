import { useState, type FormEvent } from 'react';
import {
  Check,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
  ArrowRight,
  Award,
} from 'lucide-react';
import {
  CARTOON_IMAGES,
  DAYS_OF_WEEK,
  HOUR_SECONDS,
  POINTS_PER_HOUR,
  SUBJECT_ACCENTS,
  SUBJECT_OPTIONS,
  formatDurationClock,
  getTodayDayKey,
} from '../constants';
import type { AmbientSound, DayKey, StudyTask, TaskPriority, UserProfile } from '../types';
import { AvatarImg } from './AvatarImg';
import { CartoonImg } from './CartoonImg';

interface TodayViewProps {
  profile: UserProfile;
  tasks: StudyTask[];
  activeTaskId: string | null;
  timerMode: 'countdown' | 'stopwatch';
  timerStatus: 'idle' | 'running' | 'paused';
  timerDurationSeconds: number;
  timerRemainingSeconds: number;
  stopwatchElapsedSeconds: number;
  ambientSound: AmbientSound;
  muted: boolean;
  onSelectActiveTask: (taskId: string | null) => void;
  onAddTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'completed'>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSetTimerPreset: (minutes: number | 'stopwatch') => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onSetAmbient: (sound: AmbientSound) => void;
  onToggleMute: () => void;
  onOpenProfileModal: () => void;
  onNavigate: (tab: 'today' | 'week' | 'focus' | 'room') => void;
}

export function TodayView({
  profile,
  tasks,
  activeTaskId,
  timerMode,
  timerStatus,
  timerDurationSeconds,
  timerRemainingSeconds,
  stopwatchElapsedSeconds,
  ambientSound,
  muted,
  onSelectActiveTask,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onSetTimerPreset,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onSetAmbient,
  onToggleMute,
  onOpenProfileModal,
  onNavigate,
}: TodayViewProps) {
  const todayKey = getTodayDayKey();
  const todayInfo = DAYS_OF_WEEK.find((d) => d.key === todayKey) ?? DAYS_OF_WEEK[0];

  const [scope, setScope] = useState<'today' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done'>('all');

  // New task form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [day, setDay] = useState<DayKey>(todayKey);
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTask({
      title: trimmed,
      subject,
      day,
      estimatedMinutes,
      priority,
    });
    setTitle('');
  };

  const scopedTasks = scope === 'today' ? tasks.filter((t) => t.day === todayKey) : tasks;
  const visibleTasks = scopedTasks
    .filter((t) => {
      if (statusFilter === 'active') return !t.completed;
      if (statusFilter === 'done') return t.completed;
      return true;
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt);

  const todayTotal = tasks.filter((t) => t.day === todayKey).length;
  const todayDone = tasks.filter((t) => t.day === todayKey && t.completed).length;

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;
  const displaySeconds = timerMode === 'stopwatch' ? stopwatchElapsedSeconds : timerRemainingSeconds;
  const hourPct = Math.min(100, Math.round((profile.hourProgressSeconds / HOUR_SECONDS) * 100));
  const minsTowardHour = Math.floor(profile.hourProgressSeconds / 60);
  const secsRemainingInHour = HOUR_SECONDS - profile.hourProgressSeconds;

  const ringRadius = 68;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (hourPct / 100) * ringCircumference;

  return (
    <div className="space-y-8">
      {/* Studio Scholar Overview Strip */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl"
            title="Edit scholar profile & avatar"
          >
            <AvatarImg avatarId={profile.avatarId} alt={profile.name} className="w-14 h-14 transition-transform duration-150 group-hover:scale-105" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-faint)]">
              <span>{todayInfo.label}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="hover:text-[var(--ink)] underline decoration-[var(--border-strong)] underline-offset-2 transition-colors"
              >
                Edit scholar profile
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              Welcome back, {profile.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="px-4 py-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)]">
            <p className="text-xs text-[var(--ink-muted)]">Reward Points</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent)]">
              {profile.points} <span className="text-xs font-sans font-medium text-[var(--ink-muted)]">pts</span>
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-[var(--secondary-soft)] border border-[var(--border)]">
            <p className="text-xs text-[var(--ink-muted)]">1-Hr Milestones</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--secondary)]">
              {profile.completedHours} <span className="text-xs font-sans font-medium text-[var(--ink-muted)]">hrs</span>
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-[var(--success-soft)] border border-[var(--border)]">
            <p className="text-xs text-[var(--ink-muted)]">Today&apos;s Tasks</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--success)]">
              {todayDone}/{todayTotal}
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: To-Do List & Quick Planner */}
        <section className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                {scope === 'today' ? `${todayInfo.label} To-Do List` : 'All Weekly Tasks'}
              </h2>
              <p className="text-sm text-[var(--ink-muted)] mt-0.5">
                Plan your tasks, check them off, or load any item straight into the timer.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-lg">
                <button
                  type="button"
                  onClick={() => setScope('today')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    scope === 'today'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    scope === 'all'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  Whole Week
                </button>
              </div>
            </div>
          </div>

          {/* Quick Add Task Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pb-5 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a study task (e.g. Linear Algebra problem set)..."
                aria-label="Task title"
                maxLength={120}
                className="flex-1 min-h-[42px] px-3.5 py-2 text-sm bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Subject"
                className="min-h-[36px] px-2.5 py-1.5 bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={day}
                onChange={(e) => setDay(e.target.value as DayKey)}
                aria-label="Planned day"
                className="min-h-[36px] px-2.5 py-1.5 bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
                <option value="backlog">Anytime Backlog</option>
              </select>

              <select
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                aria-label="Estimated duration"
                className="min-h-[36px] px-2.5 py-1.5 bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value={25}>25 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min (1 hr)</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min (2 hrs)</option>
              </select>

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                aria-label="Priority"
                className="min-h-[36px] px-2.5 py-1.5 bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>
          </form>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-lg">
              {(['all', 'active', 'done'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === f
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('week')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
            >
              Plan full week
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Task Rows */}
          {visibleTasks.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-medium text-[var(--ink)]">
                {scope === 'today' ? `No tasks scheduled for ${todayInfo.label} yet.` : 'No tasks match this filter.'}
              </p>
              <p className="text-xs text-[var(--ink-faint)] max-w-sm mx-auto">
                Add a study task above or organize your full Monday–Sunday schedule in the Weekly Planner.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {visibleTasks.map((task) => {
                const isFocused = activeTaskId === task.id;
                const subjectColor = SUBJECT_ACCENTS[task.subject] || '#475569';
                const dayLabel =
                  task.day === 'backlog'
                    ? 'Backlog'
                    : DAYS_OF_WEEK.find((d) => d.key === task.day)?.short ?? task.day;

                return (
                  <li
                    key={task.id}
                    className={`py-3.5 flex items-start justify-between gap-3 transition-colors ${
                      isFocused ? 'bg-[var(--accent-soft)]/50 -mx-3 px-3 rounded-xl' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Complete "${task.title}"`}
                        className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          task.completed
                            ? 'bg-[var(--success)] border-[var(--success)] text-white'
                            : 'bg-[var(--surface)] border-[var(--border-strong)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            task.completed ? 'line-through text-[var(--ink-faint)]' : 'text-[var(--ink)]'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--ink-faint)]">
                          <span className="font-medium" style={{ color: subjectColor }}>
                            {task.subject}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                          <span aria-hidden="true">·</span>
                          <span>{dayLabel}</span>
                          {task.priority === 'high' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[var(--accent-ink)]">High priority</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!task.completed && (
                        <button
                          type="button"
                          onClick={() => onSelectActiveTask(isFocused ? null : task.id)}
                          className={`min-h-[34px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isFocused
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--surface-subtle)] text-[var(--ink)] hover:bg-[var(--border)]'
                          }`}
                        >
                          {isFocused ? 'Focusing' : 'Focus'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete "${task.title}"`}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right: Study Timer & +5 Points Hourly Reward Ring */}
        <section className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CartoonImg
                src={CARTOON_IMAGES.timerKitty}
                alt="Cozy calico kitty beside a study clock"
                className="w-12 h-12"
              />
              <div>
                <h2 className="text-xl font-bold text-[var(--ink)]">Study Timer</h2>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Every 1 hr completed awards +{POINTS_PER_HOUR} reward points
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute studio audio' : 'Mute studio audio'}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Preset Mode Selector */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[var(--surface-subtle)] rounded-xl">
            {[
              { label: '25m', value: 25 as const },
              { label: '45m', value: 45 as const },
              { label: '60m (+5)', value: 60 as const },
              { label: 'Stopwatch', value: 'stopwatch' as const },
            ].map((preset) => {
              const isSelected =
                preset.value === 'stopwatch'
                  ? timerMode === 'stopwatch'
                  : timerMode === 'countdown' && timerDurationSeconds === preset.value * 60;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSetTimerPreset(preset.value)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Circular Hourly Progress Ring & Clock */}
          <div className="flex flex-col items-center py-2">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={ringRadius}
                  fill="none"
                  stroke="var(--surface-subtle)"
                  strokeWidth="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={ringRadius}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold font-mono tabular-nums tracking-tight text-[var(--ink)]">
                  {formatDurationClock(displaySeconds)}
                </span>
                <span className="text-xs text-[var(--ink-faint)] mt-1 font-mono tabular-nums">
                  {minsTowardHour}/60m to +5 pts
                </span>
              </div>
            </div>

            {activeTask ? (
              <p className="mt-3 text-xs text-[var(--ink-muted)] text-center max-w-xs truncate">
                Focusing on: <span className="font-semibold text-[var(--ink)]">{activeTask.title}</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-[var(--ink-faint)] text-center">
                Select &ldquo;Focus&rdquo; on any task to link it to this session.
              </p>
            )}
          </div>

          {/* Primary Timer Controls */}
          <div className="flex items-center gap-3">
            {timerStatus === 'running' ? (
              <button
                type="button"
                onClick={onPauseTimer}
                className="flex-1 min-h-[46px] px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--ink)] hover:opacity-90 rounded-xl transition-opacity cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartTimer}
                className="flex-1 min-h-[46px] px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {timerStatus === 'paused' ? 'Resume Study' : 'Start Study'}
              </button>
            )}

            <button
              type="button"
              onClick={onResetTimer}
              aria-label="Reset timer"
              className="min-h-[46px] min-w-[46px] flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Hourly Reward Progress & Ambient Audio */}
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--ink)] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Next +5 Points Milestone
                </span>
                <span className="font-mono tabular-nums text-[var(--ink-muted)]">
                  {formatDurationClock(secsRemainingInHour)} left
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${hourPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--ink-muted)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Focus Sound
              </span>
              <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-lg overflow-x-auto">
                {(
                  [
                    { id: 'off', label: 'Off' },
                    { id: 'rain', label: 'Rain' },
                    { id: 'brown', label: 'Brown' },
                    { id: 'chord', label: 'Pad' },
                    { id: 'musicbox', label: 'Music Box' },
                  ] as const
                ).map((snd) => (
                  <button
                    key={snd.id}
                    type="button"
                    onClick={() => onSetAmbient(snd.id)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      ambientSound === snd.id
                        ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {snd.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => onNavigate('focus')}
                className="text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
              >
                Open Rewards Shop
              </button>
              <button
                type="button"
                onClick={() => onNavigate('room')}
                className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                Study with up to 5 friends
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
