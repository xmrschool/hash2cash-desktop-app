import * as React from 'react';
import { Route, Switch } from 'react-router';
import HomePage from 'scenes/Home';

export type ReturningFunction = () => Promise<{ default: any }>;

function asyncComponent(getComponent: ReturningFunction) {
  return class AsyncComponent extends React.Component {
    static Component: any = null;
    state = { Component: AsyncComponent.Component };

    componentWillMount() {
      if (!this.state.Component) {
        getComponent()
          .then(c => c.default)
          .then(Component => {
            AsyncComponent.Component = Component;
            this.setState({ Component });
          });
      }
    }
    render() {
      const { Component } = this.state;
      if (Component) {
        return <Component {...this.props} />;
      }
      return null;
    }
  };
}

const Routes = () => {
  return (
    <Switch>
      <Route
        exact
        path="/login"
        component={asyncComponent(() =>
          import(/* webpackChunkName: "login" */ 'scenes/LoginContainer')
        )}
      />
      <Route
        exact
        path="/dashboard"
        component={asyncComponent(() =>
          import(/* webpackChunkName: "dashboard" */ 'scenes/Dashboard')
        )}
      />
      <Route
        exact
        path="/settings"
        component={asyncComponent(() =>
          import(/* webpackChunkName: "settings" */ 'scenes/Settings')
        )}
      />
      <Route
        exact
        path="/init"
        component={asyncComponent(() =>
          import(/* webpackChunkName: "init" */ 'scenes/Initialization')
        )}
      />
      <Route exact path="/" component={HomePage} />
    </Switch>
  );
};

export default Routes;
