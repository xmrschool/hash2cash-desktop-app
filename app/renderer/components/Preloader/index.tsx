import * as React from 'react';
const styles = require('./Preloader.css');

export type Props = {
  size?: number;
};

const Preloader = ({ size }: Props) => {
  const elementStyles = (size
    ? { '--preloader-size': size + 'px' }
    : undefined) as any;

  return (
    <div className={styles.ball} style={elementStyles}>
      <div />
      <div />
      <div />
    </div>
  );
};

export default Preloader;
