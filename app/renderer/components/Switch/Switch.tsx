import * as React from 'react';
import * as cx from 'classnames';

const s = require('./Switch.css');

export type SwitchProps = {
  checked: boolean;
  onChange: Function;
};
export default class Switch extends React.Component<SwitchProps> {
  render() {
    return (
      <div className={cx(s.switch, this.props.checked && s.checked)}>
        <input
          onChange={() => this.props.onChange(!this.props.checked)}
          type="checkbox"
          className={s.checkbox}
          value={this.props.checked ? 'on' : 'off'}
        />
      </div>
    );
  }
}
