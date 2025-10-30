import { useState } from "react";
import { v4 as uuid } from "uuid";
import { supabase } from "../supabaseClient";

export async function toPublicUrl(path, bucket = "mskearth") {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(bucket).getPublicUrl(path);
  if (error) throw error;
  return data?.publicUrl || "";
}


export async function getSignedUrl(path, { bucket = "mskearth", expiresIn = 3600 } = {}) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || "";
}

export async function uploadImages(files, { bucket = "mskearth", prefix = "" } = {}) {
  const arr = Array.from(files || []);
  if (!arr.length) return [];
  const cleanedPrefix = String(prefix || "").replace(/^\/+|\/+$/g, "");

  const results = await Promise.allSettled(
    arr.map(async (file) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const safeExt = ext ? `.${ext}` : "";
      const filename = `${Date.now()}-${uuid()}${safeExt}`;
      const path = cleanedPrefix ? `${cleanedPrefix}/${filename}` : filename;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw new Error(error.message || "Upload failed");
      return path;
    })
  );

  const ok = results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
  const errs = results
    .map((r) => (r.status === "rejected" ? r.reason?.message || String(r.reason) : null))
    .filter(Boolean);

  if (errs.length) {
    throw new Error(errs[0]);
  }
  return ok;
}

export async function removeImage(path, bucket = "mskearth") {
  if (!path) return;
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    /* ignore */
  }
}

export default function useUploadFiles(defaultBucket = "mskearth") {
  const [fileIds, setFileIds] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [allUploadsComplete, setAllUploadsComplete] = useState(true);
  const [errors, setErrors] = useState([]);

  const uploadFiles = async (
    files,
    {
      bucket = defaultBucket,
      prefix = "",
      maxFiles,
    } = {}
  ) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return [];

    if (typeof maxFiles === "number" && arr.length > maxFiles) {
      setErrors([{ index: -1, message: `Too many files. Max is ${maxFiles}.` }]);
      return [];
    }

    setAllUploadsComplete(false);
    setErrors([]);
    setUploadProgress({});

    const cleanedPrefix = String(prefix || "").replace(/^\/+|\/+$/g, "");

    const results = await Promise.allSettled(
      arr.map(async (file, index) => {
        setUploadProgress((prev) => ({ ...prev, [index]: 0 }));

        const ext = (file.name.split(".").pop() || "").toLowerCase();
        const safeExt = ext ? `.${ext}` : "";
        const filename = `${Date.now()}-${uuid()}${safeExt}`;
        const path = cleanedPrefix ? `${cleanedPrefix}/${filename}` : filename;

        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw new Error(error.message || "Upload failed");

        setUploadProgress((prev) => ({ ...prev, [index]: 100 }));
        return path;
      })
    );

    const ok = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);

    const errs = results
      .map((r, i) =>
        r.status === "rejected"
          ? { index: i, message: r.reason?.message || String(r.reason) }
          : null
      )
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
