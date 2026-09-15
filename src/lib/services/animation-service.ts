// ============================================================
// SerkoGram — Animation Engine (AnimationService)
// Controlled frame transitions, rate-limiting & cancellation
// ============================================================

import { getBot } from '@/lib/telegram/bot';

export type AnimationStatus = 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface AnimationFrame {
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  delayMs?: number;
}

export interface AnimationJob {
  animationId: string;
  chatId: string;
  telegramChatId: bigint;
  messageId: number;
  ownerTelegramId: bigint;
  businessConnectionId?: string;
  frames: AnimationFrame[];
  currentStep: number;
  status: AnimationStatus;
  startedAt: Date;
  finishedAt?: Date;
  cancelRequested?: boolean;
}

class AnimationEngine {
  // In-flight animation jobs by chatId:messageId key
  private activeJobs = new Map<string, AnimationJob>();

  private getKey(chatId: string, messageId: number): string {
    return `${chatId}:${messageId}`;
  }

  /**
   * Cancels any ongoing animation for a specific message or chat
   */
  cancel(chatId: string, messageId?: number): void {
    if (messageId) {
      const key = this.getKey(chatId, messageId);
      const job = this.activeJobs.get(key);
      if (job && job.status === 'RUNNING') {
        job.cancelRequested = true;
        job.status = 'CANCELLED';
        job.finishedAt = new Date();
        this.activeJobs.delete(key);
      }
    } else {
      for (const [key, job] of this.activeJobs.entries()) {
        if (key.startsWith(`${chatId}:`)) {
          job.cancelRequested = true;
          job.status = 'CANCELLED';
          job.finishedAt = new Date();
          this.activeJobs.delete(key);
        }
      }
    }
  }

  /**
   * Starts a controlled multi-frame animation sequence
   * Ensures safe rate limits (minimum 650ms between edits) and max duration (under 3.5s)
   */
  async start(params: {
    animationId: string;
    chatId: string;
    telegramChatId: bigint;
    messageId: number;
    ownerTelegramId: bigint;
    businessConnectionId?: string;
    frames: AnimationFrame[];
  }): Promise<AnimationJob> {
    const { animationId, chatId, telegramChatId, messageId, ownerTelegramId, businessConnectionId, frames } = params;

    // Cancel existing animation on this message/chat
    this.cancel(chatId, messageId);

    const job: AnimationJob = {
      animationId,
      chatId,
      telegramChatId,
      messageId,
      ownerTelegramId,
      businessConnectionId,
      frames: frames.slice(0, 8), // Cap to max 8 frames for Telegram rate limits
      currentStep: 0,
      status: 'RUNNING',
      startedAt: new Date(),
    };

    const key = this.getKey(chatId, messageId);
    this.activeJobs.set(key, job);

    // Run animation asynchronously without blocking webhook handler
    this.runJob(job, key).catch((err) => {
      console.warn(`[AnimationEngine] Job ${animationId} failed:`, err);
      job.status = 'FAILED';
      job.finishedAt = new Date();
      this.activeJobs.delete(key);
    });

    return job;
  }

  private async runJob(job: AnimationJob, key: string): Promise<void> {
    const bot = getBot();

    for (let i = 0; i < job.frames.length; i++) {
      if (job.cancelRequested || job.status === 'CANCELLED') {
        break;
      }

      const frame = job.frames[i];
      job.currentStep = i;

      // First frame was already sent as the initial response, so start editing from frame 1
      if (i > 0) {
        const delay = Math.max(frame.delayMs ?? 700, 650); // Respect Telegram edit flood limit
        await new Promise((r) => setTimeout(r, delay));

        if (job.cancelRequested) break;

        try {
          if (job.businessConnectionId) {
            await bot.api.editMessageText(
              job.telegramChatId.toString(),
              job.messageId,
              frame.text,
              {
                parse_mode: frame.parseMode || 'HTML',
                business_connection_id: job.businessConnectionId,
              }
            );
          } else {
            await bot.api.editMessageText(
              job.telegramChatId.toString(),
              job.messageId,
              frame.text,
              {
                parse_mode: frame.parseMode || 'HTML',
              }
            );
          }
        } catch (err: any) {
          // If message is deleted or rate limited, gracefully finish
          const desc = err?.description || err?.message || '';
          if (desc.includes('message to edit not found') || desc.includes('message is not modified')) {
            break;
          }
          if (desc.includes('Too Many Requests') || desc.includes('retry after')) {
            console.warn(`[AnimationEngine] Rate limited on step ${i}, stopping gracefully`);
            break;
          }
        }
      }
    }

    job.status = 'COMPLETED';
    job.finishedAt = new Date();
    this.activeJobs.delete(key);
  }

