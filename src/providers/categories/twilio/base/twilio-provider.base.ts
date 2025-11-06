/**
 * Base Twilio Provider
 * Common base class for Twilio communication provider
 */

import { BaseProvider } from '../../../base/base-provider';
import type { SMSParams, SMSResult, CallParams, CallResult } from '../twilio.provider';

/**
 * Base class for Twilio provider
 * Defines common interface for SMS/Voice operations
 */
export abstract class BaseTwilioProvider extends BaseProvider {
  readonly type = 'api' as const;

  /**
   * Send SMS message
   */
  abstract sendSMS?(params: SMSParams): Promise<SMSResult>;

  /**
   * Make a voice call
   */
  abstract makeCall?(params: CallParams): Promise<CallResult>;
}

