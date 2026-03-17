import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AiProviderDto {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
}

export class UpdateAiSettingsDto {
  @IsEnum(AiProviderDto)
  provider: AiProviderDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
