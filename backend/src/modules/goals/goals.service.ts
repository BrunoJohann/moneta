import { Injectable, NotFoundException } from '@nestjs/common';
import type { Goal } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    title: string;
    targetAmount: number;
    deadline?: string;
    messageLogId?: string;
  }) {
    return this.prisma.goal.create({
      data: {
        userId: data.userId,
        title: data.title,
        targetAmount: data.targetAmount,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        messageLogId: data.messageLogId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      targetAmount?: number;
      deadline?: string;
      status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    },
  ) {
    await this.findById(id, userId);
    return this.prisma.goal.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });
  }

  async addProgress(id: string, userId: string, amount: number) {
    const goal = await this.findById(id, userId);
    const newAmount = Number(goal.currentAmount) + amount;
    const completed = newAmount >= Number(goal.targetAmount);

    return this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        status: completed ? 'COMPLETED' : goal.status,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    return this.prisma.goal.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  forecastCompletion(goal: Goal) {
    const current = Number(goal.currentAmount);
    const target = Number(goal.targetAmount);

    if (current >= target) {
      return { predictedDate: null, onTrack: true, daysRemaining: 0 };
    }

    const daysSinceCreation = Math.max(
      1,
      (Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dailyRate = current / daysSinceCreation;

    if (dailyRate <= 0) {
      return { predictedDate: null, onTrack: false, daysRemaining: Infinity };
    }

    const remaining = target - current;
    const daysRemaining = Math.ceil(remaining / dailyRate);
    const predictedDate = new Date(
      Date.now() + daysRemaining * 24 * 60 * 60 * 1000,
    );

    const onTrack = goal.deadline
      ? predictedDate <= new Date(goal.deadline)
      : true;

    return { predictedDate, onTrack, daysRemaining };
  }
}