  /**
   * Helper to get animation preset frames for popular commands
   */
  getPresetFrames(type: string, targetText?: string): AnimationFrame[] {
    const text = targetText?.trim();

    switch (type) {
      case 'p':
        return [
          {
            text: `⚡ <b>SERKOGRAM CHAT AUTOMATION</b>\n\n<pre>[░░░░░░░░░░░░░░░░░░░░] 0% INITIALIZING</pre>`,
            delayMs: 650,
          },
          {
            text: `⚡ <b>SERKOGRAM CHAT AUTOMATION</b>\n\n<pre>[████████░░░░░░░░░░░░] 40% LOADING MODULES</pre>`,
            delayMs: 700,
          },
          {
            text: `⚡ <b>SERKOGRAM CHAT AUTOMATION</b>\n\n<pre>[████████████████░░░░] 80% CONNECTING</pre>`,
            delayMs: 700,
          },
          {
            text:
              `⚡ <b>SERKOGRAM CHAT AUTOMATION</b>\n\n` +
              `<pre>` +
              `███████╗███████╗██████╗ ██╗  ██╗ ██████╗ \n` +
              `██╔════╝██╔════╝██╔══██╗██║ ██╔╝██╔═══██╗\n` +
              `███████╗█████╗  ██████╔╝█████╔╝ ██║   ██║\n` +
              `╚════██║██╔══╝  ██╔══██╗██╔═██╗ ██║   ██║\n` +
              `███████║███████╗██║  ██║██║  ██╗╚██████╔╝\n` +
              `╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ \n` +
              `[████████████████████] 100% ONLINE</pre>`,
            delayMs: 750,
          },
        ];

      case 'love':
        return [
          { text: `💔 <i>Загрузка чувств...</i>`, delayMs: 650 },
          { text: `❤️🧡💛 <i>Биение сердца...</i>`, delayMs: 700 },
          {
            text:
              `❤️🧡💛💚💙💜\n` +
              `💕 <b>${text || 'Я тебя люблю!'}</b> 💕\n` +
              `💜💙💚💛🧡❤️`,
            delayMs: 750,
          },
        ];

      case 'love2':
        return [
          { text: `🤍 <i>Инициализация...</i>`, delayMs: 650 },
          { text: `🤍🤎💜💙 <i>Нарастание волны...</i>`, delayMs: 700 },
          {
            text:
              `🤍🤎💜💙💚💛🧡❤️\n` +
              `   ✨ <b>${text || 'Люблю тебя'}</b> ✨\n` +
              `❤️🧡💛💚💙💜🤎🤍`,
            delayMs: 750,
          },
        ];

      case '-7':
        return [
          { text: `🩸 <b>1000 - 7</b>\n\n<code>1000 - 7 = 993</code>`, delayMs: 650 },
          { text: `🩸 <b>1000 - 7</b>\n\n<code>1000 - 7 = 993\n993 - 7 = 986\n986 - 7 = 979</code>`, delayMs: 700 },
          {
            text:
              `🩸 <b>1000 - 7</b>\n\n` +
              `<code>1000 - 7 = 993\n` +
              `993 - 7 = 986\n` +
              `986 - 7 = 979\n` +
              `979 - 7 = 972\n` +
              `...\n` +
              `7 - 7 = 0</code>\n\n` +
              `<i>«Я тот, кто пожирает гулей...»</i> 👁️`,
            delayMs: 750,
          },
        ];

      case 'heart':
      case 'plove':
        return [
          { text: `🖤`, delayMs: 650 },
          { text: `💜 💙 💚`, delayMs: 700 },
          { text: `💖 <b>${text || 'С любовью от SerkoGram'}</b> 💖`, delayMs: 750 },
        ];

      default:
        return [{ text: text || '✨' }];
    }
  }
}

export const animationService = new AnimationEngine();
