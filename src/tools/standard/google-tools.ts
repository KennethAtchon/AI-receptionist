/**
* Google Tools (Standard)
* Tools used to interact with Google API's - All in one place, communication with googleapis SDK
*/

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import { GoogleProvider } from '../../providers/api/google.provider';
import * as GoogleCalendar from '../../providers/google/google.calendar';

export interface GoogleServicesToolsConfig {
    providerRegistry: ProviderRegistry;
}

/**
* Tool: Google Managing Calendar Meeting
* Manage calendar meeting in Google Calendar (Create, Delete, Update)
* @returns Tool object, manage_google_calendar
*/
export function buildCreateCalendarMeetingTool(config?: GoogleServicesToolsConfig): ITool {
    return new ToolBuilder()
    .withName('manage_google_calendar')
    .withDescription('This tool is used to manage google calendar. It can create, delete, and update calendar meetings.')
    .withParameters({
        type: 'object',
        properties: {
            operation: {
                type: 'integer',
                description: 'the operation ( CREATE - 1, DELETE - 2, UPDATE - 3)'
            },
            host: {
                type: 'string',
                description: 'the host email of the meeting'
            },
            mainGuest: {
                type: 'string',
                description: 'main guest email you want to attend'
            },
            thirdPartyGuests: {
                type: 'array',
                items: {
                    type: 'string'
                },
                description: 'list of optional third party guests email'
            },
            startTime: {
                type: 'string',
                description: 'Start time, UTC Timestamp (YYYY-MM-DDTHH:MM:SSZ)'
            },
            endTime: {
                type: 'string',
                description: 'End time, UTC Timestamp (YYYY-MM-DDTHH:MM:SSZ)'
            },
            meetingId: {
                type: 'string',
                description: 'Unique identifier for meetings (only used for update/delete operation)'
            },
            summary: {
                type: 'string',
                description: 'Optional: Title/summary of the calendar event. If not provided, defaults to "Meeting with {mainGuest}"'
            },
            description: {
                type: 'string',
                description: 'Optional: Description of the calendar event. If not provided, defaults to "Calendar meeting organized by {host}"'
            }
        },
        required: ['operation', 'host', 'mainGuest', 'startTime', 'endTime']
    })
    .default( async (params, ctx) => {
        logger.info('[ManageGoogleCalendarTool] Managing Google Calendar', { operation: params.operation });

        // Check if provider registry exists and has google provider
        if (!config?.providerRegistry || !config.providerRegistry.has('google')) {
            return {
                success: false,
                error: 'Google provider not configured',
                response: { text: 'Google provider is not configured'}
            };
        }

        const provider = await config.providerRegistry.get<GoogleProvider>('google');
        
        const { operation, host, mainGuest, thirdPartyGuests, startTime, endTime, meetingId, summary, description } = params;

        try {
            switch(operation){
                case 1: {
                    // CREATE
                    logger.info('[ManageGoogleCalendarTool] Creating calendar meeting', { host, mainGuest });
                    
                    const createParams: GoogleCalendar.CreateCalendarMeeting = {
                        host,
                        mainGuest,
                        thirdPartyGuests: thirdPartyGuests || [],
                        startingTime: startTime,
                        endingTime: endTime,
                        summary,
                        description
                    };

                    const result = await provider.CreateGoogleCalendarMeeting(createParams);
                    return result;
                }

                case 2: {
                    // DELETE
                    if (!meetingId) {
                        return {
                            success: false,
                            error: 'meetingId is required for delete operation',
                            response: { text: 'Meeting ID is required to delete a calendar meeting' }
                        };
                    }

                    logger.info('[ManageGoogleCalendarTool] Deleting calendar meeting', { meetingId });
                    
                    const deleteParams: GoogleCalendar.DeleteCalendarMeeting = {
                        meetingId
                    };

                    const result = await provider.deleteGoogleCalendarMeeting(deleteParams);
                    return result;
                }

                case 3: {
                    // UPDATE
                    if (!meetingId) {
                        return {
                            success: false,
                            error: 'meetingId is required for update operation',
                            response: { text: 'Meeting ID is required to update a calendar meeting' }
                        };
                    }

                    logger.info('[ManageGoogleCalendarTool] Updating calendar meeting', { meetingId, host, mainGuest });
                    
                    const updateParams: GoogleCalendar.UpdateCalendarMeeting = {
                        meetingId,
                        host,
                        mainGuest,
                        thirdPartyGuests: thirdPartyGuests || [],
                        startingTime: startTime,
                        endingTime: endTime,
                        summary,
                        description
                    };

                    const result = await provider.UpdateGoogleCalendarMeeting(updateParams);
                    return result;
                }

                default:
                    return {
                        success: false,
                        error: 'Invalid operation',
                        response: { text: `Invalid operation: ${operation}. Use 1 for CREATE, 2 for DELETE, or 3 for UPDATE.` }
                    };
            }
        } catch (error) {
            logger.error('[ManageGoogleCalendarTool] Error managing Google Calendar', error as Error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to manage Google Calendar',
                response: { 
                    text: `Failed to manage Google Calendar: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            };
        }
    })
    .build();
}

/**
 * Tool: Check Google Calendar Availability
 * Check if attendees are available during a specific time range
 */
export function buildCheckAvailabilityTool(config?: GoogleServicesToolsConfig): ITool {
    return new ToolBuilder()
    .withName('check_google_calendar_availability')
    .withDescription('Check if one or more people are available during a specific time range in Google Calendar. Returns availability status and any conflicts.')
    .withParameters({
        type: 'object',
        properties: {
            emails: {
                type: 'array',
                items: {
                    type: 'string'
                },
                description: 'List of email addresses to check availability for'
            },
            startTime: {
                type: 'string',
                description: 'Start time, UTC Timestamp (YYYY-MM-DDTHH:MM:SSZ)'
            },
            endTime: {
                type: 'string',
                description: 'End time, UTC Timestamp (YYYY-MM-DDTHH:MM:SSZ)'
            }
        },
        required: ['emails', 'startTime', 'endTime']
    })
    .default(async (params, ctx) => {
        logger.info('[CheckAvailabilityTool] Checking calendar availability', {
            emailCount: params.emails?.length || 0,
            startTime: params.startTime,
            endTime: params.endTime
        });

        // Check if provider registry exists and has google provider
        if (!config?.providerRegistry || !config.providerRegistry.has('google')) {
            return {
                success: false,
                error: 'Google provider not configured',
                response: { text: 'Google provider is not configured'}
            };
        }

        try {
            const provider = await config.providerRegistry.get<GoogleProvider>('google');
            const calendar = provider.getCalendarClient();
            
            const { emails, startTime, endTime } = params;

            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return {
                    success: false,
                    error: 'Invalid emails parameter',
                    response: { text: 'Please provide at least one email address to check availability for' }
                };
            }

            const availability = await GoogleCalendar.checkAvailability(calendar, emails, startTime, endTime);

            if (availability.available) {
                const availableEmails = availability.conflicts
                    .filter(c => !c.busy)
                    .map(c => c.email)
                    .join(', ');
                
                return {
                    success: true,
                    data: {
                        available: true,
                        conflicts: availability.conflicts
                    },
                    response: {
                        text: `All attendees are available during this time: ${availableEmails}`
                    }
                };
            } else {
                const busyEmails = availability.conflicts
                    .filter(c => c.busy)
                    .map(c => c.email)
                    .join(', ');
                
                return {
                    success: true,
                    data: {
                        available: false,
                        conflicts: availability.conflicts
                    },
                    response: {
                        text: `The following attendees are busy during this time: ${busyEmails}. Please choose a different time slot.`
                    }
                };
            }
        } catch (error) {
            logger.error('[CheckAvailabilityTool] Error checking availability', error as Error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check availability',
                response: {
                    text: `Failed to check calendar availability: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            };
        }
    })
    .build();
}

/**
 * Register all google tools
 */
export async function setupGoogleTools(
    registry: ToolRegistry,
    config?: GoogleServicesToolsConfig
  ): Promise<void> {
    registry.register(buildCreateCalendarMeetingTool(config));
    registry.register(buildCheckAvailabilityTool(config));
    logger.info('[GoogleTools] Registered google tools with provider registry');
  }
  