import type { Key } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: Key | null;
    }
  }
}

export {};