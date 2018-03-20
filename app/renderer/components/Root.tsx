import * as React from 'react';
import * as Redux from 'react-redux';
import { History } from 'history';

import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { Provider as MobxProvider } from 'mobx-react';
import Routes from 'routes';
import stores from 'mobx-store';
import SocketProvider from './SocketProvider';
import DevTools from 'mobx-react-devtools';
import Toast from './Toast';
import Navigator from './Navigator';

let hot: any;

if (__DEV__) {
  hot = require('react-hot-loader').hot;
}

interface IRootType {
  store: Redux.Store<any>;
  history: History;
  socket: SocketIOClient.Socket;
}
function Root({ store, history, socket }: IRootType) {
  const Fragment = (React as any).Fragment;
  return (
    <>
      { __WIN32__ && <Navigator /> }
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
      {process.env.NODE_ENV === 'development' && false && <DevTools />}
    </>
  );
}

const wrapped = hot ? hot(module)(Root) : Root;

export default wrapped;
