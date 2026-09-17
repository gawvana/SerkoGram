'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Download,
  AlertTriangle,
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
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 relative transition-all ${
          isDeleted
            ? 'bg-red-500/[0.08] backdrop-blur-md border border-red-500/25 text-zinc-100 rounded-bl-sm shadow-sm'
            : isOut
            ? 'bg-gradient-to-br from-[#065f46] to-[#047857] text-white rounded-br-sm shadow-[0_2px_12px_rgba(16,185,129,0.2)] border border-emerald-400/20'
            : 'bg-[#18181d]/85 backdrop-blur-md text-zinc-100 border border-white/[0.08] rounded-bl-sm shadow-sm'
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
          <div className="text-xs font-medium text-emerald-300 mb-1 select-none">
            {msg.senderName}
          </div>
        )}

        {/* Forward origin */}
        {msg.forwardFromName && (
          <div className="text-2xs text-sg-text-muted mb-1 border-l-2 border-emerald-500 pl-1.5">
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
            {msg.media.map((item) => {
              const isFailed = item.archiveStatus === 'FAILED';
              const isExpired = item.archiveStatus === 'EXPIRED_BEFORE_ARCHIVE';
              const isAvailable = Boolean(item.isDownloaded) && !isFailed;
              const mediaApiUrl = `/api/media/${item.id}`;
              const viewerUrl = `/archive/media/${item.id}`;

              return (
                <div key={item.id} className="rounded-xl overflow-hidden bg-black/20 border border-white/[0.06]">
                  {(item.isEphemeral || item.isViewOnce) && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-amber-500/15 border-b border-amber-500/20 text-amber-300 font-medium">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Одноразовое</span>
                      <span className="ml-auto text-[10px] opacity-80">
                        {item.archiveStatus === 'ARCHIVED'
                          ? 'Сохранено в архиве'
                          : isExpired
                          ? 'Истекло до архивации'
                          : isFailed
                          ? 'Ошибка загрузки'
                          : 'Временный файл'}
                      </span>
                    </div>
                  )}

                  {isFailed ? (
                    <div className="p-3 bg-red-500/10 text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>❌ Не удалось сохранить медиафайл</span>
                    </div>
                  ) : isExpired ? (
                    <div className="p-3 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>⚠️ Срок действия истёк на серверах Telegram</span>
                    </div>
                  ) : !isAvailable ? (
                    <div className="p-3 bg-white/[0.04] text-sg-text-muted text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>⚠️ Медиа сохранено, но сейчас недоступно для просмотра</span>
                    </div>
                  ) : item.mediaType === 'photo' ? (
                    <Link
                      href={viewerUrl}
                      className="block group relative overflow-hidden bg-black/40 cursor-pointer"
                      title="Нажмите, чтобы открыть фото"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaApiUrl}
                        alt={item.fileName || 'Фото'}
                        className="w-full max-h-72 object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-2xs text-white">
                          Открыть
                        </span>
                      </div>
                      <span className="text-2xs text-white/80 bg-black/60 px-1.5 py-0.5 rounded absolute bottom-1.5 right-1.5">
                        Фото
                      </span>
                    </Link>
                  ) : item.mediaType === 'video' || item.mediaType === 'video_note' ? (
                    <div className="relative overflow-hidden bg-black/40">
                      <video
                        src={mediaApiUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-72 object-cover"
                      />
                      <Link
                        href={viewerUrl}
                        className="flex items-center justify-between px-2.5 py-1.5 text-2xs text-white/70 hover:text-white bg-black/40 border-t border-white/[0.06] transition-colors"
                      >
                        <span>{item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : 'Видео'}</span>
                        <span className="text-emerald-400 hover:underline">Открыть плеер →</span>
                      </Link>
                    </div>
                  ) : item.mediaType === 'animation' ? (
                    <Link
                      href={viewerUrl}
                      className="block relative overflow-hidden bg-black/40 cursor-pointer"
                    >
                      <video
                        src={mediaApiUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full max-h-72 object-cover"
                      />
                      <span className="text-2xs text-white/80 bg-black/60 px-1.5 py-0.5 rounded absolute bottom-1.5 right-1.5">
                        GIF
                      </span>
                    </Link>
                  ) : item.mediaType === 'voice' || item.mediaType === 'audio' ? (
                    <div className="p-2.5 bg-black/20 space-y-1.5">
                      <div className="flex items-center justify-between text-2xs text-sg-text-secondary">
                        <span className="font-medium text-emerald-300">
                          {item.mediaType === 'voice' ? '🎙 Голосовое' : '🎵 Аудио'}
                        </span>
                        {item.duration && <span>{item.duration} сек</span>}
                      </div>
                      <audio
                        src={mediaApiUrl}
                        controls
                        preload="none"
                        className="w-full h-8"
                      />
                    </div>
                  ) : (
                    <a
                      href={mediaApiUrl}
                      download={item.fileName || 'file'}
                      className="flex items-center gap-2.5 p-2.5 hover:bg-white/[0.08] transition-colors"
                      title="Скачать файл"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate text-white">{item.fileName ?? 'Документ'}</p>
                        <p className="text-[10px] opacity-70">
                          {item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} КБ` : item.mimeType || 'Файл'}
                        </p>
                      </div>
                      <Download className="w-3.5 h-3.5 text-sg-text-muted hover:text-white shrink-0" />
                    </a>
                  )}
                </div>
              );
            })}
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
              className="flex items-center gap-0.5 text-[10px] text-emerald-300 hover:underline mr-1"
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