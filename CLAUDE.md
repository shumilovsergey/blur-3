# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **blur-3**, a music player web application that fetches media files from a Yandex S3 bucket and displays them in a Winamp-style interface. The project integrates cloud storage with a retro music player UI and is designed as a **Telegram Mini App** with full background audio playback support.

## Repository Structure

```
blur-3/
├── CLAUDE.md             # This documentation file
├── README.md             # Project description and features
├── index.html            # Main application HTML with Telegram WebApp integration
├── script.js             # S3MusicLibrary and BlurPlayer classes with background audio
├── styles.css            # Complete Winamp styling and responsive design
└── avatart.png          # Application icon/avatar
```

## S3 Bucket Structure

**Yandex S3 Bucket**: `sh-blur-media`
**Base URL**: `https://storage.yandexcloud.net/sh-blur-media/`

**Folder Hierarchy:**
```
bucket-root/
├── [001-]Artist Name/           # Artist folders (numbered for ordering)
│   ├── [001-]Album Name/        # Album folders (numbered for ordering) 
│   │   ├── [001-]Song Name.mp3  # Audio files (numbered for ordering)
│   │   ├── [002-]Song Name.mp3
│   │   └── cover.jpg            # Album cover image
│   └── [002-]Album Name/
└── [002-]Artist Name/
```

**Ordering Logic:**
- Folder/file names can start with numbers (e.g., "001-", "02-") for ordering
- Numbers should be cleaned/removed after order is preserved in application
- This allows manual ordering control in S3 while displaying clean names in UI

## Development Commands

This project uses **static HTML/CSS/JS** with no build system. Development workflow:

**Run the application locally**:
```bash
python3 -m http.server 8000
# Access app at http://localhost:8000
```

**Alternative local servers**:
```bash
# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000

# Using Python 2 (if needed)
python -m SimpleHTTPServer 8000
```

## Architecture

### Core Classes

**S3MusicLibrary Class** (`script.js`):
- Uses Yandex S3 XML API for file listing (`/?list-type=2`)
- Fetches all files recursively with pagination support
- Filters out folder entries (keys ending with "/")
- Parses S3 file paths into hierarchical music library structure
- Base URL: `https://storage.yandexcloud.net/sh-blur-media/`

**BlurPlayer Class** (`script.js`):
- Player logic and UI controls with Telegram Mini App integration
- Authentic Winamp-style interface with mobile optimizations
- 3-level folder navigation: Artist > Album > Songs
- Artist-scoped playback (songs loop within current artist only)
- **Background audio support** for Telegram Mini App environment

### Telegram Mini App Integration

**Key Features:**
- Telegram WebApp initialization with `tg.ready()`, `tg.expand()`
- Background audio playback when app is minimized or phone is locked
- MediaSession API for lock screen controls (play/pause/previous/next)
- No closing confirmation popups
- Viewport change handling to maintain audio playback

**Integration Points:**
```javascript
// Telegram WebApp setup
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.disableVerticalSwipes();
tg.disableClosingConfirmation();

// MediaSession for background controls
navigator.mediaSession.setActionHandler('play', () => player.play());
navigator.mediaSession.setActionHandler('previoustrack', () => player.playPrevious());
navigator.mediaSession.setActionHandler('nexttrack', () => player.playNext());
```

### Background Audio Implementation

**MediaSession API:**
- Lock screen controls with track navigation (⏮️ ⏭️) instead of seek buttons
- Metadata display (title, artist, album, artwork) on lock screen
- Position state management for proper iOS behavior
- Automatic seek action disabling to force track navigation

**Audio Persistence:**
- Continuous position state updates during playback
- MediaSession reset/rebuild when loading new tracks
- Telegram Mini App viewport change handling
- Browser beforeunload prevention for audio continuation

## Data Processing Requirements

