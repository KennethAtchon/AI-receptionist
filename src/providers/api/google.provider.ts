/**
 * Google Provider - ULTRA-PURE API Wrapper
 * Just wraps the Google APIs SDK and returns it
 * Processor handles all initialization and logic
 * 
 * ============================================================================
 * GOOGLE CLOUD CONSOLE SETUP GUIDE
 * ============================================================================
 * 
 * To use this provider, you need to set up authentication in Google Cloud Console.
 * This provider supports three authentication methods:
 * 
 * 1. SERVICE ACCOUNT (Recommended for server-side applications)
 * 2. OAuth2 (For user-facing applications)
 * 3. API Key (Limited functionality, read-only typically)
 * 
 * ----------------------------------------------------------------------------
 * STEP 1: CREATE A GOOGLE CLOUD PROJECT
 * ----------------------------------------------------------------------------
 * 1. Go to https://console.cloud.google.com/
 * 2. Click "Select a project" → "New Project"
 * 3. Enter a project name and click "Create"
 * 4. Wait for the project to be created
 * 
 * ----------------------------------------------------------------------------
 * STEP 2: ENABLE REQUIRED APIs
 * ----------------------------------------------------------------------------
 * 1. Go to "APIs & Services" → "Library"
 * 2. Enable the following APIs (search and enable each):
 *    - Google Calendar API
 *    - Google Sheets API
 *    - Google Drive API
 * 3. Wait a few minutes for APIs to be enabled
 * 
 * ----------------------------------------------------------------------------
 * STEP 3A: SET UP SERVICE ACCOUNT (Recommended)
 * ----------------------------------------------------------------------------
 * Best for: Server-side applications, automated systems, background jobs
 * 
 * 1. Go to "APIs & Services" → "Credentials"
 * 2. Click "Create Credentials" → "Service Account"
 * 3. Enter a service account name (e.g., "ai-receptionist-service")
 * 4. Click "Create and Continue"
 * 5. Skip optional steps and click "Done"
 * 6. Click on the created service account
 * 7. Go to "Keys" tab → "Add Key" → "Create new key"
 * 8. Select "JSON" format and click "Create"
 * 9. The JSON file will download automatically
 * 
 * Configuration:
 * ```typescript
 * {
 *   providers: {
 *     calendar: {
 *       google: {
 *         calendarId: 'primary',
 *         credentials: {
 *           // Copy from downloaded JSON file:
 *           client_email: 'your-service-account@project.iam.gserviceaccount.com',
 *           private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
 *           project_id: 'your-project-id',
 *           // ... other fields from JSON
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 * 
 * Note: For Service Account to access user calendars:
 * - Share the calendar with the service account email
 * - Or use domain-wide delegation (advanced)
 * 
 * ----------------------------------------------------------------------------
 * STEP 3B: SET UP OAuth2 (For User Applications)
 * ----------------------------------------------------------------------------
 * Best for: User-facing applications, web apps, mobile apps
 * 
 * 1. Go to "APIs & Services" → "Credentials"
 * 2. Click "Create Credentials" → "OAuth client ID"
 * 3. If prompted, configure the OAuth consent screen first:
 *    a. Choose "External" (unless you have Google Workspace)
 *    b. Fill in app name, user support email, developer contact
 *    c. Add scopes:
 *       - https://www.googleapis.com/auth/calendar
 *       - https://www.googleapis.com/auth/spreadsheets
 *       - https://www.googleapis.com/auth/drive.file
 *    d. Add test users (if in testing mode)
 *    e. Save and continue through all steps
 * 4. Back in Credentials, click "Create Credentials" → "OAuth client ID"
 * 5. Choose application type:
 *    - "Web application" for server-side
 *    - "Desktop app" for local development
 * 6. Enter a name (e.g., "AI Receptionist")
 * 7. For web apps, add authorized redirect URIs:
 *    - http://localhost:3000/oauth/callback (development)
 *    - https://yourdomain.com/oauth/callback (production)
 * 8. Click "Create"
 * 9. Copy the Client ID and Client Secret
 * 
 * 10. To get a refresh token (one-time setup):
 *     a. Visit: https://developers.google.com/oauthplayground/
 *     b. Click the gear icon (⚙️) → Check "Use your own OAuth credentials"
 *     c. Enter your Client ID and Client Secret
 *     d. In left panel, find and select:
 *        - Google Calendar API v3 → https://www.googleapis.com/auth/calendar
 *        - Google Sheets API v4 → https://www.googleapis.com/auth/spreadsheets
 *        - Google Drive API v3 → https://www.googleapis.com/auth/drive.file
 *     e. Click "Authorize APIs"
 *     f. Sign in with the Google account you want to use
 *     g. Grant permissions
 *     h. Click "Exchange authorization code for tokens"
 *     i. Copy the "Refresh token"
 * 
 * Configuration:
 * ```typescript
 * {
 *   providers: {
 *     calendar: {
 *       google: {
 *         calendarId: 'primary',
 *         credentials: {
 *           client_id: 'your-client-id.apps.googleusercontent.com',
 *           client_secret: 'your-client-secret',
 *           refresh_token: 'your-refresh-token',
 *           redirect_uri: 'http://localhost:3000/oauth/callback' // Optional
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 * 
 * ----------------------------------------------------------------------------
 * STEP 3C: SET UP API KEY (Limited - Not Recommended)
 * ----------------------------------------------------------------------------
 * Best for: Public read-only access only
 * 
 * 1. Go to "APIs & Services" → "Credentials"
 * 2. Click "Create Credentials" → "API key"
 * 3. Copy the API key
 * 4. (Recommended) Restrict the API key:
 *    - Click on the API key to edit
 *    - Under "API restrictions", select "Restrict key"
 *    - Select only: Calendar API, Sheets API, Drive API
 *    - Save
 * 
 * Configuration:
 * ```typescript
 * {
 *   providers: {
 *     calendar: {
 *       google: {
 *         calendarId: 'primary',
 *         apiKey: 'your-api-key'
 *       }
 *     }
 *   }
 * }
 * ```
 * 
 * WARNING: API keys have very limited functionality and typically cannot
 * perform write operations. Use Service Account or OAuth2 for full access.
 * 
 * ----------------------------------------------------------------------------
 * REQUIRED SCOPES
 * ----------------------------------------------------------------------------
 * The provider requires these OAuth scopes:
 * - https://www.googleapis.com/auth/calendar
 *   (Google Calendar: create, read, update, delete events)
 * - https://www.googleapis.com/auth/spreadsheets
 *   (Google Sheets: full access to spreadsheets)
 * - https://www.googleapis.com/auth/drive.file
 *   (Google Drive: create files and folders)
 * 
 * These are automatically included when using Service Account or OAuth2.
 * 
 * ----------------------------------------------------------------------------
 * TROUBLESHOOTING
 * ----------------------------------------------------------------------------
 * 
 * Error: "Request had insufficient authentication scopes"
 * → Solution: Ensure all required APIs are enabled and scopes are correct
 * 
 * Error: "Calendar not found" or "Access denied"
 * → Solution (Service Account): Share the calendar with service account email
 * → Solution (OAuth2): Ensure you granted permissions during OAuth flow
 * 
 * Error: "API key not valid" or "API key expired"
 * → Solution: Regenerate the API key or use Service Account/OAuth2 instead
 * 
 * Error: "Refresh token expired" (OAuth2)
 * → Solution: Re-run the OAuth flow to get a new refresh token
 * 
 * Service Account can't access calendars:
 * → Solution: Share the calendar with the service account email address
 * → Go to Google Calendar → Settings → Share with specific people
 * → Add the service account email with "Make changes to events" permission
 * 
 * ----------------------------------------------------------------------------
 * SECURITY BEST PRACTICES
 * ----------------------------------------------------------------------------
 * 1. Never commit credentials to version control
 * 2. Store credentials in environment variables
 * 3. Use different credentials for development/production
 * 4. Regularly rotate Service Account keys
 * 5. Restrict API keys to specific APIs and IPs
 * 6. Use least-privilege principle (minimal required scopes)
 * 7. Monitor API usage in Google Cloud Console
 * 
 * ----------------------------------------------------------------------------
 * EXAMPLE: Loading Credentials from Environment Variables
 * ----------------------------------------------------------------------------
 * ```typescript
 * import { GoogleProvider } from '@ai-receptionist/sdk';
 * 
 * // Service Account from JSON string
 * const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
 * 
 * // Or OAuth2 from individual env vars
 * const oauth2 = {
 *   client_id: process.env.GOOGLE_CLIENT_ID!,
 *   client_secret: process.env.GOOGLE_CLIENT_SECRET!,
 *   refresh_token: process.env.GOOGLE_REFRESH_TOKEN!
 * };
 * 
 * const provider = new GoogleProvider({
 *   calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
 *   credentials: serviceAccount // or oauth2
 * });
 * 
 * await provider.initialize();
 * ```
 * 
 * ============================================================================
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
  private sheets: any = null;
  private drive: any = null;

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
      
      // Create sheets client
      this.sheets = this.googleApis.google.sheets({ version: 'v4', auth: this.auth });
      
      // Create drive client
      this.drive = this.googleApis.google.drive({ version: 'v3', auth: this.auth });
      
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
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file'
          ]
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
        apiKey: this.config.apiKey,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
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
   * Get the authenticated sheets client
   */
  getSheetsClient(): any {
    this.ensureInitialized();
    if (!this.sheets) {
      this.sheets = this.googleApis.google.sheets({ version: 'v4', auth: this.auth });
    }
    return this.sheets;
  }

  /**
   * Get the authenticated drive client
   */
  getDriveClient(): any {
    this.ensureInitialized();
    if (!this.drive) {
      this.drive = this.googleApis.google.drive({ version: 'v3', auth: this.auth });
    }
    return this.drive;
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
    this.sheets = null;
    this.drive = null;
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
