type RecordingStatus = "uploaded" | "transcribing" | "done" | "failed";

export type RecordingEntity = {
  id: string;
  sessionId: string;
  question: string;
  storageKey: string;
  audioUrl: string;
  mimeType: string;
  sizeBytes: number;
  status: RecordingStatus;
  createdAt: string;
  updatedAt: string;
};

type CreateRecordingParams = Omit<RecordingEntity, "id" | "createdAt" | "updatedAt">;

const recordingStore = new Map<string, RecordingEntity>();

export function createRecording(input: CreateRecordingParams) {
  const timestamp = new Date().toISOString();
  const entity: RecordingEntity = {
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };

  recordingStore.set(entity.id, entity);
  return entity;
}

export function getRecordingById(recordingId: string) {
  return recordingStore.get(recordingId);
}

export function updateRecording(recordingId: string, patch: Partial<Omit<RecordingEntity, "id" | "createdAt">>) {
  const current = recordingStore.get(recordingId);
  if (!current) return undefined;

  const next: RecordingEntity = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  recordingStore.set(recordingId, next);
  return next;
}
