import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EMAIL_SERVICE } from './interfaces/email.interface.js';
import { ResendAdapter } from './adapters/resend.adapter.js';
import { SmtpAdapter } from './adapters/smtp.adapter.js';

@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useFactory: (config: ConfigService) => {
        return config.get('nodeEnv') === 'production'
          ? new ResendAdapter(config)
          : new SmtpAdapter(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
