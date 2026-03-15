import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOrCreate(userId: string, name: string) {
    const defaultCategory = await this.prisma.category.findFirst({
      where: { name, isDefault: true },
    });

    if (defaultCategory) {
      return defaultCategory;
    }

    const userCategory = await this.prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });

    if (userCategory) {
      return userCategory;
    }

    return this.prisma.category.create({
      data: { userId, name },
    });
  }

  async create(userId: string, data: { name: string; icon?: string; color?: string }) {
    return this.prisma.category.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon,
        color: data.color,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; icon?: string; color?: string },
  ) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.isDefault) {
      throw new BadRequestException('Cannot update a default category');
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.isDefault) {
      throw new BadRequestException('Cannot delete a default category');
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