**S3 Path Parsing:**
```javascript
// Example S3 key: "001-Artist Name/02-Album Name/03-Song Title.mp3"
// Should parse to:
{
  artist: "Artist Name",      // Remove "001-" prefix
  album: "Album Name",        // Remove "02-" prefix  
  title: "Song Title",        // Remove "03-" prefix
  file: "full/s3/path.mp3",   // Keep original S3 path for playback
  cover: "001-Artist Name/02-Album Name/cover.jpg"  // Album cover path
}
```

**Number Prefix Cleaning:**
- Remove leading numbers and hyphens (e.g., "001-", "02-", "3-")
- Preserve original order from S3 sorting
- Handle various number formats consistently

## Code Patterns

**S3 Data Fetching:**
```javascript
// Initialize and load music library
const library = new S3MusicLibrary();
const musicLibrary = await library.loadMusicLibrary();

// Access parsed library structure
library.musicLibrary // Hierarchical artist/album/song structure
library.allFiles     // Raw S3 file list
```

**Player Integration:**
```javascript
// Initialize player with Telegram WebApp and MediaSession
const player = new BlurPlayer();
await player.init(); // Loads S3 library and initializes UI/background audio

// Background audio methods
player.setupTelegramWebApp();   // Telegram Mini App integration
player.setupMediaSession();     // Lock screen controls
player.updateMediaSession();    // Update metadata and position
```

**Background Audio Workflow:**
1. `setupTelegramWebApp()` - Initialize Telegram environment
2. `setupMediaSession()` - Configure lock screen controls
3. `updateMediaSession()` - Update track metadata and disable seek actions
4. `resetMediaSession()` - Reset for new tracks to maintain track navigation

## Key Constraints

- **No external dependencies**: Pure HTML/CSS/JS implementation
- **Telegram Mini App optimized**: Background audio and proper integration
- **CORS considerations**: S3 bucket must allow cross-origin requests  
- **Mobile-optimized**: Touch controls and responsive layout for Telegram environment
- **Artist-scoped playback**: Never auto-switch between artists
- **Authentic design**: Maintains classic Winamp aesthetics
- **Static hosting**: No server-side processing required

## Working with the Codebase

**Main Application Files:**
- `index.html` - Complete UI structure with Telegram WebApp script inclusion
- `script.js` - Contains S3MusicLibrary and BlurPlayer classes with full background audio
- `styles.css` - Complete Winamp styling with mobile optimizations

**Development Workflow:**
1. Test locally using `python3 -m http.server 8000`
2. Check S3 connectivity and file parsing in browser console
3. Test Telegram Mini App integration (background audio, lock screen controls)
4. Verify mobile responsiveness and touch controls
5. Test playback functionality across different audio formats
6. Ensure proper artist/album/song hierarchy parsing
7. Validate Winamp aesthetic elements and animations

**Common Tasks:**
- **Adding new S3 features**: Modify `S3MusicLibrary` class methods
- **UI improvements**: Update HTML structure and CSS styling
- **Player features**: Extend `BlurPlayer` class functionality
- **Background audio**: Modify MediaSession and Telegram WebApp integration
- **Mobile optimization**: Test touch interactions and viewport scaling

**Background Audio Troubleshooting:**
- Check MediaSession API support in browser console
- Verify Telegram WebApp script is loaded (`window.Telegram.WebApp`)
- Test lock screen controls appear as track navigation (not seek buttons)
- Ensure audio continues when app is minimized or phone is locked
- Verify no closing confirmation popups appear when exiting Telegram

## Telegram Mini App Deployment

**Requirements:**
- Telegram WebApp script: `https://telegram.org/js/telegram-web-app.js`
- HTTPS hosting for production
- Proper CORS configuration for S3 bucket
- Mobile-optimized viewport and touch handling

**Testing:**
- Local development with `python3 -m http.server`
- Telegram Web version for initial testing
- Mobile Telegram app for full background audio testing
- Lock screen control verification on iOS/Android