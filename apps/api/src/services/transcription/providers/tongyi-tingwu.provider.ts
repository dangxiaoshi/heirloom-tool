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

function requireTingwuConfig() {
  if (!env.DASHSCOPE_API_KEY) {
    throw new Error("tongyi_tingwu_config_missing");
  }
}

function getBaseUrl() {
  return env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com";
}

function buildSubmitUrl() {
  const path = env.TONGYI_TINGWU_SUBMIT_PATH ?? "/api/v1/services/audio/asr/transcription";
  return new URL(path, getBaseUrl()).toString();
}

function buildPollUrl(jobId: string) {
  const pathTemplate = env.TONGYI_TINGWU_POLL_PATH ?? "/api/v1/tasks/{jobId}";
  const path = pathTemplate.replace("{jobId}", encodeURIComponent(jobId));
  return new URL(path, getBaseUrl()).toString();
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

function getStatus(input: unknown) {
  const rawStatus = getString(input, [
    ["output", "task_status"],
    ["output", "status"],
    ["status"],
    ["task_status"],
    ["data", "status"],
  ]);

  if (!rawStatus) return "processing";

  const normalized = rawStatus.toUpperCase();
  if (["SUCCEEDED", "SUCCESS", "COMPLETED", "FINISHED"].includes(normalized)) {
    return "done" as const;
  }
  if (["FAILED", "FAIL", "ERROR", "CANCELED", "CANCELLED"].includes(normalized)) {
    return "failed" as const;
  }
  return "processing" as const;
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

  const directTextKeys = ["transcript", "text", "sentence", "content", "Text"];
  const directValues = directTextKeys
    .map((key) => input[key])
    .flatMap((value) => collectTranscriptParts(value));

  if (directValues.length > 0) {
    return directValues;
  }

  const nestedKeys = ["results", "result", "utterances", "segments", "sentences"];
  return nestedKeys
    .map((key) => input[key])
    .flatMap((value) => collectTranscriptParts(value));
}

function normalizeTranscript(result: unknown) {
  return Array.from(new Set(collectTranscriptParts(result)))
    .filter(Boolean)
    .join("\n");
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { rawText: text };
  }
}

function buildHeaders() {
  requireTingwuConfig();

  return {
    Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export class TongyiTingwuProvider {
  async submitFileTranscription(input: SubmitFileTranscriptionInput): Promise<SubmitFileTranscriptionResult> {
    const payload = {
      input: {
        file_url: input.fileUrl,
      },
      parameters: {
        app_key: env.TONGYI_TINGWU_APP_KEY,
      },
    };

    const response = await fetch(buildSubmitUrl(), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await parseJsonResponse(response);
    const jobId = getString(body, [
      ["output", "task_id"],
      ["output", "taskId"],
      ["task_id"],
      ["taskId"],
      ["data", "task_id"],
      ["data", "taskId"],
      ["request_id"],
    ]);

    if (!response.ok || !jobId) {
      throw new Error(`tongyi_tingwu_submit_failed:${response.status}`);
    }

    return {
      jobId,
      status: "processing",
      provider: "tongyi-tingwu",
    };
  }

  async pollFileTranscription(jobId: string): Promise<PollFileTranscriptionResult> {
    const response = await fetch(buildPollUrl(jobId), {
      method: "GET",
      headers: buildHeaders(),
    });
    const body = await parseJsonResponse(response);
    const status = response.ok ? getStatus(body) : "failed";

    return {
      jobId,
      provider: "tongyi-tingwu",
      status,
      transcript: status === "done" ? normalizeTranscript(body) : undefined,
      raw: body,
    };
  }
}
