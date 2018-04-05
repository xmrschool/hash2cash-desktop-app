import * as React from 'react';
import * as cx from 'classnames';
const s = require('./Button.css');

const Button = (props: any) => {
  const warn = props.warning ? s.warning : '';
  const buttonType = props.simple ? s.simple : s.button;

  const className = props.className ? cx(buttonType, warn, props.disabled && s.disabled, props.className) : cx(buttonType, warn, props.disabled && s.disabled);

  return <button className={className} {...props} />;
};

export default Button;
