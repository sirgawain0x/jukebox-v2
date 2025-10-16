# MiniKit Integration Guide

This document explains how the MiniKit features (`IfInMiniApp`, `useAuthenticate`, and platform-aware components) have been integrated into the Jukebox app.

## Features Implemented

### 1. AutoConnect (via OnchainKitProvider)
- **Location**: `app/rootProvider.tsx`
- **Purpose**: Automatically connects wallet when running in Farcaster Mini App
- **Implementation**: Enabled via `miniKit.autoConnect: true` in OnchainKitProvider config

### 2. IfInMiniApp Component
- **Purpose**: Conditionally renders content based on whether app is running in Farcaster Mini App
- **Usage**: Wrap components to show different experiences for web vs Mini App users

### 3. useAuthenticate Hook
- **Purpose**: Provides cryptographic authentication with Sign In with Farcaster (SIWF)
- **Returns**: Verified user identity and signature for secure operations
- **Usage**: Use for security-critical features that require verified user identity

## Components Created

### AdaptiveHeader (`app/components/ui/AdaptiveHeader.tsx`)
- **Purpose**: Header that adapts based on platform (web vs Mini App)
- **Features**:
  - Shows standard wallet connection on web
  - Shows auto-connected wallet + authentication status in Mini App
  - Displays frame save button in Mini App
  - Shows authentication button on web

### MiniAppExperience (`app/components/ui/MiniAppExperience.tsx`)
- **Purpose**: Banner that shows different experiences based on platform
- **Features**:
  - Encourages web users to try Farcaster Mini App
  - Shows Mini App active status with frame save option
  - Uses `IfInMiniApp` for conditional rendering

### AuthButton (`app/components/auth/AuthButton.tsx`)
- **Purpose**: Button component for Farcaster authentication
- **Features**:
  - Triggers `useAuthenticate` authentication flow
  - Shows loading state during authentication
  - Displays authenticated user FID when logged in

### ProtectedFeature (`app/components/auth/ProtectedFeature.tsx`)
- **Purpose**: Wrapper component for features requiring authentication
- **Features**:
  - Shows authentication prompt for unauthenticated users
  - Renders protected content for authenticated users
  - Customizable fallback content

### ProtectedExample (`app/components/examples/ProtectedExample.tsx`)
- **Purpose**: Example component demonstrating ProtectedFeature usage
- **Features**:
  - Shows how to wrap sensitive features
  - Demonstrates custom fallback content
  - Example of authentication-gated functionality

## How It Works

### Platform Detection
The app automatically detects whether it's running in:
- **Web browser**: Shows standard web experience with manual wallet connection
- **Farcaster Mini App**: Shows enhanced experience with auto-connection and Mini App features

### Authentication Flow
1. User clicks authentication button
2. `useAuthenticate` hook triggers Sign In with Farcaster flow
3. User signs message with their Farcaster wallet
4. App receives verified user identity and signature
5. Protected features become available

### Conditional Rendering
- `IfInMiniApp` components show different UI based on platform
- Web users see prompts to try Farcaster Mini App
- Mini App users see enhanced features and automatic wallet connection

## Usage Examples

### Basic IfInMiniApp Usage
```tsx
import { IfInMiniApp } from '@coinbase/onchainkit/minikit';

<IfInMiniApp
  fallback={<WebVersion />}
>
  <MiniAppVersion />
</IfInMiniApp>
```

### Authentication Usage
```tsx
import { useAuthenticate } from '@coinbase/onchainkit/minikit';

const { user, authenticate } = useAuthenticate();

if (!user) {
  return <button onClick={authenticate}>Sign In</button>;
}

return <ProtectedContent />;
```

### Protected Feature Usage
```tsx
import ProtectedFeature from '../auth/ProtectedFeature';

<ProtectedFeature>
  <SensitiveFeature />
</ProtectedFeature>
```

## Benefits

1. **Seamless Experience**: Automatic wallet connection in Mini Apps
2. **Platform Optimization**: Tailored UI for each platform
3. **Security**: Cryptographic authentication for sensitive operations
4. **User Engagement**: Encourages users to try the Mini App experience
5. **Flexibility**: Easy to add authentication to any feature

## Testing

- **Web Testing**: Open app in browser to see web experience
- **Mini App Testing**: Open app in Farcaster to see Mini App experience
- **Authentication**: Click auth buttons to test Sign In with Farcaster flow
- **Protected Features**: Try accessing protected features without authentication

## Next Steps

Consider implementing:
- Backend integration for storing authenticated user sessions
- Additional protected features that require authentication
- Enhanced Mini App-specific features
- User profile management with authenticated identity
