// @flow
import * as React from 'react';
import { injectIntl, InjectedIntlProps } from 'react-intl';
const translitCyrillic = require('cyrillic-to-translit-js');

const s = require('./RignameEditor.css');
import Input from '../Input/Input';
import { LocalStorage } from '../../utils/LocalStorage';
import generateName from './nameGenerator';

const rigNameRegex = /^[a-zA-Z0-9\-_\.]+$/;
export type RignameEditorProps = InjectedIntlProps;

@(injectIntl as any)
export default class RignameEditor extends React.Component<
  {},
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

  generateScienceName() {
    const outerName = generateName();
    LocalStorage.rigName = outerName;
    this.setState({ rigName: outerName });
  }

  generateRigname() {
    let outerName = '';

    if (__DARWIN__) {
      outerName += ' OS X';
    } else if (__WIN32__) {
      outerName += ' Win ' + require('os').arch();
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
    outerName =
      require('os')
        .hostname()
        .slice(0, 30 - outerName.length) + outerName;

    outerName = outerName
      .replace(/ /g, '-')
      .replace(/\+/g, '')
      .slice(0, 30);
    outerName = new translitCyrillic().transform(outerName);

    if (!rigNameRegex.test(outerName)) {
      outerName = generateName();
    }
    LocalStorage.rigName = outerName;
    this.setState({ rigName: outerName });
  }

  componentDidMount() {
    if (this.state.rigName) return;

    this.generateScienceName();
  }

  shouldComponentUpdate(nextProps: any, nextState: any) {
    return this.state.rigName !== nextState.rigName;
  }

  changeName(event: any) {
    const { value } = event.target;

    if (value.length === 0) {
      this.setState({ valid: false, rigName: '' });

      return;
    }

    const formatted = new translitCyrillic().transform(
      value.replace(/ /g, '-').replace(/\+/g, '')
    );
    LocalStorage.rigName = formatted;
    this.setState({ rigName: formatted, valid: true });
  }
  render() {
    const intl = (this.props as InjectedIntlProps).intl;
    const errMessage = intl.formatMessage({ id: 'DASHBOARD_RIGNAME_EMPTY' });

    return (
      <div className={s.root}>
        <Input
          className={s.input}
          label={intl.formatMessage({ id: 'DASHBOARD_RIGNAME_LABEL' })}
          placeholder="my-pc"
          maxLength={29}
          onLabelClick={() => this.generateScienceName()}
          value={this.state.rigName || ''}
          error={!this.state.valid ? errMessage : null}
          onChange={this.changeName}
        />
      </div>
    );
  }
}
