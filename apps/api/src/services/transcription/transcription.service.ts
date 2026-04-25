export type TranscriptResult = {
  text: string;
  provider: "aliyun-asr";
};

export async function transcribeAudio(): Promise<TranscriptResult> {
  return {
    text: "这里返回阿里云语音转写结果。",
    provider: "aliyun-asr",
  };
}
