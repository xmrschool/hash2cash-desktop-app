import * as React from 'react';
import { observer } from 'mobx-react';
import { addLocaleData, IntlProvider } from 'react-intl';
import * as en from 'react-intl/locale-data/en';
import * as ru from 'react-intl/locale-data/ru';

addLocaleData([...en, ...ru]);
import { LocalStorage } from './utils/LocalStorage';
import globalState from './mobx-store/GlobalState';
import userOptions from './mobx-store/UserOptions';

export type Locale = {
  locale: string;
  id: string;
  link: string;
};

export type LocaleWithData = Locale & { data: any };

@observer
export class LocaleProvider extends React.Component<any> {
  componentWillReceiveProps() {
    this.forceUpdate();
  }

  render() {
    const usedLocale = globalState.currentLocale;
    console.log('used locale is: ', JSON.stringify(usedLocale));
    return (
      <IntlProvider
        locale={usedLocale && usedLocale.locale ? usedLocale.locale.slice(0, 2) : 'en'}
        messages={usedLocale && usedLocale.data}
      >
        {this.props.children}
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
    // If development, retrieve it locally
    if (__DEV__) {
      const file = require('../core/locales/' + locale.locale + '.yaml');

      LocalStorage.currentLocale = file;
      globalState.currentLocale = file;

      return;
    }

    const resp = await fetch(locale.link);
    const json = await resp.json();

    LocalStorage.currentLocale = json;
    globalState.currentLocale = json;
  } catch (e) {}
}

export function checkIfTranslateOutdated() {
  const locales = LocalStorage.appInfo!.locales;
  const usedLocale = LocalStorage.currentLocale || {
    locale: userOptions.get('locale'),
    id: 'none',
  };

  let remoteLocale;
  if (__DEV__) {
    remoteLocale = require('../core/locales/' + usedLocale.locale + '.yaml');
  } else remoteLocale = locales[usedLocale.locale];

  if (remoteLocale.id !== usedLocale.id) {
    fetchAndUseLocale(remoteLocale);
  }
}

const hot = (module as any).hot;
if (hot) {
  hot.accept('../core/locales/', () => {
    checkIfTranslateOutdated();
  });
}
