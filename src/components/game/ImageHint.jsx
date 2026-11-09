import { useState } from 'react';
import { useT } from '../../preferences/context';
import Icon from '../ui/Icon';

/**
 * Backdrop still used as the hint for movies and shows.
 * Status: 'loading' → 'loaded' | 'error'. Keyed by URL in the parent so a new
 * item always starts in 'loading'. The alt text never reveals the title.
 */
export default function ImageHint({ backdropUrl }) {
  const t = useT();
  const [status, setStatus] = useState('loading');

  return (
    <div className="image-hint" data-state={status} aria-busy={status === 'loading'}>
      {status === 'error' ? (
        <div className="image-hint-message" role="status">
          <Icon name="alert" size={20} />
          <span>{t('media.imageError')}</span>
        </div>
      ) : (
        <img
          src={backdropUrl}
          alt={t('media.sceneAlt')}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && <span className="sr-only" role="status">{t('media.imageLoading')}</span>}
    </div>
  );
}
