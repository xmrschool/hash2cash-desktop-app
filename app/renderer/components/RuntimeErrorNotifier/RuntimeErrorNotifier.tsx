import * as React from 'react';
import { observer } from 'mobx-react';
import RuntimeError, { isFsError } from '../../mobx-store/RuntimeError';
import Modal from '../Modal/Modal';
import { librariesPath } from '../../utils/FileDownloader';
import Button from "../Button/Button";

const close = require('../../../core/icon/close.svg');
// Use this class along with RuntimeError class to handle miner startup errors
@observer
export default class RuntimeErrorNotifier extends React.Component {
  constructor(props: any) {
    super(props);

    this.renderPath = this.renderPath.bind(this);
  }

  selectCopy(event: any) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(event.target as any);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  renderPath() {
    const prefix = __WIN32__ ? '\\' : '/'; // Backslash in Win32

    return (
      <code onClick={this.selectCopy} onContextMenu={this.selectCopy}>
        {librariesPath}
        {prefix}
      </code>
    );
  }

  // Show we can fix this error
  renderPossibleFix() {
    const styles = { fontSize: 16 };
    const { raw, message } = RuntimeError.error!;

    if (isFsError(raw)) {
      switch (raw.code) {
        case 'UNKNOWN':
        case 'ENOENT':
          return (
            <p style={styles}>
              Похоже, что файл майнера удалил антивирус. Добавьте папку{' '}
              {this.renderPath()} в список исключений и перезапустите бенчмарк
            </p>
          );
        case 'EACCESS':
          return (
            <p style={styles}>
              Нет доступа к файлу. Возможно, его заблокировал антивирус или вы
              используете x32 версию для 64-разрядной системы. Если у вас стоит
              антивирус - добавьте папку {this.renderPath()} в список исключений и перезапустите бенчмарк
            </p>
          );
        default:
          return (
            <p style={styles}>
              Ошибка файловой системы: {raw.code} - {raw.errno}
            </p>
          );
      }
    }

    // ToDo Add other cases to handle errors?
    return (
      <p style={styles}>{message}</p>
    );
  }

  renderError() {
    const closeStyles = {
      position: 'absolute' as any,
      right: 40,
      top: 40,
      width: 22,
      opacity: 0.8,
    };
    const { raw, stack } = RuntimeError.error!;
    return (
      <Modal>
        <img src={close} style={closeStyles} />
        <h2>Worker has been stopped</h2>
        {this.renderPossibleFix()}
        <p onClick={RuntimeError.expandStack}>Stack trace:</p>
        {RuntimeError.stackExpanded && (
          <>
            {raw && <code>{JSON.stringify(raw, null, 2)}</code>}
            <code>{stack}</code>
          </>
        )}
        <Button style={{ marginTop: 40 }} onClick={() => RuntimeError.closeError()}>Закрыть</Button>
      </Modal>
    );
  }

  render() {
    return RuntimeError.error && this.renderError();
  }
}
