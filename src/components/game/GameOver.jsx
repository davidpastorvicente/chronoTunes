import { useT } from '../../preferences/context';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Timeline from './Timeline';

/** Final screen: winner (or tie), why the game ended, scores and the winning timeline. */
export default function GameOver({ game, showTypeIcons, onRestart, onExit }) {
  const t = useT();
  const winner = game.winner == null ? null : game.players[game.winner];
  const ranking = game.players
    .map((player, index) => ({ ...player, index }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="card game-over" aria-labelledby="game-over-title">
      <span className="icon-tile" aria-hidden="true"><Icon name="trophy" size={22} /></span>
      <p className="overline">{t('gameOver.title')}</p>
      <h1 id="game-over-title" className="heading-headline">
        {winner ? <WinnerTitle t={t} name={winner.name} /> : t('gameOver.tie')}
      </h1>
      <p className="text-secondary">
        {game.endReason === 'deckExhausted'
          ? t('gameOver.deckExhausted')
          : t('gameOver.scoreReached', { target: game.winningScore })}
      </p>

      <h2 className="overline">{t('gameOver.finalScores')}</h2>
      <ol className="list">
        {ranking.map((player) => (
          <li key={player.index} className={`list-row ${player.index === game.winner ? 'is-winner' : ''}`}>
            <span>{player.name}</span>
            <span className="player-score">{player.score}</span>
          </li>
        ))}
      </ol>

      {winner && (
        <>
          <h2 className="overline">{t('gameOver.winningTimeline')}</h2>
          <Timeline items={winner.timeline} showTypeIcons={showTypeIcons} />
        </>
      )}

      <div className="actions">
        {onRestart && (
          <Button variant="primary" size="lg" icon="replay" onClick={onRestart}>
            {t('gameOver.playAgain')}
          </Button>
        )}
        <Button size="lg" icon="plus" onClick={onExit}>
          {t('gameOver.newGame')}
        </Button>
      </div>
    </section>
  );
}

function WinnerTitle({ t, name }) {
  const marker = '\u0000';
  const [before, after = ''] = t('gameOver.winner', { name: marker }).split(marker);
  return (
    <>
      {before}
      <span className="text-primary">{name}</span>
      {after}
    </>
  );
}
