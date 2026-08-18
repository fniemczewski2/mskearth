/**
 * Warstwa zgodnosci ze starymi importami.
 * Implementacja zyje w src/services/storage/useUploadFiles.js.
 */
export {
  default as useUploadFiles,
  uploadImages,
  removeImage,
  getSignedUrl,
} from '../storage/useUploadFiles.js';

export { toPublicUrl } from '../supabaseClient.js';
