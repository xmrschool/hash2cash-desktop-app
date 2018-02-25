import * as React from 'react';
import { Line } from 'progressbar.js';

export type Props = {
  step: number;
  text?: string;
  [name: string]: any;
};

export default class ProgressBar extends React.Component<Props> {
  bar: any;

  componentDidMount() {
    this.bar = new Line(document.getElementById('init-circle'), {
      strokeWidth: 2,
      easing: 'easeInOut',
      duration: 1000,
      color: '#fecb16',
      trailColor: '#eee',
      trailWidth: 1,
      svgStyle: { width: '100%', height: '100%' },
      text: {
        style: {
          // Text color.
          // Default: same as stroke color (options.color)
          color: '#fff',
          position: 'absolute',
          right: '0',
          top: '30px',
          padding: 0,
          margin: 0,
          transform: null,
        },
        autoStyleContainer: false,
      },
      from: { color: '#FFEA82' },
      to: { color: '#ED6A5A' },
    });
  }

  componentWillReceiveProps(nextProps: Props) {
    const { step, text } = nextProps;

    if (text !== this.props.text) {
      this.bar.setText(text);
    }

    if (step !== this.props.step) {
      this.bar.animate(step);
      if (!text) this.bar.setText(Math.round(step * 100) + ' %');
    }
  }
  render() {
    const { step, text, ...props } = this.props;
    return <div id="init-circle" {...props} />;
  }
}
