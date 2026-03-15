import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
}
