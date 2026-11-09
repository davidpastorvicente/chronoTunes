import { useEffect, useReducer, useRef, useState } from 'react';
import { createPlayer, playerMachine } from '../../machines/playerMachine';
import { isYouTubeUrl } from '../../utils/deezer';
import { useT } from '../../preferences/context';
import Button from '../ui/Button';

const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const YT_COMMAND = (func) => JSON.stringify({ event: 'command', func, args: '' });

const EQUALIZER_BARS = ['a', 'b', 'c', 'd', 'e'];

const PRIMARY_ACTION = {
  idle: { event: 'PLAY', label: 'player.play', icon: 'play' },
  loading: { event: 'PAUSE', label: 'player.pause', icon: 'pause' },
  playing: { event: 'PAUSE', label: 'player.pause', icon: 'pause' },
  paused: { event: 'PLAY', label: 'player.resume', icon: 'play' },
  ended: { event: 'PLAY', label: 'player.replay', icon: 'replay' },
  error: { event: 'PLAY', label: 'player.retry', icon: 'replay' },
};

/**
 * Plays a song preview: Deezer MP3 through <audio>, or a hidden YouTube
 * embed as fallback. UI state comes from `playerMachine`.
 */
export default function SongPlayer({ song }) {
  const t = useT();
  const [player, send] = useReducer(playerMachine.transition, undefined, createPlayer);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const youtube = isYouTubeUrl(song.previewUrl);
  // The YouTube iframe autoplays on mount, so it only exists once playback was requested.
  const [youtubeMounted, setYoutubeMounted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const controlYouTube = (event) => {
    if (!youtubeMounted) {
      setYoutubeMounted(true);
      return;
    }
    iframeRef.current?.contentWindow?.postMessage(
      YT_COMMAND(event === 'PAUSE' ? 'pauseVideo' : 'playVideo'),
      YOUTUBE_ORIGIN,
    );
    if (event === 'PLAY') send({ type: 'STARTED' });
  };

  const controlAudio = async (event) => {
    const audio = audioRef.current;
    if (event === 'PAUSE') {
      audio.pause();
      return;
    }
    if (player.value === 'error') audio.load();
    if (player.value === 'ended') audio.currentTime = 0;
    try {
      await audio.play();
    } catch (error) {
      if (error.name !== 'AbortError') send({ type: 'FAILED' });
    }
  };

  const handlePrimary = () => {
    const { event } = PRIMARY_ACTION[player.value];
    send({ type: event });
    if (youtube) controlYouTube(event);
    else void controlAudio(event);
  };

  const action = PRIMARY_ACTION[player.value];
  const audible = player.value === 'playing';

  return (
    <div className="song-player" data-state={player.value}>
      {youtube ? (
        youtubeMounted && (
          <iframe
            ref={iframeRef}
            className="sr-only"
            src={song.previewUrl}
            title={t('player.play')}
            allow="autoplay; encrypted-media"
            tabIndex={-1}
            onLoad={() => send({ type: 'STARTED' })}
          />
        )
      ) : (
        <audio
          ref={audioRef}
          src={song.previewUrl}
          preload="auto"
          onPlaying={() => send({ type: 'STARTED' })}
          onPause={(event) => event.currentTarget.ended || send({ type: 'PAUSE' })}
          onEnded={() => send({ type: 'ENDED' })}
          onError={() => send({ type: 'FAILED' })}
          onTimeUpdate={(event) => {
            const { currentTime, duration } = event.currentTarget;
            setProgress(duration ? currentTime / duration : 0);
          }}
        />
      )}

      <div className={`equalizer ${audible ? 'is-active' : ''}`} aria-hidden="true">
        {EQUALIZER_BARS.map((bar) => <span key={bar} />)}
      </div>

      <Button variant="primary" size="lg" icon={action.icon} onClick={handlePrimary}>
        {t(action.label)}
      </Button>

      <p className={`player-status ${player.value === 'error' ? 'text-error' : 'text-secondary'}`} role="status">
        {t(`player.status.${player.value}`)}
      </p>

      {!youtube && (
        <div className="progress" aria-hidden="true">
          <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>
      )}
    </div>
  );
}
