import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

function normalizeKey(value: string): string {
  const key = value.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!key || key.includes("..") || key.includes("\0")) {
    throw new Error("Invalid storage key");
  }
  return key;
}

function getConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = (process.env.S3_REGION || process.env.AWS_REGION || "us-east-1").trim();
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (!bucket) throw new Error("S3_BUCKET is not configured");

  const config: S3ClientConfig = {
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(process.env.S3_FORCE_PATH_STYLE === "true" ? { forcePathStyle: true } : {}),
  };

  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (accessKeyId || secretAccessKey) {
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when using explicit credentials");
    }
    config.credentials = { accessKeyId, secretAccessKey };
  }

  return { bucket, client: new S3Client(config) };
}

function storageReference(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

function parseStorageReference(value: string, expectedBucket: string): string {
  if (!value.startsWith("s3://")) return normalizeKey(value);
  const withoutScheme = value.slice("s3://".length);
  const slash = withoutScheme.indexOf("/");
  if (slash <= 0) throw new Error("Invalid storage reference");
  const bucket = withoutScheme.slice(0, slash);
  if (bucket !== expectedBucket) throw new Error("Storage reference bucket mismatch");
  return normalizeKey(withoutScheme.slice(slash + 1));
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { bucket, client } = getConfig();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION === "aws:kms" ? "aws:kms" : "AES256",
      ...(process.env.S3_KMS_KEY_ID ? { SSEKMSKeyId: process.env.S3_KMS_KEY_ID } : {}),
    })
  );

  return { key, url: storageReference(bucket, key) };
}

/** Returns a short-lived signed GET URL for an internal storage reference/key. */
export async function storageGet(referenceOrKey: string): Promise<{ key: string; url: string }> {
  const { bucket, client } = getConfig();
  const key = parseStorageReference(referenceOrKey, bucket);
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );
  return { key, url };
}

export function isPrivateStorageReference(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("s3://");
}
