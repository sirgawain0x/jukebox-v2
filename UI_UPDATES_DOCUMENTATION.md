# UI Updates Documentation

This document outlines the recent UI improvements focused on song analytics, play statistics, and claim functionality. These updates enhance user experience by providing real-time engagement metrics and streamlined fund claiming processes.

## Table of Contents
1. [Song Analytics & Statistics](#song-analytics--statistics)
2. [Play Tracking System](#play-tracking-system)
3. [Claim Functionality](#claim-functionality)
4. [Component Architecture](#component-architecture)

---

## Song Analytics & Statistics

### Overview
The application now displays comprehensive analytics for each song, including play counts, tips, shares, predictions, and an overall engagement score. These metrics update in real-time to provide users with current information about song popularity.

### EngagementMetrics Component

**Location:** `app/components/music/EngagementMetrics.tsx`

**Display Location:** 
- Shown in the Jukebox component when a song is selected (line 1566 in `Jukebox.tsx`)
- Appears below the tip/share buttons in the song detail view

**Features:**
1. **Real-time Updates**: Polls the engagement API every 5 seconds to update metrics
2. **Engagement Score**: Calculated weighted score combining all engagement metrics
3. **Four Key Metrics Displayed**:
   - **Plays**: Total number of qualified plays (≥30 seconds)
   - **Tips**: Total number of tips received
   - **Shares**: Total shares across all platforms
   - **Predictions**: Total prediction bets placed

4. **Platform-Specific Share Breakdown**: Shows share counts by platform (Twitter, Instagram, Facebook, YouTube, SoundCloud, TikTok, etc.)

5. **Artist Links**: Displays social links when available

**Visual Design:**
- Grid layout (2 columns) for the four main metrics
- Icons for each metric type (play, heart, share, trending-up)
- Engagement score prominently displayed at the top
- Platform badges for share breakdown
- Responsive design with dark mode support

**API Integration:**
- Fetches data from `/api/engagement?trackId={trackId}`
- Returns: `playCount`, `tipCount`, `shareCount`, `predictionCount`, `engagementScore`, `shareByPlatform`

### Play Count Display in Song List

**Location:** `app/components/music/Jukebox.tsx` (lines 1208-1217)

**Features:**
- Displays play count next to each song in the list
- Formatting: Shows "1.2k" for counts ≥1000, otherwise shows exact number
- Fire emoji (🔥) indicator for songs with plays
- Only displays if play count > 0

---

## Play Tracking System

### Play Event Tracking

**API Endpoint:** `POST /api/plays/track`

**Location:** `app/api/plays/track/route.ts`

**How It Works:**
1. **Qualified Plays**: Only tracks plays with duration ≥30 seconds
2. **Rate Limiting**: Maximum 10 play events per minute per user/session
3. **Idempotency**: Prevents duplicate counting using `sessionId + trackId` key
4. **Storage**: Uses Redis for fast, scalable play count storage

**Tracking Metrics:**
- **Total Play Count**: `play:track:{trackId}:total`
- **Daily Play Count**: `play:track:{trackId}:{date}` (7-day retention)
- **Weekly Play Count**: Rolling 7-day window
- **Per-User Tracking**: Stores individual play events for analytics

**Integration Points:**
- Updates Superfluid play rate oracle for verified plays
- Updates daily session tracking for play-to-earn rewards
- Returns current play count in API response

### Play Count Service

**Location:** `lib/play-counts.ts`

**Functions:**
- `getPlayCount(trackId)`: Get single track play count
- `getPlayCounts(trackIds)`: Batch operation for multiple tracks
- `getPlayCountData(trackId)`: Detailed data including daily/weekly counts
- Client-side caching helpers for performance

**Caching:**
- 5-minute cache TTL on client side
- Redis-based server-side storage
- Batch operations for efficiency

### Engagement Scoring

**Location:** `lib/engagement-scoring.ts`

**Formula:**
Engagement Score = (plays × 1) + (tips × 10) + (shares × 5) + (predictions × 3)

**Weights:**
- Plays: 1 point each
- Tips: 10 points each
- Shares: 5 points each (platform-weighted)
- Predictions: 3 points each

**Platform-Specific Share Weights:**
- YouTube: 6 points
- Twitter/TikTok: 5 points
- Instagram: 4 points
- SoundCloud: 4 points
- Facebook: 3 points
- Custom: 2 points

---

## Claim Functionality

### MyBets Component

**Location:** `app/components/prediction/MyBets.tsx`

**Purpose:** Allows users to view and claim winnings from prediction market bets

**Features:**

1. **Bet Display**:
   - Separates bets into "Active Bets" and "Resolved Bets"
   - Shows song cover art, title, artist
   - Displays bet amount in USDC
   - Shows bet side (YES/NO) with color coding
   - Indicates if bet is claimed

2. **Claim Functionality**:
   - "Claim Winnings" button appears for:
     - Resolved markets
     - Winning bets (predicted track matches winning track)
     - Unclaimed bets
   - Uses `useClaimWinnings` hook from contract hooks
   - Shows loading state during claim transaction
   - Toast notifications for success/error

3. **Summary Statistics**:
   - Total number of bets
   - Total amount wagered in USDC

4. **State Management**:
   - Fetches user bets via `useUserBets` hook
   - Automatically determines which bets can be claimed
   - Handles wallet connection state

**UI States:**
- Not connected: Shows message to connect wallet
- Loading: Skeleton loaders
- No bets: Empty state message
- Has bets: Organized list with claim buttons

### AutomatedMarkets Component

**Location:** `app/components/prediction/AutomatedMarkets.tsx`

**Purpose:** Displays all prediction markets with claim functionality

**Features:**

1. **Market Display**:
   - Market number and status (Active/Resolved/Betting Closed)
   - End time and time remaining
   - Total pool size in USDC
   - Bet count
   - Winning track (when resolved)

2. **Claim Button**:
   - Appears on resolved markets where user has unclaimed winning bets
   - Full-width button for easy access
   - Shows "Claiming..." state during transaction
   - Disabled during pending transactions

3. **Smart Detection**:
   - Checks if user has bets on the market
   - Determines if bets are winning bets
   - Checks if bets are already claimed
   - Only shows claim button when appropriate

4. **User Feedback**:
   - Shows "No winnings to claim" if user bet but didn't win
   - Shows "You didn't bet on this market" if user has no bets
   - Toast notifications for transaction status

### PoolInteractionManager Component

**Location:** `app/components/music/PoolInteractionManager.tsx`

**Purpose:** Manages Superfluid pool interactions and claiming

**Features:**

1. **Pool Connection**:
   - Connect/disconnect from Superfluid pools
   - Shows connection status
   - Validates pool address

2. **Claim Functionality**:
   - "Claim All Tokens" button
   - Shows claimable amount in USDC
   - Updates claimable amount after claiming
   - Supports claiming for any member address

3. **Status Display**:
   - Pool connection status (Connected/Not Connected)
   - Real-time claimable amount
   - Loading states for status checks

4. **Wallet Integration**:
   - Requires wallet connection
   - Uses ethers.js for Superfluid contract interactions
   - Integrates with wagmi for wallet state

**Technical Details:**
- Uses `lib/superfluid-pool-claiming.ts` for contract interactions
- Converts wagmi providers to ethers providers
- Handles both connection and claiming in one interface

---

## Component Architecture

### Data Flow

User Interaction
↓
UI Component (EngagementMetrics, MyBets, etc.)
↓
API Route (/api/engagement, /api/plays/track)
↓
Service Layer (engagement-scoring, play-counts)
↓
Redis Storage / Smart Contract

### Key Hooks

1. **useUserBets**: Fetches user's prediction market bets
2. **useClaimWinnings**: Handles claiming winnings from contracts
3. **useActiveMarkets**: Fetches all active prediction markets
4. **useAccount**: Wagmi hook for wallet connection state

### API Endpoints

1. **GET /api/engagement?trackId={trackId}**
   - Returns engagement metrics for a track
   - Calculates engagement score
   - Includes platform-specific share data

2. **POST /api/plays/track**
   - Records play events
   - Validates qualified plays (≥30s)
   - Updates play counts
   - Returns current play count

### State Management

- **Client-side**: React hooks (useState, useEffect)
- **Server-side**: Redis for metrics storage
- **Blockchain**: Smart contracts for bet/claim data
- **Real-time Updates**: Polling (5-second intervals for metrics)

---

## User Experience Improvements

### Real-time Feedback
- Metrics update every 5 seconds without page refresh
- Loading states prevent confusion during data fetching
- Toast notifications provide immediate feedback on actions

### Visual Clarity
- Color-coded bet sides (green for YES, red for NO)
- Status badges for market states
- Icons for each metric type
- Responsive grid layouts

### Accessibility
- Clear button labels
- Disabled states for unavailable actions
- Error messages for failed operations
- Empty states with helpful messages

### Performance
- Client-side caching for play counts
- Batch operations for multiple tracks
- Efficient Redis storage patterns
- Polling intervals optimized for balance between freshness and performance

---

## Future Considerations

### Potential Enhancements
1. WebSocket support for real-time updates (instead of polling)
2. Historical charts for engagement metrics
3. Comparison view between songs
4. Export functionality for analytics
5. Push notifications for claimable winnings
6. Batch claiming for multiple markets

### Technical Debt
- Consider migrating from polling to WebSockets for real-time updates
- Optimize Redis queries for large-scale deployments
- Add unit tests for engagement scoring calculations
- Implement error boundaries for better error handling

---

## Summary

These UI updates significantly enhance the application by:

1. **Providing Transparency**: Users can see real-time engagement metrics for every song
2. **Enabling Claims**: Streamlined process for users to claim their winnings
3. **Improving Engagement**: Visual feedback encourages user interaction
4. **Building Trust**: Clear display of statistics builds confidence in the platform

All changes are focused on the UI layer and do not affect smart contract functionality, making them safe to deploy without impacting ongoing games or contracts.