import * as React from 'react';
import { sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { observer } from 'mobx-react';
import tips, { ITip } from '../../../core/tips';
import globalState from '../../mobx-store/GlobalState';
import Close from '../Close/Close';

const s = require('./Tips.css');
const ok = require('./ok.svg');
const error = require('./error.svg');

@observer
export class Tip extends React.Component<{ tip: ITip }> {
  constructor(props: any) {
    super(props);

    this.tryToFix = this.tryToFix.bind(this);
  }

  async tryToFix() {
    if (!this.props.tip.couldBeFixed || this.props.tip.buttonDisabled) return;
    this.props.tip.buttonDisabled = true;
    await this.props.tip.fixIt!();
  }

  render() {
    const { tip } = this.props;
    return (
      <div className={s.tip}>
        <div className={s.actions}>
          <img className={s.status} src={tip.isOk ? ok : error} />
          <h4 className={s.tipName}>{tip.name}</h4>
          {!tip.isOk &&
            tip.couldBeFixed && (
              <div>
                <button
                  className={s.button}
                  aria-label="Fix"
                  disabled={tip.buttonDisabled}
                  onClick={this.tryToFix}
                >
                  <FormattedMessage id="TIPS_BUTTON_FIX" />
                </button>
              </div>
            )}
        </div>
        <div className={s.container}>
          <p className={s.description}>{tip.workaround}</p>
        </div>
      </div>
    );
  }
}

@observer
export default class Tips extends React.Component {
  constructor(props: any) {
    super(props);

    this.goBack = this.goBack.bind(this);
  }

  componentDidMount() {
    setTimeout(() => tips.findTips(), 100);
    document.body.classList.toggle('whiter');
  }

  goBack() {
    globalState.hideLayer();
  }

  componentWillUnmount() {
    document.body.classList.toggle('whiter');
  }

  render() {
    const tipsList = tips.tips.filter(d => d.defined);

    const sorted = sortBy(tipsList, ['couldBeFixed', 'isOk']);
    return (
      <div>
        <div className={s.row}>
          <h2 className={s.header}>
            <FormattedMessage id="TIPS_HEADER" />
          </h2>
          <Close
            onClick={this.goBack}
            onMouseOver={() => (globalState.layerAnimating = true)}
            onMouseOut={() => (globalState.layerAnimating = false)}
          />
        </div>
        {sorted.map(tip => <Tip tip={tip} key={tip.name} />)}
      </div>
    );
  }
}
