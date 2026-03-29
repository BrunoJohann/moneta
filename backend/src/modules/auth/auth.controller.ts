import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyDto } from './dto/verify.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import type { GoogleProfile } from './strategies/google.strategy.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: LoginDto) {
    return this.authService.sendOtp(dto.email);
  }

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: VerifyDto) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto) {
    const tokenHash = createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');
    await this.authService.revokeRefreshToken(tokenHash);
    return { message: 'Logged out' };
  }

  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as GoogleProfile;
    const tokens = await this.authService.handleGoogleAuth(profile);
    const frontendUrl = this.config.get<string>('frontendUrl');
    const params = new URLSearchParams({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }
}
