# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **blur-3**, a music player web application that fetches media files from a Yandex S3 bucket and displays them in a Winamp-style interface. The project integrates cloud storage with a retro music player UI.

## Repository Structure

```
blur-3/
├── README.md              # Basic project description
├── app/                   # Final production application (HTML, CSS, JS)
├── frontend-maket/        # Winamp-style UI reference implementation
│   ├── CLAUDE.md         # Detailed UI documentation
│   ├── index.html        # Player interface template
│   ├── script.js         # WinampPlayer class (UI logic)
│   └── styles.css        # Complete Winamp styling
└── s3-maket/             # S3 integration prototype
    └── index.html        # S3 file listing and data fetching
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

1. **Test S3 integration**: 
   ```bash
   cd s3-maket
   python3 -m http.server 8000
   # Test S3 data fetching at http://localhost:8000
   ```

2. **Test UI design**:
   ```bash
   cd frontend-maket  
   python3 -m http.server 8001
   # Test player interface at http://localhost:8001
   ```

3. **Run final app**:
   ```bash
   cd app
   python3 -m http.server 8002
   # Final integrated app at http://localhost:8002
   ```

## Architecture

### S3 Integration (s3-maket/)

**Data Fetching:**
- Uses Yandex S3 XML API for file listing (`/?list-type=2`)
- Fetches all files recursively with pagination support
- Filters out folder entries (keys ending with "/")
- Base URL: `https://storage.yandexcloud.net/sh-blur-media/`

**API Structure:**
```javascript
const BUCKET_NAME = 'sh-blur-media';
const API_URL = `https://storage.yandexcloud.net/${BUCKET_NAME}/?list-type=2`;

// Recursive fetching with pagination
async function listAllFiles(marker = "", allKeys = [])
```

### UI Implementation (frontend-maket/)

**Core Components:**
- `WinampPlayer` class in `script.js` - Player logic and UI controls
- Authentic Winamp-style interface with mobile optimizations
- 3-level folder navigation: Artist > Album > Songs
- Artist-scoped playback (songs loop within current artist only)

**Key Features:**
- **Touch-optimized controls**: Large buttons and drag-friendly progress bar
- **Smart folder expansion**: Auto-collapse previous selections when navigating
- **Authentic Winamp styling**: 90s gradients, LCD green text, inset/outset borders
- **Mobile-first responsive design**: Portrait orientation optimized

**Playback Logic:**
- Normal mode: Sequential album playback within artist
- Shuffle mode: Randomizes songs within current artist only
- Never switches artists automatically - user-controlled navigation

### Integration Target (app/)

**Final Application Structure:**
- Combine S3 data fetching from `s3-maket/`
- Apply Winamp UI from `frontend-maket/`
- Parse S3 file paths into Artist/Album/Song hierarchy
- Clean numbered prefixes from display names while preserving order

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

**S3 Data Fetching (s3-maket/):**
```javascript
// Fetch all files from S3 bucket
const fileList = await listAllFiles();
// Parse into hierarchical structure
const musicLibrary = parseS3FilesToLibrary(fileList);
```

**WinampPlayer Integration:**
- Adapt existing `WinampPlayer` class to use S3 data
- Replace static playlist with S3-generated library
- Maintain existing UI patterns and playback logic
- Keep artist-scoped navigation behavior

**CSS Architecture:**
- Mobile-first responsive design from `frontend-maket/`
- Authentic Winamp visual elements (gradients, borders, colors)
- Touch-friendly sizing (48px+ touch targets)
- SVG icons for scalable controls

## Key Constraints

- **No external dependencies**: Pure HTML/CSS/JS implementation
- **CORS considerations**: S3 bucket must allow cross-origin requests
- **Mobile-optimized**: Touch controls and responsive layout
- **Artist-scoped playback**: Never auto-switch between artists
- **Authentic design**: Maintains classic Winamp aesthetics

## Working with the Codebase

When developing the final app in `./app/`:
1. Start with S3 data fetching logic from `s3-maket/`
2. Copy Winamp UI components from `frontend-maket/`
3. Integrate S3 data parsing with UI playlist structure
4. Test S3 connectivity and file playback
5. Ensure mobile usability and authentic Winamp styling
6. Preserve artist-scoped playback behavior