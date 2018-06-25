import * as React from 'react';
import { createPortal } from 'react-dom';

const close = require('../../../core/icon/close.svg');
const s = require('./Modal.scss');
// ToDo handle esc button
export default function Modal(props: { children: any; onClose?: any }) {
  const closeStyles = {
    position: 'absolute' as any,
    right: 40,
    top: 40,
    width: 18,
    opacity: 0.9,
    cursor: 'pointer',
  };

  return createPortal(
    <div className={s.modal}>
      {props.onClose && (
        <img src={close} style={closeStyles} onClick={props.onClose} />
      )}
      <div className={s.inner}>{props.children}</div>
    </div>,
    document.getElementById('modal')!
  ) as any;
}
