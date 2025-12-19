"use client";
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
// Helper functions to call API routes
async function getDailyStats(userId: string) {
  const response = await fetch(`/api/session/daily?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to get daily stats');
  return response.json();
}

async function checkRewardEligibility(userId: string) {
  const response = await fetch(`/api/rewards/eligibility?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to check reward eligibility');
  return response.json();
}

async function claimRewards(userId: string) {
  const response = await fetch('/api/rewards/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error('Failed to claim rewards');
  return response.json();
}

async function getPredictionStreakData(userId: string) {
  const response = await fetch(`/api/prediction/streak?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to get prediction streak');
  return response.json();
}

async function claimStreakReward(userId: string) {
  const response = await fetch('/api/prediction/streak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error('Failed to claim streak reward');
  return response.json();
}
import { useToast } from '../ui/ToastProvider';

export function PlayToEarn() {
  const { address } = useAccount();
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    songsPlayed: 0,
    fullPlays: 0,
    eligible: false,
  });
  const [streak, setStreak] = useState(0);
  const [rewardEligibility, setRewardEligibility] = useState({
    eligible: false,
    songsPlayed: 0,
    songsNeeded: 10,
    rewardAmount: undefined as string | undefined,
    rewardType: 'USDC' as const,
  });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [streakReward, setStreakReward] = useState<{
    type: string;
    name: string;
    description: string;
  } | null>(null);
  const [streakRewardClaimed, setStreakRewardClaimed] = useState(false);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [dailyStats, eligibility, streakData] = await Promise.all([
          getDailyStats(address),
          checkRewardEligibility(address),
          getPredictionStreakData(address),
        ]);

        setStats({
          songsPlayed: dailyStats.songsPlayed || 0,
          fullPlays: dailyStats.fullPlays || 0,
          eligible: dailyStats.eligible || false,
        });
        setRewardEligibility(eligibility);
        setStreak(streakData.streak || 0);
        setStreakReward(streakData.rewardInfo || null);
        setStreakRewardClaimed(streakData.claimed || false);
      } catch (error) {
        console.error('Error loading play-to-earn data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [address]);

  const handleClaimRewards = async () => {
    if (!address) return;

    setClaiming(true);
    try {
      const result = await claimRewards(address);
      if (result.success) {
        showToast(`🎉 Rewards claimed! ${result.txHash ? `TX: ${result.txHash.slice(0, 10)}...` : ''}`);
        // Refresh data
        const eligibility = await checkRewardEligibility(address);
        setRewardEligibility(eligibility);
      } else {
        showToast(`❌ ${result.error || 'Failed to claim rewards'}`);
      }
    } catch (error) {
      showToast(`❌ Error claiming rewards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimStreakReward = async () => {
    if (!address) return;

    setClaiming(true);
    try {
      const result = await claimStreakReward(address);
      if (result.success) {
        showToast(`🎉 Streak reward claimed! ${result.rewardId ? `ID: ${result.rewardId}` : ''}`);
        setStreakRewardClaimed(true);
      } else {
        showToast(`❌ ${result.error || 'Failed to claim streak reward'}`);
      }
    } catch (error) {
      showToast(`❌ Error claiming streak reward: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!address) {
    return (
      <Card title="🎮 Play to Earn">
        <p className="text-sm text-[var(--app-foreground-muted)]">
          Connect your wallet to start earning rewards for listening!
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="🎮 Play to Earn">
        <div className="text-center py-4 text-[var(--app-foreground-muted)]">
          Loading...
        </div>
      </Card>
    );
  }

  const progress = Math.min((stats.fullPlays / 10) * 100, 100);

  return (
    <Card title="🎮 Play to Earn">
      <div className="space-y-4">
        {/* Daily Listening Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Daily Listening Goal</span>
            <span className="text-sm text-[var(--app-foreground-muted)]">
              {stats.fullPlays} / 10 songs
            </span>
          </div>
          <div className="w-full bg-[var(--app-card-border)] rounded-full h-2">
            <div
              className="bg-[#0052ff] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {stats.eligible && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Icon name="check" size="sm" />
              Eligible for rewards!
            </p>
          )}
        </div>

        {/* Rewards Section */}
        {rewardEligibility.eligible && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-green-900">
                  🎁 Daily Reward Available
                </div>
                <div className="text-xs text-green-700">
                  ${rewardEligibility.rewardAmount} {rewardEligibility.rewardType || 'USDC'}
                </div>
              </div>
              <button
                onClick={handleClaimRewards}
                disabled={claiming}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {claiming ? 'Claiming...' : 'Claim'}
              </button>
            </div>
          </div>
        )}

        {/* Prediction Streak */}
        {streak > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-blue-900">
                  🔥 Prediction Streak
                </div>
                <div className="text-xs text-blue-700">
                  {streak} week{streak !== 1 ? 's' : ''} in a row!
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{streak}</div>
            </div>
          </div>
        )}

        {/* Streak Reward */}
        {streakReward && !streakRewardClaimed && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="mb-2">
              <div className="text-sm font-medium text-purple-900">
                🏆 Streak Reward Available
              </div>
              <div className="text-xs text-purple-700 mt-1">
                {streakReward.description}
              </div>
            </div>
            <button
              onClick={handleClaimStreakReward}
              disabled={claiming}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {claiming ? 'Claiming...' : `Claim ${streakReward.name}`}
            </button>
          </div>
        )}

        {streakReward && streakRewardClaimed && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Icon name="check" size="sm" className="text-green-600" />
              Streak reward already claimed
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

