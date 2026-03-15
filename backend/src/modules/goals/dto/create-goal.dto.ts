import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  title!: string;

  @IsNumber()
  @Min(0.01)
  targetAmount!: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
