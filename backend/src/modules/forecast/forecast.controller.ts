import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  ForecastService,
  type EndOfMonthForecast,
} from './forecast.service.js';

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get()
  async getEndOfMonthForecast(
    @CurrentUser() user: { userId: string },
  ): Promise<EndOfMonthForecast> {
    return this.forecastService.getEndOfMonthForecast(user.userId);
  }
}
