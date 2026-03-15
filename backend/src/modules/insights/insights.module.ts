import { Module } from '@nestjs/common';

import { MessagingModule } from '../messaging/messaging.module.js';
import { ForecastModule } from '../forecast/forecast.module.js';
import { InsightsService } from './insights.service.js';
import { InsightsController } from './insights.controller.js';

@Module({
  imports: [MessagingModule, ForecastModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
