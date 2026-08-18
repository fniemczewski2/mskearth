import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { supabase } from '../supabaseClient.js';

const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const MAX_BYTES = 8 * 1024 * 1024;

async function assertRealImage(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`${file.name}: dozwolone formaty to JPG, PNG, WebP i AVIF.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name}: maksymalny rozmiar pliku to 8 MB.`);
  }

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from, to) => String.fromCharCode(...head.slice(from, to));

  const isJpg = head[0] === 0xff && head[1] === 0xd8;
  const isPng =
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isWebp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  const isAvif = ascii(4, 8) === 'ftyp';

  if (!(isJpg || isPng || isWebp || isAvif)) {
    throw new Error(`${file.name}: plik nie jest prawidłowym obrazem.`);
  }

  return ALLOWED_TYPES.get(file.type);
}

export async function uploadImages(files, { bucket = 'mskearth', prefix = '' } = {}) {
  const arr = Array.from(files ?? []);
  if (arr.length === 0) return [];

  const cleanPrefix = String(prefix ?? '').replace(/^\/+|\/+$/g, '');

  const results = await Promise.allSettled(
    arr.map(async (file) => {
      const ext = await assertRealImage(file);
      const filename = `${Date.now()}-${uuid()}.${ext}`;
      const path = cleanPrefix ? `${cleanPrefix}/${filename}` : filename;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw new Error(error.message || 'Nie udało się wysłać pliku.');
      return path;
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) throw new Error(failed[0].reason?.message ?? 'Upload nieudany.');

  return results.map((r) => r.value);
}

export async function removeImage(path, bucket = 'mskearth') {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

export async function getSignedUrl(path, { bucket = 'mskearth', expiresIn = 3600 } = {}) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? '';
}

export default function useUploadFiles(defaultBucket = 'mskearth') {
  const [fileIds, setFileIds] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [allUploadsComplete, setAllUploadsComplete] = useState(true);
  const [errors, setErrors] = useState([]);

  const uploadFiles = useCallback(
    async (files, { bucket = defaultBucket, prefix = '', maxFiles } = {}) => {
      const arr = Array.from(files ?? []);
      if (arr.length === 0) return [];

      if (typeof maxFiles === 'number' && arr.length > maxFiles) {
        setErrors([{ index: -1, message: `Maksymalnie ${maxFiles} plików naraz.` }]);
        return [];
      }

      setAllUploadsComplete(false);
      setErrors([]);
      setUploadProgress({});

      const cleanPrefix = String(prefix ?? '').replace(/^\/+|\/+$/g, '');

      const results = await Promise.allSettled(
        arr.map(async (file, index) => {
          setUploadProgress((prev) => ({ ...prev, [index]: 0 }));

          const ext = await assertRealImage(file);
          const filename = `${Date.now()}-${uuid()}.${ext}`;
          const path = cleanPrefix ? `${cleanPrefix}/${filename}` : filename;

          const { error } = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: file.type,
          });
          if (error) throw new Error(error.message || 'Nie udało się wysłać pliku.');

          setUploadProgress((prev) => ({ ...prev, [index]: 100 }));
          return path;
        })
      );

      const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      const errs = results
        .map((r, i) =>
          r.status === 'rejected'
            ? { index: i, message: r.reason?.message ?? String(r.reason) }
            : null
        )
        .filter(Boolean);

      setErrors(errs);
      setFileIds(ok);
      setAllUploadsComplete(true);
      return ok;
    },
    [defaultBucket]
  );

  const reset = useCallback(() => {
    setFileIds([]);
    setUploadProgress({});
    setAllUploadsComplete(true);
    setErrors([]);
  }, []);

  return {
    fileIds,
    uploadFiles,
    uploadProgress,
    allUploadsComplete,
    uploading: !allUploadsComplete,
    errors,
    reset,
  };
}
