# Blur Player 🎵

A retro-styled music player web application inspired by Winamp, built as a Telegram Mini App with cloud storage integration. This project demonstrates modern web development techniques while maintaining an authentic 90s aesthetic.

## 🚀 Live Demo
- **Telegram Mini App**: [Launch in Telegram](https://t.me/sh_blur_bot)

## 📋 Overview

Blur Player is a fully functional music streaming application that fetches audio files from Yandex S3 cloud storage and presents them through a nostalgic Winamp-inspired interface. The app features smart folder navigation, artist-scoped playback, and mobile-optimized controls.

## 🛠️ Tech Stack

### Cloud Infrastructure
- **Yandex Object Storage (S3)** - Audio file hosting and management
- **S3 XML API** - File listing with pagination support
- **CORS Configuration** - Cross-origin resource sharing setup

### Features & APIs
- **Responsive Design** - Mobile-first approach with touch controls
- **Progressive Enhancement** - Works across different devices and browsers
- **File System Simulation** - Hierarchical folder structure (Artist → Album → Songs)
- **Telegram Mini App** - Integration with Telegram's web app platform

## 🏗️ Architecture

### Data Flow
```
Yandex S3 Bucket → S3 XML API → JavaScript Parser → UI Components → Audio Player
```

### S3 Bucket Organization
```
bucket-root/
├── [001-]Artist Name/           # Numbered for ordering
│   ├── [001-]Album Name/        # Album folders
│   │   ├── [001-]Song.mp3      # Audio files
│   │   └── cover.jpg           # Album artwork
│   └── [002-]Album Name/
└── [002-]Artist Name/
```

## 🔧 Key Technical Features

### S3 Integration
- **Recursive file fetching** with pagination handling
- **Smart path parsing** to extract artist/album/song hierarchy
- **Number prefix cleaning** for display while preserving order
- **Cover art detection** from multiple filename patterns

### Audio Management
- **Artist-scoped playlists** - songs loop within current artist only
- **Shuffle mode** - randomization within artist boundaries
- **Smart navigation** - automatic album progression
- **Progress seeking** - click-to-seek and drag handle support

### UI/UX Innovations
- **Smart folder expansion** - auto-collapse previous selections
- **Single-song album detection** - one-click play for singles
- **Touch-optimized controls** - 48px+ touch targets
- **Visual hierarchy** - progressive indentation for folder structure

### Performance Optimizations
- **Lazy loading** - files loaded on demand
- **Efficient DOM manipulation** - minimal reflows and repaints
- **Memory management** - proper cleanup of audio resources
- **Mobile optimizations** - gesture handling and zoom prevention
