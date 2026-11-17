import { Award, Check, Lock, Music, Palette, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import {
  CARTOON_IMAGES,
  COLLECTIBLE_BADGES,
  HOUR_SECONDS,
  POINTS_PER_HOUR,
  STUDIO_THEMES,
  formatDurationClock,
} from '../constants';
import type { AmbientSound, StudyTask, ThemeId, UserProfile } from '../types';
import { audioEngine } from '../utils/audio';
import { CartoonImg } from './CartoonImg';
import { WeeklyTrendsChart } from './WeeklyTrendsChart';

interface TimerRewardsViewProps {
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
  onSetTimerPreset: (minutes: number | 'stopwatch') => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onSetAmbient: (sound: AmbientSound) => void;
  onToggleMute: () => void;
  onSelectOrUnlockTheme: (themeId: ThemeId) => void;
  onUnlockBadge: (badgeId: string) => void;
}

export function TimerRewardsView({
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
  onSetTimerPreset,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onSetAmbient,
  onToggleMute,
  onSelectOrUnlockTheme,
  onUnlockBadge,
}: TimerRewardsViewProps) {
  const activeTasks = tasks.filter((t) => !t.completed);
  const displaySeconds = timerMode === 'stopwatch' ? stopwatchElapsedSeconds : timerRemainingSeconds;
  const hourPct = Math.min(100, Math.round((profile.hourProgressSeconds / HOUR_SECONDS) * 100));
  const minsDone = Math.floor(profile.hourProgressSeconds / 60);

  return (
    <div className="space-y-8">
      {/* Top Focus Cockpit */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Large Focus Clock */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[var(--ink-faint)]">1 Hour Focus = +{POINTS_PER_HOUR} Points</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)] mt-1">Deep Focus Studio</h1>
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {muted ? 'Muted' : 'Sound On'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1 bg-[var(--surface-subtle)] rounded-xl">
            {[
              { label: '25 min Pomodoro', value: 25 as const },
              { label: '45 min Block', value: 45 as const },
              { label: '60 min (+5 pts)', value: 60 as const },
              { label: '90 min Deep', value: 90 as const },
              { label: 'Open Stopwatch', value: 'stopwatch' as const },
            ].map((preset) => {
              const selected =
                preset.value === 'stopwatch'
                  ? timerMode === 'stopwatch'
                  : timerMode === 'countdown' && timerDurationSeconds === preset.value * 60;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSetTimerPreset(preset.value)}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    selected
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="py-6 text-center space-y-4">
            <div className="text-6xl sm:text-7xl font-bold font-mono tabular-nums tracking-tight text-[var(--ink)]">
              {formatDurationClock(displaySeconds)}
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                <span>Hourly Reward Progress</span>
                <span className="font-mono tabular-nums font-semibold text-[var(--accent)]">
                  {minsDone} / 60 min (+{POINTS_PER_HOUR} pts)
                </span>
              </div>
              <div className="h-3 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${hourPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={activeTaskId ?? ''}
              onChange={(e) => onSelectActiveTask(e.target.value || null)}
              aria-label="Task to study"
              className="flex-1 min-h-[46px] px-3.5 py-2 text-sm bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Open Focus Session (no linked task)</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.subject})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 shrink-0">
              {timerStatus === 'running' ? (
                <button
                  type="button"
                  onClick={onPauseTimer}
                  className="min-h-[46px] px-6 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--ink)] hover:opacity-90 rounded-xl cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartTimer}
                  className="min-h-[46px] px-6 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {timerStatus === 'paused' ? 'Resume' : 'Start Focus'}
                </button>
              )}
              <button
                type="button"
                onClick={onResetTimer}
                aria-label="Reset timer"
                className="min-h-[46px] min-w-[46px] flex items-center justify-center rounded-xl border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-[var(--ink-muted)]">Ambient Studio Audio</span>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-lg">
                {(
                  [
                    { id: 'off', label: 'Silence' },
                    { id: 'rain', label: 'Soft Rain' },
                    { id: 'brown', label: 'Brown Noise' },
                    { id: 'chord', label: 'Warm Pad' },
                    { id: 'musicbox', label: 'Music Box' },
                  ] as const
                ).map((snd) => (
                  <button
                    key={snd.id}
                    type="button"
                    onClick={() => onSetAmbient(snd.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium text-[var(--ink-muted)] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[var(--accent)]" />
                Sound Effects
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => audioEngine.playPop()}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--accent-soft)] text-[var(--ink)] transition-colors cursor-pointer"
                >
                  Pop
                </button>
                <button
                  type="button"
                  onClick={() => audioEngine.playTaskComplete()}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--accent-soft)] text-[var(--ink)] transition-colors cursor-pointer"
                >
                  Task Chime
                </button>
                <button
                  type="button"
                  onClick={() => audioEngine.playTimerStart()}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--accent-soft)] text-[var(--ink)] transition-colors cursor-pointer"
                >
                  Start Bell
                </button>
                <button
                  type="button"
                  onClick={() => audioEngine.playHourRewardFanfare()}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--accent-soft)] text-[var(--ink)] transition-colors cursor-pointer"
                >
                  +5 Pt Fanfare
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Points Balance & Recent Ledger */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <CartoonImg
                  src={CARTOON_IMAGES.trophyOwl}
                  alt="Cute graduation owl holding a golden reward star"
                  className="w-16 h-16"
                />
                <div>
                  <p className="text-xs text-[var(--ink-faint)]">Available Balance</p>
                  <p className="text-4xl font-bold font-mono tabular-nums text-[var(--accent)] mt-0.5">
                    {profile.points} <span className="text-base font-sans text-[var(--ink-muted)]">pts</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--ink-faint)]">Total Logged</p>
                <p className="text-xl font-bold font-mono tabular-nums text-[var(--ink)] mt-1">
                  {Math.floor(profile.totalFocusSeconds / 60)} min
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--ink-muted)] leading-relaxed">
              Every <span className="font-semibold text-[var(--ink)]">60 minutes</span> of active focus automatically grants{' '}
              <span className="font-semibold text-[var(--accent)]">+5 points</span>. Unlock pretty pastel themes and scholar desk badges below.
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <h2 className="text-sm font-bold text-[var(--ink)]">Points Ledger</h2>
            {profile.pointHistory.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-6 text-center border border-dashed border-[var(--border)] rounded-xl">
                Complete your first 60 minutes of study to earn +5 points.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)] max-h-56 overflow-y-auto pr-1">
                {profile.pointHistory.slice(0, 12).map((evt) => (
                  <li key={evt.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{evt.reason}</p>
                      <p className="text-[11px] text-[var(--ink-faint)]">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        evt.amount >= 0 ? 'text-[var(--success)]' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      {evt.amount >= 0 ? `+${evt.amount}` : evt.amount} pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* D3 Weekly Productivity Trends Chart */}
      <WeeklyTrendsChart profile={profile} />

      {/* Reward Shop: Studio Themes & Desk Badges */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vibrant Studio Themes */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
                <Palette className="w-5 h-5 text-[var(--accent)]" />
                Studio Color Themes
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Spend study points to unlock new studio palettes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STUDIO_THEMES.map((theme) => {
              const unlocked = theme.cost === 0 || profile.unlockedThemes.includes(theme.id);
              const active = profile.themeId === theme.id;
              const canAfford = profile.points >= theme.cost;

              return (
                <div
                  key={theme.id}
                  className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-4 ${
                    active ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30' : 'border-[var(--border)] bg-[var(--canvas)]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: theme.swatchPrimary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: theme.swatchSecondary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: theme.swatchCanvas }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[var(--ink-muted)]">
                        {unlocked ? 'Owned' : `${theme.cost} pts`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--ink)]">{theme.name}</h3>
                    <p className="text-xs text-[var(--ink-muted)] leading-relaxed">{theme.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onSelectOrUnlockTheme(theme.id)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      active
                        ? 'bg-[var(--ink)] text-white'
                        : unlocked
                        ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] hover:border-[var(--accent)]'
                        : canAfford
                        ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                        : 'bg-[var(--surface-subtle)] text-[var(--ink-faint)]'
                    }`}
                  >
                    {active ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Active Theme
                      </>
                    ) : unlocked ? (
                      'Equip Theme'
                    ) : canAfford ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Unlock ({theme.cost} pts)
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Need {theme.cost} pts
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desk Scholar Badges */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--accent)]" />
              Scholar Desk Badges
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Collect commemorative stamps as your focus hours stack up.
            </p>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {COLLECTIBLE_BADGES.map((badge) => {
              const owned = profile.unlockedBadges.includes(badge.id);
              const canAfford = profile.points >= badge.cost;

              return (
                <div key={badge.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--ink)]">{badge.name}</h3>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">{badge.description}</p>
                  </div>

                  {owned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--success)] whitespace-nowrap shrink-0">
                      <Check className="w-4 h-4" />
                      Collected
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onUnlockBadge(badge.id)}
                      className={`min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        canAfford
                          ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                          : 'bg-[var(--surface-subtle)] text-[var(--ink-faint)]'
                      }`}
                    >
                      Claim · {badge.cost} pts
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
