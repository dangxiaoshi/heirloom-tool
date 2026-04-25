export class AliyunAsrProvider {
  async transcribe() {
    return {
      text: "这里封装阿里云语音模型调用。",
      provider: "aliyun-asr" as const,
    };
  }
}
