import { createHash, createHmac, randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";

type SubmitFileTranscriptionInput = {
  fileUrl: string;
};

type SubmitFileTranscriptionResult = {
  jobId: string;
  status: "processing";
  provider: "tongyi-tingwu";
};

type PollFileTranscriptionResult = {
  jobId: string;
  provider: "tongyi-tingwu";
  status: "processing" | "done" | "failed";
  transcript?: string;
  raw?: unknown;
};

type JsonRecord = Record<string, unknown>;

const TINGWU_VERSION = "2023-09-30";
const TINGWU_PATHNAME = "/openapi/tingwu/v2/tasks";
const SIGNATURE_ALGORITHM = "ACS3-HMAC-SHA256";

function requireTingwuConfig() {
  if (!env.ALIYUN_ACCESS_KEY_ID || !env.ALIYUN_ACCESS_KEY_SECRET || !env.TONGYI_TINGWU_APP_KEY) {
    throw new Error("tongyi_tingwu_config_missing");
  }
}

function getEndpoint() {
  return env.TONGYI_TINGWU_ENDPOINT ?? "https://tingwu.cn-beijing.aliyuncs.com";
}

function getSourceLanguage() {
  return env.TONGYI_TINGWU_SOURCE_LANGUAGE ?? "cn";
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function getNestedValue(input: unknown, path: string[]) {
  let current: unknown = input;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function getString(input: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = getNestedValue(input, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function sha256Hex(input: string) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function hmacSha256Hex(secret: string, input: string) {
  return createHmac("sha256", secret).update(input, "utf8").digest("hex");
}

function formatAcsDate(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function buildCanonicalQueryString(query: URLSearchParams) {
  return Array.from(query.entries())
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function buildSignedHeaders(headers: Record<string, string>) {
  const normalizedHeaders = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), value.trim()] as const)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  const canonicalHeaders = normalizedHeaders
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");
  const signedHeaders = normalizedHeaders
    .map(([key]) => key)
    .join(";");

  return {
    canonicalHeaders,
    signedHeaders,
  };
}

function buildAuthorization(input: {
  method: "GET" | "PUT";
  pathname: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: string;
}) {
  const payloadHash = sha256Hex(input.body);
  const signingHeaders = {
    ...input.headers,
    "x-acs-content-sha256": payloadHash,
  };
  const { canonicalHeaders, signedHeaders } = buildSignedHeaders(signingHeaders);
  const canonicalRequest = [
    input.method,
    input.pathname,
    buildCanonicalQueryString(input.query),
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = `${SIGNATURE_ALGORITHM}\n${sha256Hex(canonicalRequest)}`;
  const signature = hmacSha256Hex(env.ALIYUN_ACCESS_KEY_SECRET!, stringToSign);

  return {
    authorization: `${SIGNATURE_ALGORITHM} Credential=${env.ALIYUN_ACCESS_KEY_ID},SignedHeaders=${signedHeaders},Signature=${signature}`,
    payloadHash,
  };
}

function getStatus(input: unknown) {
  const rawStatus = getString(input, [
    ["Data", "TaskStatus"],
    ["TaskStatus"],
  ]);

  if (!rawStatus) return "processing";

  const normalized = rawStatus.toUpperCase();
  if (normalized === "COMPLETED") {
    return "done" as const;
  }
  if (normalized === "FAILED" || normalized === "INVALID") {
    return "failed" as const;
  }
  return "processing" as const;
}

function extractTranscriptUrl(input: unknown) {
  return getString(input, [
    ["Data", "Result", "Transcription"],
    ["Result", "Transcription"],
  ]);
}

function collectTranscriptParts(input: unknown): string[] {
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => collectTranscriptParts(item));
  }

  if (!isRecord(input)) {
    return [];
  }

  const prioritizedKeys = ["Text", "text", "Sentence", "sentence", "Content", "content"];
  const ownText = prioritizedKeys
    .map((key) => input[key])
    .flatMap((value) => collectTranscriptParts(value));

  if (ownText.length > 0) {
    return ownText;
  }

  const nestedKeys = ["Transcription", "transcription", "Paragraphs", "paragraphs", "Sentences", "sentences"];
  return nestedKeys
    .map((key) => input[key])
    .flatMap((value) => collectTranscriptParts(value));
}

function normalizeTranscript(input: unknown) {
  return Array.from(new Set(collectTranscriptParts(input))).join("\n");
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

async function fetchTranscriptText(transcriptUrl: string) {
  const response = await fetch(transcriptUrl);
  if (!response.ok) {
    throw new Error(`tongyi_tingwu_transcript_fetch_failed:${response.status}`);
  }

  const body = await parseJsonResponse(response);
  return {
    transcript: normalizeTranscript(body),
    raw: body,
  };
}

async function sendTingwuRequest(input: {
  method: "GET" | "PUT";
  pathname: string;
  query?: URLSearchParams;
  body?: unknown;
  action: "CreateTask" | "GetTaskInfo";
}) {
  requireTingwuConfig();

  const url = new URL(input.pathname, getEndpoint());
  const query = input.query ?? new URLSearchParams();
  query.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const body = input.body ? JSON.stringify(input.body) : "";
  const now = new Date();
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    host: url.host,
    "x-acs-action": input.action,
    "x-acs-date": formatAcsDate(now),
    "x-acs-signature-nonce": randomUUID(),
    "x-acs-version": TINGWU_VERSION,
  };

  if (env.ALIBABA_CLOUD_SECURITY_TOKEN) {
    headers["x-acs-security-token"] = env.ALIBABA_CLOUD_SECURITY_TOKEN;
  }

  const { authorization, payloadHash } = buildAuthorization({
    method: input.method,
    pathname: url.pathname,
    query: url.searchParams,
    headers,
    body,
  });

  headers.authorization = authorization;
  headers["x-acs-content-sha256"] = payloadHash;

  const response = await fetch(url, {
    method: input.method,
    headers,
    body: input.method === "PUT" ? body : undefined,
  });
  const responseBody = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(`tongyi_tingwu_request_failed:${response.status}:${JSON.stringify(responseBody)}`);
  }

  return responseBody;
}

export class TongyiTingwuProvider {
  async submitFileTranscription(input: SubmitFileTranscriptionInput): Promise<SubmitFileTranscriptionResult> {
    const query = new URLSearchParams({
      type: "offline",
    });
    const body = {
      AppKey: env.TONGYI_TINGWU_APP_KEY,
      Input: {
        FileUrl: input.fileUrl,
        SourceLanguage: getSourceLanguage(),
      },
      Parameters: {
        Transcription: {
          DiarizationEnabled: false,
        },
      },
    };
    const response = await sendTingwuRequest({
      method: "PUT",
      pathname: TINGWU_PATHNAME,
      query,
      body,
      action: "CreateTask",
    });
    const jobId = getString(response, [
      ["Data", "TaskId"],
      ["TaskId"],
    ]);

    if (!jobId) {
      throw new Error(`tongyi_tingwu_submit_failed:${JSON.stringify(response)}`);
    }

    return {
      jobId,
      status: "processing",
      provider: "tongyi-tingwu",
    };
  }

  async pollFileTranscription(jobId: string): Promise<PollFileTranscriptionResult> {
    const response = await sendTingwuRequest({
      method: "GET",
      pathname: `${TINGWU_PATHNAME}/${encodeURIComponent(jobId)}`,
      action: "GetTaskInfo",
    });
    const status = getStatus(response);

    if (status !== "done") {
      return {
        jobId,
        provider: "tongyi-tingwu",
        status,
        raw: response,
      };
    }

    const transcriptUrl = extractTranscriptUrl(response);
    if (!transcriptUrl) {
      throw new Error(`tongyi_tingwu_transcript_url_missing:${JSON.stringify(response)}`);
    }

    const transcriptResult = await fetchTranscriptText(transcriptUrl);

    return {
      jobId,
      provider: "tongyi-tingwu",
      status: "done",
      transcript: transcriptResult.transcript,
      raw: {
        task: response,
        transcription: transcriptResult.raw,
      },
    };
  }
}
