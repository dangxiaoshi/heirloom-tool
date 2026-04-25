import { createRequire } from "node:module";
import { env } from "../../config/env.js";

const require = createRequire(import.meta.url);
const OSS = require("ali-oss");

type UploadAudioInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
};

type UploadAudioResult = {
  key: string;
  url: string;
};

function requireOssConfig() {
  if (!env.ALIYUN_ACCESS_KEY_ID || !env.ALIYUN_ACCESS_KEY_SECRET || !env.ALIYUN_OSS_BUCKET || !env.ALIYUN_OSS_REGION) {
    throw new Error("aliyun_oss_config_missing");
  }
}

function buildObjectKey(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `recordings/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
}

function buildPublicUrl(objectKey: string) {
  if (env.ALIYUN_OSS_CDN_BASE_URL) {
    return `${env.ALIYUN_OSS_CDN_BASE_URL.replace(/\/$/, "")}/${objectKey}`;
  }

  if (env.ALIYUN_OSS_ENDPOINT) {
    return `${env.ALIYUN_OSS_ENDPOINT.replace(/\/$/, "")}/${objectKey}`;
  }

  return `https://${env.ALIYUN_OSS_BUCKET}.${env.ALIYUN_OSS_REGION}.aliyuncs.com/${objectKey}`;
}

export async function uploadAudioToOss(input: UploadAudioInput): Promise<UploadAudioResult> {
  requireOssConfig();

  const client = new OSS({
    region: env.ALIYUN_OSS_REGION,
    accessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET,
    bucket: env.ALIYUN_OSS_BUCKET,
    secure: true,
    authorizationV4: true,
  });

  const key = buildObjectKey(input.fileName);
  await client.put(key, input.fileBuffer, {
    headers: {
      "Content-Type": input.mimeType,
    },
  });

  return {
    key,
    url: buildPublicUrl(key),
  };
}
