import { AppState } from './types';

const FILE_NAME = 'solv_backup.json';

export async function findOrCreateBackupFile(accessToken: string): Promise<string> {
  // 1. Search for existing file in appDataFolder
  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.append('spaces', 'appDataFolder');
  searchUrl.searchParams.append('q', `name='${FILE_NAME}'`);
  searchUrl.searchParams.append('fields', 'files(id, name)');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    if (searchRes.status === 401) throw new Error('DRIVE_UNAUTHORIZED');
    throw new Error(`Failed to search Drive: ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. If not found, create a new one
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FILE_NAME,
      parents: ['appDataFolder'],
    }),
  });

  if (!createRes.ok) {
    if (createRes.status === 401) throw new Error('DRIVE_UNAUTHORIZED');
    throw new Error(`Failed to create file in Drive: ${await createRes.text()}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

export async function uploadToDrive(accessToken: string, fileId: string, data: Partial<AppState>): Promise<void> {
  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!uploadRes.ok) {
    if (uploadRes.status === 401) throw new Error('DRIVE_UNAUTHORIZED');
    throw new Error(`Failed to upload to Drive: ${await uploadRes.text()}`);
  }
}

export async function downloadFromDrive(accessToken: string, fileId: string): Promise<AppState | null> {
  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadRes.ok) {
    if (downloadRes.status === 401) throw new Error('DRIVE_UNAUTHORIZED');
    if (downloadRes.status === 404) return null; // File might be empty or deleted
    throw new Error(`Failed to download from Drive: ${await downloadRes.text()}`);
  }

  const text = await downloadRes.text();
  if (!text) return null;
  
  try {
    return JSON.parse(text) as AppState;
  } catch (e) {
    console.error("Failed to parse drive data", e);
    return null;
  }
}
