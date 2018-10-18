import * as React from 'react';
import * as cx from 'classnames';

const s = require('./Spinner.css');
const reload = require('./reload.svg');

export default class Spinner extends React.Component<any> {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { running, ...anotherProps } = this.props;

    return (
      <img
        className={cx(s.icon, running && s.spinner)}
        src={reload}
        {...anotherProps}
      />
    );
  }
}