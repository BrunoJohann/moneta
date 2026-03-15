import { Controller, Get, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { InsightsService } from './insights.service.js';
import { InsightsQueryDto } from './dto/insights-query.dto.js';

interface AuthUser {
  userId: string;
  email: string;
}

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: InsightsQueryDto) {
    return this.insightsService.findByUser(
      user.userId,
      query.limit,
      query.offset,
    );
  }

  @Get('latest')
  findLatest(@CurrentUser() user: AuthUser) {
    return this.insightsService.getLatest(user.userId);
  }
}
