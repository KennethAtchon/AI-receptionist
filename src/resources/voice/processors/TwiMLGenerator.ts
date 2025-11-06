/**
 * TwiML Generator
 * Generates Twilio Markup Language (TwiML) responses for voice calls
 */

import { logger } from '../../../utils/logger';
import type { TwiMLConfig, VoiceType } from '../../../types/voice.types';

export class TwiMLGenerator {
  /**
   * Generate basic greeting TwiML
   */
  static generateGreeting(config: TwiMLConfig): string {
    const voice = config.voice || 'Polly.Joanna';
    const language = config.language || 'en-US';
    const greeting = config.greeting || 'Hello, how can I help you today?';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${this.escapeXml(greeting)}</Say>
  <Pause length="1"/>
</Response>`;
  }

  /**
   * Generate gather (input collection) TwiML
   */
  static generateGather(
    message: string,
    action: string,
    config?: Partial<TwiMLConfig>
  ): string {
    const voice = config?.voice || 'Polly.Joanna';
    const timeout = config?.timeout || 5;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" action="${action}" timeout="${timeout}" speechTimeout="auto">
    <Say voice="${voice}">${this.escapeXml(message)}</Say>
  </Gather>
  <Say voice="${voice}">Sorry, I didn't catch that. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate media stream TwiML (for real-time AI)
   */
  static generateMediaStream(websocketUrl: string, config?: TwiMLConfig): string {
    const voice = config?.voice || 'Polly.Joanna';
    const greeting = config?.greeting || 'Hello, I am connecting you to our AI assistant.';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${this.escapeXml(greeting)}</Say>
  <Connect>
    <Stream url="${websocketUrl}"/>
  </Connect>
</Response>`;
  }

  /**
   * Generate voicemail TwiML
   */
  static generateVoicemail(beep: boolean = true, transcriptionCallback?: string): string {
    const transcribeAttr = transcriptionCallback
      ? `transcribe="true" transcribeCallback="${transcriptionCallback}"`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please leave a message after the beep.</Say>
  <Record
    maxLength="120"
    playBeep="${beep}"
    ${transcribeAttr}/>
  <Say voice="Polly.Joanna">Thank you for your message. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate call forward TwiML
   */
  static generateForward(phoneNumber: string, timeout: number = 30, callerId?: string): string {
    const callerIdAttr = callerId ? `callerId="${callerId}"` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while I transfer your call.</Say>
  <Dial timeout="${timeout}" ${callerIdAttr}>
    <Number>${phoneNumber}</Number>
  </Dial>
  <Say voice="Polly.Joanna">Sorry, the line is busy. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate IVR menu TwiML
   */
  static generateIVRMenu(
    message: string,
    action: string,
    voice?: VoiceType,
    numDigits: number = 1,
    timeout: number = 10
  ): string {
    const voiceType = voice || 'Polly.Joanna';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="${numDigits}" timeout="${timeout}" action="${action}">
    <Say voice="${voiceType}">${this.escapeXml(message)}</Say>
  </Gather>
  <Say voice="${voiceType}">Sorry, I didn't receive a selection. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate recording TwiML
   */
  static generateRecording(
    recordingUrl: string,
    transcribe: boolean = true,
    transcriptionCallback?: string
  ): string {
    const transcribeAttr = transcribe ? 'transcribe="true"' : '';
    const callbackAttr = transcriptionCallback ? `transcribeCallback="${transcriptionCallback}"` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record
    action="${recordingUrl}"
    ${transcribeAttr}
    ${callbackAttr}/>
</Response>`;
  }

  /**
   * Generate hangup TwiML
   */
  static generateHangup(message?: string): string {
    if (message) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${this.escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate error TwiML
   */
  static generateError(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, there was an error processing your call. Please try again later.</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate conference TwiML
   */
  static generateConference(
    conferenceName: string,
    startOnEnter: boolean = true,
    endOnExit: boolean = false
  ): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Joining conference.</Say>
  <Dial>
    <Conference startConferenceOnEnter="${startOnEnter}" endConferenceOnExit="${endOnExit}">
      ${this.escapeXml(conferenceName)}
    </Conference>
  </Dial>
</Response>`;
  }

  /**
   * Generate play audio TwiML
   */
  static generatePlay(audioUrl: string, loop: number = 1): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="${loop}">${audioUrl}</Play>
</Response>`;
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
