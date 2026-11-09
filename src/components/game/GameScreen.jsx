import { useEffect, useRef, useState } from 'react';
import { itemId } from '../../game/rules';
import { useLocalGame } from '../../hooks/useLocalGame';
import { useOnlineGame } from '../../hooks/useOnlineGame';
import { useT } from '../../preferences/context';
import { tmdbImage } from '../../utils/images';
import AppHeader from '../AppHeader';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { MEDIA_TYPE_ICONS } from '../ui/iconMaps';
import GameOver from './GameOver';
import ImageHint from './ImageHint';
import PlacementOptions from './PlacementOptions';
import PlayersPanel from './PlayersPanel';
import ResultCard from './ResultCard';
import SongPlayer from './SongPlayer';

/** Picks the driver for the mode; both return the same shape for `GameView`. */
export default function GameScreen(props) {
  return props.config.mode === 'online' ? <OnlineGame {...props} /> : <LocalGame {...props} />;
}

function LocalGame({ config, round, onRestart, onExit }) {
  return <GameView config={config} session={useLocalGame(config, round)} onRestart={onRestart} onExit={onExit} />;
}

function OnlineGame({ config, onExit }) {
  return <GameView config={config} session={useOnlineGame(config)} onExit={onExit} />;
}

function GameView({ config, session, onRestart, onExit }) {
  const t = useT();
  const { status, game } = session;
  const finished = game?.value === 'gameOver';
  const showTypeIcons = config.category === 'all';

  return (
    <>
      <AppHeader
        onHome={finished || status === 'closed' ? onExit : undefined}
        status={game && !finished && <TurnStatus game={game} session={session} online={config.mode === 'online'} />}
        actions={!finished && <ExitButton onExit={onExit} />}
      />
      <main className="container game-screen" data-screen="game" data-phase={game?.value ?? status}>
        {session.error && (
          <div className="banner banner-error" role="alert">
            <Icon name="alert" />
            <span>{t(session.error)}</span>
            {session.retry && <Button size="sm" onClick={session.retry}>{t('player.retry')}</Button>}
          </div>
        )}

        {status === 'connecting' && <Pending label={t('game.connecting')} />}
        {status === 'closed' && (
          <section className="card empty-state">
            <p>{t('errors.sessionClosed')}</p>
            <Button variant="primary" onClick={onExit}>{t('gameOver.newGame')}</Button>
          </section>
        )}

        {game && finished && (
          <GameOver game={game} showTypeIcons={showTypeIcons} onRestart={onRestart} onExit={onExit} />
        )}

        {game && !finished && (
          <div className="game-layout">
            <section className="card stage">
              <Stage game={game} session={session} />
            </section>
            <PlayersPanel game={game} myIndex={session.myIndex ?? -1} showTypeIcons={showTypeIcons} />
          </div>
        )}
      </main>
    </>
  );
}

function Stage({ game, session }) {
  const t = useT();
  const { canAct, busy } = session;
  const player = game.players[game.currentPlayerIndex];
  const nextPlayer = game.players[(game.currentPlayerIndex + 1) % game.players.length];
  const item = game.currentItem;

  if (game.value === 'playing' && item) {
    return (
      <>
        <p className="overline stage-label">
          <Icon name={MEDIA_TYPE_ICONS[item.type]} size={14} />
          {t(`media.mystery.${item.type}`)}
        </p>
        {item.type === 'song' ? (
          <SongPlayer key={itemId(item)} song={item} />
        ) : (
          <ImageHint key={itemId(item)} backdropUrl={tmdbImage(item.backdropUrl, 'w1280')} />
        )}
        {canAct ? (
          <PlacementOptions timeline={player.timeline} onPlace={session.place} disabled={busy} />
        ) : (
          <WaitingNote label={t('game.waitingForPlacement', { name: player.name })} />
        )}
      </>
    );
  }

  if (game.value === 'result' && item && game.lastPlacement) {
    return (
      <>
        <ResultCard item={item} correct={game.lastPlacement.correct} />
        {canAct ? (
          <div className="actions">
            <Button variant="primary" size="lg" iconAfter="arrowRight" onClick={session.nextTurn} loading={busy}>
              {t('game.nextTurn')}
            </Button>
            {game.players.length > 1 && (
              <span className="text-secondary">{t('game.nextUp', { name: nextPlayer.name })}</span>
            )}
          </div>
        ) : (
          <WaitingNote label={t('game.waitingForNext', { name: player.name })} />
        )}
      </>
    );
  }

  return <Pending label={t('game.preparing')} />;
}

function TurnStatus({ game, session, online }) {
  const t = useT();
  const name = game.players[game.currentPlayerIndex]?.name ?? '';
  const label = online && session.canAct ? t('game.yourTurn') : t('game.turnOf', { name });
  return (
    <span className={`chip ${session.canAct && online ? 'chip-active' : ''}`} role="status">
      {label}
    </span>
  );
}

/**
 * Exit with an inline confirmation. Focus moves to the safe "Back" action when
 * it opens, Escape cancels, and focus returns to the trigger afterwards.
 */
function ExitButton({ onExit }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef(null);
  const cancelRef = useRef(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) triggerRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className="segmented-item"
        onClick={() => setConfirming(true)}
        aria-label={t('nav.exit')}
        title={t('nav.exit')}
      >
        <Icon name="logOut" />
      </button>
    );
  }
  return (
    <div
      className="popover"
      role="alertdialog"
      aria-labelledby="exit-confirm"
      onKeyDown={(event) => event.key === 'Escape' && setConfirming(false)}
    >
      <p id="exit-confirm">{t('nav.exitConfirm')}</p>
      <div className="actions">
        <Button ref={cancelRef} size="sm" onClick={() => setConfirming(false)}>{t('setup.back')}</Button>
        <Button variant="danger" size="sm" icon="logOut" onClick={onExit}>{t('nav.exit')}</Button>
      </div>
    </div>
  );
}

function Pending({ label }) {
  return (
    <div className="pending" role="status">
      <Icon name="loader" size={24} className="spin" />
      <span>{label}</span>
    </div>
  );
}

function WaitingNote({ label }) {
  return (
    <p className="waiting-note">
      <Icon name="loader" size={16} className="spin" />
      {label}
    </p>
  );
}
