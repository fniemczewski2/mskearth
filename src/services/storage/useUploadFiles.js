import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { supabase } from '../supabaseClient.js';

const KINDS = {
  image: {
    types: new Map([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
      ['image/avif', 'avif'],
    ]),
    maxBytes: 8 * 1024 * 1024,
    typeError: 'dozwolone formaty to JPG, PNG, WebP i AVIF.',
  },
  pdf: {
    types: new Map([['application/pdf', 'pdf']]),
    maxBytes: 20 * 1024 * 1024,
    typeError: 'dozwolony format to PDF.',
  },
};

const AVIF_BRANDS = new Set(['avif', 'avis']);

/** Sprawdza typ deklarowany i sygnature pliku. Zwraca rozszerzenie. */
export async function assertAllowedFile(file, kind = 'image') {
  const spec = KINDS[kind];
  if (!spec) throw new Error(`Nieznany rodzaj pliku: ${kind}`);

  if (!spec.types.has(file.type)) {
    throw new Error(`${file.name}: ${spec.typeError}`);
  }
  if (file.size > spec.maxBytes) {
    throw new Error(`${file.name}: maksymalny rozmiar pliku to ${spec.maxBytes / 1024 / 1024} MB.`);
  }

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from, to) => String.fromCharCode(...head.slice(from, to));

  const signatureOk = {
    'image/jpeg': head[0] === 0xff && head[1] === 0xd8,
    'image/png': head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47,
    'image/webp': ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP',
    // Samo "ftyp" pasuje tez do MP4/MOV/HEIC, dlatego sprawdzamy marke.
    'image/avif': ascii(4, 8) === 'ftyp' && AVIF_BRANDS.has(ascii(8, 12)),
    'application/pdf': ascii(0, 5) === '%PDF-',
  }[file.type];

  if (!signatureOk) {
    throw new Error(`${file.name}: zawartość pliku nie zgadza się z jego typem.`);
  }

  return spec.types.get(file.type);
}

async function uploadOne(file, { bucket, prefix, kind }) {
  const ext = await assertAllowedFile(file, kind);
  const cleanPrefix = String(prefix ?? '').replace(/^\/+|\/+$/g, '');
  const filename = `${Date.now()}-${uuid()}.${ext}`;
  const path = cleanPrefix ? `${cleanPrefix}/${filename}` : filename;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message || 'Nie udało się wysłać pliku.');
  return path;
}

export async function uploadImages(files, { bucket = 'mskearth', prefix = '', kind = 'image' } = {}) {
  const arr = Array.from(files ?? []);
  if (arr.length === 0) return [];

  const results = await Promise.allSettled(arr.map((file) => uploadOne(file, { bucket, prefix, kind })));
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
    async (files, { bucket = defaultBucket, prefix = '', maxFiles, kind = 'image' } = {}) => {
      const arr = Array.from(files ?? []);
      if (arr.length === 0) return [];

      if (typeof maxFiles === 'number' && arr.length > maxFiles) {
        setErrors([{ index: -1, message: `Maksymalnie ${maxFiles} plików naraz.` }]);
        return [];
      }

      setAllUploadsComplete(false);
      setErrors([]);
      setUploadProgress({});

      const results = await Promise.allSettled(
        arr.map(async (file, index) => {
          setUploadProgress((prev) => ({ ...prev, [index]: 0 }));
          const path = await uploadOne(file, { bucket, prefix, kind });
          setUploadProgress((prev) => ({ ...prev, [index]: 100 }));
          return path;
        })
      );

      const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      const errs = results
        .map((r, i) =>
          r.status === 'rejected' ? { index: i, message: r.reason?.message ?? String(r.reason) } : null
        )
        .filter(Boolean);

      setErrors(errs);
      // Kolejny wybor plikow dopisuje sie do poprzednich, zamiast je gubic.
      setFileIds((prev) => [...prev, ...ok]);
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
