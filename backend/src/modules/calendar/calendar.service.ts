import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCalendarEventDto } from './dto/create-calendar-event.dto.js';
import type { UpdateCalendarEventDto } from './dto/update-calendar-event.dto.js';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, start: Date, end: Date) {
    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: start, lte: end },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  create(userId: string, dto: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        allDay: dto.allDay ?? false,
        location: dto.location,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCalendarEventDto) {
    await this.assertOwner(userId, id);
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.allDay !== undefined && { allDay: dto.allDay }),
        ...(dto.location !== undefined && { location: dto.location }),
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  private async assertOwner(userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.userId !== userId) throw new ForbiddenException();
  }
}
