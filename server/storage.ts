/**
 * Railway Storage Module — Cloudflare R2 (S3-compatible)
 * Replaces Manus storage proxy with direct S3/R2 access.
 * 
 * Required env vars:
 *   R2_ACCOUNT_ID       — Cloudflare account ID
 *   R2_ACCESS_KEY_ID    — R2 access key
 *   R2_SECRET_ACCESS_KEY — R2 secret key
 *   R2_BUCKET_NAME      — R2 bucket name (e.g., "totallook")
 *   R2_PUBLIC_URL       — Public URL prefix for the bucket (e.g., "https://pub-xxx.r2.dev")
 * 
 * Alternative: Set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_PUBLIC_URL
 * for any S3-compatible provider (AWS S3, MinIO, etc.)
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getStorageConfig() {
  // Try R2 first, then generic S3
  const endpoint = process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : process.env.S3_ENDPOINT;
  
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "Storage not configured. Set R2_* or S3_* environment variables. " +
      "See deployment guide for details."
    );
  }

  return { endpoint, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const config = getStorageConfig();
    _s3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
      },
    });
  }
  return _s3Client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  const client = getS3Client();

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  // If we have a public URL, use it directly
  const url = config.publicUrl
    ? `${config.publicUrl.replace(/\/+$/, "")}/${key}`
    : await getSignedUrl(client, new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }), { expiresIn: 86400 * 7 }); // 7 day signed URL

  return { key, url };
}

export async function storageGet(
  relKey: string,
  expiresIn = 86400
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  // If public URL is available, use it
  if (config.publicUrl) {
    return {
      key,
      url: `${config.publicUrl.replace(/\/+$/, "")}/${key}`,
    };
  }

  // Otherwise generate a signed URL
  const client = getS3Client();
  const url = await getSignedUrl(client, new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  }), { expiresIn });

  return { key, url };
}
