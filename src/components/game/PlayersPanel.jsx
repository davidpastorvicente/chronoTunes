import { useT } from '../../preferences/context';
import Timeline from './Timeline';

/** Display order: on my device I come first; on a shared device the active player does. */
function displayOrder(game, myIndex) {
  const indexes = game.players.map((_, i) => i);
  const first = myIndex >= 0 ? myIndex : game.currentPlayerIndex;
  return [...indexes.slice(first), ...indexes.slice(0, first)];
}

const initial = (name) => name.trim().charAt(0).toUpperCase() || '?';

/** Every player's score and timeline. */
export default function PlayersPanel({ game, myIndex = -1, showTypeIcons }) {
  const t = useT();
  const placement = game.value === 'result' && game.lastPlacement?.correct ? game.lastPlacement : null;

  return (
    <section className="players-panel" aria-labelledby="players-heading">
      <h2 id="players-heading" className="overline">{t('timeline.title')}</h2>
      {displayOrder(game, myIndex).map((index) => {
        const player = game.players[index];
        const active = index === game.currentPlayerIndex && game.value !== 'gameOver';
        return (
          <article
            key={player.id ?? index}
            className={`card player-card ${active ? 'is-active' : ''}`}
            aria-current={active ? 'true' : undefined}
            data-player-index={index}
          >
            <div className="player-card-header">
              <span className="avatar" aria-hidden="true">{initial(player.name)}</span>
              <h3 className="player-name">{player.name}</h3>
              {index === myIndex && <span className="chip">{t('timeline.you')}</span>}
              {active && <span className="chip chip-active">{t('timeline.current')}</span>}
              <span className="player-score">{t('timeline.score', { score: player.score, target: game.winningScore })}</span>
            </div>
            <div className="progress" aria-hidden="true">
              <div className="progress-bar is-success" style={{ transform: `scaleX(${Math.min(1, player.score / game.winningScore)})` }} />
            </div>
            <Timeline
              items={player.timeline}
              showTypeIcons={showTypeIcons}
              highlightIndex={placement?.playerIndex === index ? placement.position : null}
            />
          </article>
        );
      })}
    </section>
  );
}
