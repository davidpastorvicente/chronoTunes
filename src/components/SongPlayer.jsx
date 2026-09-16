import { useState, useRef, useEffect } from 'react';
import { translations } from '../translations';
import './SongPlayer.css';

export default function SongPlayer({ song, language }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null);

  const t = translations[language];

  // When the song changes, reset the UI and prefetch the new audio so playback
  // is (near) instant when the user hits play. Setting preload="auto" plus an
  // explicit load() tells the browser to start requesting /api/audio (which
  // spawns yt-dlp on the server) right away, buffering ahead of the click.
  useEffect(() => {
    setIsPlaying(false);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [song]);

  const handlePlayClick = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPaused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  return (
    <div className="song-player">
      <audio ref={audioRef} src={song.previewUrl} preload="auto" />
      {!isPlaying ? (
        <div className="play-button-container">
          <button className="play-button" onClick={handlePlayClick}>
            <span className="play-icon">▶️</span>
            <span>{t.playSong}</span>
          </button>
        </div>
      ) : (
        <div className="now-playing">
          <button className="control-button" onClick={togglePlayPause}>
            {isPaused ? `▶️ ${t.play}` : `⏸️ ${t.pause}`}
          </button>
          <div className={`music-bars ${isPaused ? 'paused' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>{isPaused ? t.paused : t.playing}</p>
        </div>
      )}
    </div>
  );
}
