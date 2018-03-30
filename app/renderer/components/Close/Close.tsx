import * as React from 'react';

const s = require('./Close.css');

export default class Close extends React.Component<{ [key: string]: any }> {
  constructor(props: any) {
    super(props);

    this.esc = this.esc.bind(this);
  }

  esc(event: any) {
    if (event.keyCode !== 27) return;
    if (this.props.onClick) this.props.onClick(event);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.esc, false);
  }

  componentWillUnmount() {
    document.removeEventListener('keyup', this.esc);
  }

  render() {
    return (
      <div className={s.root} {...this.props} >
        <div className={s.button}>
          <svg viewBox="0 0 12 12" name="Close" width="18" height="18">
            <g fill="none" fillRule="evenodd">
              <path d="M0 0h12v12H0" />
              <path
                className="fill"
                fill="#dcddde"
                d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6"
              />
            </g>
          </svg>
        </div>
        <div className={s.text}>ESC</div>
      </div>
    );
  }
}
