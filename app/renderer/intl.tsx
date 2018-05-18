import * as React from 'react';
import { observer } from 'mobx-react';
import {
  addLocaleData,
  IntlProvider,
  injectIntl,
  InjectedIntl,
} from 'react-intl';
import * as en from 'react-intl/locale-data/en';
import * as ru from 'react-intl/locale-data/ru';
import * as uk from 'react-intl/locale-data/uk';
import * as ro from 'react-intl/locale-data/ro';

addLocaleData([...en, ...ru, ...uk, ...ro]);
import { LocalStorage } from './utils/LocalStorage';
import globalState from './mobx-store/GlobalState';
import userOptions from './mobx-store/UserOptions';

export type Locale = {
  locale: string;
  id: string;
  link: string;
  data: string;
};

export let intl: InjectedIntl;
let resolver: Function;
const promise: Promise<void> = new Promise(resolve => {
  resolver = resolve;
});

export async function getIntl(): Promise<InjectedIntl> {
  await promise;

  return intl;
}
export type LocaleWithData = Locale & { data: any };

@injectIntl
export class IntlLocale extends React.Component<any> {
  render() {
    intl = this.props.intl;
    resolver();

    return this.props.children;
  }
}
@observer
export class LocaleProvider extends React.Component<any> {
  componentWillReceiveProps() {
    console.log('calling forceUpdate()');
    this.forceUpdate();
  }

  render() {
    const usedLocale = globalState.currentLocale;
    return (
      <IntlProvider
        locale={
          usedLocale && usedLocale.locale ? usedLocale.locale.slice(0, 2) : 'en'
        }
        messages={usedLocale && usedLocale.data}
      >
        <IntlLocale>{this.props.children}</IntlLocale>
      </IntlProvider>
    );
  }
}
/* How caching works?
    1. We get a list of locales, like { en: { id: 'some-unique-id', link: 'http://...'}, ru: { ... } } from `appInfo`
       It automathically saved along with `appInfo` in localStorage
    2. When we want to check if it's up to date, we compare locally used `currentLocale`' id and `id` from `appInfo.locales`
    If it's outdated, we download and replace locale
*/

export async function fetchAndUseLocale(locale: Locale) {
  try {
    LocalStorage.currentLocale = locale;
    globalState.currentLocale = locale;

    return;

    /*const resp = await fetch(locale.link);
    const json = await resp.json();

    LocalStorage.currentLocale = json;
    globalState.currentLocale = json;*/
  } catch (e) {}
}

export function checkIfTranslateOutdated() {
  // const locales = LocalStorage.appInfo!.locales;
  const usedLocale = LocalStorage.currentLocale || {
    locale: userOptions.get('locale'),
    id: 'none',
  };

  const remoteLocale = require('../core/locales/' +
    usedLocale.locale.slice(0, 2) +
    '.yaml');

  console.log('remote locale: ', remoteLocale);
  fetchAndUseLocale({
    data: remoteLocale,
    locale: usedLocale.locale,
    id: usedLocale.locale,
    link: '',
  });
}

const hot = (module as any).hot;
checkIfTranslateOutdated();
if (hot) {
  hot.accept('../core/locales/', () => {
    checkIfTranslateOutdated();
  });
}
