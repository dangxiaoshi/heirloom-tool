import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  ALIYUN_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_ACCESS_KEY_SECRET: z.string().optional(),
  ALIBABA_CLOUD_SECURITY_TOKEN: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),
  ALIYUN_OSS_REGION: z.string().optional(),
  ALIYUN_OSS_ENDPOINT: z.string().optional(),
  ALIYUN_OSS_CDN_BASE_URL: z.string().optional(),
  TONGYI_TINGWU_APP_KEY: z.string().optional(),
  TONGYI_TINGWU_ENDPOINT: z.string().optional(),
  TONGYI_TINGWU_SOURCE_LANGUAGE: z.string().optional(),
});

export const env = envSchema.parse(process.env);
