import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type { IEmailService } from '../interfaces/email.interface.js';

export class ResendAdapter implements IEmailService {
  private readonly resend: Resend;

  constructor(config: ConfigService) {
    this.resend = new Resend(config.get<string>('resend.apiKey'));
  }

  async sendOtp(to: string, code: string): Promise<void> {
    await this.resend.emails.send({
      from: 'Moneta <noreply@moneta.app>',
      to,
      subject: 'Seu código Moneta',
      html: `<p>Seu código de verificação: <strong>${code}</strong></p><p>Válido por 10 minutos.</p>`,
    });
  }
}
