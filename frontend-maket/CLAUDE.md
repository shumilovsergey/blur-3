# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Winamp-style HTML/CSS/JS music player** designed as a mobile web application. The project recreates the classic 90s Winamp interface with modern mobile-optimized touch controls and responsive design.

## Architecture

### Core Components

**Main Files:**
- `index.html` - Main application structure with player and playlist sections
- `styles.css` - Complete Winamp-style CSS with mobile optimizations  
- `script.js` - Player functionality and playlist management (`WinampPlayer` class)

### Application Structure

**Two Main Sections:**
1. **Player Section** - Music controls and track display
2. **Playlist Section** - 3-level folder tree (Artist > Album > Songs)

**Player Section Layout:**
- **Display Area**: Left half = track info (song, album, artist, time), Right half = album cover
- **Progress Bar**: Authentic Winamp-style orange-to-green gradient with draggable handle
- **Control Buttons**: Previous, Play/Pause, Next, Shuffle, Info (all SVG icons)

**Playlist Section:**
- **Smart folder navigation**: Click artist → expand albums, click album → expand songs
- **Intelligent collapse**: Selecting new artist auto-collapses previous artist completely
- **Album switching**: Within same artist, selecting new album collapses previous album only

## Key Features

### Playback Logic
- **Artist-based looping**: Songs always loop within the current artist only
- **Normal mode**: Plays through albums sequentially within artist, loops back to first album when finished
- **Shuffle mode**: Randomizes songs within current artist only (never changes artist)
- **Album transitions**: Seamless progression from last song of album to first song of next album (same artist)

### Mobile Optimizations
- **Touch-friendly buttons**: Large 65x50px control buttons with proper touch targets
- **Folder tree**: 48px+ height for all clickable items
- **Progress bar seeking**: Click anywhere on bar to seek to that time position
- **Responsive layout**: Adapts to mobile screens while maintaining functionality
- **No volume controls**: Users control volume via phone hardware buttons

### Design System
- **Authentic Winamp styling**: Classic 90s gradients, inset/outset borders, green LCD text
- **Custom SVG icons**: Consistent geometric design matching Winamp aesthetic
- **3D button effects**: Proper hover/active states with visual depth
- **Color scheme**: Green text, dark backgrounds, authentic progress bar colors

## Development

### File Structure
```
/winamp/
├── index.html          # Main application
├── styles.css          # All styling and responsive design
├── script.js           # WinampPlayer class and functionality
└── CLAUDE.md           # This documentation
```

### Key Classes and Methods

**WinampPlayer (script.js):**
- `loadTrack(track)` - Updates display and sets current track
- `updateCurrentArtistPlaylist(artistName)` - Filters playlist by artist
- `playNext()` / `playPrevious()` - Navigate within current artist only
- `handleArtistClick()` / `handleAlbumClick()` - Smart folder expansion/collapse
- `togglePlayPause()` - Combined play/pause functionality
- `seekTo(e)` - Progress bar time seeking

**CSS Architecture:**
- `.display-section` - Main player display (50/50 split)
- `.controls-section` - Button container with SVG icons
- `.folder-tree` - Playlist navigation with smart expand/collapse
- Mobile-first responsive design with touch optimizations

### Sample Data Structure
```javascript
playlist = [
  {
    id: 100,
    artist: "Marz", 
    album: "Bleach",
    title: "Side",
    duration: "4:34",
    file: "audio/marz-side.mp3"
  }
]
```

## Mobile Considerations

- **No zoom on double-tap**: Prevented for better UX
- **Touch drag support**: Progress bar handle works with touch
- **Keyboard shortcuts**: Space (play/pause), Arrow keys (navigation)
- **Portrait orientation**: Optimized layout for mobile screens
- **Performance**: Lightweight with smooth animations

## Design Philosophy

This player maintains authentic Winamp aesthetics while being fully modern and mobile-optimized. The 3-level folder structure (Artist > Album > Songs) with intelligent expansion provides intuitive music library navigation. Artist-based playback ensures users stay within their selected artist's discography, making it perfect for focused listening sessions.

The interface balances nostalgia with usability, featuring the classic Winamp look users remember while providing touch-friendly controls and modern web standards compliance.