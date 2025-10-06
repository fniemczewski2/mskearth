// useUploadFiles.js
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { supabase } from './supabaseClient';

/**
 * Upload one or many files to a Supabase Storage bucket/prefix.
 * - Returns STORAGE PATHS (e.g. "articles/<articleId>/<filename>.jpg")
 * - Later you can resolve a public URL with:
 *     supabase.storage.from(bucket).getPublicUrl(path)
 */
export default function useUploadFiles(defaultBucket = 'mskearth') {
  const [fileIds, setFileIds] = useState([]);           // storage paths
  const [uploadProgress, setUploadProgress] = useState({}); // index -> 0..100
  const [allUploadsComplete, setAllUploadsComplete] = useState(true);
  const [errors, setErrors] = useState([]);

  const uploadFiles = async (
    files,
    {
      bucket = defaultBucket,
      prefix = '',
      // if provided, hard-limit how many files we accept in one go
      maxFiles,
    } = {}
  ) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return [];

    if (typeof maxFiles === 'number' && arr.length > maxFiles) {
      setErrors([{ index: -1, message: `Too many files. Max is ${maxFiles}.` }]);
      return [];
    }

    setAllUploadsComplete(false);
    setErrors([]);
    setUploadProgress({}); // reset

    const cleanedPrefix = String(prefix || '').replace(/^\/+|\/+$/g, '');

    const results = await Promise.allSettled(
      arr.map(async (file, index) => {
        setUploadProgress((prev) => ({ ...prev, [index]: 0 }));

        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const safeExt = ext ? `.${ext}` : '';
        const filename = `${Date.now()}-${uuid()}${safeExt}`;
        const path = cleanedPrefix ? `${cleanedPrefix}/${filename}` : filename;

        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw new Error(error.message || 'Upload failed');

        setUploadProgress((prev) => ({ ...prev, [index]: 100 }));
        return path;
      })
    );

    const ok = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean);

    const errs = results
      .map((r, i) => (r.status === 'rejected' ? { index: i, message: r.reason?.message || String(r.reason) } : null))
      .filter(Boolean);

    setErrors(errs);
    setFileIds(ok);
    setAllUploadsComplete(true);

    return ok;
  };

  const reset = () => {
    setFileIds([]);
    setUploadProgress({});
    setAllUploadsComplete(true);
    setErrors([]);
  };

  const uploading = !allUploadsComplete;

  return { fileIds, uploadFiles, uploadProgress, allUploadsComplete, uploading, errors, reset };
}
