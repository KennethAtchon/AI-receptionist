/**
 * Google Provider - ULTRA-PURE API Wrapper
 * Just wraps the Google APIs SDK and returns it
 * Processor handles all initialization and logic
 */

import { BaseProvider } from '../base.provider';
import type { GoogleConfig, GoogleServiceAccountCredentials, GoogleOAuth2Credentials } from '../../types';
import { logger } from '../../utils/logger';
import * as GoogleCalendar from '../google/google.calendar';

// Re-export types for convenience
export type {
  CreateCalendarMeeting as createCalendarMeeting,
  UpdateCalendarMeeting as updateCalendarMeeting,
  DeleteCalendarMeeting as deleteCalendarMeeting,
  CalendarResult,
  EventObject
} from '../google/google.calendar';

/**
 * Google Provider
 * Thin SDK wrapper + helper methods for common operations
 */
export class GoogleProvider extends BaseProvider {
  readonly name = 'google';
  readonly type = 'api' as const;

  private googleApis: any = null;
  private auth: any = null;
  private calendar: any = null;

  constructor(private config: GoogleConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[GoogleProvider] Initializing (loading SDK)');
    
    try {
      // Lazy-load the SDK
      this.googleApis = await import('googleapis');
      
      // Set up authentication
      await this.setupAuth();
      
      // Create calendar client
      this.calendar = this.googleApis.google.calendar({ version: 'v3', auth: this.auth });
      
      this.initialized = true;
      logger.info('[GoogleProvider] SDK loaded and authenticated');
    } catch (error) {
      logger.error('[GoogleProvider] Failed to load SDK:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Type guard to check if credentials are Service Account
   */
  private isServiceAccountCredentials(creds: any): creds is GoogleServiceAccountCredentials {
    return creds && typeof creds.client_email === 'string' && typeof creds.private_key === 'string';
  }

  /**
   * Type guard to check if credentials are OAuth2
   */
  private isOAuth2Credentials(creds: any): creds is GoogleOAuth2Credentials {
    return creds && typeof creds.client_id === 'string' && typeof creds.client_secret === 'string';
  }

  /**
   * Set up authentication based on config
   * Supports both OAuth2 and Service Account authentication
   */
  private async setupAuth(): Promise<void> {
    const { google } = this.googleApis;
    
    if (this.config.credentials) {
      // Check if it's service account credentials (has client_email and private_key)
      if (this.isServiceAccountCredentials(this.config.credentials)) {
        // Service Account authentication
        logger.info('[GoogleProvider] Using Service Account authentication');
        this.auth = new google.auth.JWT({
          email: this.config.credentials.client_email,
          key: this.config.credentials.private_key,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
      } else if (this.isOAuth2Credentials(this.config.credentials)) {
        // OAuth2 authentication
        logger.info('[GoogleProvider] Using OAuth2 authentication');
        this.auth = new google.auth.OAuth2(
          this.config.credentials.client_id,
          this.config.credentials.client_secret,
          this.config.credentials.redirect_uri || 'http://localhost'
        );
        
        // Set refresh token if provided
        if (this.config.credentials.refresh_token) {
          this.auth.setCredentials({
            refresh_token: this.config.credentials.refresh_token
          });
        }
      } else {
        throw new Error('Invalid credentials format. Must be service account (client_email, private_key) or OAuth2 (client_id, client_secret, refresh_token)');
      }
    } else if (this.config.apiKey) {
      // API key authentication (limited scope - read-only typically)
      // Note: API keys are typically insufficient for Calendar write operations
      // They work best for public calendar reads
      logger.warn('[GoogleProvider] Using API Key authentication - write operations may fail. Use OAuth2 or Service Account for full functionality.');
      // For API key, we create a minimal auth client
      // Note: This may not work for write operations - OAuth2 or Service Account is recommended
      this.auth = new google.auth.GoogleAuth({
        apiKey: this.config.apiKey
      });
    } else {
      throw new Error('No authentication method provided. Need either credentials or apiKey');
    }

    // Ensure we have valid credentials
    // Note: API key auth may not support getAccessToken, so we catch errors
    try {
      if (this.auth && typeof this.auth.getAccessToken === 'function') {
        await this.auth.getAccessToken();
      }
      logger.info('[GoogleProvider] Authentication successful');
    } catch (error) {
      // API key auth might not support getAccessToken - that's okay
      if (this.config.apiKey) {
        logger.info('[GoogleProvider] API key configured (limited auth flow)');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the raw Google APIs SDK
   * Processor will handle auth, calendar client creation, etc.
   */
  getApi(): any {
    this.ensureInitialized();
    return this.googleApis.google;
  }

  /**
   * Get the authenticated calendar client
   */
  getCalendarClient(): any {
    this.ensureInitialized();
    if (!this.calendar) {
      this.calendar = this.googleApis.google.calendar({ version: 'v3', auth: this.auth });
    }
    return this.calendar;
  }

  /**
   * Get config (credentials, etc.)
   * Processor will use this to set up auth
   */
  getConfig(): GoogleConfig {
    return this.config;
  }

  async dispose(): Promise<void> {
    logger.info('[GoogleProvider] Disposing');
    this.googleApis = null;
    this.auth = null;
    this.calendar = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.calendar) {
      return false;
    }

    try {
      // Test connection by fetching calendar metadata
      await this.calendar.calendars.get({
        calendarId: this.config.calendarId || 'primary'
      });
      return true;
    } catch (error) {
      logger.error('[GoogleProvider] Health check failed:', error as Error);
      return false;
    }
  }


  /**
   * Create a Google Calendar Meeting
   * Checks availability before creating the meeting (optional, defaults to skipping check)
   */
  async CreateGoogleCalendarMeeting(
    params: GoogleCalendar.CreateCalendarMeeting,
    options?: { skipAvailabilityCheck?: boolean }
  ): Promise<GoogleCalendar.CalendarResult> {
    this.ensureInitialized();

    try {
      const { host, mainGuest, thirdPartyGuests, startingTime, endingTime } = params;

      logger.info('[GoogleProvider] Creating calendar meeting', {
        host,
        mainGuest,
        guestCount: thirdPartyGuests?.length || 0
      });

      // Check availability before creating the meeting (defaults to skipping check)
      const skipCheck = options?.skipAvailabilityCheck !== false; // Default to true
      if (!skipCheck) {
        const calendar = this.getCalendarClient();
        const allAttendees = [host, mainGuest, ...(thirdPartyGuests || [])];
        const availability = await GoogleCalendar.checkAvailability(calendar, allAttendees, startingTime, endingTime);

        if (!availability.available) {
          const busyAttendees = availability.conflicts
            .filter(c => c.busy)
            .map(c => c.email)
            .join(', ');

          logger.warn('[GoogleProvider] Availability check failed - conflicts detected', {
            busyAttendees
          });

          return {
            success: false,
            error: 'Time slot is not available for all attendees',
            data: {
              availability,
              busyAttendees: availability.conflicts.filter(c => c.busy).map(c => c.email)
            },
            response: {
              text: `Cannot create meeting: The following attendees are busy during this time: ${busyAttendees}. Please choose a different time.`
            }
          };
        }

        logger.info('[GoogleProvider] Availability check passed - all attendees are available');
      } else {
        logger.info('[GoogleProvider] Skipping availability check (default behavior)');
      }

      // Parse event object
      const eventObject = GoogleCalendar.parseGoogleCalendarEvent(params);
      
      // Get calendar client and create event
      const calendar = this.getCalendarClient();
      const calendarId = this.config.calendarId || 'primary';

      return await GoogleCalendar.createCalendarEvent(calendar, calendarId, eventObject);
    } catch (error: any) {
      logger.error('[GoogleProvider] Failed to create calendar meeting:', error);
      
      return {
        success: false,
        error: error?.message || 'Failed to create calendar meeting',
        response: {
          text: `Failed to create calendar meeting: ${error?.message || 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Update a Google Calendar Meeting
   * Checks availability before updating the meeting (optional, defaults to skipping check)
   */
  async UpdateGoogleCalendarMeeting(
    params: GoogleCalendar.UpdateCalendarMeeting,
    options?: { skipAvailabilityCheck?: boolean }
  ): Promise<GoogleCalendar.CalendarResult> {
    this.ensureInitialized();

    try {
      const { meetingId, host, mainGuest, thirdPartyGuests, startingTime, endingTime } = params;

      logger.info('[GoogleProvider] Updating calendar meeting', {
        meetingId,
        host,
        mainGuest
      });

      // Check availability before updating the meeting (defaults to skipping check)
      const skipCheck = options?.skipAvailabilityCheck !== false; // Default to true
      if (!skipCheck) {
        const calendar = this.getCalendarClient();
        const allAttendees = [host, mainGuest, ...(thirdPartyGuests || [])];
        const availability = await GoogleCalendar.checkAvailability(calendar, allAttendees, startingTime, endingTime);

        if (!availability.available) {
          const busyAttendees = availability.conflicts
            .filter(c => c.busy)
            .map(c => c.email)
            .join(', ');

          logger.warn('[GoogleProvider] Availability check failed for update - conflicts detected', {
            busyAttendees
          });

          return {
            success: false,
            error: 'Time slot is not available for all attendees',
            data: {
              availability,
              busyAttendees: availability.conflicts.filter(c => c.busy).map(c => c.email)
            },
            response: {
              text: `Cannot update meeting: The following attendees are busy during this time: ${busyAttendees}. Please choose a different time.`
            }
          };
        }

        logger.info('[GoogleProvider] Availability check passed for update - all attendees are available');
      } else {
        logger.info('[GoogleProvider] Skipping availability check for update (default behavior)');
      }

      // Parse event object (includes meetingId)
      const eventObject = GoogleCalendar.parseGoogleCalendarEvent(params);
      
      // Get calendar client and update event
      const calendar = this.getCalendarClient();
      const calendarId = this.config.calendarId || 'primary';

      return await GoogleCalendar.updateCalendarEvent(calendar, calendarId, meetingId, eventObject);
    } catch (error: any) {
      logger.error('[GoogleProvider] Failed to update calendar meeting:', error);
      
      return {
        success: false,
        error: error?.message || 'Failed to update calendar meeting',
        response: {
          text: `Failed to update calendar meeting: ${error?.message || 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Delete a Google Calendar Meeting
   */
  async deleteGoogleCalendarMeeting(params: GoogleCalendar.DeleteCalendarMeeting): Promise<GoogleCalendar.CalendarResult> {
    this.ensureInitialized();

    try {
      const { meetingId } = params;

      logger.info('[GoogleProvider] Deleting calendar meeting', { meetingId });

      // Get calendar client and delete event
      const calendar = this.getCalendarClient();
      const calendarId = this.config.calendarId || 'primary';

      return await GoogleCalendar.deleteCalendarEvent(calendar, calendarId, meetingId);
    } catch (error: any) {
      logger.error('[GoogleProvider] Failed to delete calendar meeting:', error);
      
      return {
        success: false,
        error: error?.message || 'Failed to delete calendar meeting',
        response: {
          text: `Failed to delete calendar meeting: ${error?.message || 'Unknown error'}`
        }
      };
    }
  }

}
