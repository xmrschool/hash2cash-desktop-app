import * as React from 'react';
import * as cx from 'classnames';

const s = require('./PlayButton.css');

export default function PlayButton({
  paused,
  size = 50,
  ...props
}: {
  paused: boolean;
  [key: string]: any;
}) {
  const classNames = cx(paused && s.paused, s.btn);
  // Cuz css props aren't supported
  const styles = { '--button-size': size + 'px' } as any;

  const path = paused
    ? 'M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z'
    : 'M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z';

  return (
    <button className={classNames} style={styles} aria-label="Start">
      <svg height="100%" version="1.1" viewBox="14 8 8 20" width="100%">
        <path d={path} />
        <path d={path} />
      </svg>
    </button>
  );
}
