import * as fs from 'fs';
import * as path from 'path';

// Get upload folder path
export function getUploadPath(): string {
  return path.join(__dirname, '..', '..', '..', 'uploads');
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const ext = getFileExtension(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  return `${nameWithoutExt}_${timestamp}_${randomString}${ext}`;
}

export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

export async function saveFile(file: Express.Multer.File): Promise<string> {
  if (!file) throw new Error('No file provided');

  try {
    const uploadDir = getUploadPath();
    ensureDirectoryExists(uploadDir);

    const filename = generateUniqueFilename(file.originalname);
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
}
