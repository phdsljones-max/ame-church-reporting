import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Pluggable mailer. To add a real provider (SendGrid, SES, Postmark, ...):
 *   1. Implement this interface in a new class.
 *   2. Register it in getMailer() keyed off a MAILER env value.
 */
export interface Mailer {
  sendPasswordReset(email: string, resetToken: string): Promise<void>;
}

/** Development stub: logs the reset token to the server console. */
class StubMailer implements Mailer {
  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    logger.info(`[mailer:stub] Password reset requested for ${email}. Reset token: ${resetToken}`);
    logger.info(
      '[mailer:stub] This is a development stub. Configure a real MAILER provider before production use.'
    );
  }
}

let instance: Mailer | null = null;

export function getMailer(): Mailer {
  if (!instance) {
    if (config.mailer !== 'stub') {
      logger.warn(
        `Unknown MAILER="${config.mailer}". Falling back to the stub mailer. ` +
          'Implement the Mailer interface for a real provider.'
      );
    }
    instance = new StubMailer();
  }
  return instance;
}
