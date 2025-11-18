import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export function deleteFileFromUploads(path: string | null) {
  if (!path) return;

  // Expect stored path like "/uploads/filename.ext"
  const filename = path.replace(/^\/uploads\//, '');
  if (!filename) return;

  const fullPath = join(process.cwd(), 'uploads', filename);

  if (existsSync(fullPath)) {
    try {
      unlinkSync(fullPath);
      console.log(`Deleted file: ${fullPath}`);
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  } else {
    console.log('File does not exist:', fullPath);
  }
}
