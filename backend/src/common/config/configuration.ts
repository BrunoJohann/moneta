import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  OPENAI_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  WHATSAPP_TOKEN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  WHATSAPP_VERIFY_TOKEN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  WHATSAPP_PHONE_NUMBER_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  META_APP_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  RESEND_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(1025),

  FRONTEND_URL: Joi.string().uri().required(),
  PORT: Joi.number().default(3001),
  ADMIN_EMAILS: Joi.string().default(''),

  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),

  GROQ_API_KEY: Joi.string().optional(),
});

export interface AppConfig {
  nodeEnv: string;
  database: { url: string };
  redis: { url: string };
  jwt: { secret: string; refreshSecret: string };
  openai: { apiKey: string };
  groq: { apiKey: string };
  whatsapp: {
    token: string;
    verifyToken: string;
    phoneNumberId: string;
    metaAppSecret: string;
  };
  resend: { apiKey: string };
  smtp: { host: string; port: number };
  frontendUrl: string;
  port: number;
  adminEmails: string[];
  google: { clientId: string; clientSecret: string; callbackUrl: string };
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    metaAppSecret: process.env.META_APP_SECRET ?? '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
  },
  frontendUrl: process.env.FRONTEND_URL!,
  port: parseInt(process.env.PORT ?? '3001', 10),
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3001/api/auth/google/callback',
  },
});
