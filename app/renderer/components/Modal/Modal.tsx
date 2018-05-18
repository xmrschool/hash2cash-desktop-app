import * as React from 'react';
import { createPortal } from 'react-dom';

const s = require('./Modal.scss');
export default function Modal(props: { children: any }) {
  return createPortal(
    <div className={s.modal}>
      <div className={s.inner}>{props.children}</div>
    </div>,
    document.getElementById('modal')!
  ) as any;
}
