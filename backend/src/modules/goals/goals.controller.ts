import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { GoalsService } from './goals.service.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { UpdateGoalDto } from './dto/update-goal.dto.js';
import { AddProgressDto } from './dto/add-progress.dto.js';

interface AuthUser {
  userId: string;
  email: string;
}

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.goalsService.findAllByUser(user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const goal = await this.goalsService.findById(id, user.userId);
    const forecast = this.goalsService.forecastCompletion(goal);
    return { ...goal, forecast };
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create({ userId: user.userId, ...dto });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(id, user.userId, dto);
  }

  @Post(':id/progress')
  addProgress(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddProgressDto,
  ) {
    return this.goalsService.addProgress(id, user.userId, dto.amount);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.goalsService.delete(id, user.userId);
  }
}
