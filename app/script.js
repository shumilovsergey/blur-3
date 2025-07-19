// S3 Configuration
const BUCKET_NAME = 'sh-blur-media';
const BASE_URL = `https://storage.yandexcloud.net/${BUCKET_NAME}/`;
const API_URL = `https://storage.yandexcloud.net/${BUCKET_NAME}/?list-type=2`;

class S3MusicLibrary {
    constructor() {
        this.allFiles = [];
        this.musicLibrary = [];
    }

    async loadMusicLibrary() {
        try {
            this.allFiles = await this.listAllFiles();
            this.musicLibrary = this.parseS3FilesToLibrary(this.allFiles);
            return this.musicLibrary;
        } catch (error) {
            console.error('Error loading music library:', error);
            throw error;
        }
    }

    async listAllFiles(marker = "", allKeys = []) {
        const url = marker ? `${API_URL}&start-after=${encodeURIComponent(marker)}` : API_URL;
        const response = await fetch(url);
        const xmlText = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "application/xml");

        const contents = Array.from(xml.getElementsByTagName("Contents"));
        for (const node of contents) {
            const key = node.getElementsByTagName("Key")[0].textContent;
            if (!key.endsWith("/")) {
                allKeys.push(key);
            }
        }

        const isTruncated = xml.getElementsByTagName("IsTruncated")[0]?.textContent === "true";
        const lastKey = allKeys[allKeys.length - 1];

        if (isTruncated && lastKey) {
            return this.listAllFiles(lastKey, allKeys);
        } else {
            return allKeys;
        }
    }

    parseS3FilesToLibrary(files) {
        const library = {};
        const tracks = [];
        let trackId = 1;

        files.forEach(file => {
            const parts = file.split('/');
            if (parts.length >= 3 && this.isAudioFile(file)) {
                const artistFolder = parts[0];
                const albumFolder = parts[1];
                const fileName = parts[2];

                const artist = this.cleanName(artistFolder);
                const album = this.cleanName(albumFolder);
                const title = this.cleanName(fileName.replace(/\.(mp3|wav|flac|m4a|ogg)$/i, ''));

                // Find cover image for this album
                const coverPath = this.findAlbumCover(files, artistFolder, albumFolder);

                if (!library[artist]) {
                    library[artist] = {};
                }
                if (!library[artist][album]) {
                    library[artist][album] = {
                        tracks: [],
                        cover: coverPath
                    };
                }

                const track = {
                    id: trackId++,
                    artist: artist,
                    album: album,
                    title: title,
                    file: BASE_URL + encodeURIComponent(file),
                    cover: coverPath ? BASE_URL + encodeURIComponent(coverPath) : null,
                    duration: "0:00" // Will be updated when audio loads
                };

                library[artist][album].tracks.push(track);
                tracks.push(track);
            }
        });

        return { library, tracks };
    }

    isAudioFile(fileName) {
        return /\.(mp3|wav|flac|m4a|ogg)$/i.test(fileName);
    }

    findAlbumCover(files, artistFolder, albumFolder) {
        const coverFiles = ['cover.jpg', 'cover.jpeg', 'cover.png', 'folder.jpg', 'album.jpg'];
        for (const coverFile of coverFiles) {
            const coverPath = `${artistFolder}/${albumFolder}/${coverFile}`;
            if (files.includes(coverPath)) {
                return coverPath;
            }
        }
        return null;
    }

    cleanName(name) {
        // Remove number prefixes like "001-", "02-", "3-", etc.
        return name.replace(/^\d+[-_\s]*/, '').trim();
    }
}

class BlurPlayer {
    constructor() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.playlist = [];
        this.currentIndex = 0;
        this.isShuffleOn = false;
        this.currentOpenArtist = null;
        this.currentOpenAlbum = null;
        this.currentArtistPlaylist = [];
        this.s3Library = new S3MusicLibrary();
        
