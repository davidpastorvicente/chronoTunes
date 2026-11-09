import { MIN_ONLINE_PLAYERS } from '../../game/rules';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { inviteLink } from '../../hooks/useSetup';
import { useT } from '../../preferences/context';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

const COPY_LABELS = { idle: 'lobby.copy', copied: 'lobby.copied', failed: 'lobby.copyFailed' };
const COPY_ICONS = { idle: 'copy', copied: 'check', failed: 'alert' };

/** Waiting room for host and guests: code, settings summary and live player list. */
export default function Lobby({ session, isHost, starting, onStart }) {
  const t = useT();
  const [codeStatus, copyCode] = useCopyToClipboard();
  const [linkStatus, copyLink] = useCopyToClipboard();
  const { code, players, settings } = session;
  const enough = players.length >= MIN_ONLINE_PLAYERS;

  return (
    <div className="stack">
      <h2 className="heading-section" tabIndex={-1}>{t(isHost ? 'lobby.hostTitle' : 'lobby.guestTitle')}</h2>

      <div className="code-display">
        <span className="code" aria-label={code.split('').join(' ')}>{code}</span>
        <div className="actions">
          <Button size="sm" icon={COPY_ICONS[codeStatus]} onClick={() => copyCode(code)}>
            {t(COPY_LABELS[codeStatus])}
          </Button>
          {isHost && (
            <Button size="sm" icon={linkStatus === 'idle' ? 'link' : COPY_ICONS[linkStatus]} onClick={() => copyLink(inviteLink(code))}>
              {linkStatus === 'idle' ? t('lobby.copyLink') : t(COPY_LABELS[linkStatus])}
            </Button>
          )}
        </div>
        {settings && (
          <p className="text-secondary">
            {t('lobby.summary', {
              category: t(`category.${settings.category}`),
              score: settings.winningScore,
              contentSet: t(`contentSet.${settings.contentSet}`),
            })}
          </p>
        )}
      </div>

      <section aria-labelledby="lobby-players">
        <h3 id="lobby-players" className="field-label">{t('lobby.players', { count: players.length })}</h3>
        <ul className="list" aria-live="polite">
          {players.map((player, index) => (
            <li key={player.id} className="list-row">
              <span className="list-row-main">
                <span className="avatar" aria-hidden="true">{player.name.charAt(0).toUpperCase()}</span>
                {player.name}
              </span>
              <span className="chip-row">
                {index === 0 && <span className="chip">{t('lobby.host')}</span>}
                {player.id === session.playerId && <span className="chip chip-active">{t('lobby.you')}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <>
          {!enough && <p className="waiting-note"><Icon name="loader" size={16} className="spin" />{t('lobby.waitingForPlayers')}</p>}
          <Button variant="primary" size="lg" block disabled={!enough} loading={starting} onClick={onStart}>
            {starting ? t('lobby.starting') : t('lobby.start')}
          </Button>
          {!enough && <p className="field-hint">{t('lobby.needMore')}</p>}
        </>
      ) : (
        <p className="waiting-note"><Icon name="loader" size={16} className="spin" />{t('lobby.waitingForHost')}</p>
      )}
    </div>
  );
}
