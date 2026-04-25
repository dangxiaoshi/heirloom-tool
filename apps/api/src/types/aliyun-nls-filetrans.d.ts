declare module "aliyun-nls-filetrans" {
  type SubmitTaskResponse = {
    StatusText?: string;
    TaskId?: string;
    Result?: unknown;
  };

  export default class FileTransClient {
    constructor(config: {
      accessKeyId: string;
      secretAccessKey: string;
      endpoint: string;
      apiVersion: string;
    });

    submitTask(
      params: { Task: string },
      options?: { method?: string },
    ): Promise<SubmitTaskResponse>;

    getTaskResult(params: { TaskId: string }): Promise<SubmitTaskResponse>;
  }
}
