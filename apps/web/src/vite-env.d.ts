/// <reference types="vite/client" />

declare global {
  interface Window {
    __WORKBITS_READY__?: boolean;
  }
}

export {};
