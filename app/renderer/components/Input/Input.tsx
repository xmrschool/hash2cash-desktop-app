import * as React from 'react';
import * as cx from 'classnames';

const s = require('./Input.css');

export interface IProps {
  label?: string;
  onLabelClick?: Function;
  onLabelDoubleClick?: Function;
  placeholder?: string;
  className?: string;
  error?: string | null;
}

export interface IState {
  shaking?: boolean;
}

export default class Input extends React.Component<
  React.InputHTMLAttributes<HTMLInputElement> & IProps,
  IState
> {
  state = {
    shaking: false,
  };

  componentWillReceiveProps(nextProps: IProps) {
    if (nextProps.error !== this.props.error && nextProps.error !== null) {
      return this.shake();
    }
  }

  shake() {
    this.setState({ shaking: true });

    setTimeout(() => this.setState({ shaking: false }), 430);
  }

  render() {
    const {
      label,
      placeholder,
      className,
      error,
      onLabelClick,
      onLabelDoubleClick,
      ...inputProps
    } = this.props;
    const shouldShake = this.state.shaking;

    return (
      <div className={cx(s.root, className)}>
        <span
          className={s.label}
          onClick={onLabelClick as any}
          onDoubleClick={onLabelDoubleClick as any}
        >
          {label || placeholder}
        </span>
        <div className={s.inputContainer}>
          <input
            className={cx(s.input, shouldShake && s.shaking)}
            {...inputProps}
          />
          {!!error && <div className={s.error}>{error}</div>}
        </div>
      </div>
    );
  }
}
