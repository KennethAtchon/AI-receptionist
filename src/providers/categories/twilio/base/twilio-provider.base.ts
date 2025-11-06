/**
 * Base Twilio Provider
 * Common base class for Twilio communication provider
 */

import { BaseProvider } from '../../../base/base-provider';
import type { SMSParams, SMSResult, CallParams, CallResult } from '../twilio.provider';

/**
 * Base class for Twilio provider
 * Defines common interface for SMS/Voice operations
 * 
 * Note: Methods are abstract but not required - subclasses may implement
 * only the methods they support. This is intentional for flexibility.
 */
export abstract class BaseTwilioProvider extends BaseProvider {
  readonly type = 'api' as const;

  /**
   * Send SMS message
   * Subclasses should implement this method if SMS functionality is supported
   */
  abstract sendSMS(params: SMSParams): Promise<SMSResult>;

  /**
   * Make a voice call
   * Subclasses should implement this method if voice functionality is supported
   */
  abstract makeCall(params: CallParams): Promise<CallResult>;
}

