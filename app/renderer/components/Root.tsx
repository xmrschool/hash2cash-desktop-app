import * as React from 'react';
import * as Redux from 'react-redux';
import { History } from 'history';
import { hot } from 'react-hot-loader';

import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { Provider as MobxProvider } from 'mobx-react';
import Routes from 'routes';
import stores from 'mobx-store';
import SocketProvider from './SocketProvider';
import DevTools from 'mobx-react-devtools';
import Toast from './Toast';

interface IRootType {
  store: Redux.Store<any>;
  history: History;
  socket: SocketIOClient.Socket;
}

export default hot(module)(function Root({
  store,
  history,
  socket,
}: IRootType) {
  const Fragment = (React as any).Fragment;
  return (
    <>
      <MobxProvider {...stores}>
        <Provider store={store}>
          <SocketProvider socket={socket}>
            <Fragment>
              <ConnectedRouter history={history} store={store}>
                <Routes />
              </ConnectedRouter>
              <Toast />
            </Fragment>
          </SocketProvider>
        </Provider>
      </MobxProvider>
      {process.env.NODE_ENV === 'development' && <DevTools />}
    </>
  );
});
