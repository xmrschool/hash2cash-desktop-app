import * as React from 'react';
import * as cx from 'classnames';

const s = require('./CloseIcon.css');

export default class CloseIcon extends React.Component<{ opened: boolean } & React.SVGProps<SVGSVGElement>> {
  render() {
    const { opened, ...props } = this.props;

    return (
      <svg className={cx(s.root, opened && s.opened)} height={18} width={18} {...props}>
        <g fill="none" fillRule="evenodd">
          <path d="M0 0h18v18H0" />
          <path stroke="#FFF" d="M4.5 4.5l9 9" strokeLinecap="round" />
          <path stroke="#FFF" d="M13.5 4.5l-9 9" strokeLinecap="round" />
        </g>
      </svg>
    )
  }
}