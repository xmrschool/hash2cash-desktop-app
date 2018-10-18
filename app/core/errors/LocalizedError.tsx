import * as React from 'react';
import { FormattedMessage } from 'react-intl';

let intl: any;
if (process.env.NODE_ENV !== 'test') {
  intl = require('../../renderer/intl').intl;
}
interface IMessageDescriptor {
  id: string;
  description?: string;
  defaultMessage?: string;
}

export default class LocalizedError extends Error {
  descriptor: IMessageDescriptor;

  constructor(descriptor: IMessageDescriptor) {
    super(descriptor.defaultMessage || descriptor.id);

    this.descriptor = descriptor;
    this.stack = (new Error).stack;
  }

  toReact() {
    return <FormattedMessage {...this.descriptor} />
  }

  unformattedMessage() {
    return this.descriptor.defaultMessage || this.descriptor.id;
  }

  toMessage() {
    if (intl) {
      return intl.formatMessage(this.descriptor);
    }

    return this.unformattedMessage();
  }
}