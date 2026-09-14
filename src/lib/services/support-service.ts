// ============================================================
// SerkoGram — Support Service
// ============================================================

import { prisma } from '@/lib/db';
import type { TicketCategory, TicketStatus } from '@prisma/client';

export async function createTicket(
  userId: string,
  category: TicketCategory,
  subject: string,
  message: string
) {
  return prisma.supportTicket.create({
    data: {
      userId,
      category,
      subject,
      messages: {
        create: {
          text: message,
          isSupport: false,
        },
      },
    },
    include: { messages: true },
  });
}

export async function getUserTickets(userId: string, cursor?: string, limit = 20) {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = tickets.length > limit;
  const items = hasMore ? tickets.slice(0, limit) : tickets;

  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
}

export async function getTicketDetail(ticketId: string, userId: string) {
  return prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function addTicketMessage(
  ticketId: string,
  userId: string,
  text: string,
  isSupport = false
) {
  // Verify ownership
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, ...(isSupport ? {} : { userId }) },
  });

  if (!ticket) return null;

  const message = await prisma.supportMessage.create({
    data: {
      ticketId,
      text,
      isSupport,
    },
  });

  // Update ticket status
  const newStatus: TicketStatus = isSupport ? 'WAITING_USER' : 'OPEN';
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: newStatus },
  });

  return message;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
) {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      ...(status === 'CLOSED' || status === 'RESOLVED'
        ? { closedAt: new Date() }
        : {}),
    },
  });
}
