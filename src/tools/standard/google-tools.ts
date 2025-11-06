/**
* Google Tools (Standard)
* Tools used to interact with Google API's - All in one place, communication with googleapis SDK
*/

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import { GoogleProvider } from '../../providers/categories/google';
import * as GoogleCalendar from '../../providers/categories/google/google.calendar';
import * as GoogleSheet from '../../providers/categories/google/google.sheet';
import * as GoogleDrive from '../../providers/categories/google/google.drive';

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
 * Tool: Google Sheets Operations
 * CRUD operations on Google Spreadsheets
 */
export function buildGoogleSheetsTool(config?: GoogleServicesToolsConfig): ITool {
    return new ToolBuilder()
    .withName('manage_google_sheets')
    .withDescription('Perform CRUD operations on Google Spreadsheets. Can create, read, update, append, and delete spreadsheets. The AI can decide what data to store in spreadsheets.')
    .withParameters({
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['create', 'read', 'update', 'append', 'delete'],
                description: 'Operation to perform: create (new spreadsheet), read (read data), update (overwrite cells), append (add rows), delete (remove spreadsheet)'
            },
            spreadsheetId: {
                type: 'string',
                description: 'Spreadsheet ID (required for read, update, append, delete operations)'
            },
            title: {
                type: 'string',
                description: 'Title for new spreadsheet (required for create operation)'
            },
            range: {
                type: 'string',
                description: 'Cell range (e.g., "A1:B10" or "Sheet1!A1:B10"). Required for read, update, append operations'
            },
            values: {
                type: 'array',
                items: {
                    type: 'array',
                    items: {
                        type: ['string', 'number', 'boolean', 'null']
                    }
                },
                description: '2D array of values to write. Each inner array is a row. Required for update and append operations'
            },
            sheetName: {
                type: 'string',
                description: 'Optional: Name of the sheet to work with. If not provided, uses the first sheet'
            }
        },
        required: ['operation']
    })
    .default(async (params, ctx) => {
        logger.info('[GoogleSheetsTool] Managing Google Sheets', { operation: params.operation });

        if (!config?.providerRegistry || !config.providerRegistry.has('google')) {
            return {
                success: false,
                error: 'Google provider not configured',
                response: { text: 'Google provider is not configured'}
            };
        }

        try {
            const provider = await config.providerRegistry.get<GoogleProvider>('google');
            const sheetsClient = provider.getSheetsClient();
            const driveClient = provider.getDriveClient();

            const { operation, spreadsheetId, title, range, values, sheetName } = params;

            switch (operation) {
                case 'create': {
                    if (!title) {
                        return {
                            success: false,
                            error: 'Title is required for create operation',
                            response: { text: 'Title is required to create a new spreadsheet' }
                        };
                    }

                    const result = await GoogleSheet.createSpreadsheet(sheetsClient, { title });
                    return result;
                }

                case 'read': {
                    if (!spreadsheetId) {
                        return {
                            success: false,
                            error: 'spreadsheetId is required for read operation',
                            response: { text: 'Spreadsheet ID is required to read data' }
                        };
                    }

                    const result = await GoogleSheet.readSpreadsheet(sheetsClient, {
                        spreadsheetId,
                        range,
                        sheetName
                    });
                    return result;
                }

                case 'update': {
                    if (!spreadsheetId || !range || !values) {
                        return {
                            success: false,
                            error: 'spreadsheetId, range, and values are required for update operation',
                            response: { text: 'Spreadsheet ID, range, and values are required to update data' }
                        };
                    }

                    const result = await GoogleSheet.updateSpreadsheet(sheetsClient, {
                        spreadsheetId,
                        range,
                        values,
                        sheetName
                    });
                    return result;
                }

                case 'append': {
                    if (!spreadsheetId || !range || !values) {
                        return {
                            success: false,
                            error: 'spreadsheetId, range, and values are required for append operation',
                            response: { text: 'Spreadsheet ID, range, and values are required to append data' }
                        };
                    }

                    const result = await GoogleSheet.appendSpreadsheet(sheetsClient, {
                        spreadsheetId,
                        range,
                        values,
                        sheetName
                    });
                    return result;
                }

                case 'delete': {
                    if (!spreadsheetId) {
                        return {
                            success: false,
                            error: 'spreadsheetId is required for delete operation',
                            response: { text: 'Spreadsheet ID is required to delete a spreadsheet' }
                        };
                    }

                    const result = await GoogleSheet.deleteSpreadsheet(driveClient, {
                        spreadsheetId
                    });
                    return result;
                }

                default:
                    return {
                        success: false,
                        error: 'Invalid operation',
                        response: { text: `Invalid operation: ${operation}. Use: create, read, update, append, or delete` }
                    };
            }
        } catch (error) {
            logger.error('[GoogleSheetsTool] Error managing Google Sheets', error as Error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to manage Google Sheets',
                response: {
                    text: `Failed to manage Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            };
        }
    })
    .build();
}

/**
 * Tool: Google Drive Operations
 * Create files and folders in Google Drive
 */
export function buildGoogleDriveTool(config?: GoogleServicesToolsConfig): ITool {
    return new ToolBuilder()
    .withName('manage_google_drive')
    .withDescription('Create files and folders in Google Drive. Can create text files, documents, or folders. The AI can decide what content to store in files.')
    .withParameters({
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['create_file', 'create_folder'],
                description: 'Operation to perform: create_file (create a new file), create_folder (create a new folder)'
            },
            name: {
                type: 'string',
                description: 'Name of the file or folder to create'
            },
            content: {
                type: 'string',
                description: 'Content for the file (required for create_file operation)'
            },
            mimeType: {
                type: 'string',
                description: 'MIME type of the file (e.g., "text/plain", "text/markdown", "application/json"). Defaults to "text/plain"'
            },
            folderId: {
                type: 'string',
                description: 'Optional: ID of the parent folder to create the file/folder in'
            },
            description: {
                type: 'string',
                description: 'Optional: Description of the file or folder'
            }
        },
        required: ['operation', 'name']
    })
    .default(async (params, ctx) => {
        logger.info('[GoogleDriveTool] Managing Google Drive', { operation: params.operation });

        if (!config?.providerRegistry || !config.providerRegistry.has('google')) {
            return {
                success: false,
                error: 'Google provider not configured',
                response: { text: 'Google provider is not configured'}
            };
        }

        try {
            const provider = await config.providerRegistry.get<GoogleProvider>('google');
            const driveClient = provider.getDriveClient();

            const { operation, name, content, mimeType, folderId, description } = params;

            switch (operation) {
                case 'create_file': {
                    if (!content) {
                        return {
                            success: false,
                            error: 'Content is required for create_file operation',
                            response: { text: 'Content is required to create a file' }
                        };
                    }

                    const result = await GoogleDrive.createDriveFile(driveClient, {
                        name,
                        content,
                        mimeType,
                        folderId,
                        description
                    });
                    return result;
                }

                case 'create_folder': {
                    const result = await GoogleDrive.createDriveFolder(driveClient, name, folderId, description);
                    return result;
                }

                default:
                    return {
                        success: false,
                        error: 'Invalid operation',
                        response: { text: `Invalid operation: ${operation}. Use: create_file or create_folder` }
                    };
            }
        } catch (error) {
            logger.error('[GoogleDriveTool] Error managing Google Drive', error as Error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to manage Google Drive',
                response: {
                    text: `Failed to manage Google Drive: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    registry.register(buildGoogleSheetsTool(config));
    registry.register(buildGoogleDriveTool(config));
    logger.info('[GoogleTools] Registered google tools with provider registry');
  }
  