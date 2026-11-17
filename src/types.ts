export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'backlog';

export type TaskPriority = 'low' | 'medium' | 'high';

export type ThemeId = 'tangerine' | 'lavender' | 'matcha' | 'cobalt' | 'sunset' | 'berry';

export type AvatarId = 'fox' | 'cat' | 'frog' | 'bear' | 'owl';

export type CheerType = 'highfive' | 'coffee' | 'spark' | 'clap';

export type AmbientSound = 'off' | 'rain' | 'brown' | 'chord' | 'musicbox';

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  day: DayKey;
  estimatedMinutes: number;
  priority: TaskPriority;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface PointEvent {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarId: AvatarId;
  themeId: ThemeId;
  points: number;
  totalFocusSeconds: number;
  hourProgressSeconds: number;
  completedHours: number;
  dailyFocusSeconds?: Record<string, number>;
  unlockedThemes: ThemeId[];
  unlockedBadges: string[];
  pointHistory: PointEvent[];
}

export interface WorkspaceState {
  profile: UserProfile;
  tasks: StudyTask[];
}

export interface RoomMember {
  clientId: string;
  name: string;
  avatarId: AvatarId;
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

export interface RoomSharedTimer {
  mode: 'coop' | 'solo';
  status: 'idle' | 'running' | 'paused';
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
}

export interface RoomFeedItem {
  id: string;
  type: 'chat' | 'milestone' | 'cheer' | 'system';
  senderId?: string;
  senderName: string;
  senderAvatarId?: AvatarId;
  text: string;
  timestamp: number;
}

export interface StudyRoomState {
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

export interface RoomSummary {
  code: string;
  name: string;
  memberCount: number;
  maxCapacity: number;
  mode: 'coop' | 'solo';
  competitionMode: 'friendly' | 'competitive';
}

export interface SharedPlanSnapshot {
  shareId: string;
  ownerName: string;
  ownerAvatarId: AvatarId;
  tasks: StudyTask[];
  createdAt: number;
}

export interface CheerEventPayload {
  id: string;
  roomCode: string;
  fromClientId: string;
  fromName: string;
  toClientId: string;
  toName: string;
  cheerType: CheerType;
  timestamp: number;
}
