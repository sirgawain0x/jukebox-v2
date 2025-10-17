import { Song } from "@/types/music";
import { 
  checkAddressHasFarcaster, 
  lookupFidByAddress,
  hasFarcasterProfile 
} from "./farcaster-artist";

/**
 * Demo function showing how to handle addresses without Farcaster FIDs
 */
export async function demonstrateNoFarcasterHandling() {
  console.log("=== Demonstrating Addresses Without Farcaster FIDs ===\n");

  // Example addresses - some with Farcaster profiles, some without
  const testAddresses = [
    "0x1234567890123456789012345678901234567890", // deadmau5 - has Farcaster
    "0x2345678901234567890123456789012345678901", // skrillex - has Farcaster  
    "0x5678901234567890123456789012345678901234", // Post Malone - no Farcaster
    "0x6789012345678901234567890123456789012345", // The Weeknd - no Farcaster
  ];

  for (const address of testAddresses) {
    console.log(`Checking address: ${address}`);
    
    // Check if address has Farcaster profile
    const hasFarcaster = await checkAddressHasFarcaster(address);
    console.log(`  Has Farcaster: ${hasFarcaster}`);
    
    if (hasFarcaster) {
      // Get the profile details
      const profile = await lookupFidByAddress(address);
      console.log(`  FID: ${profile.fid}`);
      console.log(`  Username: @${profile.username}`);
      console.log(`  Profile Picture: ${profile.pfpUrl}`);
    } else {
      console.log(`  No Farcaster profile found for this address`);
      console.log(`  This is normal - not all addresses have Farcaster profiles`);
    }
    
    console.log(""); // Empty line for readability
  }
}

/**
 * Demo function showing how sharing works with and without Farcaster profiles
 */
export function demonstrateSharingBehavior(songs: Song[]) {
  console.log("=== Demonstrating Sharing Behavior ===\n");

  songs.forEach(song => {
    console.log(`Song: "${song.title}" by ${song.artist}`);
    console.log(`Address: ${song.creatorAddress}`);
    
    if (hasFarcasterProfile(song)) {
      console.log(`✅ Has Farcaster Profile:`);
      console.log(`   - FID: ${song.artistFid}`);
      console.log(`   - Username: @${song.artistUsername}`);
      console.log(`   - Sharing will include mention: @${song.artistUsername}`);
    } else {
      console.log(`❌ No Farcaster Profile:`);
      console.log(`   - Sharing will work normally without mentions`);
      console.log(`   - Text will be: "Check out "${song.title}" by ${song.artist}!"`);
    }
    
    console.log(""); // Empty line for readability
  });
}

/**
 * Demo function showing UI status indicators
 */
export function demonstrateUIStatus(songs: Song[]) {
  console.log("=== UI Status Indicators ===\n");

  songs.forEach(song => {
    console.log(`Artist: ${song.artist}`);
    
    if (hasFarcasterProfile(song)) {
      console.log(`  Status Badge: 🟢 "Connected" (green)`);
      console.log(`  Display: @${song.artistUsername || song.artistFid}`);
    } else {
      console.log(`  Status Badge: 🟡 "No Farcaster" (yellow)`);
      console.log(`  Display: Wallet: ${song.creatorAddress.slice(0, 6)}...${song.creatorAddress.slice(-4)}`);
    }
    
    console.log(""); // Empty line for readability
  });
}

/**
 * Demo function showing how to handle mixed scenarios
 */
export async function demonstrateMixedScenarios() {
  console.log("=== Mixed Scenarios Demo ===\n");

  // Simulate a playlist with mixed artist types
  const mixedPlaylist = [
    { artist: "deadmau5", hasFarcaster: true },
    { artist: "Post Malone", hasFarcaster: false },
    { artist: "skrillex", hasFarcaster: true },
    { artist: "The Weeknd", hasFarcaster: false },
  ];

  console.log("Playlist with mixed artist types:");
  mixedPlaylist.forEach((artist, index) => {
    console.log(`${index + 1}. ${artist.artist} - ${artist.hasFarcaster ? '✅ Has Farcaster' : '❌ No Farcaster'}`);
  });

  console.log("\nSharing this playlist:");
  console.log("- Artists with Farcaster profiles will be mentioned");
  console.log("- Artists without profiles will be included in text only");
  console.log("- All sharing functionality works regardless of Farcaster status");
  console.log("- Users can manually add Farcaster profiles later if needed");
}

/**
 * Run all demonstrations
 */
export async function runAllDemos() {
  await demonstrateNoFarcasterHandling();
  demonstrateSharingBehavior([]); // Would need actual songs
  demonstrateUIStatus([]); // Would need actual songs  
  await demonstrateMixedScenarios();
}

// Example usage:
// import { runAllDemos } from './address-farcaster-demo';
// runAllDemos();
