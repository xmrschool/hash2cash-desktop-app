// @flow
import * as React from 'react';

const s = require('./RignameEditor.css');
import Input from '../Input/Input';
import { LocalStorage } from '../../utils/LocalStorage';

export type RignameEditorProps = {};
export default class RignameEditor extends React.Component<
  RignameEditorProps,
  { rigName: string | null; valid: boolean }
> {
  constructor(props: RignameEditorProps) {
    super(props);

    this.state = {
      rigName: LocalStorage.rigName,
      valid: true,
    };
    this.changeName = this.changeName.bind(this);
  }

  generateRigname() {
    let outerName = '';

    if (__DARWIN__) {
      outerName += '  OS X';
    } else if (__WIN32__) {
      outerName += '  Win ' + require('os').arch();
    }

    if (LocalStorage.collectedReport) {
      const possibleCpu = LocalStorage.collectedReport.devices.find(
        d => d.type === 'cpu'
      );

      if (possibleCpu) {
        const speed = /@ (\S+)/;
        const result = speed.exec(possibleCpu.model);

        if (result) outerName += ` ${result[1]}`;
      }
    }

    // Count how long it could be
    outerName = require('os').hostname().slice(0, 30 - outerName.length) + outerName;

    outerName = outerName.slice(0, 30);
    LocalStorage.rigName = outerName;
    this.setState({ rigName: outerName.replace(/ /g, '-').replace(/\+/g, '') });
  }

  componentDidMount() {
    if (this.state.rigName) return;

    this.generateRigname();
  }

  changeName(event: any) {
    const { value } = event.target;

    if (value.length === 0) {
      this.setState({ valid: false, rigName: '' });

      return;
    }

    const formatted = value.replace(/ /g, '-').replace(/\+/g, '');
    LocalStorage.rigName = formatted;
    this.setState({ rigName: formatted, valid: true });
  }
  render() {
    return (
      <div className={s.root}>
        <Input
          className={s.input}
          label="Rig name"
          placeholder="my-pc"
          maxLength={29}
          onLabelClick={() => this.generateRigname()}
          value={this.state.rigName || ''}
          error={!this.state.valid ? "can't be empty" : null}
          onChange={this.changeName}
        />
      </div>
    );
  }
}
