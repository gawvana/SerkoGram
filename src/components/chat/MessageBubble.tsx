'use client';

import { useState } from 'react';
import {
  CheckCheck,
  Trash2,
  Pencil,
  FileText,
  Play,
  Pause,
  Image as ImageIcon,
  Video as VideoIcon,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MessageItem } from '@/lib/types';

interface MessageBubbleProps {
  msg: MessageItem;
}

export function MessageBubble({ msg }: MessageBubbleProps) {
  const isOut = msg.isOutgoing;
  const isDeleted = msg.isDeleted;
  const isEdited = msg.isEdited;
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; version: number; text: string | null; editedAt: string }>>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Format time
  const time = new Date(msg.telegramDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const deletedTime = msg.deletedAt
    ? new Date(msg.deletedAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleFetchVersions = async () => {
    if (showVersions) {
      setShowVersions(false);
      return;
    }

    if (versions.length === 0) {
      setLoadingVersions(true);
      try {
        const res = await fetch(`/api/messages/${msg.id}/versions`, { credentials: 'include' });
        const json = await res.json();
        if (json.success && json.data) {
          setVersions(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch versions:', err);
      } finally {
        setLoadingVersions(false);
      }
    }
    setShowVersions(true);
  };

  return (
    <div className={`flex w-full mb-2.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 relative shadow-sm transition-all ${
          isDeleted
            ? 'bg-red-950/30 border border-red-500/30 text-sg-text-primary rounded-bl-sm'
            : isOut
            ? 'bg-sg-purple text-white rounded-br-sm'
            : 'bg-sg-surface-2 text-white border border-sg-border rounded-bl-sm'
        }`}
      >
        {/* Deleted Message Header */}
        {isDeleted && (
          <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-red-500/20 text-red-400 text-xs font-semibold">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Сообщение удалено</span>
            {deletedTime && <span className="text-[10px] text-red-300/70 ml-auto">в {deletedTime}</span>}
          </div>
        )}

        {/* Sender name for incoming messages */}
        {!isOut && msg.senderName && !isDeleted && (
          <div className="text-xs font-medium text-sg-purple-light mb-1 select-none">
            {msg.senderName}
          </div>
        )}

        {/* Forward origin */}
        {msg.forwardFromName && (
          <div className="text-2xs text-sg-text-muted mb-1 border-l-2 border-sg-purple pl-1.5">
            Переслано от <span className="text-white font-medium">{msg.forwardFromName}</span>
          </div>
        )}

        {/* Reply preview */}
        {msg.replyToMessageId && (
          <div className="text-2xs bg-black/20 rounded-md p-1.5 mb-1.5 border-l-2 border-white/60">
            <span className="opacity-80">Ответ на сообщение #{msg.replyToMessageId}</span>
          </div>
        )}

        {/* Media Attachments */}
        {msg.media && msg.media.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {msg.media.map((item) => (
              <div key={item.id} className="rounded-xl overflow-hidden bg-black/20">
                {item.mediaType === 'photo' ? (
                  <div className="relative aspect-video flex items-center justify-center bg-black/30">
                    <ImageIcon className="w-8 h-8 text-white/50" />
                    <span className="text-2xs text-white/70 absolute bottom-1 right-2">Фото</span>
                  </div>
                ) : item.mediaType === 'video' ? (
                  <div className="relative aspect-video flex items-center justify-center bg-black/30">
                    <VideoIcon className="w-8 h-8 text-white/50" />
                    <span className="text-2xs text-white/70 absolute bottom-1 right-2">
                      {item.duration ? `${Math.floor(item.duration / 60)}:${item.duration % 60}` : 'Видео'}
                    </span>
                  </div>
                ) : item.mediaType === 'voice' || item.mediaType === 'audio' ? (
                  <div className="flex items-center gap-3 p-2.5">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                      aria-label="Play/Pause voice"
                    >
                      {isPlayingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-white rounded-full transition-all ${
                            isPlayingVoice ? 'w-2/3' : 'w-0'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1 text-[10px] opacity-70">
                        <span>{item.mediaType === 'voice' ? 'Голосовое' : 'Аудио'}</span>
                        <span>{item.duration ? `${item.duration} сек` : ''}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.fileName ?? 'Файл'}</p>
                      <p className="text-[10px] opacity-70">
                        {item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} КБ` : item.mimeType}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text / Caption */}
        {(msg.text || msg.caption) && (
          <div className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
            {msg.text ?? msg.caption}
          </div>
        )}

        {/* Metadata footer */}
        <div className="flex items-center justify-end gap-1.5 mt-1 select-none text-[11px] opacity-75">
          {isEdited && (
            <button
              type="button"
              onClick={handleFetchVersions}
              className="flex items-center gap-0.5 text-[10px] text-sg-purple-light hover:underline mr-1"
              title="Посмотреть историю изменений"
            >
              <Pencil className="w-2.5 h-2.5" />
              <span>изм.</span>
              {showVersions ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}

          <span>{time}</span>

          {isOut && <CheckCheck className="w-3.5 h-3.5" />}
        </div>

        {/* Versions dropdown */}
        {showVersions && (
          <div className="mt-2.5 pt-2 border-t border-white/10 text-xs space-y-1.5">
            <p className="text-[11px] font-semibold text-sg-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              История изменений:
            </p>
            {loadingVersions ? (
              <p className="text-[11px] text-sg-text-muted">Загрузка...</p>
            ) : versions.length === 0 ? (
              <p className="text-[11px] text-sg-text-muted">Предыдущих версий не найдено</p>
            ) : (
              versions.map((ver) => (
                <div key={ver.id} className="p-1.5 rounded bg-black/20 text-2xs space-y-0.5">
                  <div className="flex justify-between text-white/60 text-[10px]">
                    <span>Версия {ver.version}</span>
                    <span>{new Date(ver.editedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-white/90">{ver.text}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}