// @flow
import * as React from 'react';

const s = require('./PrettyNumber.css');

export type PrettyNumberProps = {
  unit: string;
  num: number;
  fixedLevel?: number;
};

export default class PrettyNumber extends React.Component<PrettyNumberProps> {
  shouldComponentUpdate(nextProps: PrettyNumberProps) {
    if (
      nextProps.fixedLevel !== this.props.fixedLevel ||
      nextProps.unit !== this.props.unit
    ) {
      return true;
    }

    // Think dat's enough because floating part updated with main part mostly
    const floatingPoint = this.props.num
      .toFixed(this.props.fixedLevel || 2)
      .split('.')[1];
    const floatingPointNew = nextProps.num
      .toFixed(this.props.fixedLevel || 2)
      .split('.')[1];

    return floatingPoint !== floatingPointNew;
  }

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
