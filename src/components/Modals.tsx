import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Share2, Users, X } from 'lucide-react';
import { AVATARS, DAYS_OF_WEEK } from '../constants';
import type { AvatarId, SharedPlanSnapshot, StudyRoomState, StudyTask, UserProfile } from '../types';
import { AvatarImg } from './AvatarImg';

interface ShareModalProps {
  isOpen: boolean;
  room: StudyRoomState | null;
  tasks: StudyTask[];
  profile: UserProfile;
  onClose: () => void;
  onCreateAndEnterRoom: (name: string) => void;
  onPublishWeeklyPlan: () => Promise<string | null>;
}

export function ShareModal({
  isOpen,
  room,
  tasks,
  profile,
  onClose,
  onCreateAndEnterRoom,
  onPublishWeeklyPlan,
}: ShareModalProps) {
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [publishingPlan, setPublishingPlan] = useState(false);
  const [copiedPlan, setCopiedPlan] = useState(false);

  if (!isOpen) return null;

  const roomInviteUrl = room
    ? `${window.location.origin}${window.location.pathname}?room=${room.code}`
    : null;

  const handleCopyRoom = () => {
    if (!roomInviteUrl) return;
    void navigator.clipboard.writeText(roomInviteUrl);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const handlePublishPlan = async () => {
    setPublishingPlan(true);
    const shareId = await onPublishWeeklyPlan();
    setPublishingPlan(false);
    if (shareId) {
      const url = `${window.location.origin}${window.location.pathname}?plan=${shareId}`;
      setPlanUrl(url);
      void navigator.clipboard.writeText(url);
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="share-modal-title" className="text-xl font-bold text-[var(--ink)]">
              Share &amp; Study Together
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Invite up to 5 friends to a live study room or share your weekly task schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: 5-Person Multiplayer Room Invite */}
        <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              Live 5-Person Study Room
            </h3>
            {room && (
              <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                {room.members.length}/{room.maxCapacity} seats
              </span>
            )}
          </div>

          {room && roomInviteUrl ? (
            <div className="space-y-2.5">
              <p className="text-xs text-[var(--ink-muted)]">
                Share code <span className="font-mono font-bold text-[var(--ink)]">{room.code}</span> or send the direct room link:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomInviteUrl}
                  className="flex-1 min-h-[38px] px-3 py-1.5 text-xs font-mono bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--ink)]"
                />
                <button
                  type="button"
                  onClick={handleCopyRoom}
                  className="min-h-[38px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {copiedRoom ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedRoom ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--ink-muted)]">
                You aren&apos;t in a room yet. Open a 5-seat room to generate an instant multiplayer invite link.
              </p>
              <button
                type="button"
                onClick={() => {
                  onCreateAndEnterRoom(`${profile.name}'s Study Room`);
                  onClose();
                }}
                className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg cursor-pointer"
              >
                Open New 5-Seat Room Now
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Share Weekly Plan Snapshot */}
        <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[var(--secondary)]" />
              Share Your Weekly Plan
            </h3>
            <span className="text-xs font-mono tabular-nums text-[var(--ink-faint)]">
              {tasks.length} tasks
            </span>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Generate a snapshot link of your Monday–Sunday task schedule so classmates can preview and import it.
          </p>

          {planUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={planUrl}
                className="flex-1 min-h-[38px] px-3 py-1.5 text-xs font-mono bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--ink)]"
              />
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(planUrl);
                  setCopiedPlan(true);
                  setTimeout(() => setCopiedPlan(false), 2000);
                }}
                className="min-h-[38px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--ink)] rounded-lg whitespace-nowrap cursor-pointer"
              >
                {copiedPlan ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPlan ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={publishingPlan || tasks.length === 0}
              onClick={handlePublishPlan}
              className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-[var(--ink)] hover:opacity-90 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {publishingPlan ? 'Creating Snapshot...' : 'Create Shareable Plan Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (name: string, avatarId: AvatarId) => void;
}

export function ProfileModal({ isOpen, profile, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [avatarId, setAvatarId] = useState<AvatarId>(profile.avatarId);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setAvatarId(profile.avatarId);
    }
  }, [isOpen, profile.name, profile.avatarId]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(name.trim() || 'Scholar', avatarId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-modal-title" className="text-xl font-bold text-[var(--ink)]">
              Scholar Identity
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Customize how you appear at the multiplayer study table.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="scholar-name" className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">
              Display Name
            </label>
            <input
              id="scholar-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={28}
              className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-[var(--canvas)] border border-[var(--border)] rounded-xl text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--ink-muted)] mb-2">Choose Study Companion</p>
            <div className="grid grid-cols-5 gap-2.5">
              {AVATARS.map((av) => {
                const selected = avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarId(av.id)}
                    className={`p-1.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <AvatarImg avatarId={av.id} alt={av.label} className="w-full aspect-square" />
                    <span className="block text-[11px] font-semibold text-[var(--ink)] mt-1.5 truncate">
                      {av.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[40px] px-5 py-2 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl cursor-pointer"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}

interface ImportedPlanModalProps {
  snapshot: SharedPlanSnapshot | null;
  onClose: () => void;
  onImportTasks: (tasks: StudyTask[]) => void;
}

export function ImportedPlanModal({ snapshot, onClose, onImportTasks }: ImportedPlanModalProps) {
  if (!snapshot) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AvatarImg avatarId={snapshot.ownerAvatarId} alt={snapshot.ownerName} className="w-11 h-11" />
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">{snapshot.ownerName}&apos;s Weekly Plan</h2>
              <p className="text-xs text-[var(--ink-muted)]">
                {snapshot.tasks.length} study tasks ready to add to your week
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ink-muted)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto border-y border-[var(--border)]">
          {snapshot.tasks.map((t) => {
            const dayLabel = DAYS_OF_WEEK.find((d) => d.key === t.day)?.short ?? 'Backlog';
            return (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-[var(--ink)] truncate">{t.title}</span>
                <span className="text-[var(--ink-faint)] font-mono tabular-nums whitespace-nowrap shrink-0">
                  {dayLabel} · {t.estimatedMinutes}m
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-[var(--ink-muted)] cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => {
              onImportTasks(snapshot.tasks);
              onClose();
            }}
            className="min-h-[40px] px-5 py-2 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl cursor-pointer"
          >
            Add Tasks to My Week
          </button>
        </div>
      </div>
    </div>
  );
}
