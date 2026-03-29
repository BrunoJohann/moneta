import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AiProviderDto {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GROQ = 'GROQ',
}

export class UpdateAiSettingsDto {
  @IsEnum(AiProviderDto)
  provider: AiProviderDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string | null;

  @IsOptional()
  @IsEnum(AiProviderDto)
  transcriptionProvider?: AiProviderDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  transcriptionModel?: string | null;
}
