// Client-side play tracking service
// Tracks play events locally and reports qualified plays to the API

export type PlayEvent = {
  trackId: string;
  userId: string | null;
  duration: number; // in seconds
  timestamp: number;
  sessionId: string;
  state: 'pending' | 'processed' | 'error';
}

export type PlayTrackingState = {
  currentTrackId: string | null;
  startTime: number | null;
  totalPlayed: number; // in seconds
  qualifiedPlayReported: boolean;
  sessionId: string;
}

const QUALIFIED_PLAY_THRESHOLD = 30; // 30 seconds for qualified play
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new play tracking state
export function createPlayTrackingState(): PlayTrackingState {
  return {
    currentTrackId: null,
    startTime: null,
    totalPlayed: 0,
    qualifiedPlayReported: false,
    sessionId: generateSessionId(),
  };
}

// Start tracking a play session
export function startPlayTracking(
  state: PlayTrackingState,
  trackId: string
): PlayTrackingState {
  // Reset if switching tracks
  if (state.currentTrackId !== trackId) {
    return {
      ...state,
      currentTrackId: trackId,
      startTime: Date.now(),
      totalPlayed: 0,
      qualifiedPlayReported: false,
    };
  }

  // Resume tracking if same track
  if (state.startTime === null) {
    return {
      ...state,
      startTime: Date.now(),
    };
  }

  return state;
}

// Update play progress
export function updatePlayProgress(
  state: PlayTrackingState,
  currentTime: number // current playback time in seconds
): { state: PlayTrackingState; shouldReport: boolean } {
  if (!state.currentTrackId || state.startTime === null) {
    return { state, shouldReport: false };
  }

  const now = Date.now();
  const elapsed = (now - state.startTime) / 1000; // convert to seconds
  const totalPlayed = state.totalPlayed + elapsed;

  const shouldReport =
    !state.qualifiedPlayReported &&
    totalPlayed >= QUALIFIED_PLAY_THRESHOLD;

  return {
    state: {
      ...state,
      totalPlayed,
      startTime: now, // Reset start time for next interval
      qualifiedPlayReported: state.qualifiedPlayReported || shouldReport,
    },
    shouldReport,
  };
}

// Pause tracking
export function pausePlayTracking(
  state: PlayTrackingState
): PlayTrackingState {
  if (!state.currentTrackId || state.startTime === null) {
    return state;
  }

  const now = Date.now();
  const elapsed = (now - state.startTime) / 1000;
  const totalPlayed = state.totalPlayed + elapsed;

  return {
    ...state,
    totalPlayed,
    startTime: null, // Paused
  };
}

// End play tracking and create final event
export function endPlayTracking(
  state: PlayTrackingState
): PlayEvent | null {
  if (!state.currentTrackId) {
    return null;
  }

  const now = Date.now();
  const elapsed = state.startTime
    ? (now - state.startTime) / 1000
    : 0;
  const totalDuration = state.totalPlayed + elapsed;

  return {
    trackId: state.currentTrackId,
    userId: null, // Will be set by the component
    duration: totalDuration,
    timestamp: now,
    sessionId: state.sessionId,
    state: 'pending',
  };
}

// Report play event to API
export async function reportPlayEvent(
  event: PlayEvent,
  userId: string | null
): Promise<{ success: boolean; playCount?: number; error?: string }> {
  try {
    const response = await fetch('/api/plays/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      playCount: data.playCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Check if session is still valid (not expired)
export function isSessionValid(state: PlayTrackingState): boolean {
  if (!state.startTime) {
    return true; // No active session
  }

  const now = Date.now();
  return now - state.startTime < SESSION_DURATION;
}

// Reset session if expired
export function resetIfExpired(state: PlayTrackingState): PlayTrackingState {
  if (isSessionValid(state)) {
    return state;
  }

  return createPlayTrackingState();
}

