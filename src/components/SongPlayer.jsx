import { useState, useRef, useEffect } from 'react';
import { translations } from '../translations';
import './SongPlayer.css';

export default function SongPlayer({ song, language }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null);

  const t = translations[language];

  // Reset the player UI when the song changes. We intentionally do NOT call
  // audioRef.load() here: with preload="none" the browser only requests
  // /api/audio (which spawns yt-dlp on the server) once the user hits play.
  useEffect(() => {
    setIsPlaying(false);
    setIsPaused(false);
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
      <audio ref={audioRef} src={song.previewUrl} preload="none" />
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
