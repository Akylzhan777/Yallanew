import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

async function broadcastNewTask(clientName: string) {
  supabase.functions.invoke('editor-automations', {
    body: { action: 'broadcast_new_task', taskTitle: clientName },
  }).catch(() => {});
}

interface ManualTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (taskTitle?: string) => void;
  editors: Array<{ editor_name: string }>;
}

type TaskType = 'video' | 'cover';
type VideoFormat = 'reels' | 'youtube';

function calcAutoReward(taskType: TaskType, videoFormat: VideoFormat, minutes: number): number {
  if (taskType === 'cover') return 1200;
  if (videoFormat === 'youtube') return Math.max(1, minutes) * 10000;
  return 10000;
}

export default function ManualTaskModal({ isOpen, onClose, onTaskCreated, editors }: ManualTaskModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientPrice, setClientPrice] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [videoSourcesUrl, setVideoSourcesUrl] = useState('');
  const [photoCoverUrl, setPhotoCoverUrl] = useState('');
  const [assignedEditor, setAssignedEditor] = useState('free');
  const [taskType, setTaskType] = useState<TaskType>('video');
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('reels');
  const [minutes, setMinutes] = useState('');
  const [rewardInput, setRewardInput] = useState('10000');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isCoverOnly = taskType === 'cover';
  const isYouTube = taskType === 'video' && videoFormat === 'youtube';

  useEffect(() => {
    const mins = parseFloat(minutes) || 0;
    const auto = calcAutoReward(taskType, videoFormat, mins);
    setRewardInput(String(auto));
  }, [taskType, videoFormat, minutes]);

  const handleCreateTask = async () => {
    setError('');

    if (!clientName.trim()) {
      setError('Укажите имя клиента');
      return;
    }

    const parsedReward = parseInt(rewardInput.trim(), 10);
    if (isNaN(parsedReward) || parsedReward < 0) {
      setError('Укажите корректное вознаграждение');
      return;
    }

    try {
      setIsLoading(true);

      const isAssigned = assignedEditor !== 'free';
      const parsedClientPrice = clientPrice.trim() !== '' ? Number(clientPrice.trim()) : null;

      const newTask = {
        client_name: clientName.trim(),
        client_price: !isNaN(parsedClientPrice as number) && parsedClientPrice !== null ? parsedClientPrice : null,
        script: scriptText.trim() || null,
        raw_video_link: videoSourcesUrl.trim() || null,
        cover_photo_link: photoCoverUrl.trim() || null,
        editing_status: isAssigned ? 'in_progress' : 'pending',
        editor_name: isAssigned ? assignedEditor : null,
        claimed_at: isAssigned ? new Date().toISOString() : null,
        task_type: taskType,
        reward_amount: parsedReward,
        video_format: taskType === 'cover' ? null : (videoFormat === 'youtube' ? 'horizontal' : 'vertical'),
      };

      const { error: createError } = await supabase.from('video_units').insert([newTask]);

      if (createError) {
        setError('Ошибка создания задачи: ' + createError.message);
        return;
      }

      if (isAssigned) {
        const { data: editorBalance, error: balanceError } = await supabase
          .from('editor_balances')
          .select('balance')
          .eq('editor_name', assignedEditor)
          .maybeSingle();

        if (balanceError) {
          setError('Ошибка получения баланса: ' + balanceError.message);
          return;
        }

        const currentBalance = editorBalance?.balance ?? 0;
        const { error: updateError } = await supabase
          .from('editor_balances')
          .update({ balance: currentBalance + parsedReward })
          .eq('editor_name', assignedEditor);

        if (updateError) {
          setError('Ошибка обновления баланса: ' + updateError.message);
          return;
        }
      }

      broadcastNewTask(clientName.trim());
      const broadcastTitle = assignedEditor === 'free' ? clientName.trim() : undefined;
      onTaskCreated(broadcastTitle);
      setClientName('');
      setClientPrice('');
      setScriptText('');
      setVideoSourcesUrl('');
      setPhotoCoverUrl('');
      setAssignedEditor('free');
      setTaskType('video');
      setVideoFormat('reels');
      setMinutes('');
      setRewardInput('10000');
      onClose();
    } catch (e) {
      setError('Неожиданная ошибка: ' + String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const editorOptions = editors.map(e => e.editor_name).filter(Boolean);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#2C2F3A',
    border: '1px solid #3C3F4A',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.95rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600 as const,
    color: '#8F90A6',
    marginBottom: 8,
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        background: '#1C1E26',
        border: '1px solid #2C2F3A',
        borderRadius: 16,
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: '0 0 24px 0' }}>
          Добавить задачу вручную
        </h2>

        {/* Task type */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Тип задачи</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['video', 'cover'] as TaskType[]).map(t => {
              const isActive = taskType === t;
              const accent = t === 'cover' ? '#F59E0B' : '#3B82F6';
              return (
                <button
                  key={t}
                  onClick={() => setTaskType(t)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: isActive ? `${accent}18` : '#2C2F3A',
                    border: `1px solid ${isActive ? accent : '#3C3F4A'}`,
                    borderRadius: 8,
                    color: isActive ? accent : '#8F90A6',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'cover' ? '🎨 Обложка' : '🎬 Монтаж'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Video format (only for montage) */}
        {!isCoverOnly && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Формат видео</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { key: 'reels', label: '📱 Reels / Shorts', sub: 'Фикс' },
                { key: 'youtube', label: '🖥️ YouTube / Подкаст', sub: 'Поминутно' },
              ] as { key: VideoFormat; label: string; sub: string }[]).map(f => {
                const isActive = videoFormat === f.key;
                const accent = f.key === 'youtube' ? '#3B82F6' : '#A855F7';
                return (
                  <button
                    key={f.key}
                    onClick={() => setVideoFormat(f.key)}
                    style={{
                      flex: 1,
                      padding: '9px 10px',
                      background: isActive ? `${accent}18` : '#2C2F3A',
                      border: `1px solid ${isActive ? accent : '#3C3F4A'}`,
                      borderRadius: 8,
                      color: isActive ? accent : '#8F90A6',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left' as const,
                    }}
                  >
                    {f.label}
                    <div style={{ fontSize: '0.68rem', fontWeight: 500, marginTop: 2, opacity: 0.8 }}>
                      {f.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Duration input for YouTube */}
        {isYouTube && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Хронометраж (минут)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="1"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                placeholder="например, 9"
                style={{ ...inputStyle, paddingRight: 52 }}
              />
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#3B82F6', fontWeight: 700, fontSize: '0.78rem', pointerEvents: 'none',
              }}>
                мин
              </span>
            </div>
          </div>
        )}

        {/* Reward — editable */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Вознаграждение (₸)
            <span style={{ marginLeft: 6, fontSize: '0.72rem', fontWeight: 400, color: '#4B5063' }}>
              {isCoverOnly ? '· фикс' : isYouTube ? `· ${minutes || '?'} мин × 10 000` : '· фикс'}
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min="0"
              value={rewardInput}
              onChange={e => setRewardInput(e.target.value)}
              style={{
                ...inputStyle,
                paddingRight: 42,
                background: isCoverOnly ? '#F59E0B0D' : isYouTube ? '#3B82F60D' : '#3B82F60D',
                border: `1px solid ${isCoverOnly ? '#F59E0B33' : '#3B82F633'}`,
                fontWeight: 700,
                fontSize: '1rem',
                color: isCoverOnly ? '#F59E0B' : '#60A5FA',
              }}
            />
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: isCoverOnly ? '#F59E0B' : '#60A5FA',
              fontWeight: 700, fontSize: '0.82rem', pointerEvents: 'none',
            }}>
              ₸
            </span>
          </div>
          {!isCoverOnly && isYouTube && (
            <div style={{ marginTop: 5, fontSize: '0.73rem', color: '#4B5063' }}>
              Авторасчёт: {minutes || '?'} мин × 10 000 ₸ — можно изменить вручную
            </div>
          )}
        </div>

        {/* Client */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Клиент</label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Имя клиента"
            style={inputStyle}
          />
        </div>

        {/* Client price */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Цена для клиента (AED)
            <span style={{ color: '#8F90A6', fontWeight: 400 }}> — опционально</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              inputMode="numeric"
              value={clientPrice}
              onChange={e => setClientPrice(e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, paddingRight: 52 }}
            />
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#F59E0B', fontWeight: 700, fontSize: '0.82rem', pointerEvents: 'none',
            }}>
              AED
            </span>
          </div>
        </div>

        {/* Script */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Сценарий</label>
          <textarea
            value={scriptText}
            onChange={e => setScriptText(e.target.value)}
            placeholder="Текст сценария (опционально)"
            style={{
              ...inputStyle,
              fontFamily: 'inherit',
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Raw video link */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            Ссылка на исходники{isCoverOnly ? <span style={{ color: '#8F90A6', fontWeight: 400 }}> (необязательно)</span> : ''}
          </label>
          <input
            type="url"
            value={videoSourcesUrl}
            onChange={e => setVideoSourcesUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {/* Cover photo link */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Ссылка на фото/обложку</label>
          <input
            type="url"
            value={photoCoverUrl}
            onChange={e => setPhotoCoverUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {/* Assign editor */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Назначить монтажера</label>
          <select
            value={assignedEditor}
            onChange={e => setAssignedEditor(e.target.value)}
            style={inputStyle}
          >
            <option value="free">Оставить свободным</option>
            {editorOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#FF6B6B18',
            border: '1px solid #FF6B6B44',
            borderRadius: 8,
            color: '#FF6B6B',
            fontSize: '0.85rem',
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              background: '#2C2F3A',
              border: '1px solid #3C3F4A',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleCreateTask}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              background: isCoverOnly ? '#F59E0B' : '#3B82F6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Создание...' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </div>
  );
}
