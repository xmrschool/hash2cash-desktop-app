import * as React from 'react';
import * as cx from 'classnames';
const s = require('./Button.css');

const Button = (props: any) => {
  const { className, simple, warning, disabled, ...rest } = props || ({} as any);

  const warn = warning ? s.warning : '';
  const buttonType = simple ? s.simple : s.button;

  const _className = className ? cx(buttonType, warn, disabled && s.disabled, className) : cx(buttonType, warn, disabled && s.disabled);

  return <button className={_className} {...rest} />;
};

export default Button;
