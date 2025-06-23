import { defineModuleConfig } from '../../base';

export interface WorkerStartupConfigurations {
  allowedOrigin: string[];
  webContainerSecret: string;
}

declare global {
  interface AppConfigSchema {
    worker: {
      allowedOrigin: ConfigItem<string[]>;
      webContainerSecret: ConfigItem<string>;
    };
  }
}

defineModuleConfig('worker', {
  allowedOrigin: {
    desc: 'Allowed origin',
    default: ['localhost', '127.0.0.1'],
  },
  webContainerSecret: {
    desc: 'Secret key for web container HMAC signatures',
    default: 'default-web-container-secret',
  },
});
