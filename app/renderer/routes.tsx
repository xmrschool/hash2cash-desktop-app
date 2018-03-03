import * as React from 'react';
import { Route, Switch } from 'react-router';
import HomePage from 'scenes/Home';
import LoginContainer from 'scenes/LoginContainer';
import Dashboard from 'scenes/Dashboard';
import Initialization from 'scenes/Initialization';
import Settings from './scenes/Settings';

const Routes = () => {
  return (
    <Switch>
      <Route exact path="/login" component={LoginContainer} />
      <Route exact path="/dashboard" component={Dashboard} />
      <Route exact path="/settings" component={Settings} />
      <Route exact path="/init" component={Initialization} />
      <Route exact path="/" component={HomePage} />
    </Switch>
  );
}

export default Routes;
