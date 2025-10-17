# Handling Addresses Without Farcaster FIDs

This document explains how the Jukebox application handles cases where an artist's wallet address doesn't have an associated Farcaster FID.

## Overview

Not all wallet addresses have associated Farcaster profiles. The application gracefully handles this scenario by:

1. **Graceful Degradation**: Sharing still works without mentions
2. **Visual Indicators**: Clear UI indicators show when artists don't have Farcaster profiles
3. **Fallback Options**: Alternative ways to identify and share artist information
4. **Future-Proofing**: Easy to add Farcaster profiles later when they become available

## Implementation Details

### 1. Enhanced Lookup Functions

#### `lookupFidByAddress(address: string)`
```typescript
export async function lookupFidByAddress(address: string): Promise<{
  fid?: number;
  username?: string;
  pfpUrl?: string;
  hasFarcaster?: boolean;
}> {
  // Returns { hasFarcaster: false } when no profile found
}
```

#### `checkAddressHasFarcaster(address: string)`
```typescript
export async function checkAddressHasFarcaster(address: string): Promise<boolean> {
  const result = await lookupFidByAddress(address);
  return result.hasFarcaster || false;
}
```

### 2. Enhanced Song Enhancement

The `enhanceSongWithFarcasterProfile` function now:
1. First tries to lookup by artist name
2. If no profile found, tries to lookup by wallet address
3. Returns the song unchanged if no Farcaster profile exists

```typescript
export async function enhanceSongWithFarcasterProfile(song: Song): Promise<Song> {
  if (song.artistFid) {
    return song; // Already has Farcaster info
  }

  // Try to lookup by artist name first
  let farcasterInfo = await lookupArtistFid(song.artist);
  
  // If no Farcaster profile found by name, try by wallet address
  if (!farcasterInfo.hasFarcaster) {
    farcasterInfo = await lookupFidByAddress(song.creatorAddress);
  }
  
  return {
    ...song,
    artistFid: farcasterInfo.fid,
    artistUsername: farcasterInfo.username,
    artistPfpUrl: farcasterInfo.pfpUrl
  };
}
```

### 3. UI Indicators

#### Artist Profile Display
- **With Farcaster**: Shows blue "Connected" badge with @username
- **Without Farcaster**: Shows gray "No Farcaster" badge with wallet address

```typescript
{hasFarcasterProfile(song) ? (
  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
    @{song.artistUsername || song.artistFid}
  </span>
) : (
  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
    No Farcaster
  </span>
)}
```

#### Artist List Display
- **Connected**: Green "Connected" badge
- **No Farcaster**: Yellow "No Farcaster" badge

### 4. Sharing Behavior

#### With Farcaster Profile
```typescript
composeCast({
  text: `🎵 Check out "${song.title}" by @${song.artistUsername}! 🎶`,
  mentions: [{
    fid: song.artistFid,
    username: song.artistUsername,
    displayName: song.artist,
    pfpUrl: song.artistPfpUrl
  }],
  embeds: [window.location.href]
});
```

#### Without Farcaster Profile
```typescript
composeCast({
  text: `🎵 Check out "${song.title}" by ${song.artist}! 🎶`,
  mentions: [], // No mentions
  embeds: [window.location.href]
});
```

## User Experience

### 1. Visual Feedback
- Clear indicators show which artists have Farcaster profiles
- Wallet addresses are displayed for artists without Farcaster profiles
- Status badges help users understand the connection status

### 2. Sharing Experience
- Songs can still be shared even without Farcaster profiles
- The sharing text adapts based on available profile information
- No broken functionality when Farcaster profiles are missing

### 3. Profile Management
- Users can manually add Farcaster profiles for artists
- Auto-lookup attempts both name and address resolution
- Clear feedback when no profile is found

## Real-World Scenarios

### Scenario 1: New Artist
```typescript
const newArtist = {
  id: "1",
  title: "New Track",
  artist: "Unknown Artist",
  creatorAddress: "0x1234...5678",
  // No Farcaster profile yet
};

// Sharing will work without mentions
// UI will show "No Farcaster" status
// User can manually add profile later
```

### Scenario 2: Artist Gets Farcaster Profile Later
```typescript
// Initially no profile
const song = { artistFid: undefined, ... };

// Later, artist creates Farcaster profile
// User can use "Auto Lookup" to find and add the profile
// Or manually enter the FID and username
```

### Scenario 3: Multiple Lookup Methods
```typescript
// Try by name first
let profile = await lookupArtistFid("deadmau5");

// If not found, try by address
if (!profile.hasFarcaster) {
  profile = await lookupFidByAddress("0x1234...5678");
}

// Still no profile? That's okay - sharing still works
```

## Production Considerations

### 1. API Integration
For production, replace mock functions with real API calls:

```typescript
// Example with Airstack API
export async function lookupFidByAddress(address: string) {
  const query = `
    query GetFarcasterProfile($address: String!) {
      Socials(input: {
        filter: {
          dappName: {_eq: farcaster}
          identity: {_eq: $address}
        }
        blockchain: ethereum
      }) {
        Social {
          profileName
          profileImage
          userId
        }
      }
    }
  `;
  
  const response = await fetch('https://api.airstack.xyz/gql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address } })
  });
  
  const data = await response.json();
  const profile = data.data?.Socials?.Social?.[0];
  
  if (profile) {
    return {
      fid: parseInt(profile.userId),
      username: profile.profileName,
      pfpUrl: profile.profileImage,
      hasFarcaster: true
    };
  }
  
  return { hasFarcaster: false };
}
```

### 2. Caching Strategy
```typescript
// Cache results to avoid repeated API calls
const profileCache = new Map<string, FarcasterProfile>();

export async function lookupFidByAddress(address: string) {
  if (profileCache.has(address)) {
    return profileCache.get(address);
  }
  
  const result = await fetchFromAPI(address);
  profileCache.set(address, result);
  return result;
}
```

### 3. Error Handling
```typescript
export async function lookupFidByAddress(address: string) {
  try {
    const result = await fetchFromAPI(address);
    return result;
  } catch (error) {
    console.error('Failed to lookup Farcaster profile:', error);
    // Return graceful fallback
    return { hasFarcaster: false };
  }
}
```

## Testing

### Test Cases
1. **Artist with Farcaster profile**: Verify mentions work correctly
2. **Artist without Farcaster profile**: Verify sharing still works
3. **Mixed playlist**: Some artists with profiles, some without
4. **Profile lookup failure**: API errors don't break functionality
5. **Manual profile addition**: Users can add profiles manually

### Sample Data
```typescript
// Artists with Farcaster profiles
const artistsWithFarcaster = [
  { artist: "deadmau5", fid: 12345, username: "deadmau5" },
  { artist: "skrillex", fid: 23456, username: "skrillex" }
];

// Artists without Farcaster profiles
const artistsWithoutFarcaster = [
  { artist: "Post Malone", address: "0x5678...1234" },
  { artist: "The Weeknd", address: "0x6789...2345" }
];
```

## Benefits

1. **Inclusive**: Works for all artists, regardless of Farcaster presence
2. **Future-Proof**: Easy to add profiles when they become available
3. **User-Friendly**: Clear visual indicators and graceful degradation
4. **Flexible**: Multiple lookup methods and manual override options
5. **Robust**: Handles API failures and missing data gracefully

This approach ensures that the Farcaster integration enhances the experience for artists who have profiles while maintaining full functionality for those who don't.
