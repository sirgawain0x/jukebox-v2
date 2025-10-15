"use client";
import { useState, useEffect } from "react";
import { RecentTip } from "@/types/music";
import { timeAgo } from "../../utils/timeAgo";

export function RecentTips({ artistId }: { artistId: string }) {
  const [tips, setTips] = useState<RecentTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    fetch("https://api.spinamp.xyz/v3/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          artist(id: "${artistId}") {
            recentTips {
              amountEth
              timestamp
              txHash
              sender { address }
            }
          }
        }`,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTips(data?.data?.artist?.recentTips || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load tips");
        setLoading(false);
      });
  }, [artistId]);

  if (loading) {
    return (
      <div className="bg-white/10 dark:bg-black/20 rounded-xl p-4 shadow-md mt-6">
        Loading recent tips...
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white/10 dark:bg-black/20 rounded-xl p-4 shadow-md mt-6 text-red-500">
        {error}
      </div>
    );
  }
  if (!tips.length) {
    return (
      <div className="bg-white/10 dark:bg-black/20 rounded-xl p-4 shadow-md mt-6">
        No recent tips found.
      </div>
    );
  }
  return (
    <div className="bg-white/10 dark:bg-black/20 rounded-xl p-4 shadow-md mt-6">
      <h3 className="font-semibold text-lg mb-3">Recent Tips</h3>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {tips.map((tip, idx) => (
          <li key={idx} className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                {tip.sender?.address
                  ? `${tip.sender.address.slice(0, 6)}...${tip.sender.address.slice(-4)}`
                  : "Unknown"}
              </span>
              <span className="text-xs text-gray-400">
                {timeAgo(Number(tip.timestamp))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-500">
                {tip.amountEth ? Number(tip.amountEth).toFixed(4) : "?"} ETH
              </span>
              {tip.txHash && (
                <a
                  href={`https://basescan.io/tx/${tip.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 underline"
                >
                  View
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
