import { env } from "../../../config/env.js";

type SubmitFileTranscriptionInput = {
  fileUrl: string;
};

type SubmitFileTranscriptionResult = {
  jobId: string;
  status: "processing";
  provider: "dashscope-paraformer";
};

type PollFileTranscriptionResult = {
  jobId: string;
  provider: "dashscope-paraformer";
  status: "processing" | "done" | "failed";
  transcript?: string;
  raw?: unknown;
};

type JsonRecord = Record<string, unknown>;
type DashScopeResultItem = {
  file_url?: string;
  transcription_url?: string;
  subtask_status?: string;
};
type DashScopeSentence = {
  begin_time?: number;
  end_time?: number;
  text?: string;
  speaker_id?: number;
};

const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com";

function requireDashScopeConfig() {
  if (!env.DASHSCOPE_API_KEY) {
    throw new Error("dashscope_api_key_missing");
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function getNestedValue(input: unknown, path: string[]) {
  let current: unknown = input;
  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

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

function getNumber(input: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = getNestedValue(input, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function getLanguageHints() {
  return (env.DASHSCOPE_ASR_LANGUAGE_HINTS ?? "zh,en")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSpeakerCount() {
  return env.DASHSCOPE_ASR_SPEAKER_COUNT && env.DASHSCOPE_ASR_SPEAKER_COUNT >= 2
    ? env.DASHSCOPE_ASR_SPEAKER_COUNT
    : 2;
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

async function sendDashScopeRequest(pathname: string, init: RequestInit) {
  requireDashScopeConfig();

  const url = new URL(pathname, env.DASHSCOPE_API_ENDPOINT ?? DASHSCOPE_ENDPOINT);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${env.DASHSCOPE_API_KEY}`);
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(`dashscope_request_failed:${response.status}:${JSON.stringify(body)}`);
  }

  return body;
}

function getTaskStatus(input: unknown) {
  const status = getString(input, [["output", "task_status"], ["task_status"]])?.toUpperCase();
  if (!status || status === "PENDING" || status === "RUNNING") {
    return "processing" as const;
  }
  if (status === "SUCCEEDED") {
    return "done" as const;
  }
  return "failed" as const;
}

function extractSucceededResult(input: unknown) {
  const results = getNestedValue(input, ["output", "results"]);
  if (!Array.isArray(results)) {
    return undefined;
  }

  return results.find((item): item is DashScopeResultItem => {
    if (!isRecord(item)) return false;
    const candidate = item as DashScopeResultItem;
    return typeof candidate.transcription_url === "string" && candidate.subtask_status?.toUpperCase() === "SUCCEEDED";
  });
}

function formatTimestamp(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function normalizeSentences(sentences: DashScopeSentence[]) {
  const lines: string[] = [];
  let currentSpeaker: number | undefined;
  let currentBegin = 0;
  let currentEnd = 0;
  let currentTexts: string[] = [];

  const flush = () => {
    if (currentTexts.length === 0) return;
    const prefix = typeof currentSpeaker === "number"
      ? `[${formatTimestamp(currentBegin)}] 说话人${currentSpeaker + 1}：`
      : `[${formatTimestamp(currentBegin)}] `;
    lines.push(`${prefix}${currentTexts.join("")}`.trim());
    currentTexts = [];
  };

  for (const sentence of sentences) {
    const text = sentence.text?.trim();
    if (!text) continue;

    const speaker = sentence.speaker_id;
    const begin = sentence.begin_time ?? currentEnd;
    const end = sentence.end_time ?? begin;
    const shouldSplit = currentTexts.length > 0
      && (speaker !== currentSpeaker || begin - currentEnd > 500);

    if (shouldSplit) {
      flush();
    }

    if (currentTexts.length === 0) {
      currentSpeaker = speaker;
      currentBegin = begin;
    }

    currentEnd = end;
    currentTexts.push(text);
  }

  flush();
  return lines.join("\n");
}

function normalizeTranscript(input: unknown) {
  const sentences = getNestedValue(input, ["transcripts", "0", "sentences"]);
  if (Array.isArray(sentences)) {
    const normalized = normalizeSentences(
      sentences.map((item) => ({
        begin_time: getNumber(item, [["begin_time"]]),
        end_time: getNumber(item, [["end_time"]]),
        text: getString(item, [["text"]]),
        speaker_id: getNumber(item, [["speaker_id"]]),
      })),
    );
    if (normalized) {
      return normalized;
    }
  }

  const transcriptText = getString(input, [["transcripts", "0", "text"], ["text"]]);
  return transcriptText ?? "";
}

async function fetchTranscriptText(transcriptionUrl: string) {
  const response = await fetch(transcriptionUrl);
  if (!response.ok) {
    throw new Error(`dashscope_transcript_fetch_failed:${response.status}`);
  }

  const body = await parseJsonResponse(response);
  return {
    transcript: normalizeTranscript(body),
    raw: body,
  };
}

export class DashScopeAsrProvider {
  async submitFileTranscription(input: SubmitFileTranscriptionInput): Promise<SubmitFileTranscriptionResult> {
    const response = await sendDashScopeRequest("/api/v1/services/audio/asr/transcription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: env.DASHSCOPE_ASR_MODEL ?? "paraformer-v2",
        input: {
          file_urls: [input.fileUrl],
        },
        parameters: {
          language_hints: getLanguageHints(),
          disfluency_removal_enabled: true,
          diarization_enabled: true,
          speaker_count: getSpeakerCount(),
        },
      }),
    });

    const jobId = getString(response, [["output", "task_id"], ["task_id"]]);
    if (!jobId) {
      throw new Error(`dashscope_submit_failed:${JSON.stringify(response)}`);
    }

    return {
      jobId,
      status: "processing",
      provider: "dashscope-paraformer",
    };
  }

  async pollFileTranscription(jobId: string): Promise<PollFileTranscriptionResult> {
    const response = await sendDashScopeRequest(`/api/v1/tasks/${encodeURIComponent(jobId)}`, {
      method: "POST",
    });
    const status = getTaskStatus(response);

    if (status !== "done") {
      return {
        jobId,
        provider: "dashscope-paraformer",
        status,
        raw: response,
      };
    }

    const result = extractSucceededResult(response);
    if (!result?.transcription_url) {
      throw new Error(`dashscope_transcription_url_missing:${JSON.stringify(response)}`);
    }

    const transcriptResult = await fetchTranscriptText(result.transcription_url);

    return {
      jobId,
      provider: "dashscope-paraformer",
      status: "done",
      transcript: transcriptResult.transcript,
      raw: {
        task: response,
        transcription: transcriptResult.raw,
      },
    };
  }
}