        this.initializeElements();
        this.bindEvents();
        this.loadMusicLibrary();
    }
    
    initializeElements() {
        this.songTitle = document.querySelector('.song-title');
        this.albumName = document.querySelector('.album-name');
        this.artistName = document.querySelector('.artist-name');
        this.currentTimeDisplay = document.querySelector('.current-time');
        this.totalTimeDisplay = document.querySelector('.total-time');
        this.playPauseBtn = document.querySelector('.play-pause');
        this.prevBtn = document.querySelector('.prev');
        this.nextBtn = document.querySelector('.next');
        this.shuffleBtn = document.querySelector('.shuffle');
        this.infoBtn = document.querySelector('.info');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressHandle = document.querySelector('.progress-handle');
        this.folderTree = document.getElementById('folder-tree');
        this.coverPlaceholder = document.querySelector('.cover-placeholder');
        this.coverImg = document.querySelector('.album-cover-img');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.playlistInfo = document.getElementById('playlist-info');
        this.loadingScreen = document.getElementById('loading-screen');
        this.winampContainer = document.getElementById('winamp-container');
        
        this.audio = new Audio();
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.playNext());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
    }
    
    bindEvents() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.infoBtn.addEventListener('click', () => this.showInfo());
        this.refreshBtn.addEventListener('click', () => this.refreshLibrary());
        
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.progressBar.addEventListener('touchstart', (e) => this.seekTo(e));
        this.progressHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        this.progressHandle.addEventListener('touchstart', (e) => this.startDrag(e));
        
        this.folderTree.addEventListener('click', (e) => this.handleTreeClick(e));
        
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Prevent zoom on double tap
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
        
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    async loadMusicLibrary() {
        try {
            this.showLoading('Loading music library...');
            const { library, tracks } = await this.s3Library.loadMusicLibrary();
            this.playlist = tracks;
            this.renderMusicLibrary(library);
            this.updatePlaylistInfo();
            this.hideLoading();
        } catch (error) {
            this.showLoading('Error loading music library. Check console for details.');
            console.error('Failed to load music library:', error);
        }
    }

    async refreshLibrary() {
        await this.loadMusicLibrary();
    }

    showLoading(text = 'Loading...') {
        this.loadingScreen.querySelector('.loading-text').textContent = text;
        this.loadingScreen.style.display = 'flex';
        this.winampContainer.style.display = 'none';
    }

    hideLoading() {
        this.loadingScreen.style.display = 'none';
        this.winampContainer.style.display = 'flex';
    }

    renderMusicLibrary(library) {
        this.folderTree.innerHTML = '';
        
        Object.keys(library).forEach(artistName => {
            const artistFolder = this.createArtistFolder(artistName, library[artistName]);
            this.folderTree.appendChild(artistFolder);
        });
    }

    createArtistFolder(artistName, albums) {
        const artistDiv = document.createElement('div');
        artistDiv.className = 'artist-folder';
        artistDiv.setAttribute('data-artist', artistName);

        const artistHeader = document.createElement('div');
        artistHeader.className = 'folder-header artist-header';
        artistHeader.innerHTML = `
            <span class="folder-icon">📁</span>
            <span class="folder-name">${artistName}</span>
        `;

        const albumList = document.createElement('div');
        albumList.className = 'album-list';
        albumList.style.display = 'none';

        Object.keys(albums).forEach(albumName => {
            const albumFolder = this.createAlbumFolder(albumName, albums[albumName]);
            albumList.appendChild(albumFolder);
        });

        artistDiv.appendChild(artistHeader);
        artistDiv.appendChild(albumList);
        
        return artistDiv;
    }

    createAlbumFolder(albumName, albumData) {
        const albumDiv = document.createElement('div');
        albumDiv.className = 'album-folder';
        albumDiv.setAttribute('data-album', albumName);

        const albumHeader = document.createElement('div');
        albumHeader.className = 'album-header';
        albumHeader.innerHTML = `
            <span class="folder-icon">📁</span>
            <span class="album-name">${albumName}</span>
            <div class="album-cover-placeholder">🎵</div>
        `;

        const songList = document.createElement('div');
        songList.className = 'song-list';
        songList.style.display = 'none';

        albumData.tracks.forEach(track => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.setAttribute('data-id', track.id);
            songItem.innerHTML = `
                <span>${track.title}</span>
                <span class="duration">${track.duration}</span>
            `;
            songList.appendChild(songItem);
        });

        albumDiv.appendChild(albumHeader);
        albumDiv.appendChild(songList);
        
        return albumDiv;
    }

    handleTreeClick(e) {
        e.preventDefault();
        
        const songItem = e.target.closest('.song-item');
        if (songItem) {
            const songId = parseInt(songItem.getAttribute('data-id'));
            const trackIndex = this.playlist.findIndex(track => track.id === songId);
            
            if (trackIndex !== -1) {
                this.currentIndex = trackIndex;
                const selectedTrack = this.playlist[trackIndex];
                this.loadTrack(selectedTrack);
                this.play();
            }
            return;
        }
        
        const artistHeader = e.target.closest('.artist-header');
        if (artistHeader) {
            this.handleArtistClick(artistHeader);
            return;
        }
        
        const albumHeader = e.target.closest('.album-header');
        if (albumHeader) {
            this.handleAlbumClick(albumHeader);
            return;
        }
    }
    
    handleArtistClick(artistHeader) {
        const artistFolder = artistHeader.parentElement;
        const artistName = artistFolder.getAttribute('data-artist');
        const albumList = artistFolder.querySelector('.album-list');
        
        // Close previous artist if different
        if (this.currentOpenArtist && this.currentOpenArtist !== artistName) {
            const prevArtistFolder = document.querySelector(`[data-artist="${this.currentOpenArtist}"]`);
            if (prevArtistFolder) {
                const prevAlbumList = prevArtistFolder.querySelector('.album-list');
                const prevArtistHeader = prevArtistFolder.querySelector('.artist-header');
                prevAlbumList.style.display = 'none';
                prevArtistHeader.classList.remove('expanded');
                
                const prevAlbums = prevArtistFolder.querySelectorAll('.song-list');
                prevAlbums.forEach(list => list.style.display = 'none');
                const prevAlbumHeaders = prevArtistFolder.querySelectorAll('.album-header');
                prevAlbumHeaders.forEach(header => header.classList.remove('expanded'));
            }
            this.currentOpenAlbum = null;
        }
        
        // Toggle current artist
        if (albumList.style.display === 'none' || albumList.style.display === '') {
            albumList.style.display = 'block';
            artistHeader.classList.add('expanded');
            this.currentOpenArtist = artistName;
        } else {
            albumList.style.display = 'none';
            artistHeader.classList.remove('expanded');
            this.currentOpenArtist = null;
            this.currentOpenAlbum = null;
            
            const albums = artistFolder.querySelectorAll('.song-list');
            albums.forEach(list => list.style.display = 'none');
            const albumHeaders = artistFolder.querySelectorAll('.album-header');
            albumHeaders.forEach(header => header.classList.remove('expanded'));
        }
    }
    
    handleAlbumClick(albumHeader) {
        const albumFolder = albumHeader.parentElement;
        const albumName = albumFolder.getAttribute('data-album');
        const songList = albumFolder.querySelector('.song-list');
        const artistFolder = albumFolder.closest('.artist-folder');
        
        // Close previous album in same artist
        if (this.currentOpenAlbum && this.currentOpenAlbum !== albumName) {
            const prevAlbumFolder = artistFolder.querySelector(`[data-album="${this.currentOpenAlbum}"]`);
            if (prevAlbumFolder) {
                const prevSongList = prevAlbumFolder.querySelector('.song-list');
                const prevAlbumHeader = prevAlbumFolder.querySelector('.album-header');
                prevSongList.style.display = 'none';
                prevAlbumHeader.classList.remove('expanded');
            }
        }
        
        // Toggle current album
        if (songList.style.display === 'none' || songList.style.display === '') {
            songList.style.display = 'block';
            albumHeader.classList.add('expanded');
            this.currentOpenAlbum = albumName;
        } else {
            songList.style.display = 'none';
            albumHeader.classList.remove('expanded');
            this.currentOpenAlbum = null;
        }
    }
    
    loadTrack(track) {
        this.currentTrack = track;
        
        // Update current artist playlist
        if (!this.currentArtistPlaylist.length || this.currentArtistPlaylist[0].artist !== track.artist) {
            this.updateCurrentArtistPlaylist(track.artist);
        }
        
        // Update display
        this.songTitle.textContent = track.title;
        this.albumName.textContent = track.album;
        this.artistName.textContent = track.artist;
        this.totalTimeDisplay.textContent = track.duration;
        
        // Update album cover
        if (track.cover) {
            this.coverImg.src = track.cover;
            this.coverImg.style.display = 'block';
            this.coverPlaceholder.style.display = 'none';
        } else {
            this.coverImg.style.display = 'none';
            this.coverPlaceholder.style.display = 'flex';
        }
        
        // Load audio
        this.audio.src = track.file;
        this.audio.load();
        
        // Update playing state
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        const currentSongItem = document.querySelector(`[data-id="${track.id}"]`);
        if (currentSongItem) {
            currentSongItem.classList.add('playing');
        }
        
        this.currentTime = 0;
        this.updateTimeDisplay();
        this.updateProgress();
    }

    handleAudioError(e) {
        console.error('Audio error:', e);
        this.songTitle.textContent = 'Error loading track';
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (this.currentTrack && this.audio.src) {
            this.audio.play().then(() => {
                this.isPlaying = true;
                this.playPauseBtn.querySelector('.play-icon').style.display = 'none';
                this.playPauseBtn.querySelector('.pause-icon').style.display = 'block';
            }).catch(error => {
                console.error('Play error:', error);
            });
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playPauseBtn.querySelector('.play-icon').style.display = 'block';
        this.playPauseBtn.querySelector('.pause-icon').style.display = 'none';
    }
    
    updateCurrentArtistPlaylist(artistName) {
        this.currentArtistPlaylist = this.playlist.filter(track => track.artist === artistName);
    }
    
    getCurrentArtistIndex() {
        if (!this.currentTrack) return 0;
        return this.currentArtistPlaylist.findIndex(track => track.id === this.currentTrack.id);
    }
    
    playNext() {
        if (!this.currentArtistPlaylist.length) return;
        
        const currentArtistIndex = this.getCurrentArtistIndex();
        let nextTrack;
        
        if (this.isShuffleOn) {
            const randomIndex = Math.floor(Math.random() * this.currentArtistPlaylist.length);
            nextTrack = this.currentArtistPlaylist[randomIndex];
        } else {
            const nextIndex = (currentArtistIndex + 1) % this.currentArtistPlaylist.length;
            nextTrack = this.currentArtistPlaylist[nextIndex];
        }
        
        this.currentIndex = this.playlist.findIndex(track => track.id === nextTrack.id);
        this.loadTrack(nextTrack);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    playPrevious() {
        if (!this.currentArtistPlaylist.length) return;
        
        const currentArtistIndex = this.getCurrentArtistIndex();
        let prevTrack;
        
        if (this.isShuffleOn) {
            const randomIndex = Math.floor(Math.random() * this.currentArtistPlaylist.length);
            prevTrack = this.currentArtistPlaylist[randomIndex];
        } else {
            const prevIndex = currentArtistIndex > 0 ? currentArtistIndex - 1 : this.currentArtistPlaylist.length - 1;
            prevTrack = this.currentArtistPlaylist[prevIndex];
        }
        
        this.currentIndex = this.playlist.findIndex(track => track.id === prevTrack.id);
        this.loadTrack(prevTrack);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    toggleShuffle() {
        this.isShuffleOn = !this.isShuffleOn;
        if (this.isShuffleOn) {
            this.shuffleBtn.classList.add('active');
        } else {
            this.shuffleBtn.classList.remove('active');
        }
    }
    
    showInfo() {
        if (this.currentTrack) {
            alert(`Now Playing:\n${this.currentTrack.title}\nBy: ${this.currentTrack.artist}\nAlbum: ${this.currentTrack.album}`);
        }
    }
    
    updateDuration() {
        if (this.audio.duration) {
            this.duration = this.audio.duration;
            const minutes = Math.floor(this.duration / 60);
            const seconds = Math.floor(this.duration % 60);
            const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.totalTimeDisplay.textContent = durationStr;
            
            // Update track duration in playlist
            if (this.currentTrack) {
                this.currentTrack.duration = durationStr;
                const songItem = document.querySelector(`[data-id="${this.currentTrack.id}"] .duration`);
                if (songItem) {
                    songItem.textContent = durationStr;
                }
            }
        }
    }
    
    updateProgress() {
        if (this.audio.duration > 0) {
            this.currentTime = this.audio.currentTime;
            const progress = (this.currentTime / this.audio.duration) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.progressHandle.style.left = `${progress}%`;
            this.updateTimeDisplay();
        }
    }
    
    updateTimeDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.currentTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updatePlaylistInfo() {
        const totalTracks = this.playlist.length;
        const currentTrack = this.currentIndex + 1;
        this.playlistInfo.innerHTML = `
            <span class="playlist-time">0:00/0:00</span>
            <span class="playlist-count">${currentTrack} of ${totalTracks}</span>
        `;
    }
    
    seekTo(e) {
        e.preventDefault();
        const rect = this.progressBar.getBoundingClientRect();
        const clickX = (e.clientX || e.touches[0].clientX) - rect.left;
        const progress = Math.max(0, Math.min(1, clickX / rect.width));
        
        if (this.audio.duration) {
            this.audio.currentTime = progress * this.audio.duration;
        }
    }
    
    startDrag(e) {
        e.preventDefault();
        const isTouch = e.type === 'touchstart';
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startProgress = this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0;
        
        const handleMove = (moveEvent) => {
            const clientX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const deltaX = clientX - startX;
            const rect = this.progressBar.getBoundingClientRect();
            const deltaProgress = (deltaX / rect.width) * 100;
            const newProgress = Math.max(0, Math.min(100, startProgress + deltaProgress));
            
            if (this.audio.duration) {
                this.audio.currentTime = (newProgress / 100) * this.audio.duration;
            }
        };
        
        const handleEnd = () => {
            if (isTouch) {
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
            } else {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleEnd);
            }
        };
        
        if (isTouch) {
            document.addEventListener('touchmove', handleMove);
            document.addEventListener('touchend', handleEnd);
        } else {
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleEnd);
        }
    }
    
    handleKeyboard(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                this.playPrevious();
                break;
            case 'ArrowRight':
                this.playNext();
                break;
        }
    }
}

// Initialize the player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const player = new BlurPlayer();
});