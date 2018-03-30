import { createElement, ComponentClass } from 'react';
import * as PropTypes from 'prop-types';

export type SocketType = {
  socket: SocketIOClient.Socket;
};

function socketConnect(Target: ComponentClass<any>): any {
  function SocketConnect(props: any, context: any) {
    return createElement(
      Target,
      Object.assign({}, props, {
        socket: context.socket,
      })
    );
  }

  (SocketConnect as any).contextTypes = {
    socket: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  };

  return SocketConnect;
}

export default socketConnect;
