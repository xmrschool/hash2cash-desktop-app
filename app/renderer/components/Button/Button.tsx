import * as React from 'react';
import * as cx from 'classnames';
const s = require('./Button.css');

const Button = (props: any) => {
  const { className, simple, warning, success, disabled, ...rest } =
    props || ({} as any);

  const warn = warning ? s.warning : '';
  const succ = success ? s.success : '';

  const buttonType = simple ? s.simple : s.button;

  const _className = className
    ? cx(buttonType, warn, succ, disabled && s.disabled, className)
    : cx(buttonType, warn, succ, disabled && s.disabled);

  return <button className={_className} {...rest} />;
};

export default Button;
