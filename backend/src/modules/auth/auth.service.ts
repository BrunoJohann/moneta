import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '../email/interfaces/email.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  async sendOtp(email: string) {
    const code = String(randomInt(100_000, 999_999));
    const hashedCode = this.hashToken(code);

    await this.prisma.authSession.create({
      data: {
        email,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.emailService.sendOtp(email, code);

    return { message: 'Code sent' };
  }

  async verifyOtp(email: string, code: string) {
    const hashedCode = this.hashToken(code);

    const session = await this.prisma.authSession.findFirst({
      where: {
        email,
        code: hashedCode,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { usedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({ data: { email } });
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return { ...tokens, user };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
    });

    return this.generateTokens(user.id, user.email);
  }

  async handleGoogleAuth(profile: {
    googleId: string;
    email: string;
    name: string;
  }) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });

    if (user) {
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.googleId },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
        },
      });
    }

    return this.generateTokens(user.id, user.email);
  }

  async revokeRefreshToken(tokenHash: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync({
      sub: userId,
      email,
    });

    const rawRefreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
