import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Coffee,
  Copy,
  Crown,
  Hand,
  LogOut,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  CARTOON_IMAGES,
  CHEER_OPTIONS,
  MAX_ROOM_MEMBERS,
  POINTS_PER_HOUR,
  formatDurationClock,
} from '../constants';
import type {
  CheerEventPayload,
  CheerType,
  RoomSummary,
  StudyRoomState,
  UserProfile,
} from '../types';
import { AvatarImg } from './AvatarImg';
import { CartoonImg } from './CartoonImg';

interface StudyRoomViewProps {
  profile: UserProfile;
  activeTaskTitle: string;
  wsConnected: boolean;
  room: StudyRoomState | null;
  roomError: string | null;
  activeCheers: CheerEventPayload[];
  availableRooms: RoomSummary[];
  onRefreshRooms: () => void;
  onCreateRoom: (
    name: string,
    squadGoalMinutes: number,
    competitionMode: 'friendly' | 'competitive',
    raceTargetPoints: number
  ) => void;
  onJoinRoom: (roomCode: string) => void;
  onLeaveRoom: () => void;
  onCoopAction: (
    action: 'start' | 'pause' | 'reset' | 'set_mode' | 'set_duration',
    payload?: { mode?: 'coop' | 'solo'; durationSeconds?: number }
  ) => void;
  onSetCompetition: (payload: {
    competitionMode?: 'friendly' | 'competitive';
    raceTargetPoints?: number;
    resetRound?: boolean;
  }) => void;
  onSendCheer: (toClientId: string, cheerType: CheerType) => void;
  onSendChat: (text: string) => void;
  onOpenShareModal: () => void;
}

