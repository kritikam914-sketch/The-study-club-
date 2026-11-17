import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_ROOM_MEMBERS = 5;
const HOUR_SECONDS = 3600;
const POINTS_PER_HOUR = 5;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'studyclub.json');

interface StudyTask {
  id: string;
  title: string;
  subject: string;
  day: string;
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

interface PointEvent {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

interface UserProfile {
  id: string;
  name: string;
  avatarId: string;
  themeId: string;
  points: number;
  totalFocusSeconds: number;
  hourProgressSeconds: number;
  completedHours: number;
  dailyFocusSeconds?: Record<string, number>;
  unlockedThemes: string[];
  unlockedBadges: string[];
  pointHistory: PointEvent[];
}

interface WorkspaceState {
  profile: UserProfile;
  tasks: StudyTask[];
}

interface RoomMember {
  clientId: string;
  name: string;
  avatarId: string;
  currentTaskTitle: string;
  timerStatus: 'idle' | 'studying' | 'break';
  timerRemainingSeconds: number;
  sessionFocusSeconds: number;
  sessionPoints: number;
  totalPoints: number;
  hourProgressSeconds: number;
  connectedAt: number;
  isHost: boolean;
}

interface RoomSharedTimer {
  mode: 'coop' | 'solo';
  status: 'idle' | 'running' | 'paused';
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
}

interface RoomFeedItem {
  id: string;
  type: 'chat' | 'milestone' | 'cheer' | 'system';
  senderId?: string;
  senderName: string;
  senderAvatarId?: string;
  text: string;
  timestamp: number;
}

interface StudyRoomState {
  code: string;
  name: string;
  hostId: string;
  maxCapacity: number;
  squadGoalMinutes: number;
  competitionMode: 'friendly' | 'competitive';
  raceTargetPoints: number;
  winnerId: string | null;
  sharedTimer: RoomSharedTimer;
  members: RoomMember[];
  feed: RoomFeedItem[];
  createdAt: number;
}

interface SharedPlanSnapshot {
  shareId: string;
  ownerName: string;
  ownerAvatarId: string;
  tasks: StudyTask[];
  createdAt: number;
}

interface PersistedStore {
  workspaces: Record<string, WorkspaceState>;
  sharedPlans: Record<string, SharedPlanSnapshot>;
  rooms: Record<string, StudyRoomState>;
}

function getTodayDayKey(): string {
  const jsDay = new Date().getDay();
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[jsDay] || 'mon';
}

function createStarterWorkspace(id: string): WorkspaceState {
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
      {
        id: `t_${now}_3`,
        title: 'Read chapter 4 & highlight key quotes',
        subject: 'Literature',
        day: today === 'wed' ? 'thu' : 'wed',
        estimatedMinutes: 30,
        priority: 'medium',
        completed: false,
        createdAt: now + 2,
      },
      {
        id: `t_${now}_4`,
        title: 'Organize lab diagrams & weekly recap',
        subject: 'Biology',
        day: today === 'fri' ? 'sat' : 'fri',
        estimatedMinutes: 60,
        priority: 'low',
        completed: false,
        createdAt: now + 3,
      },
    ],
  };
}

function loadStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedStore;
      return {
        workspaces: parsed.workspaces || {},
        sharedPlans: parsed.sharedPlans || {},
        rooms: parsed.rooms || {},
      };
    }
  } catch (err) {
    console.error('Failed to read store, initializing fresh store:', err);
  }
  return { workspaces: {}, sharedPlans: {}, rooms: {} };
}

const store: PersistedStore = loadStore();

// Clear stale socket members on server boot while keeping named rooms intact
for (const code of Object.keys(store.rooms)) {
  store.rooms[code].members = [];
  if (store.rooms[code].sharedTimer.status === 'running') {
    store.rooms[code].sharedTimer.status = 'paused';
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store:', err);
    }
  }, 400);
}

function generateShortCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createRoomObject(
  code: string,
  name: string,
  hostId: string,
  squadGoalMinutes = 300,
  competitionMode: 'friendly' | 'competitive' = 'friendly',
  raceTargetPoints = 15
): StudyRoomState {
  const now = Date.now();
  return {
    code,
    name: name.trim().slice(0, 48) || 'Focus Study Lounge',
    hostId,
    maxCapacity: MAX_ROOM_MEMBERS,
    squadGoalMinutes: Math.max(60, Math.min(1800, squadGoalMinutes)),
    competitionMode,
    raceTargetPoints: Math.max(0, Math.min(100, raceTargetPoints)),
    winnerId: null,
    sharedTimer: {
      mode: 'coop',
      status: 'idle',
      durationSeconds: HOUR_SECONDS,
      remainingSeconds: HOUR_SECONDS,
      startedAt: null,
    },
    members: [],
    feed: [
      {
        id: `sys_${now}`,
        type: 'system',
        senderName: 'StudyClub',
        text:
          competitionMode === 'competitive'
            ? `Competitive room ${code} opened! Earn +5 pts/hr and climb to #1 on the leaderboard.`
            : `Room ${code} opened. Up to 5 scholars can study together here.`,
        timestamp: now,
      },
    ],
    createdAt: now,
  };
}

// Seed one inviting open community lounge if no rooms exist
if (Object.keys(store.rooms).length === 0) {
  store.rooms['SUN428'] = createRoomObject('SUN428', 'Sunlit Focus Lounge', 'system', 300);
  scheduleSave();
}

interface ClientSocketMeta {
  ws: WebSocket;
  clientId: string | null;
  roomCode: string | null;
}

const socketClients = new Map<WebSocket, ClientSocketMeta>();

function broadcastToRoom(roomCode: string, payload: unknown): void {
  const message = JSON.stringify(payload);
  for (const meta of socketClients.values()) {
    if (meta.roomCode === roomCode && meta.ws.readyState === WebSocket.OPEN) {
      meta.ws.send(message);
    }
  }
}

function pushRoomFeed(room: StudyRoomState, item: RoomFeedItem): void {
  room.feed.push(item);
  if (room.feed.length > 40) {
    room.feed = room.feed.slice(-40);
  }
}

