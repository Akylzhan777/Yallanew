import { supabase } from './supabase';

const DEADLINE_HOURS = 48;

export interface DeadlineStatus {
  hoursRemaining: number;
  minutesRemaining: number;
  isOverdue: boolean;
  isPenaltyApplied: boolean;
  deadlineTime: Date;
}

export function calculateProgressivePenalty(hoursOverdue: number): number {
  if (hoursOverdue <= 24) return 500;
  if (hoursOverdue <= 48) return 5000;
  if (hoursOverdue <= 72) return 10000;
  return 20000;
}

export function getOverdueHours(claimedAt: string | null): number {
  if (!claimedAt) return 0;
  const claimedDate = new Date(claimedAt);
  const deadlineTime = new Date(claimedDate.getTime() + DEADLINE_HOURS * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = now.getTime() - deadlineTime.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

export function getDeadlineStatus(claimedAt: string | null): DeadlineStatus | null {
  if (!claimedAt) return null;

  const claimedDate = new Date(claimedAt);
  const deadlineTime = new Date(claimedDate.getTime() + DEADLINE_HOURS * 60 * 60 * 1000);
  const now = new Date();
  const timeDiff = deadlineTime.getTime() - now.getTime();

  const totalSeconds = Math.floor(timeDiff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return {
    hoursRemaining: Math.max(0, hours),
    minutesRemaining: Math.max(0, minutes),
    isOverdue: timeDiff < 0,
    isPenaltyApplied: false,
    deadlineTime,
  };
}

export function formatDeadlineTime(hoursRemaining: number, minutesRemaining: number): string {
  if (hoursRemaining === 0 && minutesRemaining === 0) return 'Время истекло';
  return `${hoursRemaining}ч ${minutesRemaining}м`;
}

export async function checkAndApplyDeadlinePenalties(): Promise<void> {
  try {
    const { data: pendingTasks, error: fetchError } = await supabase
      .from('video_units')
      .select('id, editor_name, claimed_at, deadline_penalty_applied, editing_status')
      .eq('editing_status', 'in_progress')
      .not('editor_name', 'is', null)
      .not('claimed_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching pending tasks:', fetchError);
      return;
    }

    if (!pendingTasks) return;

    const now = new Date();
    const editorPenalties: { [editorName: string]: number } = {};

    for (const task of pendingTasks) {
      if (!task.claimed_at || task.deadline_penalty_applied) continue;

      const claimedDate = new Date(task.claimed_at);
      const deadline = new Date(claimedDate.getTime() + DEADLINE_HOURS * 60 * 60 * 1000);

      if (now > deadline) {
        const hoursOverdue = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60);
        const penaltyAmount = calculateProgressivePenalty(hoursOverdue);

        if (task.editor_name) {
          editorPenalties[task.editor_name] = (editorPenalties[task.editor_name] ?? 0) + penaltyAmount;
        }

        await supabase
          .from('video_units')
          .update({
            deadline_penalty_applied: true,
            penalty_amount: penaltyAmount,
          })
          .eq('id', task.id);
      }
    }

    for (const [editorName, penaltyAmount] of Object.entries(editorPenalties)) {
      const { data: editorBalance, error: balanceError } = await supabase
        .from('editor_balances')
        .select('balance')
        .eq('editor_name', editorName)
        .maybeSingle();

      if (!balanceError && editorBalance) {
        const newBalance = editorBalance.balance - penaltyAmount;
        await supabase
          .from('editor_balances')
          .update({ balance: newBalance })
          .eq('editor_name', editorName);
      }
    }
  } catch (e) {
    console.error('Error checking deadline penalties:', e);
  }
}
