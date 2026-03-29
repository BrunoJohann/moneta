import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId') || 'PLACEHOLDER',
      clientSecret: config.get<string>('google.clientSecret') || 'PLACEHOLDER',
      callbackURL:
        config.get<string>('google.callbackUrl') ||
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails: { value: string }[]; displayName: string },
    done: VerifyCallback,
  ) {
    const user: GoogleProfile = {
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
    };
    done(null, user);
  }
}
