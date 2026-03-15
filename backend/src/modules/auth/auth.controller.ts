import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyDto } from './dto/verify.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
