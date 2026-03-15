export const MESSAGING_SERVICE = Symbol('IMessagingService');

export interface IMessagingService {
  sendText(phone: string, text: string): Promise<void>;
  sendTemplate(
    phone: string,
    templateName: string,
    params: string[],
  ): Promise<void>;
}
