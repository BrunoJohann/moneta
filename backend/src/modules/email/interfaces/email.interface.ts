export const EMAIL_SERVICE = Symbol('IEmailService');

export interface IEmailService {
  sendOtp(to: string, code: string): Promise<void>;
}
