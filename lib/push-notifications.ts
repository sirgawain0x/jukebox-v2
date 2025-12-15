import webpush from "web-push";
import { redis } from "@/lib/redis";

// Configure VAPID details
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_SUBJECT =
    process.env.VAPID_SUBJECT || "mailto:admin@creativeplatform.xyz";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(
            VAPID_SUBJECT,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
    } catch (error) {
        console.error("Failed to configure VAPID details:", error);
    }
}

export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

// Helper to serialize PushSubscription to our stored format
export function serializeSubscription(
    sub: PushSubscription | PushSubscriptionData
): PushSubscriptionData | null {
    if ("getKey" in sub && typeof sub.getKey === "function") {
        // It's a PushSubscription object
        const p256dh = sub.getKey("p256dh");
        const auth = sub.getKey("auth");

        if (!p256dh || !auth) return null;

        return {
            endpoint: sub.endpoint,
            keys: {
                p256dh: btoa(
                    String.fromCharCode(...new Uint8Array(p256dh as ArrayBuffer))
                ),
                auth: btoa(String.fromCharCode(...new Uint8Array(auth as ArrayBuffer))),
            },
        };
    } else if ("keys" in sub && sub.keys && "p256dh" in sub.keys) {
        // Already serialized
        return sub as PushSubscriptionData;
    }
    return null;
}

const SUBSCRIPTION_PREFIX = "push_sub:";

function getSubscriptionKey(userIdOrEndpoint: string): string {
    // Use a hash or just the endpoint directly if it is safe, but here we'll use a prefix
    // If userId is provided, use that. If not, use endpoint.
    return `${SUBSCRIPTION_PREFIX}${userIdOrEndpoint}`;
}

export async function saveSubscription(
    subscription: PushSubscriptionData,
    userId?: string
): Promise<void> {
    if (!redis) {
        console.warn("Redis not configured, cannot save subscription");
        return;
    }
    const key = getSubscriptionKey(userId || subscription.endpoint);
    await redis.set(key, JSON.stringify(subscription));
}

export async function deleteSubscription(
    userIdOrEndpoint: string
): Promise<void> {
    if (!redis) return;
    const key = getSubscriptionKey(userIdOrEndpoint);
    await redis.del(key);
}

export async function getAllSubscriptions(): Promise<PushSubscriptionData[]> {
    if (!redis) return [];

    const keys = await redis.keys(`${SUBSCRIPTION_PREFIX}*`);
    if (keys.length === 0) return [];

    // Fetch all in parallel
    // redis.mget expects multiple keys
    // Note: Upstash/redis `mget` returns array of values
    // We need to fetch somewhat efficiently
    // Since keys can be many, we might want to scan or chunk, but for now assuming low volume for MVP
    const subs = await redis.mget<string[]>(...keys);

    return subs
        .filter((s): s is string => s !== null && s !== undefined)
        .map((s) => JSON.parse(s) as PushSubscriptionData);
}

export interface BroadcastResult {
    successCount: number;
    failureCount: number;
}

export async function broadcastNotification(
    title: string,
    body: string,
    url: string = "/"
): Promise<BroadcastResult> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.error("VAPID keys missing, cannot broadcast");
        return { successCount: 0, failureCount: 0 };
    }

    const subscriptions = await getAllSubscriptions();
    if (subscriptions.length === 0) {
        return { successCount: 0, failureCount: 0 };
    }

    console.log(`Broadcasting to ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
        title,
        body,
        icon: "/icon.png",
        badge: "/icon.png",
        url,
    });

    const promises = subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                },
                payload
            );
            return true;
        } catch (error: unknown) {
            const err = error as { statusCode?: number };
            if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription gone, clean up
                // Ideally we delete by the key we stored it under. 
                // Since we retrieve by prefix, we'd need to know the original key or store the key in the value.
                // For now, let's try to delete by endpoint if that was the key, but we might miss userId keys.
                // A better schema might be needed long term (Set of keys).
                // MVP: We won't auto-delete here effectively without a mapping back to the Redis key.
                // We can iterate keys again or store key in payload.
                console.log("Subscription expired:", sub.endpoint);
            }
            console.error("Failed to send notification:", error);
            return false;
        }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;
    const failureCount = results.length - successCount;

    return { successCount, failureCount };
}
