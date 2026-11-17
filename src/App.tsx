import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Pause, Share2, Sparkles, X } from 'lucide-react';
import {
  COLLECTIBLE_BADGES,
  HOUR_SECONDS,
  POINTS_PER_HOUR,
  STUDIO_THEMES,
  formatDurationClock,
  getTodayDayKey,
} from './constants';
import type {
  AmbientSound,
  AvatarId,
  CheerEventPayload,
  CheerType,
  DayKey,
  RoomSummary,
  SharedPlanSnapshot,
  StudyRoomState,
  StudyTask,
  ThemeId,
  WorkspaceState,
} from './types';
import { audioEngine } from './utils/audio';
import { TodayView } from './components/TodayView';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { TimerRewardsView } from './components/TimerRewardsView';
import { StudyRoomView } from './components/StudyRoomView';
import { ImportedPlanModal, ProfileModal, ShareModal } from './components/Modals';

type ActiveTab = 'today' | 'week' | 'focus' | 'room';

const WORKSPACE_STORAGE_KEY = 'studyclub_workspace_id_v1';
const LOCAL_STATE_KEY = 'studyclub_local_state_v1';

function getOrCreateWorkspaceId(): string {
  const existing = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (existing) return existing;
  const generated = `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(WORKSPACE_STORAGE_KEY, generated);
  return generated;
}

function createFallbackWorkspace(id: string): WorkspaceState {
  const today = getTodayDayKey();
  const now = Date.now();
  return {
    profile: {
      id,
      name: 'Scholar',
      avatarId: 'fox',
      themeId: 'tangerine',
      points: 0,
      totalFocusSeconds: 0,
      hourProgressSeconds: 0,
      completedHours: 0,
      dailyFocusSeconds: {},
      unlockedThemes: ['tangerine', 'lavender'],
      unlockedBadges: [],
      pointHistory: [],
    },
    tasks: [
      {
        id: `t_${now}_1`,
        title: 'Review core lecture notes & summary cards',
        subject: 'Computer Science',
        day: today,
        estimatedMinutes: 60,
        priority: 'high',
        completed: false,
        createdAt: now,
      },
      {
        id: `t_${now}_2`,
        title: 'Solve 12 practice equations',
        subject: 'Mathematics',
        day: today,
        estimatedMinutes: 45,
        priority: 'medium',
        completed: false,
        createdAt: now + 1,
      },
    ],
  };
}

export default function App() {
  const [workspaceId] = useState<string>(() => getOrCreateWorkspaceId());
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STATE_KEY);
      if (cached) {
        return JSON.parse(cached) as WorkspaceState;
      }
    } catch {
      // Ignore corrupt cache
    }
    return createFallbackWorkspace(workspaceId);
  });
  const [loadedFromServer, setLoadedFromServer] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Solo Study Timer State
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [timerDurationSeconds, setTimerDurationSeconds] = useState<number>(HOUR_SECONDS);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number>(HOUR_SECONDS);
  const [stopwatchElapsedSeconds, setStopwatchElapsedSeconds] = useState<number>(0);

  // Audio & Theme
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('off');
  const [muted, setMuted] = useState(false);

  // Modals & Notifications
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [importedPlan, setImportedPlan] = useState<SharedPlanSnapshot | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; subtitle: string } | null>(null);

  // Multiplayer WebSocket State
  const wsRef = useRef<WebSocket | null>(null);
  const currentRoomCodeRef = useRef<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [room, setRoom] = useState<StudyRoomState | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
  const [activeCheers, setActiveCheers] = useState<CheerEventPayload[]>([]);

  const showToast = useCallback((title: string, subtitle: string) => {
    const id = Date.now();
    setToast({ id, title, subtitle });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 5500);
  }, []);

  // Apply selected vibrant theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', workspace.profile.themeId);
  }, [workspace.profile.themeId]);

  // Initial workspace load from server
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workspace/${encodeURIComponent(workspaceId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WorkspaceState | null) => {
        if (!cancelled && data && data.profile && Array.isArray(data.tasks)) {
          setWorkspace((prev) => {
            // Preserve local points/progress if higher than newly created server record
            if (prev.profile.totalFocusSeconds > data.profile.totalFocusSeconds) {
              return prev;
            }
            return data;
          });
        }
      })
      .catch(() => {
        // Offline / server starting fallback already handled by local cache
      })
      .finally(() => {
        if (!cancelled) setLoadedFromServer(true);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Persist workspace to localStorage + debounced PUT to server
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore quota errors
    }
    if (!loadedFromServer) return;

    const timer = setTimeout(() => {
      void fetch(`/api/workspace/${encodeURIComponent(workspaceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspace),
      }).catch(() => {
        // Ignore transient network errors
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [workspace, workspaceId, loadedFromServer]);

  // Helper to advance focus seconds & award +5 points every 60 minutes (3600s)
  const recordFocusSeconds = useCallback(
    (deltaSeconds: number) => {
      if (deltaSeconds <= 0) return;

      let hoursEarnedNow = 0;
      setWorkspace((prev) => {
        const nextTotal = prev.profile.totalFocusSeconds + deltaSeconds;
        let nextHourProg = prev.profile.hourProgressSeconds + deltaSeconds;
        let nextPoints = prev.profile.points;
        let nextCompletedHours = prev.profile.completedHours;
        const nextHistory = [...prev.profile.pointHistory];

        while (nextHourProg >= HOUR_SECONDS) {
          nextHourProg -= HOUR_SECONDS;
          hoursEarnedNow += 1;
          nextCompletedHours += 1;
          nextPoints += POINTS_PER_HOUR;
          nextHistory.unshift({
            id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            amount: POINTS_PER_HOUR,
            reason: `Completed 1-hour focus milestone (#${nextCompletedHours})`,
            timestamp: Date.now(),
          });
        }

        const nowDate = new Date();
        const localDateKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;
        const prevDaily = prev.profile.dailyFocusSeconds ?? {};
        const nextDaily = {
          ...prevDaily,
          [localDateKey]: (prevDaily[localDateKey] || 0) + deltaSeconds,
        };

        return {
          ...prev,
          profile: {
            ...prev.profile,
            points: nextPoints,
            totalFocusSeconds: nextTotal,
            hourProgressSeconds: nextHourProg,
            completedHours: nextCompletedHours,
            dailyFocusSeconds: nextDaily,
            pointHistory: nextHistory.slice(0, 50),
          },
        };
      });

      if (hoursEarnedNow > 0) {
        const gained = hoursEarnedNow * POINTS_PER_HOUR;
        audioEngine.playHourRewardFanfare();
        showToast(
          `+${gained} Reward Points Earned!`,
          `You completed ${hoursEarnedNow} full hour of focused study.`
        );
        if (wsRef.current?.readyState === WebSocket.OPEN && currentRoomCodeRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: 'room:milestone',
              earnedPoints: gained,
              text: `${workspace.profile.name} completed a 1-hour focus milestone and earned +${gained} points!`,
            })
          );
        }
      }
    },
    [showToast, workspace.profile.name]
  );

  // Accurate timestamp-based Solo Timer loop
  const lastTickTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerStatus !== 'running') {
      lastTickTimeRef.current = null;
      return;
    }

    lastTickTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const prev = lastTickTimeRef.current ?? now;
      const elapsedSec = Math.floor((now - prev) / 1000);
      if (elapsedSec <= 0) return;
      lastTickTimeRef.current = prev + elapsedSec * 1000;

      // Avoid double-counting if inside a running Co-Op Room sprint
      const coopRunning = room?.sharedTimer.mode === 'coop' && room.sharedTimer.status === 'running';
      if (!coopRunning) {
        recordFocusSeconds(elapsedSec);
      }

      if (timerMode === 'stopwatch') {
        setStopwatchElapsedSeconds((s) => s + elapsedSec);
      } else {
        setTimerRemainingSeconds((rem) => {
          const next = rem - elapsedSec;
          if (next <= 0) {
            setTimerStatus('idle');
            audioEngine.playTaskComplete();
            showToast(
              'Focus Session Complete!',
              `${Math.round(timerDurationSeconds / 60)} minutes added toward your +5 pt hourly milestone.`
            );
            return timerDurationSeconds;
          }
          return next;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timerStatus, timerMode, timerDurationSeconds, recordFocusSeconds, showToast, room]);

  // Also track Co-Op Room active seconds toward user's +5 pt hourly progress
  const lastCoopTickRef = useRef<number | null>(null);
  useEffect(() => {
    const coopRunning = Boolean(room && room.sharedTimer.mode === 'coop' && room.sharedTimer.status === 'running');
    if (!coopRunning) {
      lastCoopTickRef.current = null;
      return;
    }

    lastCoopTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const prev = lastCoopTickRef.current ?? now;
      const elapsedSec = Math.floor((now - prev) / 1000);
      if (elapsedSec <= 0) return;
      lastCoopTickRef.current = prev + elapsedSec * 1000;
      recordFocusSeconds(elapsedSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.sharedTimer.mode, room?.sharedTimer.status, recordFocusSeconds]);

  // WebSocket Connection & Auto-Reconnect
  const activeTaskTitle =
    workspace.tasks.find((t) => t.id === activeTaskId)?.title ?? 'Open Focus Session';

  const sendJoinMessage = useCallback(
    (code: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'room:join',
            roomCode: code,
            clientId: workspace.profile.id,
            name: workspace.profile.name,
            avatarId: workspace.profile.avatarId,
            currentTaskTitle: activeTaskTitle,
            totalPoints: workspace.profile.points,
            hourProgressSeconds: workspace.profile.hourProgressSeconds,
          })
        );
      }
    },
    [
      workspace.profile.id,
      workspace.profile.name,
      workspace.profile.avatarId,
      workspace.profile.points,
      workspace.profile.hourProgressSeconds,
      activeTaskTitle,
    ]
  );

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setWsConnected(true);
        setRoomError(null);
        if (currentRoomCodeRef.current) {
          sendJoinMessage(currentRoomCodeRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; [key: string]: unknown };
          if (msg.type === 'room:state') {
            setRoom(msg.room as StudyRoomState);
            setRoomError(null);
          } else if (msg.type === 'room:tick') {
            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                sharedTimer: msg.sharedTimer as StudyRoomState['sharedTimer'],
                members: msg.members as StudyRoomState['members'],
              };
            });
          } else if (msg.type === 'room:sprint_completed') {
            setRoom(msg.room as StudyRoomState);
            audioEngine.playHourRewardFanfare();
            const pts = Number(msg.awardedPoints || 0);
            showToast(
              pts > 0 ? `Co-Op 1-Hour Sprint Complete (+${pts} pts)!` : 'Co-Op Focus Sprint Complete!',
              'Great focus session with your study squad.'
            );
          } else if (msg.type === 'room:race_winner') {
            setRoom(msg.room as StudyRoomState);
            audioEngine.playHourRewardFanfare();
            const winner = msg.winner as { name?: string; sessionPoints?: number } | undefined;
            showToast(
              `${winner?.name || 'A scholar'} Won the Points Race!`,
              `Reached ${winner?.sessionPoints ?? 0} points in the study room.`
            );
          } else if (msg.type === 'room:cheer_pop') {
            const payload = msg as unknown as CheerEventPayload;
            audioEngine.playCheerPop(payload.cheerType);
            setActiveCheers((prev) => [...prev.filter((c) => c.toClientId !== payload.toClientId), payload]);
            setTimeout(() => {
              setActiveCheers((prev) => prev.filter((c) => c.id !== payload.id));
            }, 3500);
          } else if (msg.type === 'room:error') {
            setRoomError(String(msg.message || 'Unable to join room.'));
            currentRoomCodeRef.current = null;
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [sendJoinMessage, showToast]);

  // Sync solo presence updates into active study room
  useEffect(() => {
    if (!room || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'room:update_presence',
        name: workspace.profile.name,
        avatarId: workspace.profile.avatarId,
        currentTaskTitle: activeTaskTitle,
        totalPoints: workspace.profile.points,
        hourProgressSeconds: workspace.profile.hourProgressSeconds,
        timerStatus: timerStatus === 'running' ? 'studying' : 'idle',
        timerRemainingSeconds: timerMode === 'stopwatch' ? stopwatchElapsedSeconds : timerRemainingSeconds,
      })
    );
  }, [
    room?.code,
    workspace.profile.name,
    workspace.profile.avatarId,
    workspace.profile.points,
    workspace.profile.hourProgressSeconds,
    activeTaskTitle,
    timerStatus,
    timerMode,
    timerRemainingSeconds,
    stopwatchElapsedSeconds,
  ]);

  // Handle URL ?room=CODE and ?plan=SHAREID deep links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const planParam = params.get('plan');

    if (roomParam) {
      const cleanCode = roomParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanCode) {
        currentRoomCodeRef.current = cleanCode;
        setActiveTab('room');
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendJoinMessage(cleanCode);
        }
      }
    }

    if (planParam) {
      const cleanPlan = planParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanPlan) {
        fetch(`/api/plans/${encodeURIComponent(cleanPlan)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((snapshot: SharedPlanSnapshot | null) => {
            if (snapshot) setImportedPlan(snapshot);
          })
          .catch(() => {
            // Ignore missing plan
          });
      }
    }
  }, [sendJoinMessage]);

  // Handlers: Tasks
  const handleAddTask = (draft: Omit<StudyTask, 'id' | 'createdAt' | 'completed'>) => {
    audioEngine.playPop();
    const newTask: StudyTask = {
      ...draft,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
      createdAt: Date.now(),
    };
    setWorkspace((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  };

  const handleToggleTask = (taskId: string) => {
    let completedTitle: string | null = null;
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const nextCompleted = !t.completed;
        if (nextCompleted) completedTitle = t.title;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? Date.now() : undefined,
        };
      }),
    }));

    if (completedTitle) {
      audioEngine.playTaskComplete();
      if (activeTaskId === taskId) setActiveTaskId(null);
      if (wsRef.current?.readyState === WebSocket.OPEN && currentRoomCodeRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: 'room:milestone',
            text: `${workspace.profile.name} completed "${completedTitle}"!`,
          })
        );
      }
    } else {
      audioEngine.playClick();
    }
  };

  const handleMoveTask = (taskId: string, newDay: DayKey) => {
    audioEngine.playPop();
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, day: newDay } : t)),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    audioEngine.playClick();
    if (activeTaskId === taskId) setActiveTaskId(null);
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleImportSharedTasks = (tasksToImport: StudyTask[]) => {
    audioEngine.playTaskComplete();
    const now = Date.now();
    const cloned = tasksToImport.map((t, idx) => ({
      ...t,
      id: `imp_${now}_${idx}`,
      completed: false,
      createdAt: now + idx,
    }));
    setWorkspace((prev) => ({
      ...prev,
      tasks: [...cloned, ...prev.tasks],
    }));
    setActiveTab('week');
    showToast('Weekly Plan Imported', `Added ${cloned.length} tasks to your weekly schedule.`);
  };

  // Handlers: Timer & Audio
  const handleSetTimerPreset = (preset: number | 'stopwatch') => {
    audioEngine.playClick();
    setTimerStatus('idle');
    if (preset === 'stopwatch') {
      setTimerMode('stopwatch');
      setStopwatchElapsedSeconds(0);
    } else {
      setTimerMode('countdown');
      const secs = preset * 60;
      setTimerDurationSeconds(secs);
      setTimerRemainingSeconds(secs);
    }
  };

  const handleStartTimer = () => {
    audioEngine.playTimerStart();
    setTimerStatus('running');
  };

  const handlePauseTimer = () => {
    audioEngine.playTimerPause();
    setTimerStatus('paused');
  };

  const handleResetTimer = () => {
    audioEngine.playClick();
    setTimerStatus('idle');
    setTimerRemainingSeconds(timerDurationSeconds);
    setStopwatchElapsedSeconds(0);
  };

  const handleSetAmbient = (sound: AmbientSound) => {
    audioEngine.playClick();
    setAmbientSound(sound);
    audioEngine.setAmbient(sound);
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    audioEngine.muted = nextMuted;
    if (nextMuted) {
      audioEngine.stopAmbient();
    } else {
      audioEngine.setAmbient(ambientSound);
    }
  };

  // Handlers: Rewards Shop & Profile
  const handleSelectOrUnlockTheme = (themeId: ThemeId) => {
    const theme = STUDIO_THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    setWorkspace((prev) => {
      const alreadyOwned = theme.cost === 0 || prev.profile.unlockedThemes.includes(themeId);
      if (alreadyOwned) {
        audioEngine.playPop();
        return {
          ...prev,
          profile: {
            ...prev.profile,
            themeId,
            unlockedThemes: prev.profile.unlockedThemes.includes(themeId)
              ? prev.profile.unlockedThemes
              : [...prev.profile.unlockedThemes, themeId],
          },
        };
      }
      if (prev.profile.points < theme.cost) return prev;
      audioEngine.playUnlock();
      return {
        ...prev,
        profile: {
          ...prev.profile,
          points: prev.profile.points - theme.cost,
          themeId,
          unlockedThemes: [...prev.profile.unlockedThemes, themeId],
          pointHistory: [
            {
              id: `shop_${Date.now()}`,
              amount: -theme.cost,
              reason: `Unlocked ${theme.name} theme`,
              timestamp: Date.now(),
            },
            ...prev.profile.pointHistory,
          ],
        },
      };
    });
  };

  const handleUnlockBadge = (badgeId: string) => {
    const badge = COLLECTIBLE_BADGES.find((b) => b.id === badgeId);
    if (!badge) return;
    audioEngine.playUnlock();

    setWorkspace((prev) => {
      if (prev.profile.unlockedBadges.includes(badgeId) || prev.profile.points < badge.cost) {
        return prev;
      }
      return {
        ...prev,
        profile: {
          ...prev.profile,
          points: prev.profile.points - badge.cost,
          unlockedBadges: [...prev.profile.unlockedBadges, badgeId],
          pointHistory: [
            {
              id: `badge_${Date.now()}`,
              amount: -badge.cost,
              reason: `Collected "${badge.name}" badge`,
              timestamp: Date.now(),
            },
            ...prev.profile.pointHistory,
          ],
        },
      };
    });
  };

  const handleSaveProfile = (name: string, avatarId: AvatarId) => {
    audioEngine.playClick();
    setWorkspace((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        name,
        avatarId,
      },
    }));
  };

  // Handlers: Multiplayer Rooms & Plan Sharing
  const refreshAvailableRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) return;
      const data = (await res.json()) as { rooms: RoomSummary[] };
      setAvailableRooms(data.rooms || []);
    } catch {
      // Ignore
    }
  }, []);

  const handleCreateRoom = async (
    name: string,
    squadGoalMinutes = 300,
    competitionMode: 'friendly' | 'competitive' = 'friendly',
    raceTargetPoints = 15
  ) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          hostId: workspace.profile.id,
          squadGoalMinutes,
          competitionMode,
          raceTargetPoints,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { room: StudyRoomState };
      const code = data.room.code;
      currentRoomCodeRef.current = code;
      setActiveTab('room');
      sendJoinMessage(code);
    } catch {
      setRoomError('Could not reach the study room server.');
    }
  };

  const handleJoinRoom = (code: string) => {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;
    currentRoomCodeRef.current = clean;
    setRoomError(null);
    sendJoinMessage(clean);
  };

  const handleLeaveRoom = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:leave' }));
    }
    currentRoomCodeRef.current = null;
    setRoom(null);
    void refreshAvailableRooms();
  };

  const handleCoopAction = (
    action: 'start' | 'pause' | 'reset' | 'set_mode' | 'set_duration',
    payload?: { mode?: 'coop' | 'solo'; durationSeconds?: number }
  ) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    audioEngine.playClick();
    wsRef.current.send(
      JSON.stringify({
        type: 'room:coop_timer',
        action,
        ...payload,
      })
    );
  };

  const handleSendCheer = (toClientId: string, cheerType: CheerType) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    audioEngine.playClick();
    wsRef.current.send(
      JSON.stringify({
        type: 'room:cheer',
        toClientId,
        cheerType,
      })
    );
  };

  const handleSendChat = (text: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'room:chat',
        text,
      })
    );
  };

  const handleSetCompetition = (payload: {
    competitionMode?: 'friendly' | 'competitive';
    raceTargetPoints?: number;
    resetRound?: boolean;
  }) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    audioEngine.playPop();
    wsRef.current.send(
      JSON.stringify({
        type: 'room:set_competition',
        ...payload,
      })
    );
  };

  const handlePublishWeeklyPlan = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/plans/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: workspace.profile.name,
          ownerAvatarId: workspace.profile.avatarId,
          tasks: workspace.tasks,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { shareId: string };
      return data.shareId;
    } catch {
      return null;
    }
  };

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Weekly Plan' },
    { id: 'focus', label: 'Focus & Rewards' },
    { id: 'room', label: room ? `Room (${room.members.length}/5)` : 'Study Room' },
  ];

  const miniClockDisplay =
    timerMode === 'stopwatch'
      ? formatDurationClock(stopwatchElapsedSeconds)
      : formatDurationClock(timerRemainingSeconds);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--canvas)] text-[var(--ink)] transition-colors duration-200">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[var(--surface)]/95 backdrop-blur-xs border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="text-xl font-extrabold font-display tracking-tight text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            StudyClub
          </button>

          {/* Zone 2: Clean Text Nav Links */}
          <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-[var(--accent)] text-[var(--ink)]'
                      : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="min-h-[38px] px-4 py-2 inline-flex items-center gap-2 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share &amp; Invite</span>
              <span className="sm:hidden">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'today' && (
          <TodayView
            profile={workspace.profile}
            tasks={workspace.tasks}
            activeTaskId={activeTaskId}
            timerMode={timerMode}
            timerStatus={timerStatus}
            timerDurationSeconds={timerDurationSeconds}
            timerRemainingSeconds={timerRemainingSeconds}
            stopwatchElapsedSeconds={stopwatchElapsedSeconds}
            ambientSound={ambientSound}
            muted={muted}
            onSelectActiveTask={setActiveTaskId}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onSetTimerPreset={handleSetTimerPreset}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResetTimer={handleResetTimer}
            onSetAmbient={handleSetAmbient}
            onToggleMute={handleToggleMute}
            onOpenProfileModal={() => setProfileModalOpen(true)}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'week' && (
          <WeeklyPlannerView
            tasks={workspace.tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onMoveTask={handleMoveTask}
            onDeleteTask={handleDeleteTask}
            onFocusTask={(taskId) => {
              setActiveTaskId(taskId);
              setActiveTab('today');
            }}
            onOpenShareModal={() => setShareModalOpen(true)}
          />
        )}

        {activeTab === 'focus' && (
          <TimerRewardsView
            profile={workspace.profile}
            tasks={workspace.tasks}
            activeTaskId={activeTaskId}
            timerMode={timerMode}
            timerStatus={timerStatus}
            timerDurationSeconds={timerDurationSeconds}
            timerRemainingSeconds={timerRemainingSeconds}
            stopwatchElapsedSeconds={stopwatchElapsedSeconds}
            ambientSound={ambientSound}
            muted={muted}
            onSelectActiveTask={setActiveTaskId}
            onSetTimerPreset={handleSetTimerPreset}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResetTimer={handleResetTimer}
            onSetAmbient={handleSetAmbient}
            onToggleMute={handleToggleMute}
            onSelectOrUnlockTheme={handleSelectOrUnlockTheme}
            onUnlockBadge={handleUnlockBadge}
          />
        )}

        {activeTab === 'room' && (
          <StudyRoomView
            profile={workspace.profile}
            activeTaskTitle={activeTaskTitle}
            wsConnected={wsConnected}
            room={room}
            roomError={roomError}
            activeCheers={activeCheers}
            availableRooms={availableRooms}
            onRefreshRooms={refreshAvailableRooms}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLeaveRoom={handleLeaveRoom}
            onCoopAction={handleCoopAction}
            onSetCompetition={handleSetCompetition}
            onSendCheer={handleSendCheer}
            onSendChat={handleSendChat}
            onOpenShareModal={() => setShareModalOpen(true)}
          />
        )}
      </main>

      {/* Compact Floating Mini-Timer when studying on Weekly/Room tabs */}
      {timerStatus === 'running' && (activeTab === 'week' || activeTab === 'room') && (
        <div className="fixed bottom-5 right-5 z-40 bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl px-4 py-3 shadow-lg flex items-center gap-4">
          <div>
            <p className="text-[11px] text-[var(--ink-faint)]">Focus Timer Active</p>
            <p className="text-lg font-bold font-mono tabular-nums text-[var(--ink)]">
              {miniClockDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePauseTimer}
            aria-label="Pause study timer"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-[var(--ink)] text-white cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('focus')}
            aria-label="View timer"
            className="min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-[var(--accent)] text-white rounded-xl cursor-pointer"
          >
            Open
          </button>
        </div>
      )}

      {/* Non-blocking Reward & Milestone Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-5 z-50 max-w-sm bg-[var(--ink)] text-white rounded-2xl p-4 shadow-xl flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              {toast.title}
            </p>
            <p className="text-xs text-white/80 mt-0.5">{toast.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        room={room}
        tasks={workspace.tasks}
        profile={workspace.profile}
        onClose={() => setShareModalOpen(false)}
        onCreateAndEnterRoom={(name) => void handleCreateRoom(name)}
        onPublishWeeklyPlan={handlePublishWeeklyPlan}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        profile={workspace.profile}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />

      <ImportedPlanModal
        snapshot={importedPlan}
        onClose={() => setImportedPlan(null)}
        onImportTasks={handleImportSharedTasks}
      />
    </div>
  );
}
