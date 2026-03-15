import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import type { RecurrenceType } from '@prisma/client';

export class UpdateReminderDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsIn(['ONCE', 'WEEKLY', 'MONTHLY'])
  @IsOptional()
  recurrenceType?: RecurrenceType;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsDateString()
  @IsOptional()
  nextDueDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
