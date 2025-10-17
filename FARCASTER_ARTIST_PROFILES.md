# Farcaster Artist Profile Linking Feature

This document describes the implementation of Farcaster artist profile linking in the Jukebox application, allowing users to link artist Farcaster profiles to shared casts and enhance social interactions.

## Overview

The feature enables:
- Linking artist Farcaster profiles to songs
- Including artist mentions in shared casts
- Enhanced sharing functionality with profile links
- Interactive artist profile management UI

## Implementation Details

### 1. Data Model Extensions

#### Updated Song Type (`types/music.ts`)
```typescript
export type Song = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  creatorAddress: string;
  audioUrl: string;
  playCount: number | bigint;
  platformName?: string;
  artistFid?: number; // Farcaster FID for the artist
  artistUsername?: string; // Farcaster username for the artist
  artistPfpUrl?: string; // Artist's Farcaster profile picture URL
};
```

### 2. Utility Functions (`app/utils/farcaster-artist.ts`)

#### Core Functions:
- `createArtistMention(song: Song)`: Creates a Farcaster mention object for an artist
- `createArtistMentions(songs: Song[])`: Creates mentions for multiple songs
- `generateCastTextWithArtist()`: Generates enhanced cast text with artist mentions
- `lookupArtistFid()`: Mock function to resolve artist names to Farcaster FIDs
- `enhanceSongWithFarcasterProfile()`: Enhances song objects with Farcaster profile info
- `hasFarcasterProfile()`: Checks if a song has Farcaster profile information

### 3. UI Components

#### ArtistProfile Component (`app/components/music/ArtistProfile.tsx`)
- Displays artist profile information
- Provides editing interface for Farcaster profile data
- Auto-lookup functionality for artist FIDs
- Grouped view for managing multiple artist profiles

#### Enhanced Share Page (`app/share/page.tsx`)
- Improved UI for handling shared casts
- Interactive buttons for sharing back to Farcaster
- Display of cast mentions and author information
- Enhanced user experience with proper styling

### 4. Updated Sharing Functionality

#### Jukebox Component (`app/components/music/Jukebox.tsx`)
- Enhanced sharing functions to include artist mentions
- Updated quick share buttons to use new mention system
- Integrated ArtistProfile component for profile management

#### PlaylistSection Component (`app/components/music/PlaylistSection.tsx`)
- Prepared for artist mentions in playlist sharing
- Added TODO comments for future enhancement when playlist songs are available

## Usage Examples

### 1. Sharing a Song with Artist Mention

```typescript
const handleShareSong = useCallback(() => {
  if (!selectedSong) return;
  
  const baseText = `🎵 Currently vibing to "${selectedSong.title}" by ${selectedSong.artist}! Check out this amazing track on Jukebox 🎶`;
  const enhancedText = generateCastTextWithArtist(baseText, selectedSong);
  const artistMention = createArtistMention(selectedSong);
  
  composeCast({
    text: enhancedText,
    mentions: artistMention ? [artistMention] : [],
    embeds: [window.location.href]
  });
}, [selectedSong, composeCast]);
```

### 2. Managing Artist Profiles

```typescript
<ArtistProfile 
  song={selectedSong} 
  onUpdate={(updatedSong) => {
    // Update the song in the songs array
    setSongs(prevSongs => 
      prevSongs.map(song => 
        song.id === updatedSong.id ? updatedSong : song
      )
    );
  }}
/>
```

### 3. Auto-lookup Artist Farcaster Profile

```typescript
const farcasterInfo = await lookupArtistFid("deadmau5");
// Returns: { fid: 12345, username: "deadmau5", pfpUrl: "..." }
```

## Configuration

### Mock Artist Mappings
The `lookupArtistFid` function includes mock mappings for demonstration:

```typescript
const mockArtistMappings = {
  "deadmau5": { fid: 12345, username: "deadmau5", pfpUrl: "..." },
  "skrillex": { fid: 23456, username: "skrillex", pfpUrl: "..." },
  "porter robinson": { fid: 34567, username: "porterrobinson", pfpUrl: "..." },
};
```

## Future Enhancements

### 1. Real Artist Lookup Integration
- Integrate with Farcaster API for real-time artist lookups
- Use services like Airstack for comprehensive profile data
- Implement caching for frequently looked up artists

### 2. Enhanced Playlist Sharing
- Include artist mentions when sharing playlists
- Show artist profiles in playlist views
- Bulk artist profile management for playlists

### 3. Social Features
- Artist profile verification system
- Social proof for artist connections
- Enhanced analytics for artist mentions

### 4. Database Integration
- Store artist Farcaster profiles in database
- Sync with on-chain data
- Implement profile update mechanisms

## Testing

### Sample Data
Use the provided sample songs (`app/utils/sample-songs.ts`) for testing:

```typescript
import { sampleSongsWithFarcaster } from "@/app/utils/sample-songs";

// Use sample songs with Farcaster profiles for testing
const testSongs = sampleSongsWithFarcaster;
```

### Test Scenarios
1. **Song Sharing**: Test sharing songs with and without Farcaster profiles
2. **Profile Management**: Test editing artist profiles through the UI
3. **Auto-lookup**: Test the artist FID lookup functionality
4. **Share Page**: Test the enhanced share page with cast information

## API Integration Notes

### Farcaster API Integration
For production use, replace the mock `lookupArtistFid` function with real API calls:

```typescript
// Example integration with Farcaster API
export async function lookupArtistFid(artistName: string) {
  const response = await fetch(`https://api.farcaster.xyz/v2/user-by-username?username=${artistName}`);
  const data = await response.json();
  
  return {
    fid: data.result?.user?.fid,
    username: data.result?.user?.username,
    pfpUrl: data.result?.user?.pfp_url
  };
}
```

### Third-party Services
Consider integrating with:
- **Airstack**: Comprehensive Farcaster data
- **Farcaster Hub**: Direct protocol access
- **Custom Database**: Store artist mappings locally

## Security Considerations

1. **Input Validation**: Validate all Farcaster FIDs and usernames
2. **Rate Limiting**: Implement rate limiting for API calls
3. **Caching**: Cache lookup results to reduce API calls
4. **Error Handling**: Graceful handling of API failures

## Performance Optimization

1. **Lazy Loading**: Load artist profiles on demand
2. **Caching**: Cache frequently accessed profiles
3. **Batch Operations**: Batch multiple artist lookups
4. **Optimistic Updates**: Update UI before API confirmation

This implementation provides a solid foundation for Farcaster artist profile linking while maintaining flexibility for future enhancements and integrations.
