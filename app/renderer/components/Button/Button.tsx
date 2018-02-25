import * as React from 'react';
import * as cx from 'classnames';
const s = require('./Button.css');

const Button = (props: any) => {
  const className = props.className ? cx(s.button, props.disabled && s.disabled, props.className) : cx(s.button, props.disabled && s.disabled);

  return <button className={className} {...props} />;
};

export default Button;
