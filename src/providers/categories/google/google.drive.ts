/**
 * Google Drive Helper Functions
 * Contains all drive-specific logic and operations
 */

import { logger } from '../../../utils/logger';

// Types
export interface CreateFileParams {
  name: string;
  content?: string;
  mimeType?: string;
  folderId?: string;
  description?: string;
}

export interface DriveResult {
  success: boolean;
  error?: string;
  data?: Record<string, any>;
  response: Record<string, string>;
}

/**
 * Create a file in Google Drive
 */
export async function createDriveFile(
  driveClient: any,
  params: CreateFileParams
): Promise<DriveResult> {
  try {
    const { name, content, mimeType = 'text/plain', folderId, description } = params;

    // Prepare file metadata
    const fileMetadata: any = {
      name: name
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    if (description) {
      fileMetadata.description = description;
    }

    // Prepare media if content is provided
    let media: any = undefined;
    if (content) {
      media = {
        mimeType: mimeType,
        body: content
      };
    }

    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size'
    });

    logger.info('[GoogleDrive] File created successfully', {
      fileId: response.data.id,
      fileName: response.data.name,
      mimeType: response.data.mimeType
    });

    return {
      success: true,
      data: {
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        mimeType: response.data.mimeType,
        size: response.data.size
      },
      response: {
        text: `File created successfully: ${response.data.name}. File ID: ${response.data.id}`,
        url: response.data.webViewLink || ''
      }
    };
  } catch (error: any) {
    logger.error('[GoogleDrive] Failed to create file:', error);
    
    return {
      success: false,
      error: error?.message || 'Failed to create file',
      response: {
        text: `Failed to create file: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(
  driveClient: any,
  name: string,
  parentFolderId?: string,
  description?: string
): Promise<DriveResult> {
  try {
    const fileMetadata: any = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    if (description) {
      fileMetadata.description = description;
    }

    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink'
    });

    logger.info('[GoogleDrive] Folder created successfully', {
      folderId: response.data.id,
      folderName: response.data.name
    });

    return {
      success: true,
      data: {
        folderId: response.data.id,
        folderName: response.data.name,
        webViewLink: response.data.webViewLink
      },
      response: {
        text: `Folder created successfully: ${response.data.name}. Folder ID: ${response.data.id}`,
        url: response.data.webViewLink || ''
      }
    };
  } catch (error: any) {
    logger.error('[GoogleDrive] Failed to create folder:', error);
    
    return {
      success: false,
      error: error?.message || 'Failed to create folder',
      response: {
        text: `Failed to create folder: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

