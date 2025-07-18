class WinampPlayer {
    constructor() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.volume = 80;
        this.currentTime = 0;
        this.duration = 0;
        this.playlist = [];
        this.currentIndex = 0;
        this.isShuffleOn = false;
        this.isRepeatOn = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadPlaylist();
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
        this.folderTree = document.querySelector('.folder-tree');
        this.coverPlaceholder = document.querySelector('.cover-placeholder');
        
        this.currentOpenArtist = null;
        this.currentOpenAlbum = null;
        this.currentArtistPlaylist = [];
        
        this.audio = new Audio();
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.playNext());
    }
    
    bindEvents() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.infoBtn.addEventListener('click', () => this.showInfo());
        
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
    
    loadPlaylist() {
        const samplePlaylist = [
            {
                artist: 'Marz',
                album: 'Bleach',
                tracks: [
                    { title: 'Bleach', duration: '1:14', file: 'audio/marz-bleach.mp3' },
                    { title: 'Side', duration: '4:34', file: 'audio/marz-side.mp3' },
                    { title: 'Third Eye', duration: '4:34', file: 'audio/marz-third-eye.mp3' },
                    { title: 'Steal My Shine', duration: '4:40', file: 'audio/marz-steal-my-shine.mp3' },
                    { title: 'Step Aside', duration: '4:56', file: 'audio/marz-step-aside.mp3' },
                    { title: 'Third Eye', duration: '4:10', file: 'audio/marz-third-eye-2.mp3' }
                ]
            },
            {
                artist: 'Ghost Machine',
                album: 'Various Tracks',
                tracks: [
                    { title: 'Intro', duration: '1:06', file: 'audio/ghost-machine-intro.mp3' },
                    { title: 'Headstone', duration: '4:14', file: 'audio/ghost-machine-headstone.mp3' },
                    { title: 'Vegas Moon', duration: '3:55', file: 'audio/ghost-machine-vegas-moon.mp3' },
                    { title: 'God Forbid', duration: '3:27', file: 'audio/ghost-machine-god-forbid.mp3' },
                    { title: 'Scarred By Happiness (L.S.D.)', duration: '5:19', file: 'audio/ghost-machine-scarred.mp3' }
                ]
            }
        ];
        
        this.playlist = [];
        let index = 100;
        
        samplePlaylist.forEach(artist => {
            artist.tracks.forEach(track => {
                this.playlist.push({
                    id: index++,
                    artist: artist.artist,
                    album: artist.album,
                    title: track.title,
                    duration: track.duration,
                    file: track.file
                });
            });
        });
        
        this.updatePlaylistDisplay();
    }
    
    updatePlaylistDisplay() {
        const playlistInfo = document.querySelector('.playlist-info');
        const totalTracks = this.playlist.length;
        const currentTrack = this.currentIndex + 1;
        
        playlistInfo.innerHTML = `
            <span class="playlist-time">0:00/0:00</span>
            <span class="playlist-count">${currentTrack} of ${totalTracks}</span>
        `;
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
        
        // If clicking on a different artist
        if (this.currentOpenArtist && this.currentOpenArtist !== artistName) {
            // Close previous artist
            const prevArtistFolder = document.querySelector(`[data-artist="${this.currentOpenArtist}"]`);
            if (prevArtistFolder) {
                const prevAlbumList = prevArtistFolder.querySelector('.album-list');
                const prevArtistHeader = prevArtistFolder.querySelector('.artist-header');
                prevAlbumList.style.display = 'none';
                prevArtistHeader.classList.remove('expanded');
                
                // Close all albums in previous artist
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
            
            // Close all albums in this artist
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
        
        // If clicking on a different album within the same artist
        if (this.currentOpenAlbum && this.currentOpenAlbum !== albumName) {
            // Close previous album in this artist
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
        
        // Update current artist playlist when artist changes
        if (!this.currentArtistPlaylist.length || this.currentArtistPlaylist[0].artist !== track.artist) {
            this.updateCurrentArtistPlaylist(track.artist);
        }
        
        // Update display elements
        this.songTitle.textContent = track.title;
        this.albumName.textContent = track.album;
        this.artistName.textContent = track.artist;
        this.totalTimeDisplay.textContent = track.duration;
        
        // Update playing state in playlist
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        const currentSongItem = document.querySelector(`[data-id="${track.id}"]`);
        if (currentSongItem) {
            currentSongItem.classList.add('playing');
        }
        
        // Set duration for progress calculation
        this.duration = this.parseDuration(track.duration);
        this.currentTime = 0;
        this.updateTimeDisplay();
        this.updateProgress();
    }
    
    parseDuration(durationStr) {
        const parts = durationStr.split(':');
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return minutes * 60 + seconds;
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (this.currentTrack) {
            this.isPlaying = true;
            this.playPauseBtn.querySelector('.play-icon').style.display = 'none';
        this.playPauseBtn.querySelector('.pause-icon').style.display = 'block';
            this.startVisualizer();
            this.simulatePlayback();
        }
    }
    
    pause() {
        this.isPlaying = false;
        this.playPauseBtn.querySelector('.play-icon').style.display = 'block';
        this.playPauseBtn.querySelector('.pause-icon').style.display = 'none';
        this.stopVisualizer();
    }
    
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.playPauseBtn.querySelector('.play-icon').style.display = 'block';
        this.playPauseBtn.querySelector('.pause-icon').style.display = 'none';
        this.updateTimeDisplay();
        this.stopVisualizer();
        this.resetProgress();
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
            // Shuffle within current artist only
            const randomIndex = Math.floor(Math.random() * this.currentArtistPlaylist.length);
            nextTrack = this.currentArtistPlaylist[randomIndex];
        } else {
            // Normal order within current artist
            const nextIndex = (currentArtistIndex + 1) % this.currentArtistPlaylist.length;
            nextTrack = this.currentArtistPlaylist[nextIndex];
        }
        
        // Update global playlist index
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
            // Shuffle within current artist only
            const randomIndex = Math.floor(Math.random() * this.currentArtistPlaylist.length);
            prevTrack = this.currentArtistPlaylist[randomIndex];
        } else {
            // Normal order within current artist
            const prevIndex = currentArtistIndex > 0 ? currentArtistIndex - 1 : this.currentArtistPlaylist.length - 1;
            prevTrack = this.currentArtistPlaylist[prevIndex];
        }
        
        // Update global playlist index
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
        // Placeholder for info button functionality
        console.log('Info button clicked - functionality to be implemented later');
    }
    
    setVolume(value) {
        this.volume = value;
        this.audio.volume = value / 100;
    }
    
    simulatePlayback() {
        if (!this.isPlaying) return;
        
        this.currentTime += 0.1;
        if (this.currentTime >= this.duration) {
            this.currentTime = this.duration;
            this.playNext();
            return;
        }
        
        this.updateTimeDisplay();
        this.updateProgress();
        
        setTimeout(() => this.simulatePlayback(), 100);
    }
    
    updateTimeDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.currentTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateProgress() {
        if (this.duration > 0) {
            const progress = (this.currentTime / this.duration) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.progressHandle.style.left = `${progress}%`;
        }
    }
    
    resetProgress() {
        this.progressFill.style.width = '0%';
        this.progressHandle.style.left = '0%';
    }
    
    updateDuration() {
        this.duration = this.audio.duration || 240;
    }
    
    seekTo(e) {
        e.preventDefault();
        const rect = this.progressBar.getBoundingClientRect();
        const clickX = (e.clientX || e.touches[0].clientX) - rect.left;
        const progress = Math.max(0, Math.min(1, clickX / rect.width));
        this.currentTime = progress * this.duration;
        this.updateProgress();
        this.updateTimeDisplay();
        
        // If audio is loaded, seek to the new position
        if (this.audio && this.audio.duration) {
            this.audio.currentTime = this.currentTime;
        }
    }
    
    startDrag(e) {
        e.preventDefault();
        const isTouch = e.type === 'touchstart';
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startProgress = (this.currentTime / this.duration) * 100;
        
        const handleMove = (moveEvent) => {
            const clientX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const deltaX = clientX - startX;
            const rect = this.progressBar.getBoundingClientRect();
            const deltaProgress = (deltaX / rect.width) * 100;
            const newProgress = Math.max(0, Math.min(100, startProgress + deltaProgress));
            
            this.currentTime = (newProgress / 100) * this.duration;
            this.updateProgress();
            this.updateTimeDisplay();
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
    
    startVisualizer() {
        if (this.visualizerInterval) return;
        
        this.visualizerInterval = setInterval(() => {
            this.visualizerBars.forEach(bar => {
                const height = Math.random() * 40 + 10;
                bar.style.height = `${height}px`;
            });
        }, 100);
    }
    
    stopVisualizer() {
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
            this.visualizerInterval = null;
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

document.addEventListener('DOMContentLoaded', () => {
    const player = new WinampPlayer();
    
    if (player.playlist.length > 0) {
        player.loadTrack(player.playlist[0]);
    }
    
    document.querySelectorAll('.song-item').forEach((item, index) => {
        item.setAttribute('data-id', player.playlist[index]?.id || index + 100);
    });
});