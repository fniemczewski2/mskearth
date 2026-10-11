import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabaseClient.js', () => ({ supabase: {} }));

import { assertAllowedFile } from './useUploadFiles.js';

function fileOf(bytes, type, name = 'f') {
  return new File([new Uint8Array(bytes)], name, { type });
}

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

describe('assertAllowedFile', () => {
  it('accepts a real PDF for financial reports', async () => {
    const pdf = fileOf([...ascii('%PDF-1.7'), 0, 0, 0, 0], 'application/pdf', 'raport.pdf');
    await expect(assertAllowedFile(pdf, 'pdf')).resolves.toBe('pdf');
  });

  it('rejects a PDF in the image uploader', async () => {
    const pdf = fileOf([...ascii('%PDF-1.7'), 0, 0, 0, 0], 'application/pdf', 'raport.pdf');
    await expect(assertAllowedFile(pdf, 'image')).rejects.toThrow(/JPG/);
  });

  it('rejects an MP4 renamed to .avif', async () => {
    const mp4 = fileOf([0, 0, 0, 0x18, ...ascii('ftypisom')], 'image/avif', 'x.avif');
    await expect(assertAllowedFile(mp4, 'image')).rejects.toThrow(/zawartość/);
  });

  it('accepts a real AVIF', async () => {
    const avif = fileOf([0, 0, 0, 0x1c, ...ascii('ftypavif')], 'image/avif', 'x.avif');
    await expect(assertAllowedFile(avif, 'image')).resolves.toBe('avif');
  });
});
