'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';

interface MediaData {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  mediaType: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  isEphemeral?: boolean;
  isViewOnce?: boolean;
  archiveStatus?: string;
  createdAt: string;
  message?: {
    id: string;
    chatId: string;
    telegramMessageId: number;
    telegramDate: string;
    text: string | null;
    caption: string | null;
    senderName: string | null;
    isDeleted: boolean;
  };
}

export default function MediaViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const mediaId = resolvedParams.id;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading, error } = useQuery<MediaData>({
    queryKey: ['media-view', mediaId],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}?json=true`, { credentials: 'include' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data;
    },
  });

  const mediaUrl = `/api/media/${mediaId}`;
  const backHref = data?.message?.chatId ? `/archive/${data.message.chatId}` : '/archive';

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-sg-bg text-sg-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0d0d12]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            className="p-2 -ml-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sg-text-secondary hover:text-white transition-colors"
            aria-label="Назад в чат"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate text-white">
              {data?.fileName || (data?.mediaType ? `${data.mediaType.toUpperCase()} в архиве` : 'Медиафайл')}
            </h1>
            <p className="text-2xs text-emerald-400 flex items-center gap-1 truncate">
              <ShieldCheck className="w-3 h-3" />
              <span>Защищённое хранилище SerkoGram</span>
            </p>
          </div>
        </div>

        {data && (
          <a
            href={mediaUrl}
            download={data.fileName || `media_${data.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Скачать</span>
          </a>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-xs text-sg-text-muted">Загрузка медиафайла из защищённого архива...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-semibold text-white mb-2">Медиафайл недоступен</h2>
            <p className="text-xs text-sg-text-secondary max-w-sm mb-6">
              {(error as Error).message || 'Не удалось загрузить медиафайл или доступ ограничен владельцем.'}
            </p>
            <Link
              href={backHref}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-medium text-white transition-colors"
            >
              Вернуться в архив
            </Link>
          </div>
        ) : data ? (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Ephemeral / View-Once Notice Banner */}
            {(data.isEphemeral || data.isViewOnce) && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-200 text-xs">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-300">Одноразовое / исчезающее медиа</p>
                  <p className="text-2xs text-amber-200/80">
                    Медиафайл был успешно зафиксирован SerkoGram до истечения таймера самоуничтожения Telegram.
                  </p>
                </div>
              </div>
            )}

            {/* Media Player / Viewer Viewport */}
            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-2xl flex items-center justify-center min-h-[300px] max-h-[75vh]">
              {data.mediaType === 'photo' ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl}
                    alt={data.fileName || 'Фото архива'}
                    className={`max-h-[70vh] w-auto max-w-full object-contain rounded-lg transition-transform ${
                      isFullscreen ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  />
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/60 backdrop-blur text-white/80 hover:text-white"
                    aria-label="Toggle zoom"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : data.mediaType === 'video' || data.mediaType === 'animation' || data.mediaType === 'video_note' ? (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    loop={data.mediaType === 'animation'}
                    autoPlay={data.mediaType === 'animation'}
                    muted={data.mediaType === 'animation'}
                    className="max-h-[70vh] w-auto max-w-full rounded-lg"
                  >
                    Ваш браузер не поддерживает воспроизведение видео.
                  </video>
                </div>
              ) : data.mediaType === 'voice' || data.mediaType === 'audio' ? (
                <div className="p-8 w-full max-w-md flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">
                      {data.mediaType === 'voice' ? 'Голосовое сообщение' : 'Аудиозапись'}
                    </p>
                    <p className="text-2xs text-sg-text-muted mt-1">
                      {data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : ''}
                      {data.fileSize ? ` • ${formatFileSize(data.fileSize)}` : ''}
                    </p>
                  </div>
                  <audio src={mediaUrl} controls className="w-full mt-2" />
                </div>
              ) : (
                <div className="p-8 w-full max-w-md flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white/80">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white break-all">
                      {data.fileName || 'Документ'}
                    </p>
                    <p className="text-2xs text-sg-text-muted mt-1">
                      {formatFileSize(data.fileSize)} • {data.mimeType || 'application/octet-stream'}
                    </p>
                  </div>
                  <a
                    href={mediaUrl}
                    download={data.fileName || 'document'}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать документ</span>
                  </a>
                </div>
              )}
            </div>

            {/* Metadata & Context Card */}
            <div className="rounded-2xl bg-[#141419]/80 border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-2">
                <span className="text-sg-text-muted">Статус сохранения</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Сохранено в постоянном архиве</span>
                </span>
              </div>

              {data.message && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sg-text-muted">Отправитель</span>
                    <span className="text-white font-medium">{data.message.senderName || 'Собеседник'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sg-text-muted">Дата отправки</span>
                    <span className="text-zinc-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-sg-text-muted" />
                      <span>{formatDate(data.message.telegramDate || data.createdAt)}</span>
                    </span>
                  </div>

                  {(data.message.caption || data.message.text) && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <p className="text-2xs text-sg-text-muted mb-1">Подпись / Текст:</p>
                      <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                        {data.message.caption || data.message.text}
                      </p>
                    </div>
                  )}

                  {data.message.isDeleted && (
                    <div className="pt-2 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Оригинальное сообщение удалено из Telegram (сохранено в SerkoGram)</span>
                    </div>
                  )}
                </>
              )}

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <Link
                  href={backHref}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Перейти к диалогу</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="text-[11px] text-sg-text-muted">ID: {data.id.slice(0, 12)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
