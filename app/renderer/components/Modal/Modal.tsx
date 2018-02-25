import * as React from 'react';

const s = require('./Modal.scss');
export default function Modal(props: { children: any }) {
  return <div className={s.modal}>{props.children}</div>;
}
