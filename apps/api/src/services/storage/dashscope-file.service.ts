import { env } from "../../config/env.js";

type UploadAudioInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
};

type UploadAudioResult = {
  key: string;
  ossUrl: string;
};

type JsonRecord = Record<string, unknown>;

const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com";
const DASHSCOPE_FILE_BUCKET = "dashscope-file-mgr";
const DASHSCOPE_FILE_HOST = "https://dashscope-file-mgr.oss-cn-beijing.aliyuncs.com";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function getString(input: unknown, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = input;
    let failed = false;

    for (const key of path) {
      if (!isRecord(current) || !(key in current)) {
        failed = true;
        break;
      }
      current = current[key];
    }

    if (!failed && typeof current === "string" && current.trim()) {
      return current.trim();
    }
  }

  return undefined;
}

function requireDashScopeConfig() {
  if (!env.DASHSCOPE_API_KEY) {
    throw new Error("dashscope_api_key_missing");
  }
}

function buildObjectKey(fileName: string, uploadDir: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const normalizedDir = uploadDir.replace(/^\/+|\/+$/g, "");
  return `${normalizedDir}/${crypto.randomUUID()}-${safeName}`;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { rawText: text };
  }
}

async function requestUploadPolicy() {
  requireDashScopeConfig();

  const url = new URL("/api/v1/uploads", env.DASHSCOPE_API_ENDPOINT ?? DASHSCOPE_ENDPOINT);
  url.searchParams.set("action", "getPolicy");
  url.searchParams.set("model", env.DASHSCOPE_ASR_MODEL ?? "paraformer-v2");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
      Accept: "application/json",
    },
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(`dashscope_upload_policy_failed:${response.status}:${JSON.stringify(body)}`);
  }

  return body;
}

export async function uploadAudioToDashScope(input: UploadAudioInput): Promise<UploadAudioResult> {
  const policyResponse = await requestUploadPolicy();

  const uploadDir = getString(policyResponse, [["data", "upload_dir"], ["Data", "UploadDir"]]);
  const policy = getString(policyResponse, [["data", "policy"], ["Data", "Policy"]]);
  const signature = getString(policyResponse, [["data", "signature"], ["Data", "Signature"]]);
  const accessKeyId = getString(policyResponse, [
    ["data", "oss_access_key_id"],
    ["data", "access_key_id"],
    ["data", "OSSAccessKeyId"],
    ["Data", "OSSAccessKeyId"],
  ]);

  if (!uploadDir || !policy || !signature || !accessKeyId) {
    throw new Error(`dashscope_upload_policy_invalid:${JSON.stringify(policyResponse)}`);
  }

  const key = buildObjectKey(input.fileName, uploadDir);
  const form = new FormData();
  form.set("key", key);
  form.set("policy", policy);
  form.set("OSSAccessKeyId", accessKeyId);
  form.set("signature", signature);
  form.set("x-oss-object-acl", "private");
  form.set("x-oss-forbid-overwrite", "true");
  form.set("success_action_status", "204");
  const bytes = new Uint8Array(input.fileBuffer);
  form.set("file", new Blob([bytes], { type: input.mimeType }), input.fileName);

  const uploadResponse = await fetch(DASHSCOPE_FILE_HOST, {
    method: "POST",
    body: form,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`dashscope_file_upload_failed:${uploadResponse.status}:${errorText}`);
  }

  return {
    key,
    ossUrl: `oss://${DASHSCOPE_FILE_BUCKET}/${key}`,
  };
}
