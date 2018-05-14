import * as React from 'react';
import * as cx from 'classnames';

export type DropdownProps = {
  isOpened: boolean;
  children: React.ReactChild;
  onToggled: () => void;
  childRef: Element;
};

const s = require('./Dropdown.css');

export default class Dropdown extends React.Component<DropdownProps> {
  element: any;

  constructor(props: DropdownProps) {
    super(props);

    this.clickHandler = this.clickHandler.bind(this);
  }

  componentWillReceiveProps(nextProps: DropdownProps) {
    if (this.props.isOpened !== nextProps.isOpened) {
      if (nextProps.isOpened) {
        this.mountClick();
      } else this.unmountClick()
    }
  }

  componentWillUnmount() {
    this.unmountClick();
  }

  clickHandler(event: any) {
    const wrapper = this.element;
    const button = this.props.childRef;

    console.log('btn: ', button);
    if (
      !wrapper.contains(event.target) &&
      (!button || !button.contains(event.target))
    ) {
      this.props.onToggled();
    }
  }

  mountClick() {
    document.body.addEventListener('click', this.clickHandler);
  }

  unmountClick() {
    document.body.removeEventListener('click', this.clickHandler);
  }

  render() {
    const { children, isOpened } = this.props;

    return (
      <div className={cx(s.root, isOpened && s.opened)} ref={(ref) => (this.element = ref)}>
        <div className={s.menu}>{children}</div>
      </div>
    );
  }
}
