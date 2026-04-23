import type React from 'react';

type AltchaWidgetProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement> & {
    auto?: 'off' | 'onload' | 'onsubmit';
    challenge?: string;
    configuration?: string;
    type?: 'checkbox' | 'switch' | 'native';
  },
  HTMLElement
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': AltchaWidgetProps;
    }
  }
}

export {};
