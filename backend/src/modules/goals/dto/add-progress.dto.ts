import { IsNumber, Min } from 'class-validator';

export class AddProgressDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
