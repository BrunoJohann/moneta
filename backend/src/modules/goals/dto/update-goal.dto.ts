import { IsString, IsNumber, IsOptional, IsDateString, IsIn, Min } from 'class-validator';
import type { GoalStatus } from '@prisma/client';

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  targetAmount?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsIn(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  @IsOptional()
  status?: GoalStatus;
}
