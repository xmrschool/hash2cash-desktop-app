import * as Electron from 'electron';
import * as React from 'react';

const shell = Electron.shell || Electron.remote.shell;

const icon = require('./help-round-button.svg');
const s = require('./Help.css');

export class HelpItem extends React.Component<{ link: string, children: React.ReactNode }> {
  constructor(props: any) {
    super(props);

    this.openExternal = this.openExternal.bind(this);
  }

  openExternal() {
    shell.openExternal(this.props.link);
  }

  render() {
    return (
      <div onClick={this.openExternal} className={s.root}>
        <img className={s.ico} src={icon} />
        {this.props.children}
      </div>
    );
  }
}

export default class Help extends React.Component<{ link: string }> {
  constructor(props: any) {
    super(props);

    this.openExternal = this.openExternal.bind(this);
  }

  openExternal() {
    shell.openExternal(this.props.link);
  }

  render() {
    return (
      <div onClick={this.openExternal}>
        <img className={s.icon} src={icon} />
      </div>
    );
  }
}
