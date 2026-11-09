import { useState, useRef, useEffect } from 'react';
import { translations } from '../translations';
import './SongPlayer.css';

export default function SongPlayer({ song, language }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  
  const t = translations[language];
  const isYouTube = song.previewUrl && song.previewUrl.includes('youtube');

  useEffect(() => {
    if (audioRef.current && !isYouTube) {
      audioRef.current.load();
    }
  }, [song, isYouTube]);

  const handlePlayClick = () => {
    if (isYouTube) {
      setIsPlaying(true);
      setIsPaused(false);
    } else if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const togglePlayPause = () => {
    if (isYouTube) {
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        if (isPaused) {
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } else {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
        setIsPaused(!isPaused);
      }
    } else if (audioRef.current) {
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
      {!isYouTube && <audio ref={audioRef} src={song.previewUrl} />}
      {isYouTube && isPlaying && (
        <iframe
          ref={iframeRef}
          width="0"
          height="0"
          src={`${song.previewUrl}&enablejsapi=1`}
          title="Song Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{ display: 'none' }}
        />
      )}
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
