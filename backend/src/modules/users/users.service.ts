import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findOrCreateByEmail(email: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({ data: { email } });
    }

    return user;
  }

  async findOrCreateByPhone(phone: string) {
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const placeholderEmail = `${phone.replace(/\D/g, '')}@phone.placeholder`;
      user = await this.prisma.user.create({
        data: { phone, email: placeholderEmail },
      });
    }

    return user;
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
