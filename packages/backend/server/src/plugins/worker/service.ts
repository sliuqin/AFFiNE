import { Injectable } from '@nestjs/common';

import { Config, OnEvent, URLHelper } from '../../base';
import { fixUrl, OriginRules } from './utils';

@Injectable()
export class WorkerService {
  allowedOrigins: OriginRules = [this.url.origin];
  webContainerSecret: string = 'default-web-container-secret';

  constructor(
    private readonly config: Config,
    private readonly url: URLHelper
  ) {}

  @OnEvent('config.init')
  onConfigInit() {
    this.allowedOrigins = [
      ...this.config.worker.allowedOrigin
        .map(u => fixUrl(u)?.origin as string)
        .filter(v => !!v),
      this.url.origin,
    ];
    this.webContainerSecret = this.config.worker.webContainerSecret;
  }

  @OnEvent('config.changed')
  onConfigChanged(event: Events['config.changed']) {
    if ('worker' in event.updates) {
      this.onConfigInit();
    }
  }
}
