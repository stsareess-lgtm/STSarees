import { requireAdminActionUser } from "@/lib/auth/require-admin";
import { env } from "@/env.mjs";
import { AwsClient } from "aws4fetch";

/**
 * Sakthi Textile media storage on Cloudflare R2 (same pipeline as Hub of crafts).
 *
 * - Browser direct uploads: aws4fetch presigned PUT (S3 API)
 * - Worker put/get/delete: R2 binding (no S3 signature — avoids 401s from
 *   aws4fetch + global_fetch_strictly_public on Workers)
 *
 * `trusted-server` — route already authenticated (e.g. Velo API key).
 */
export type MediaWriteAuth = "admin-session" | "trusted-server";

async function assertMediaWriteAuth(auth: MediaWriteAuth = "admin-session") {
  if (auth === "trusted-server") return;
  await requireAdminActionUser();
}

function getAwsClient() {
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string) {
  const endpoint = env.S3_ENDPOINT.replace(/\/$/, "");
  const bucket = env.NEXT_PUBLIC_S3_BUCKET;
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${endpoint}/${bucket}/${encodedKey}`;
}

function mediaProxyConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = env.R2_MEDIA_PROXY_URL?.replace(/\/$/, "");
  const secret = env.R2_MEDIA_PROXY_SECRET?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret };
}

/** True when server can stage/put via binding or authenticated media proxy. */
export function hasServerMediaWritePath(): boolean {
  return Boolean(mediaProxyConfig());
}

async function proxyFetch(
  pathWithQuery: string,
  init: RequestInit & { method: string },
): Promise<Response> {
  const proxy = mediaProxyConfig();
  if (!proxy) {
    throw new Error("R2 media proxy is not configured.");
  }
  return fetch(`${proxy.baseUrl}${pathWithQuery}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${proxy.secret}`,
    },
  });
}

function toArrayBuffer(body: Buffer | Uint8Array | string | ArrayBuffer) {
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }
  if (body instanceof ArrayBuffer) return body;
  if (Buffer.isBuffer(body)) {
    return body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    );
  }
  return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
}

export type PutObjectParams = {
  Bucket: string;
  Key: string;
  Body: Buffer | Uint8Array | string | ArrayBuffer;
  ContentType?: string;
  CacheControl?: string;
};

/** Browser staging upload — S3 presigned PUT (no Content-Type in signature). */
export async function createPresignedPutUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
  auth?: MediaWriteAuth;
}) {
  await assertMediaWriteAuth(params.auth ?? "admin-session");
  const expires = params.expiresInSeconds ?? 60 * 10;
  const url = `${objectUrl(params.key)}?X-Amz-Expires=${expires}`;

  const signed = await getAwsClient().sign(url, {
    method: "PUT",
    aws: { signQuery: true },
  });

  return String(signed.url);
}

export async function putObject(
  params: PutObjectParams,
  options?: { auth?: MediaWriteAuth },
) {
  await assertMediaWriteAuth(options?.auth ?? "admin-session");

  const headers: Record<string, string> = {};
  if (params.ContentType) headers["Content-Type"] = params.ContentType;
  if (params.CacheControl) headers["Cache-Control"] = params.CacheControl;
  const body = toArrayBuffer(params.Body);
  // R2 S3 API requires Content-Length (411 MissingContentLength without it).
  // Undici/aws4fetch can omit it for some ArrayBuffer bodies on Vercel.
  const byteLength =
    typeof body === "string" ? Buffer.byteLength(body) : body.byteLength;
  headers["Content-Length"] = String(byteLength);

  // Vercel / Node: prefer authenticated Worker+R2 binding proxy when configured.
  // Stale R2 S3 API tokens return 401 Unauthorized against Cloudflare R2.
  const proxy = mediaProxyConfig();
  if (proxy) {
    const res = await proxyFetch(
      `/object?key=${encodeURIComponent(params.Key)}`,
      { method: "PUT", headers, body },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `R2 put failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
    return { etag: res.headers.get("etag") };
  }

  const res = await getAwsClient().fetch(objectUrl(params.Key), {
    method: "PUT",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `R2 put failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  return { etag: res.headers.get("etag") };
}

export type ObjectMeta = {
  size: number;
  contentType: string | null;
};

/** Metadata only — no image bytes through the host. */
export async function headObjectMeta(params: {
  key: string;
  auth?: MediaWriteAuth;
}): Promise<ObjectMeta> {
  await assertMediaWriteAuth(params.auth ?? "admin-session");

  const proxy = mediaProxyConfig();
  const res = proxy
    ? await proxyFetch(`/object?key=${encodeURIComponent(params.key)}`, {
        method: "HEAD",
      })
    : await getAwsClient().fetch(objectUrl(params.key), { method: "HEAD" });

  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Uploaded file not found. Try uploading again."
        : `R2 head failed (${res.status}).`,
    );
  }

  return {
    size: Number(res.headers.get("content-length") || 0),
    contentType: res.headers.get("content-type"),
  };
}

/**
 * Copy staging → final inside R2 (Worker promote or S3 CopyObject).
 * Keeps Vercel CPU low: only JSON keys cross the wire on the happy path.
 */
export async function promoteObject(params: {
  fromKey: string;
  toKey: string;
  contentType?: string;
  cacheControl?: string;
  deleteSource?: boolean;
  auth?: MediaWriteAuth;
}): Promise<ObjectMeta> {
  await assertMediaWriteAuth(params.auth ?? "admin-session");
  const deleteSource = params.deleteSource !== false;

  const proxy = mediaProxyConfig();
  if (proxy) {
    const res = await proxyFetch("/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromKey: params.fromKey,
        toKey: params.toKey,
        contentType: params.contentType,
        cacheControl:
          params.cacheControl || "public, max-age=31536000, immutable",
        deleteSource,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        res.status === 404
          ? "Uploaded file not found. Try uploading again."
          : `R2 promote failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
    const json = (await res.json().catch(() => ({}))) as {
      size?: number;
      contentType?: string;
    };
    return {
      size: Number(json.size ?? 0),
      contentType: json.contentType ?? params.contentType ?? null,
    };
  }

  const copySource = `/${env.NEXT_PUBLIC_S3_BUCKET}/${params.fromKey}`;
  const headers: Record<string, string> = {
    "x-amz-copy-source": copySource,
    "x-amz-metadata-directive": "REPLACE",
    "Cache-Control":
      params.cacheControl || "public, max-age=31536000, immutable",
  };
  if (params.contentType) headers["Content-Type"] = params.contentType;

  const copyRes = await getAwsClient().fetch(objectUrl(params.toKey), {
    method: "PUT",
    headers,
  });
  if (!copyRes.ok) {
    const text = await copyRes.text().catch(() => "");
    throw new Error(
      `R2 copy failed (${copyRes.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }
  if (deleteSource) {
    await deleteObjects({ keys: [params.fromKey], auth: params.auth });
  }
  return {
    size: 0,
    contentType: params.contentType ?? null,
  };
}

export async function getObjectBuffer(params: {
  key: string;
  maxBytes?: number;
  auth?: MediaWriteAuth;
}) {
  await assertMediaWriteAuth(params.auth ?? "admin-session");

  const proxy = mediaProxyConfig();
  const res = proxy
    ? await proxyFetch(`/object?key=${encodeURIComponent(params.key)}`, {
        method: "GET",
      })
    : await getAwsClient().fetch(objectUrl(params.key), { method: "GET" });

  if (!res.ok) {
    throw new Error(`R2 get failed (${res.status}).`);
  }

  const declared = Number(res.headers.get("content-length") || 0);
  if (
    params.maxBytes &&
    Number.isFinite(declared) &&
    declared > 0 &&
    declared > params.maxBytes
  ) {
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    throw new Error("Image is too large after upload. Compress and retry.");
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (params.maxBytes && bytes.byteLength > params.maxBytes) {
    throw new Error("Image is too large after upload. Compress and retry.");
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function deleteObjects(params: {
  keys: string[];
  auth?: MediaWriteAuth;
}) {
  await assertMediaWriteAuth(params.auth ?? "admin-session");
  const keys = [...new Set(params.keys.map((k) => k.trim()).filter(Boolean))];
  if (keys.length === 0) return;

  const proxy = mediaProxyConfig();
  if (proxy) {
    // Prefer query-key DELETE — some edges reject DELETE with a JSON body.
    await Promise.all(
      keys.map(async (key) => {
        const res = await proxyFetch(`/object?key=${encodeURIComponent(key)}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 404) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `R2 delete failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
          );
        }
      }),
    );
    return;
  }

  const client = getAwsClient();
  await Promise.all(
    keys.map(async (key) => {
      const res = await client.fetch(objectUrl(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `R2 delete failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
        );
      }
    }),
  );
}

export const uploadImage = async (params: PutObjectParams) => {
  return putObject(params);
};
