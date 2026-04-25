import { createRecording, getRecordingById, updateRecording } from "../../repositories/recording.repository.js";
import { createOrUpdateTranscript, getTranscriptByRecordingId } from "../../repositories/transcript.repository.js";
import { uploadAudioToOss } from "../storage/oss.service.js";
import { TongyiTingwuProvider } from "./providers/tongyi-tingwu.provider.js";

type CreateRecordingInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sessionId?: string;
  question?: string;
};

const transcriptionProvider = new TongyiTingwuProvider();

export async function createRecordingWithUpload(input: CreateRecordingInput) {
  const uploaded = await uploadAudioToOss({
    fileBuffer: input.fileBuffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });

  const recording = createRecording({
    sessionId: input.sessionId ?? "session-dev",
    question: input.question ?? "",
    storageKey: uploaded.key,
    audioUrl: uploaded.url,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    status: "uploaded",
  });

  createOrUpdateTranscript({
    recordingId: recording.id,
    provider: "tongyi-tingwu",
    status: "uploaded",
    transcript: "",
  });

  return {
    recordingId: recording.id,
    status: recording.status,
    audioUrl: recording.audioUrl,
  };
}

export async function startTranscriptionJob(recordingId: string) {
  const recording = getRecordingById(recordingId);
  if (!recording) {
    throw new Error("recording_not_found");
  }

  const existingTranscript = getTranscriptByRecordingId(recordingId);
  if (existingTranscript?.jobId) {
    return {
      recordingId,
      jobId: existingTranscript.jobId,
      status: existingTranscript.status,
    };
  }

  const submitted = await transcriptionProvider.submitFileTranscription({
    fileUrl: recording.audioUrl,
  });

  updateRecording(recordingId, {
    status: "transcribing",
  });

  createOrUpdateTranscript({
    recordingId,
    provider: submitted.provider,
    status: "processing",
    transcript: "",
    jobId: submitted.jobId,
  });

  return {
    recordingId,
    jobId: submitted.jobId,
    status: "processing",
  };
}

export async function pollTranscriptionResult(recordingId: string) {
  const transcript = getTranscriptByRecordingId(recordingId);
  if (!transcript) {
    throw new Error("transcript_not_found");
  }

  if (!transcript.jobId || transcript.status === "done" || transcript.status === "failed") {
    return transcript;
  }

  const result = await transcriptionProvider.pollFileTranscription(transcript.jobId);

  if (result.status === "processing") {
    createOrUpdateTranscript({
      recordingId,
      provider: result.provider,
      status: "processing",
      transcript: transcript.transcript,
      jobId: transcript.jobId,
      raw: result.raw,
    });
  } else if (result.status === "done") {
    createOrUpdateTranscript({
      recordingId,
      provider: result.provider,
      status: "done",
      transcript: result.transcript ?? "",
      jobId: transcript.jobId,
      raw: result.raw,
    });
    updateRecording(recordingId, { status: "done" });
  } else {
    createOrUpdateTranscript({
      recordingId,
      provider: result.provider,
      status: "failed",
      transcript: transcript.transcript,
      jobId: transcript.jobId,
      raw: result.raw,
    });
    updateRecording(recordingId, { status: "failed" });
  }

  return getTranscriptByRecordingId(recordingId);
}
