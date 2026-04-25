export type InterviewModule = "童年" | "婚姻" | "迁徙" | "职业" | "家风";

export type InterviewSession = {
  id: string;
  elderName: string;
  relation: string;
  topic?: string;
  status: "active" | "completed";
};
