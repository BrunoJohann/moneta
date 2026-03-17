import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const email: string | undefined = request.user?.email;
    const adminEmails = this.config.get<string[]>('adminEmails') ?? [];

    if (!email || !adminEmails.includes(email)) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    return true;
  }
}
