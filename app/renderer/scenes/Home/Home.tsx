import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import * as cx from 'classnames';
import Preloader from 'components/Preloader';
import { sleep } from 'utils/sleep';
import socketConnect from 'utils/socket';
import globalState from 'mobx-store/GlobalState';
import userState from 'mobx-store/User';


const s = require('./Home.css');

export const ANIMATION_TIME = 200;

export type State = {
  animating: boolean;
};

@socketConnect
export class HomePage extends React.Component<
  RouteComponentProps<any> & { socket: SocketIOClient.Socket },
  State
> {
  state = {
    animating: false,
  };

  componentDidMount() {
    console.log('entered: ', this, window.location);
    this.onEntered();
  }

  async disappear() {
    this.setState({ animating: true });
    await sleep(ANIMATION_TIME);
  }

  async onEntered() {
    await globalState.connectionPromise;
    await userState.attemptToLogin();
    await this.disappear();

    this.props.history.push(userState.authenticated ? '/dashboard' : '/login');
  }

  render() {
    return (
      <div className={cx(s.root, this.state.animating && s.animating)}>
        <Preloader size={100} />
      </div>
    );
  }
}

export default (HomePage as any) as React.StatelessComponent<
  RouteComponentProps<any>
>;
