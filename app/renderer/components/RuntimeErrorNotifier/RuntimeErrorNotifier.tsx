import * as React from 'react';
import { FormattedMessage, defineMessages } from 'react-intl';
import { observer } from 'mobx-react';
import RuntimeError, { isFsError } from '../../mobx-store/RuntimeError';
import Modal from '../Modal/Modal';
import { librariesPath } from '../../utils/FileDownloader';
import Button from '../Button/Button';

const close = require('../../../core/icon/close.svg');

const messages = defineMessages({
  stopped: {
    id: 'runtimeError.workerStopped',
    defaultMessage: 'Miner stopped',
  },
  noFile: {
    id: 'runtimeError.noFile',
    defaultMessage: `It seems that antivirus deleted miner. You have to add {path} path to run it, and then, reload app`,
  },
  noAccess: {
    id: 'runtimeError.noAccess',
    defaultMessage: `No access to miner. It may happen due to your antivirus, feel free to add {path} to exception list, and then, reload app`,
  },
  undefinedError: {
    id: 'runtimeError.undefinedError',
    defaultMessage: 'Undefined file-system error ({code} – {errno}). Try again later, or, contact us',
  },
  close: {
    id: 'runtimeError.close',
    defaultMessage: 'Close',
  },
});

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
        {librariesPath.replace(/\//g, prefix)}
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
              <FormattedMessage {...messages.noFile} values={{ path: this.renderPath() }} />
            </p>
          );
        case 'EACCESS':
          return (
            <p style={styles}>
              <FormattedMessage {...messages.noAccess} values={{ path: this.renderPath() }} />
            </p>
          );
        default:
          return (
            <p style={styles}>
              <FormattedMessage {...messages.undefinedError} values={raw} />
            </p>
          );
      }
    }

    // ToDo Add other cases to handle errors?
    return <p style={styles}>{message}</p>;
  }

  renderError() {
    const closeStyles = {
      position: 'absolute' as any,
      right: 40,
      top: 40,
      width: 18,
      opacity: 0.9,
      cursor: 'pointer',
    };
    const { raw, stack } = RuntimeError.error!;
    return (
      <Modal>
        <img
          src={close}
          style={closeStyles}
          onClick={RuntimeError.closeError}
        />
        <h2><FormattedMessage {...messages.stopped} /></h2>
        {this.renderPossibleFix()}
        <p onClick={RuntimeError.expandStack}>{RuntimeError.stackExpanded ? 'Hide' : 'Show'} error details</p>
        {RuntimeError.stackExpanded && (
          <>
            {raw && <code>{JSON.stringify(raw, null, 2)}</code>}
            <code>{stack}</code>
          </>
        )}
        <Button style={{ marginTop: 40 }} onClick={RuntimeError.closeError}>
          <FormattedMessage {...messages.close} />
        </Button>
      </Modal>
    );
  }

  render() {
    return RuntimeError.error && this.renderError();
  }
}
