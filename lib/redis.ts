import { Redis } from "@upstash/redis";

if (
  !process.env.KV_REST_API_URL ||
  !process.env.KV_REST_API_TOKEN
) {
  console.warn(
    "KV_REST_API_URL or KV_REST_API_TOKEN environment variable is not defined, please add to enable background notifications and webhooks."
  );
}

export const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })
    : null;
