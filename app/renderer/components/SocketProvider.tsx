import { Component, ReactElement } from 'react';
import * as PropTypes from 'prop-types';

export type Props = {
  socket: SocketIOClient.Socket;
  children: ReactElement<any>;
};

export default class SocketProvider extends Component<Props> {
  static propTypes = {
    socket: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  };

  static defaultProps = {
    socket: false,
  };

  static childContextTypes = {
    socket: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  };

  getChildContext() {
    return {
      socket: this.props.socket,
    };
  }

  render() {
    return this.props.children;
  }
}