export function StudyRoomView({
  profile,
  activeTaskTitle,
  wsConnected,
  room,
  roomError,
  activeCheers,
  availableRooms,
  onRefreshRooms,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onCoopAction,
  onSetCompetition,
  onSendCheer,
  onSendChat,
  onOpenShareModal,
}: StudyRoomViewProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [squadGoalHours, setSquadGoalHours] = useState(5);
  const [newCompMode, setNewCompMode] = useState<'friendly' | 'competitive'>('competitive');
  const [newRaceTarget, setNewRaceTarget] = useState(15);
  const [joinCode, setJoinCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [rankingBasis, setRankingBasis] = useState<'session' | 'total'>('session');

  useEffect(() => {
    if (!room) {
      onRefreshRooms();
    }
  }, [room, onRefreshRooms]);

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    onCreateRoom(
      newRoomName.trim() || `${profile.name}'s Study Lounge`,
      squadGoalHours * 60,
      newCompMode,
      newRaceTarget
    );
    setNewRoomName('');
  };

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length >= 3) {
      onJoinRoom(cleaned);
      setJoinCode('');
    }
  };

  const handleCopyInvite = () => {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    void navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = chatText.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setChatText('');
  };

  const renderCheerIcon = (type: CheerType) => {
    switch (type) {
      case 'highfive':
        return <Hand className="w-3.5 h-3.5" />;
      case 'coffee':
        return <Coffee className="w-3.5 h-3.5" />;
      case 'spark':
        return <Zap className="w-3.5 h-3.5" />;
      case 'clap':
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  // Lobby View when not inside a room
  if (!room) {
    return (
      <div className="space-y-8">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pb-6 border-b border-[var(--border)]">
          <div className="lg:col-span-7 space-y-2">
            <p className="text-xs font-medium text-[var(--ink-faint)]">Multiplayer Focus Rooms · Up to 5 Scholars</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              Study Together or Compete for Points
            </h1>
            <p className="text-sm text-[var(--ink-muted)] max-w-xl">
              Open a 5-seat table for friendly co-op focus or launch a live Competitive Points Race to see who earns the most points!
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] pt-1">
              <Wifi className={`w-4 h-4 ${wsConnected ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
              <span>{wsConnected ? 'Live sync ready' : 'Connecting to room server...'}</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <CartoonImg
              src={CARTOON_IMAGES.studyDeskBanner}
              alt="Cute cartoon fox, frog, and cat studying happily around a cozy desk"
              className="w-full aspect-video"
            />
          </div>
        </section>

        {roomError && (
          <div className="p-4 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-sm font-medium text-[var(--danger)]">
            {roomError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create Room */}
          <form
            onSubmit={handleCreateSubmit}
            className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">Open a 5-Seat Study Room</h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Choose Friendly Co-Op or Competitive Points Race for up to 5 people.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label htmlFor="room-name-input" className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">
                  Room Name
                </label>
                <input
                  id="room-name-input"
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder={`${profile.name}'s Study Lounge`}
                  maxLength={48}
                  className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <p className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">Room Style</p>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface-subtle)] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNewCompMode('friendly')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      newCompMode === 'friendly'
                        ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    Friendly Co-Op
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCompMode('competitive')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      newCompMode === 'competitive'
                        ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    Competitive Race
                  </button>
                </div>
              </div>

              {newCompMode === 'competitive' ? (
                <div>
                  <label htmlFor="race-target-select" className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">
                    Points Race Target
                  </label>
                  <select
                    id="race-target-select"
                    value={newRaceTarget}
                    onChange={(e) => setNewRaceTarget(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value={10}>First to 10 pts (2 hrs)</option>
                    <option value={15}>First to 15 pts (3 hrs)</option>
                    <option value={25}>First to 25 pts (5 hrs)</option>
                    <option value={0}>Open Leaderboard (highest points)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="squad-goal-select" className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">
                    Combined Squad Study Goal
                  </label>
                  <select
                    id="squad-goal-select"
                    value={squadGoalHours}
                    onChange={(e) => setSquadGoalHours(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value={2}>2 Hours Combined</option>
                    <option value={5}>5 Hours Combined (1 hr per seat)</option>
                    <option value={10}>10 Hours Marathon</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create &amp; Enter Room
            </button>
          </form>

          {/* Join by Code or Active Rooms */}
          <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
            <form onSubmit={handleJoinSubmit} className="space-y-3 pb-6 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--ink)]">Join with a Room Code</h2>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code (e.g. SUN428)"
                  maxLength={10}
                  className="flex-1 min-h-[42px] px-3.5 py-2 text-sm font-mono uppercase bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 text-sm font-semibold text-white bg-[var(--ink)] hover:opacity-90 rounded-xl transition-opacity whitespace-nowrap cursor-pointer"
                >
                  Join Room
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--ink)]">Open Community &amp; Recent Rooms</h3>
                <button
                  type="button"
                  onClick={onRefreshRooms}
                  className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2 cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {availableRooms.length === 0 ? (
                <p className="text-xs text-[var(--ink-faint)] py-6 text-center">
                  No open rooms right now. Create one on the left to start studying!
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {availableRooms.map((r) => {
                    const isFull = r.memberCount >= r.maxCapacity;
                    return (
                      <li key={r.code} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">{r.name}</p>
                          <p className="text-xs text-[var(--ink-faint)] font-mono tabular-nums mt-0.5">
                            Code {r.code} · {r.memberCount}/{r.maxCapacity} seats ·{' '}
                            <span className={r.competitionMode === 'competitive' ? 'text-[var(--accent)] font-semibold' : ''}>
                              {r.competitionMode === 'competitive' ? 'Competitive Race' : 'Friendly Co-Op'}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isFull}
                          onClick={() => onJoinRoom(r.code)}
                          className={`min-h-[36px] px-4 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            isFull
                              ? 'bg-[var(--surface-subtle)] text-[var(--ink-faint)]'
                              : 'bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:bg-[var(--accent)] hover:text-white transition-colors'
                          }`}
                        >
                          {isFull ? 'Room Full (5/5)' : 'Take a Seat'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Multiplayer Room View (Up to 5 Seats)
  const isCompetitive = room.competitionMode === 'competitive';
  const seats = Array.from({ length: MAX_ROOM_MEMBERS }, (_, i) => room.members[i] ?? null);
  const totalSquadSeconds = room.members.reduce((sum, m) => sum + m.sessionFocusSeconds, 0);
  const totalSquadMinutes = Math.floor(totalSquadSeconds / 60);
  const squadGoalPct = Math.min(100, Math.round((totalSquadMinutes / room.squadGoalMinutes) * 100));

  // Sorted Live Leaderboard
  const getMemberScore = (m: StudyRoomState['members'][number]) =>
    rankingBasis === 'total' ? m.totalPoints ?? m.sessionPoints : m.sessionPoints;

  const rankedMembers = [...room.members].sort((a, b) => {
    const diff = getMemberScore(b) - getMemberScore(a);
    if (diff !== 0) return diff;
    const focusDiff = b.sessionFocusSeconds - a.sessionFocusSeconds;
    if (focusDiff !== 0) return focusDiff;
    return (b.hourProgressSeconds || 0) - (a.hourProgressSeconds || 0);
  });

  const leaderScore = rankedMembers.length > 0 ? getMemberScore(rankedMembers[0]) : 0;
  const rankMap = new Map<string, number>();
  rankedMembers.forEach((m, idx) => rankMap.set(m.clientId, idx + 1));

  const winnerMember = room.winnerId
    ? room.members.find((m) => m.clientId === room.winnerId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* Room Top Bar */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-faint)]">
              <span className="font-mono font-semibold text-[var(--ink)]">Room {room.code}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {room.members.length}/{MAX_ROOM_MEMBERS} seats occupied
              </span>
              <span aria-hidden="true">·</span>
              <span className={isCompetitive ? 'font-semibold text-[var(--accent)]' : ''}>
                {isCompetitive ? 'Competitive Points Race' : 'Friendly Co-Op'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Wifi className={`w-3.5 h-3.5 ${wsConnected ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
                {wsConnected ? 'Live' : 'Reconnecting'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] mt-1">{room.name}</h1>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Your active focus task: <span className="font-semibold text-[var(--ink)]">{activeTaskTitle}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-xl">
              <button
                type="button"
                onClick={() => onSetCompetition({ competitionMode: 'friendly' })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  !isCompetitive
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Friendly
              </button>
              <button
                type="button"
                onClick={() => onSetCompetition({ competitionMode: 'competitive' })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isCompetitive
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Compete
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyInvite}
              className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? 'Invite Link Copied' : 'Copy Room Invite'}
            </button>

            <button
              type="button"
              onClick={onOpenShareModal}
              className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink)] bg-[var(--surface-subtle)] hover:bg-[var(--border)] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Share Details
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>

        {/* Squad Goal & Co-Op Sprint Controller */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 border-t border-[var(--border)] items-center">
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--ink)]">Squad Session Goal</span>
              <span className="font-mono tabular-nums text-[var(--ink-muted)]">
                {totalSquadMinutes} / {room.squadGoalMinutes} min ({squadGoalPct}%)
              </span>
            </div>
            <div className="h-2.5 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--success)] transition-all duration-300"
                style={{ width: `${squadGoalPct}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-lg">
              <button
                type="button"
                onClick={() => onCoopAction('set_mode', { mode: 'coop' })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  room.sharedTimer.mode === 'coop'
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Synced Co-Op Sprint
              </button>
              <button
                type="button"
                onClick={() => onCoopAction('set_mode', { mode: 'solo' })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  room.sharedTimer.mode === 'solo'
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Solo Desk Timers
              </button>
            </div>

            {room.sharedTimer.mode === 'coop' && (
              <div className="flex items-center gap-2">
                <select
                  value={room.sharedTimer.durationSeconds}
                  disabled={room.sharedTimer.status === 'running'}
                  onChange={(e) => onCoopAction('set_duration', { durationSeconds: Number(e.target.value) })}
                  aria-label="Co-Op Sprint Duration"
                  className="min-h-[38px] px-2.5 py-1 text-xs font-semibold bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] disabled:opacity-60"
                >
                  <option value={1500}>25m Sprint</option>
                  <option value={2700}>45m Block</option>
                  <option value={3600}>60m (+{POINTS_PER_HOUR} pts)</option>
                </select>

                <span className="text-xl font-bold font-mono tabular-nums text-[var(--ink)] px-2">
                  {formatDurationClock(room.sharedTimer.remainingSeconds)}
                </span>

                {room.sharedTimer.status === 'running' ? (
                  <button
                    type="button"
                    onClick={() => onCoopAction('pause')}
                    className="min-h-[38px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--ink)] rounded-lg cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause Room
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCoopAction('start')}
                    className="min-h-[38px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Together
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onCoopAction('reset')}
                  aria-label="Reset co-op timer"
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Competitive Live Leaderboard */}
      {isCompetitive && (
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <CartoonImg
                src={CARTOON_IMAGES.trophyOwl}
                alt="Trophy owl celebrating points race standings"
                className="w-14 h-14"
              />
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[var(--accent)]" />
                  Room Points Leaderboard
                </h2>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  {room.raceTargetPoints > 0 && rankingBasis === 'session'
                    ? `Race to ${room.raceTargetPoints} pts · Every 1 hr focus adds +${POINTS_PER_HOUR} pts`
                    : `Ranked by highest points · Every 1 hr focus adds +${POINTS_PER_HOUR} pts`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] rounded-lg">
                <button
                  type="button"
                  onClick={() => setRankingBasis('session')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    rankingBasis === 'session'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  Room Race Pts
                </button>
                <button
                  type="button"
                  onClick={() => setRankingBasis('total')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    rankingBasis === 'total'
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  All-Time Pts
                </button>
              </div>

              {rankingBasis === 'session' && (
                <>
                  <select
                    value={room.raceTargetPoints}
                    onChange={(e) => onSetCompetition({ raceTargetPoints: Number(e.target.value) })}
                    aria-label="Race Target Points"
                    className="min-h-[36px] px-2.5 py-1 text-xs font-semibold bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)]"
                  >
                    <option value={10}>Goal: 10 pts</option>
                    <option value={15}>Goal: 15 pts</option>
                    <option value={25}>Goal: 25 pts</option>
                    <option value={0}>No cap</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => onSetCompetition({ resetRound: true })}
                    className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    New Round
                  </button>
                </>
              )}
            </div>
          </div>

          {winnerMember && rankingBasis === 'session' && (
            <div className="p-4 rounded-xl bg-[var(--warning-soft)] border border-[var(--warning)]/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-[var(--warning)] shrink-0" />
                <p className="text-sm font-bold text-[var(--ink)]">
                  {winnerMember.name} reached {room.raceTargetPoints} points and won this round!
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSetCompetition({ resetRound: true })}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[var(--ink)] text-white rounded-lg whitespace-nowrap cursor-pointer"
              >
                Start Next Round
              </button>
            </div>
          )}

          <div className="space-y-3">
            {rankedMembers.map((member, index) => {
              const rank = index + 1;
              const score = getMemberScore(member);
              const isMe = member.clientId === profile.id;
              const denominator =
                rankingBasis === 'session' && room.raceTargetPoints > 0
                  ? room.raceTargetPoints
                  : Math.max(5, leaderScore);
              const barPct = Math.min(100, Math.round((score / denominator) * 100));
              const gap = leaderScore - score;
              const minsIntoHour = Math.floor((member.hourProgressSeconds || 0) / 60);

              return (
                <div
                  key={member.clientId}
                  className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    rank === 1
                      ? 'bg-[var(--accent-soft)]/50 border-[var(--accent)]'
                      : isMe
                      ? 'bg-[var(--secondary-soft)]/50 border-[var(--border-strong)]'
                      : 'bg-[var(--canvas)] border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono tabular-nums text-xs font-bold shrink-0 ${
                        rank === 1
                          ? 'bg-[var(--accent)] text-white'
                          : rank === 2
                          ? 'bg-[var(--secondary)] text-white'
                          : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {rank === 1 ? <Crown className="w-4 h-4" /> : `#${rank}`}
                    </div>

                    <AvatarImg
                      avatarId={member.avatarId as UserProfile['avatarId']}
                      alt={member.name}
                      className="w-10 h-10"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--ink)] truncate">
                        {member.name} {isMe && '(You)'}
                      </p>
                      <p className="text-xs text-[var(--ink-faint)] font-mono tabular-nums">
                        {Math.floor(member.sessionFocusSeconds / 60)}m this session · {minsIntoHour}/60m to +5 pts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:min-w-[260px]">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono tabular-nums font-bold text-[var(--ink)]">
                          {score} pts
                        </span>
                        <span className="text-[11px] text-[var(--ink-faint)] font-mono tabular-nums">
                          {rank === 1 ? '1st Place' : `-${gap} pts behind`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            rank === 1 ? 'bg-[var(--accent)]' : 'bg-[var(--secondary)]'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5-Seat Study Table + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 5 Desks Grid */}
        <section className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {seats.map((member, index) => {
            if (!member) {
              return (
                <div
                  key={`empty_${index}`}
                  className="border border-dashed border-[var(--border-strong)] rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[220px] bg-[var(--canvas)]"
                >
                  <p className="text-xs font-semibold text-[var(--ink-muted)]">Seat {index + 1} · Open</p>
                  <p className="text-xs text-[var(--ink-faint)] mt-1 mb-4 max-w-[180px]">
                    Invite a study partner to fill this desk.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="px-3 py-1.5 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Copy Invite Link
                  </button>
                </div>
              );
            }

            const isMe = member.clientId === profile.id;
            const rank = rankMap.get(member.clientId) ?? index + 1;
            const latestCheer = activeCheers.find((c) => c.toClientId === member.clientId);
            const cheerOption = latestCheer
              ? CHEER_OPTIONS.find((o) => o.type === latestCheer.cheerType)
              : null;

            return (
              <div
                key={member.clientId}
                className={`relative bg-[var(--surface)] border rounded-2xl p-5 flex flex-col justify-between min-h-[220px] transition-colors ${
                  isMe ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                }`}
              >
                {/* Incoming Cheer Floating Banner */}
                {latestCheer && cheerOption && (
                  <div className="absolute -top-3 right-3 px-2.5 py-1 rounded-lg bg-[var(--ink)] text-white text-[11px] font-semibold shadow-sm flex items-center gap-1.5 z-10">
                    {renderCheerIcon(latestCheer.cheerType)}
                    <span>
                      {latestCheer.fromName}: {cheerOption.short}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarImg avatarId={member.avatarId as UserProfile['avatarId']} alt={member.name} className="w-11 h-11" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--ink)] truncate">
                          {member.name} {isMe && '(You)'}
                        </p>
                        <p className="text-xs text-[var(--ink-faint)]">
                          {isCompetitive ? `#${rank} · ` : ''}
                          {member.isHost ? 'Host' : 'Scholar'} ·{' '}
                          <span
                            className={
                              member.timerStatus === 'studying'
                                ? 'text-[var(--success)] font-medium'
                                : 'text-[var(--ink-faint)]'
                            }
                          >
                            {member.timerStatus === 'studying'
                              ? 'Focusing'
                              : member.timerStatus === 'break'
                              ? 'On Break'
                              : 'Ready'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--ink-muted)] line-clamp-2 min-h-[32px]">
                    {member.currentTaskTitle || 'Open Study Block'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums font-bold text-base text-[var(--ink)]">
                      {formatDurationClock(
                        room.sharedTimer.mode === 'coop'
                          ? room.sharedTimer.remainingSeconds
                          : member.timerRemainingSeconds
                      )}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-[var(--accent)]">
                      {isCompetitive
                        ? `${rankingBasis === 'total' ? member.totalPoints ?? member.sessionPoints : member.sessionPoints} pts`
                        : `+${member.sessionPoints} pts today`}
                    </span>
                  </div>

                  {!isMe ? (
                    <div className="flex items-center justify-between gap-1">
                      {CHEER_OPTIONS.map((cheer) => (
                        <button
                          key={cheer.type}
                          type="button"
                          onClick={() => onSendCheer(member.clientId, cheer.type)}
                          title={`Send ${cheer.label} to ${member.name}`}
                          className="flex-1 min-h-[32px] py-1 px-1.5 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] text-[var(--ink-muted)] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          {renderCheerIcon(cheer.type)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--ink-faint)] font-mono tabular-nums">
                      Session time: {Math.floor(member.sessionFocusSeconds / 60)}m logged
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Live Study Feed & Chat */}
        <aside className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col h-[460px]">
          <div className="pb-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-bold text-[var(--ink)]">Room Feed &amp; Study Chat</h2>
            <p className="text-xs text-[var(--ink-faint)]">Cheer boosts, race updates, and notes</p>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {room.feed.map((item) => (
              <div key={item.id} className="text-xs leading-relaxed">
                {item.type === 'chat' ? (
                  <p>
                    <span className="font-bold text-[var(--ink)]">{item.senderName}: </span>
                    <span className="text-[var(--ink-muted)]">{item.text}</span>
                  </p>
                ) : item.type === 'milestone' ? (
                  <p className="font-semibold text-[var(--accent-ink)] bg-[var(--accent-soft)] px-3 py-2 rounded-lg">
                    {item.text}
                  </p>
                ) : (
                  <p className="text-[var(--ink-faint)]">{item.text}</p>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChatSubmit} className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Say hi or share your goal..."
              maxLength={240}
              className="flex-1 min-h-[38px] px-3 py-1.5 text-xs bg-[var(--canvas)] border border-[var(--border)] rounded-lg text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
