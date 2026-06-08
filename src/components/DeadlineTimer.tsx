import { useEffect, useState } from 'react';
import { getDeadlineStatus, formatDeadlineTime, getOverdueHours, calculateProgressivePenalty } from '../lib/deadlineUtils';

interface DeadlineTimerProps {
  claimedAt: string | null;
  deadlinePenaltyApplied: boolean;
}

export default function DeadlineTimer({ claimedAt, deadlinePenaltyApplied }: DeadlineTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; isOverdue: boolean } | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const status = getDeadlineStatus(claimedAt);
      if (!status) return;
      setTimeLeft({
        hours: status.hoursRemaining,
        minutes: status.minutesRemaining,
        isOverdue: status.isOverdue,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [claimedAt]);

  if (!timeLeft) return null;

  if (deadlinePenaltyApplied) {
    const hoursOverdue = getOverdueHours(claimedAt);
    const penalty = calculateProgressivePenalty(hoursOverdue);
    return (
      <span className="inline-flex items-center gap-1 bg-red-900/30 text-red-400 border border-red-800/50 rounded text-xs px-2 py-1">
        🔥 Просрочено (Штраф: -{penalty.toLocaleString('ru-RU')} ₸)
      </span>
    );
  }

  if (timeLeft.isOverdue) {
    const hoursOverdue = getOverdueHours(claimedAt);
    const penalty = calculateProgressivePenalty(hoursOverdue);
    return (
      <span className="inline-flex items-center gap-1 bg-red-900/30 text-red-400 border border-red-800/50 rounded text-xs px-2 py-1">
        🔥 Просрочено (Штраф: -{penalty.toLocaleString('ru-RU')} ₸)
      </span>
    );
  }

  const isWarning = timeLeft.hours < 12;

  return (
    <div style={{
      padding: '6px 10px',
      background: isWarning ? '#FF6B6B18' : '#3B82F618',
      border: `1px solid ${isWarning ? '#FF6B6B44' : '#3B82F644'}`,
      borderRadius: 6,
      color: isWarning ? '#FF6B6B' : '#3B82F6',
      fontSize: '0.8rem',
      fontWeight: 600,
    }}>
      Осталось: {formatDeadlineTime(timeLeft.hours, timeLeft.minutes)}
    </div>
  );
}
