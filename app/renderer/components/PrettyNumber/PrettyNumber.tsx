// @flow
import * as React from 'react';

const s = require('./PrettyNumber.css');

export type PrettyNumberProps = {
  unit: string;
  num: number;
  fixedLevel?: number;
};

export default class PrettyNumber extends React.Component<PrettyNumberProps> {
  render() {
    const { unit, fixedLevel, num } = this.props;
    const floatingPoint = num.toFixed(fixedLevel || 2).split('.')[1];

    return (
      <div className={s.root}>
        <span className={s.unit}>{unit}</span>
        <span className={s.mainPart}>
          {Math.round(num).toLocaleString('fr-FR')}
        </span>
        {this.props.fixedLevel !== 0 && (
          <span className={s.floatingPoint}>.{floatingPoint}</span>
        )}
      </div>
    );
  }
}
