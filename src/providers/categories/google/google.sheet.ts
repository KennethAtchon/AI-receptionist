/**
 * Google Sheets Helper Functions
 * Contains all spreadsheet-specific logic and operations
 */

import { logger } from '../../../utils/logger';

// Types
export interface CreateSpreadsheetParams {
  title: string;
  sheets?: Array<{ title: string; headers?: string[] }>;
}

export interface ReadSpreadsheetParams {
  spreadsheetId: string;
  range?: string;
  sheetName?: string;
}

export interface UpdateSpreadsheetParams {
  spreadsheetId: string;
  range: string;
  values: any[][];
  sheetName?: string;
}

export interface AppendSpreadsheetParams {
  spreadsheetId: string;
  range: string;
  values: any[][];
  sheetName?: string;
}

export interface DeleteSpreadsheetParams {
  spreadsheetId: string;
}

export interface SpreadsheetResult {
  success: boolean;
  error?: string;
  data?: Record<string, any>;
  response: Record<string, string>;
}

/**
 * Create a new Google Spreadsheet
 */
export async function createSpreadsheet(
  sheetsClient: any,
  params: CreateSpreadsheetParams
): Promise<SpreadsheetResult> {
  try {
    const { title, sheets = [] } = params;

    const requestBody: any = {
      properties: {
        title: title
      }
    };

    // Add sheets if provided
    if (sheets.length > 0) {
      requestBody.sheets = sheets.map(sheet => ({
        properties: {
          title: sheet.title
        }
      }));
    }

    const response = await sheetsClient.spreadsheets.create({
      requestBody
    });

    logger.info('[GoogleSheet] Spreadsheet created successfully', {
      spreadsheetId: response.data.spreadsheetId,
      title: response.data.properties?.title
    });

    return {
      success: true,
      data: {
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetUrl: response.data.spreadsheetUrl,
        title: response.data.properties?.title
      },
      response: {
        text: `Spreadsheet created successfully. Spreadsheet ID: ${response.data.spreadsheetId}`,
        url: response.data.spreadsheetUrl || ''
      }
    };
  } catch (error: any) {
    logger.error('[GoogleSheet] Failed to create spreadsheet:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create spreadsheet',
      response: {
        text: `Failed to create spreadsheet: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Read data from a Google Spreadsheet
 */
export async function readSpreadsheet(
  sheetsClient: any,
  params: ReadSpreadsheetParams
): Promise<SpreadsheetResult> {
  try {
    const { spreadsheetId, range, sheetName } = params;

    // Build range string
    let rangeString = range || 'A1:Z1000';
    if (sheetName && !range?.includes('!')) {
      rangeString = `${sheetName}!${rangeString}`;
    }

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: rangeString
    });

    const values = response.data.values || [];
    
    logger.info('[GoogleSheet] Spreadsheet read successfully', {
      spreadsheetId,
      range: rangeString,
      rowCount: values.length
    });

    return {
      success: true,
      data: {
        spreadsheetId,
        range: rangeString,
        values,
        rowCount: values.length
      },
      response: {
        text: `Read ${values.length} rows from spreadsheet`
      }
    };
  } catch (error: any) {
    logger.error('[GoogleSheet] Failed to read spreadsheet:', error);
    
    if (error?.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found',
        response: {
          text: `Spreadsheet not found. Spreadsheet ID: ${params.spreadsheetId}`
        }
      };
    }
    
    return {
      success: false,
      error: error?.message || 'Failed to read spreadsheet',
      response: {
        text: `Failed to read spreadsheet: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Update data in a Google Spreadsheet
 */
export async function updateSpreadsheet(
  sheetsClient: any,
  params: UpdateSpreadsheetParams
): Promise<SpreadsheetResult> {
  try {
    const { spreadsheetId, range, values, sheetName } = params;

    // Build range string
    let rangeString = range;
    if (sheetName && !range.includes('!')) {
      rangeString = `${sheetName}!${range}`;
    }

    const response = await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: rangeString,
      valueInputOption: 'RAW',
      requestBody: {
        values
      }
    });

    logger.info('[GoogleSheet] Spreadsheet updated successfully', {
      spreadsheetId,
      range: rangeString,
      cellsUpdated: response.data.updatedCells
    });

    return {
      success: true,
      data: {
        spreadsheetId,
        range: rangeString,
        cellsUpdated: response.data.updatedCells,
        rowsUpdated: response.data.updatedRows
      },
      response: {
        text: `Updated ${response.data.updatedCells} cells in spreadsheet`
      }
    };
  } catch (error: any) {
    logger.error('[GoogleSheet] Failed to update spreadsheet:', error);
    
    return {
      success: false,
      error: error?.message || 'Failed to update spreadsheet',
      response: {
        text: `Failed to update spreadsheet: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Append data to a Google Spreadsheet
 */
export async function appendSpreadsheet(
  sheetsClient: any,
  params: AppendSpreadsheetParams
): Promise<SpreadsheetResult> {
  try {
    const { spreadsheetId, range, values, sheetName } = params;

    // Build range string
    let rangeString = range;
    if (sheetName && !range.includes('!')) {
      rangeString = `${sheetName}!${range}`;
    }

    const response = await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: rangeString,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values
      }
    });

    logger.info('[GoogleSheet] Data appended successfully', {
      spreadsheetId,
      range: rangeString,
      cellsUpdated: response.data.updates?.updatedCells
    });

    return {
      success: true,
      data: {
        spreadsheetId,
        range: rangeString,
        cellsUpdated: response.data.updates?.updatedCells,
        rowsAppended: response.data.updates?.updatedRows
      },
      response: {
        text: `Appended ${response.data.updates?.updatedRows} rows to spreadsheet`
      }
    };
  } catch (error: any) {
    logger.error('[GoogleSheet] Failed to append to spreadsheet:', error);
    
    return {
      success: false,
      error: error?.message || 'Failed to append to spreadsheet',
      response: {
        text: `Failed to append to spreadsheet: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Delete a Google Spreadsheet
 */
export async function deleteSpreadsheet(
  driveClient: any,
  params: DeleteSpreadsheetParams
): Promise<SpreadsheetResult> {
  try {
    const { spreadsheetId } = params;

    await driveClient.files.delete({
      fileId: spreadsheetId
    });

    logger.info('[GoogleSheet] Spreadsheet deleted successfully', { spreadsheetId });

    return {
      success: true,
      data: {
        spreadsheetId
      },
      response: {
        text: `Spreadsheet deleted successfully. Spreadsheet ID: ${spreadsheetId}`
      }
    };
  } catch (error: any) {
    logger.error('[GoogleSheet] Failed to delete spreadsheet:', error);
    
    if (error?.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found',
        response: {
          text: `Spreadsheet not found. Spreadsheet ID: ${params.spreadsheetId}`
        }
      };
    }
    
    return {
      success: false,
      error: error?.message || 'Failed to delete spreadsheet',
      response: {
        text: `Failed to delete spreadsheet: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

