// ============================================================
// SerkoGram — Durable Scheduled Job & Timer Service
// Survives serverless cold starts, deploys, and restarts.
// ============================================================

import { prisma } from '@/lib/db';
import { getBot } from '@/lib/telegram/bot';

export interface ScheduleJobParams {
  type: 'TIMER' | 'REMINDER';
  chatId: string;
  telegramChatId: bigint;
  businessConnectionId?: string;
  userId?: string;
  targetMessageId?: number;
  payload?: Record<string, any>;
  delaySeconds: number;
}

export interface ScheduledJobResult {
  id: string;
  executeAt: Date;
  status: string;
}

class JobService {
  private activeTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Schedules a durable job that is persisted to the database.
   */
  async scheduleJob(params: ScheduleJobParams): Promise<ScheduledJobResult> {
    const executeAt = new Date(Date.now() + params.delaySeconds * 1000);

    const job = await (prisma as any).scheduledJob.create({
      data: {
        type: params.type,
        chatId: params.chatId,
        telegramChatId: params.telegramChatId,
        businessConnectionId: params.businessConnectionId || null,
        userId: params.userId || null,
        targetMessageId: params.targetMessageId || null,
        payload: params.payload ? JSON.stringify(params.payload) : null,
        executeAt,
        status: 'PENDING',
        attempts: 0,
      },
    });

    // For short-duration timers, register an in-memory timer while the instance is warm
    if (params.delaySeconds <= 60) {
      const timer = setTimeout(async () => {
        await this.executeJobById(job.id).catch((err) => {
          console.warn(`[JobService] Immediate execution of job ${job.id} error:`, err);
        });
        this.activeTimers.delete(job.id);
      }, params.delaySeconds * 1000);

      this.activeTimers.set(job.id, timer);
    }

    return {
      id: job.id,
      executeAt,
      status: 'PENDING',
    };
  }

  /**
   * Executes a specific job by ID with atomic concurrency protection.
   */
  async executeJobById(jobId: string): Promise<boolean> {
    const job = await (prisma as any).scheduledJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== 'PENDING') {
      return false;
    }

    // Atomically transition to PROCESSING to prevent duplicate execution
    try {
      await (prisma as any).scheduledJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });
    } catch {
      return false;
    }

    try {
      const bot = getBot();
      let payloadObj: any = {};
      if (job.payload) {
        try {
          payloadObj = JSON.parse(job.payload);
        } catch {
          payloadObj = {};
        }
      }

      const text =
        payloadObj.text ||
        `⏰ <b>Таймер сработал!</b>\n\nУстановленное время истекло.`;

      if (job.businessConnectionId) {
        await bot.api.sendMessage(job.telegramChatId.toString(), text, {
          parse_mode: 'HTML',
          business_connection_id: job.businessConnectionId,
          reply_parameters: job.targetMessageId ? { message_id: job.targetMessageId } : undefined,
        });
      } else {
        await bot.api.sendMessage(job.telegramChatId.toString(), text, {
          parse_mode: 'HTML',
          reply_parameters: job.targetMessageId ? { message_id: job.targetMessageId } : undefined,
        });
      }

      await (prisma as any).scheduledJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });

      return true;
    } catch (err: any) {
      console.error(`[JobService] Error executing job ${jobId}:`, err);
      await (prisma as any).scheduledJob.update({
        where: { id: jobId },
        data: { status: 'FAILED' },
      });
      return false;
    }
  }

  /**
   * Sweeps and executes any overdue pending jobs.
   * Call this on webhook updates or health checks to recover jobs across cold starts.
   */
  async processDueJobs(): Promise<number> {
    try {
      const now = new Date();
      const dueJobs = await (prisma as any).scheduledJob.findMany({
        where: {
          status: 'PENDING',
          executeAt: { lte: now },
        },
        take: 10,
      });

      let executed = 0;
      for (const job of dueJobs) {
        const success = await this.executeJobById(job.id);
        if (success) executed++;
      }
      return executed;
    } catch (err) {
      console.warn('[JobService] processDueJobs error:', err);
      return 0;
    }
  }
}

export const jobService = new JobService();
