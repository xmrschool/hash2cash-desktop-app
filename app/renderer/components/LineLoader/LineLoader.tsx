import * as React from 'react';

const styles = require('./LineLoader.css');

export default function LineLoader() {
  return (
    <div className={styles['preloader-1']}>
      <span className={styles['line-1']} />
      <span className={styles['line-2']} />
      <span className={styles['line-3']} />
      <span className={styles['line-4']} />
    </div>
  );
}

export type FallbackProps = {
  condition: boolean;
  children: any;
};

export function FallbackLoader(props: FallbackProps) {
  const { condition, children } = props;

  return condition ? children : <LineLoader />;
}
