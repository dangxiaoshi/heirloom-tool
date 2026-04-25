type TranscriptStatus = "uploaded" | "processing" | "done" | "failed";

export type TranscriptEntity = {
  recordingId: string;
  provider: "dashscope-paraformer";
  status: TranscriptStatus;
  transcript: string;
  jobId?: string;
  raw?: unknown;
  updatedAt: string;
};

const transcriptStore = new Map<string, TranscriptEntity>();

export function createOrUpdateTranscript(input: Omit<TranscriptEntity, "updatedAt">) {
  const entity: TranscriptEntity = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  transcriptStore.set(input.recordingId, entity);
  return entity;
}

export function getTranscriptByRecordingId(recordingId: string) {
  return transcriptStore.get(recordingId);
}
