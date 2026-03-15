import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type { IEmailService } from '../interfaces/email.interface.js';

export class SmtpAdapter implements IEmailService {
  private readonly logger = new Logger(SmtpAdapter.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(config: ConfigService) {
    const host = config.get<string>('smtp.host', 'localhost');
    const port = config.get<number>('smtp.port', 1025);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      ignoreTLS: true,
    });

    this.logger.log(`SMTP adapter configured for ${host}:${port}`);
  }

  async sendOtp(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: 'Moneta <noreply@moneta.app>',
      to,
      subject: 'Seu código Moneta',
      html: `<p>Seu código de verificação: <strong>${code}</strong></p><p>Válido por 10 minutos.</p>`,
    });
    this.logger.log(`OTP email sent to ${to} (code: ${code})`);
  }
}
