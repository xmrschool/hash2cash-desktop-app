import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import LocalizedError from '../errors/LocalizedError';

export type IntlProperties = {
  __kind: 'intl';
  id: string;
  description?: string;
  defaultMessage?: string;
  values?: any;
};

export interface IReactable {
  toReact(): React.ReactNode;
}

export type Renderable = string | IntlProperties | LocalizedError;

export function render(child: Renderable): React.ReactNode | null {
  if (typeof child === 'undefined') return null;
  const { __kind: kind, ...props } = child as any;

  if (typeof child === 'string') {
    // Simple string
    return child;
  } else if (kind === 'intl' || (props.id && props.defaultMessage)) {
    // Intl object
    return <FormattedMessage {...props} />;
  } else if (props.toReact) {
    // LocalizedError, for example
    return props.toReact();
  } else if (props.message) {
    // Simple Error();
    return props.message;
  }

  console.log('Invariant: unexpected child passed to render(): ', child);
  return child;
}
