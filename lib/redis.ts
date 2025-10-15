import { Redis } from "@upstash/redis";

if (
  !process.env.JUKEBOX_KV_REST_API_URL ||
  !process.env.JUKEBOX_KV_REST_API_TOKEN
) {
  console.warn(
    "JUKEBOX_KV_REST_API_URL or JUKEBOX_KV_REST_API_TOKEN environment variable is not defined, please add to enable background notifications and webhooks."
  );
}

export const redis =
  process.env.JUKEBOX_KV_REST_API_URL && process.env.JUKEBOX_KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.JUKEBOX_KV_REST_API_URL,
        token: process.env.JUKEBOX_KV_REST_API_TOKEN,
      })
    : null;