// Authoritative 1-second tick loop for active Co-Op Study Rooms
setInterval(() => {
  for (const room of Object.values(store.rooms)) {
    if (room.members.length === 0) continue;
    if (room.sharedTimer.mode === 'coop' && room.sharedTimer.status === 'running') {
      room.sharedTimer.remainingSeconds = Math.max(0, room.sharedTimer.remainingSeconds - 1);

      for (const member of room.members) {
        member.timerStatus = 'studying';
        member.timerRemainingSeconds = room.sharedTimer.remainingSeconds;
        member.sessionFocusSeconds += 1;
      }

      if (room.sharedTimer.remainingSeconds === 0) {
        room.sharedTimer.status = 'idle';
        room.sharedTimer.remainingSeconds = room.sharedTimer.durationSeconds;
        room.sharedTimer.startedAt = null;

        const completedFullHour = room.sharedTimer.durationSeconds >= HOUR_SECONDS;
        const awardedPoints = completedFullHour ? POINTS_PER_HOUR : 0;

        if (awardedPoints > 0) {
          for (const member of room.members) {
            member.sessionPoints += awardedPoints;
            member.totalPoints += awardedPoints;
          }
        }

        const now = Date.now();
        pushRoomFeed(room, {
          id: `mile_${now}`,
          type: 'milestone',
          senderName: 'StudyClub',
          text: completedFullHour
            ? `Co-Op 1-Hour Sprint complete! Everyone in the room earned +${POINTS_PER_HOUR} points!`
            : `Co-Op focus sprint finished (${Math.round(room.sharedTimer.durationSeconds / 60)}m added toward your +5 pt hour)!`,
          timestamp: now,
        });

        if (
          room.competitionMode === 'competitive' &&
          room.raceTargetPoints > 0 &&
          !room.winnerId &&
          room.members.length > 0
        ) {
          const top = [...room.members].sort((a, b) => b.sessionPoints - a.sessionPoints)[0];
          if (top && top.sessionPoints >= room.raceTargetPoints) {
            room.winnerId = top.clientId;
            pushRoomFeed(room, {
              id: `win_${now}`,
              type: 'milestone',
              senderName: top.name,
              text: `${top.name} reached ${room.raceTargetPoints} pts and claimed 1st place in the Points Race!`,
              timestamp: now,
            });
            broadcastToRoom(room.code, { type: 'room:race_winner', winner: top, room });
          }
        }

        broadcastToRoom(room.code, {
          type: 'room:sprint_completed',
          durationSeconds: room.sharedTimer.durationSeconds,
          awardedPoints,
          room,
        });
        scheduleSave();
      } else {
        broadcastToRoom(room.code, {
          type: 'room:tick',
          sharedTimer: room.sharedTimer,
          members: room.members,
        });
      }
    }
  }
}, 1000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get('/api/workspace/:id', (req, res) => {
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!id) {
      res.status(400).json({ error: 'Invalid workspace id' });
      return;
    }
    if (!store.workspaces[id]) {
      store.workspaces[id] = createStarterWorkspace(id);
      scheduleSave();
    }
    res.json(store.workspaces[id]);
  });

  app.put('/api/workspace/:id', (req, res) => {
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!id) {
      res.status(400).json({ error: 'Invalid workspace id' });
      return;
    }
    const body = req.body as WorkspaceState;
    if (!body || !body.profile || !Array.isArray(body.tasks)) {
      res.status(400).json({ error: 'Invalid workspace payload' });
      return;
    }
    store.workspaces[id] = {
      profile: body.profile,
      tasks: body.tasks.slice(0, 200),
    };
    scheduleSave();
    res.json({ ok: true });
  });

  app.post('/api/plans/share', (req, res) => {
    const { ownerName, ownerAvatarId, tasks } = req.body as {
      ownerName?: string;
      ownerAvatarId?: string;
      tasks?: StudyTask[];
    };
    if (!Array.isArray(tasks)) {
      res.status(400).json({ error: 'Tasks array required' });
      return;
    }
    let shareId = generateShortCode(6);
    while (store.sharedPlans[shareId]) {
      shareId = generateShortCode(6);
    }
    const snapshot: SharedPlanSnapshot = {
      shareId,
      ownerName: (ownerName || 'Scholar').slice(0, 32),
      ownerAvatarId: ownerAvatarId || 'fox',
      tasks: tasks.slice(0, 100),
      createdAt: Date.now(),
    };
    store.sharedPlans[shareId] = snapshot;
    scheduleSave();
    res.json({ shareId, snapshot });
  });

  app.get('/api/plans/:shareId', (req, res) => {
    const shareId = req.params.shareId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const snapshot = store.sharedPlans[shareId];
    if (!snapshot) {
      res.status(404).json({ error: 'Shared weekly plan not found' });
      return;
    }
    res.json(snapshot);
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Object.values(store.rooms)
      .sort((a, b) => b.members.length - a.members.length || b.createdAt - a.createdAt)
      .slice(0, 12)
      .map((room) => ({
        code: room.code,
        name: room.name,
        memberCount: room.members.length,
        maxCapacity: room.maxCapacity,
        mode: room.sharedTimer.mode,
        competitionMode: room.competitionMode || 'friendly',
      }));
    res.json({ rooms: list });
  });

  app.post('/api/rooms', (req, res) => {
    const { name, hostId, squadGoalMinutes, competitionMode, raceTargetPoints } = req.body as {
      name?: string;
      hostId?: string;
      squadGoalMinutes?: number;
      competitionMode?: 'friendly' | 'competitive';
      raceTargetPoints?: number;
    };
    let code = generateShortCode(6);
    while (store.rooms[code]) {
      code = generateShortCode(6);
    }
    const mode = competitionMode === 'competitive' ? 'competitive' : 'friendly';
    const target = typeof raceTargetPoints === 'number' ? raceTargetPoints : 15;
    const room = createRoomObject(
      code,
      name || 'Study Squad Room',
      hostId || 'host',
      squadGoalMinutes || 300,
      mode,
      target
    );
    store.rooms[code] = room;
    scheduleSave();
    res.json({ room });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const room = store.rooms[code];
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ room });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const meta: ClientSocketMeta = { ws, clientId: null, roomCode: null };
    socketClients.set(ws, meta);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; [key: string]: unknown };
        const type = msg.type;

        if (type === 'room:join') {
          const roomCode = String(msg.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const clientId = String(msg.clientId || '').slice(0, 64);
          const name = String(msg.name || 'Scholar').trim().slice(0, 28) || 'Scholar';
          const avatarId = String(msg.avatarId || 'fox');
          const currentTaskTitle = String(msg.currentTaskTitle || 'Open Focus Session').slice(0, 80);

          if (!roomCode || !clientId) {
            ws.send(JSON.stringify({ type: 'room:error', code: 'INVALID_JOIN', message: 'Room code and profile ID required.' }));
            return;
          }

          let room = store.rooms[roomCode];
          if (!room) {
            room = createRoomObject(roomCode, `Room ${roomCode}`, clientId, 300);
            store.rooms[roomCode] = room;
          }

          const existingIdx = room.members.findIndex((m) => m.clientId === clientId);
          if (existingIdx === -1 && room.members.length >= MAX_ROOM_MEMBERS) {
            ws.send(
              JSON.stringify({
                type: 'room:error',
                code: 'ROOM_FULL',
                message: `Room ${roomCode} is full (${MAX_ROOM_MEMBERS}/${MAX_ROOM_MEMBERS} seats occupied).`,
              })
            );
            return;
          }

          // Leave previous room if switching
          if (meta.roomCode && meta.roomCode !== roomCode && meta.clientId) {
            const prevRoom = store.rooms[meta.roomCode];
            if (prevRoom) {
              prevRoom.members = prevRoom.members.filter((m) => m.clientId !== meta.clientId);
              broadcastToRoom(prevRoom.code, { type: 'room:state', room: prevRoom });
            }
          }

          meta.clientId = clientId;
          meta.roomCode = roomCode;

          const totalPoints = typeof msg.totalPoints === 'number' ? Math.max(0, Math.floor(msg.totalPoints)) : 0;
          const hourProgressSeconds =
            typeof msg.hourProgressSeconds === 'number' ? Math.max(0, Math.floor(msg.hourProgressSeconds)) : 0;

          const now = Date.now();
          if (existingIdx >= 0) {
            room.members[existingIdx] = {
              ...room.members[existingIdx],
              name,
              avatarId,
              currentTaskTitle,
              totalPoints,
              hourProgressSeconds,
            };
          } else {
            const isHost = room.members.length === 0 || room.hostId === clientId;
            if (isHost) room.hostId = clientId;
            room.members.push({
              clientId,
              name,
              avatarId,
              currentTaskTitle,
              timerStatus: room.sharedTimer.mode === 'coop' && room.sharedTimer.status === 'running' ? 'studying' : 'idle',
              timerRemainingSeconds: room.sharedTimer.remainingSeconds,
              sessionFocusSeconds: 0,
              sessionPoints: 0,
              totalPoints,
              hourProgressSeconds,
              connectedAt: now,
              isHost,
            });
            pushRoomFeed(room, {
              id: `join_${now}_${clientId}`,
              type: 'system',
              senderId: clientId,
              senderName: name,
              senderAvatarId: avatarId,
              text: `${name} pulled up a chair (${room.members.length}/${MAX_ROOM_MEMBERS} seats).`,
              timestamp: now,
            });
          }

          scheduleSave();
          broadcastToRoom(roomCode, { type: 'room:state', room });
          return;
        }

        if (type === 'room:leave') {
          if (meta.roomCode && meta.clientId) {
            const room = store.rooms[meta.roomCode];
            if (room) {
              const leaving = room.members.find((m) => m.clientId === meta.clientId);
              room.members = room.members.filter((m) => m.clientId !== meta.clientId);
              if (room.hostId === meta.clientId && room.members.length > 0) {
                room.hostId = room.members[0].clientId;
                room.members[0].isHost = true;
              }
              if (leaving) {
                pushRoomFeed(room, {
                  id: `leave_${Date.now()}`,
                  type: 'system',
                  senderName: leaving.name,
                  text: `${leaving.name} stepped away from the desk.`,
                  timestamp: Date.now(),
                });
              }
              broadcastToRoom(room.code, { type: 'room:state', room });
              scheduleSave();
            }
          }
          meta.roomCode = null;
          return;
        }

        if (!meta.roomCode || !meta.clientId) return;
        const room = store.rooms[meta.roomCode];
        if (!room) return;

        if (type === 'room:update_presence') {
          const member = room.members.find((m) => m.clientId === meta.clientId);
          if (!member) return;

          if (typeof msg.name === 'string') {
            member.name = msg.name.trim().slice(0, 28) || member.name;
          }
          if (typeof msg.avatarId === 'string') {
            member.avatarId = msg.avatarId;
          }
          if (typeof msg.currentTaskTitle === 'string') {
            member.currentTaskTitle = msg.currentTaskTitle.slice(0, 80);
          }
          if (room.sharedTimer.mode === 'solo') {
            if (msg.timerStatus === 'idle' || msg.timerStatus === 'studying' || msg.timerStatus === 'break') {
              member.timerStatus = msg.timerStatus;
            }
            if (typeof msg.timerRemainingSeconds === 'number') {
              member.timerRemainingSeconds = Math.max(0, Math.floor(msg.timerRemainingSeconds));
            }
          }
          if (typeof msg.sessionFocusSeconds === 'number') {
            member.sessionFocusSeconds = Math.max(member.sessionFocusSeconds, Math.floor(msg.sessionFocusSeconds));
          }
          if (typeof msg.sessionPoints === 'number') {
            member.sessionPoints = Math.max(member.sessionPoints, Math.floor(msg.sessionPoints));
          }
          if (typeof msg.totalPoints === 'number') {
            member.totalPoints = Math.max(0, Math.floor(msg.totalPoints));
          }
          if (typeof msg.hourProgressSeconds === 'number') {
            member.hourProgressSeconds = Math.max(0, Math.floor(msg.hourProgressSeconds));
          }

          broadcastToRoom(room.code, { type: 'room:state', room });
          return;
        }

        if (type === 'room:set_competition') {
          const sender = room.members.find((m) => m.clientId === meta.clientId);
          if (msg.competitionMode === 'competitive' || msg.competitionMode === 'friendly') {
            room.competitionMode = msg.competitionMode;
            pushRoomFeed(room, {
              id: `comp_${Date.now()}`,
              type: 'system',
              senderName: sender?.name || 'StudyClub',
              text:
                room.competitionMode === 'competitive'
                  ? `${sender?.name || 'Someone'} switched the room to Competitive Points Race!`
                  : `${sender?.name || 'Someone'} switched the room to Friendly Co-Op mode.`,
              timestamp: Date.now(),
            });
          }
          if (typeof msg.raceTargetPoints === 'number') {
            room.raceTargetPoints = Math.max(0, Math.min(100, Math.floor(msg.raceTargetPoints)));
          }
          if (msg.resetRound === true) {
            room.winnerId = null;
            for (const m of room.members) {
              m.sessionPoints = 0;
              m.sessionFocusSeconds = 0;
            }
            pushRoomFeed(room, {
              id: `rst_${Date.now()}`,
              type: 'system',
              senderName: sender?.name || 'StudyClub',
              text: `${sender?.name || 'Host'} started a fresh Points Race round!`,
              timestamp: Date.now(),
            });
          }
          scheduleSave();
          broadcastToRoom(room.code, { type: 'room:state', room });
          return;
        }

        if (type === 'room:coop_timer') {
          const action = String(msg.action || '');
          if (action === 'set_mode') {
            room.sharedTimer.mode = msg.mode === 'solo' ? 'solo' : 'coop';
            if (room.sharedTimer.mode === 'solo') {
              room.sharedTimer.status = 'idle';
            }
          } else if (action === 'set_duration' && typeof msg.durationSeconds === 'number') {
            const secs = Math.max(300, Math.min(7200, Math.floor(msg.durationSeconds)));
            room.sharedTimer.durationSeconds = secs;
            room.sharedTimer.remainingSeconds = secs;
            room.sharedTimer.status = 'idle';
          } else if (action === 'start') {
            room.sharedTimer.mode = 'coop';
            room.sharedTimer.status = 'running';
            room.sharedTimer.startedAt = Date.now();
          } else if (action === 'pause') {
            room.sharedTimer.status = 'paused';
            for (const m of room.members) {
              m.timerStatus = 'idle';
            }
          } else if (action === 'reset') {
            room.sharedTimer.status = 'idle';
            room.sharedTimer.remainingSeconds = room.sharedTimer.durationSeconds;
            room.sharedTimer.startedAt = null;
            for (const m of room.members) {
              m.timerStatus = 'idle';
              m.timerRemainingSeconds = room.sharedTimer.durationSeconds;
            }
          }
          scheduleSave();
          broadcastToRoom(room.code, { type: 'room:state', room });
          return;
        }

        if (type === 'room:cheer') {
          const fromMember = room.members.find((m) => m.clientId === meta.clientId);
          const toClientId = String(msg.toClientId || '');
          const toMember = room.members.find((m) => m.clientId === toClientId);
          const cheerType = String(msg.cheerType || 'highfive');
          if (!fromMember || !toMember) return;

          const labels: Record<string, string> = {
            highfive: 'sent a High Five to',
            coffee: 'brewed a Coffee Boost for',
            spark: 'sent a Brain Spark to',
            clap: 'cheered on',
          };

          const now = Date.now();
          pushRoomFeed(room, {
            id: `cheer_${now}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'cheer',
            senderId: fromMember.clientId,
            senderName: fromMember.name,
            senderAvatarId: fromMember.avatarId,
            text: `${fromMember.name} ${labels[cheerType] || 'cheered on'} ${toMember.name}!`,
            timestamp: now,
          });

          broadcastToRoom(room.code, {
            type: 'room:cheer_pop',
            id: `pop_${now}_${Math.random().toString(36).slice(2, 6)}`,
            roomCode: room.code,
            fromClientId: fromMember.clientId,
            fromName: fromMember.name,
            toClientId: toMember.clientId,
            toName: toMember.name,
            cheerType,
            timestamp: now,
          });
          broadcastToRoom(room.code, { type: 'room:state', room });
          return;
        }

        if (type === 'room:chat') {
          const sender = room.members.find((m) => m.clientId === meta.clientId);
          const text = String(msg.text || '').trim().slice(0, 240);
          if (!sender || !text) return;

          pushRoomFeed(room, {
            id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'chat',
            senderId: sender.clientId,
            senderName: sender.name,
            senderAvatarId: sender.avatarId,
            text,
            timestamp: Date.now(),
          });
          scheduleSave();
          broadcastToRoom(room.code, { type: 'room:state', room });
          return;
        }

        if (type === 'room:milestone') {
          const sender = room.members.find((m) => m.clientId === meta.clientId);
          const text = String(msg.text || '').trim().slice(0, 160);
          if (!sender || !text) return;

          if (typeof msg.earnedPoints === 'number' && msg.earnedPoints > 0) {
            const pts = Math.floor(msg.earnedPoints);
            sender.sessionPoints += pts;
            sender.totalPoints += pts;
          }

          const now = Date.now();
          pushRoomFeed(room, {
            id: `mile_${now}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'milestone',
            senderId: sender.clientId,
            senderName: sender.name,
            senderAvatarId: sender.avatarId,
            text,
            timestamp: now,
          });

          if (
            room.competitionMode === 'competitive' &&
            room.raceTargetPoints > 0 &&
            !room.winnerId &&
            sender.sessionPoints >= room.raceTargetPoints
          ) {
            room.winnerId = sender.clientId;
            pushRoomFeed(room, {
              id: `win_${now}`,
              type: 'milestone',
              senderName: sender.name,
              text: `${sender.name} reached ${room.raceTargetPoints} pts and won the Points Race!`,
              timestamp: now,
            });
            broadcastToRoom(room.code, { type: 'room:race_winner', winner: sender, room });
          }

          scheduleSave();
          broadcastToRoom(room.code, { type: 'room:state', room });
          return;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      const closedMeta = socketClients.get(ws);
      socketClients.delete(ws);
      if (closedMeta?.roomCode && closedMeta?.clientId) {
        const room = store.rooms[closedMeta.roomCode];
        if (room) {
          // Only remove if no other open socket holds this clientId in this room
          const stillConnectedElsewhere = Array.from(socketClients.values()).some(
            (m) => m.roomCode === closedMeta.roomCode && m.clientId === closedMeta.clientId
          );
          if (!stillConnectedElsewhere) {
            const leaving = room.members.find((m) => m.clientId === closedMeta.clientId);
            room.members = room.members.filter((m) => m.clientId !== closedMeta.clientId);
            if (room.hostId === closedMeta.clientId && room.members.length > 0) {
              room.hostId = room.members[0].clientId;
              room.members[0].isHost = true;
            }
            if (leaving) {
              pushRoomFeed(room, {
                id: `disc_${Date.now()}`,
                type: 'system',
                senderName: leaving.name,
                text: `${leaving.name} left the study room.`,
                timestamp: Date.now(),
              });
            }
            broadcastToRoom(room.code, { type: 'room:state', room });
            scheduleSave();
          }
        }
      }
    });
  });

  // Vite dev middleware or static dist serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyClub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StudyClub server:', err);
  process.exit(1);
});
