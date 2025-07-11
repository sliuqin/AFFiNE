import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { metrics } from '../../base';

@Injectable()
export class MonitorService {
  protected logger = new Logger(MonitorService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  async monitor() {
    const memoryUsage = process.memoryUsage();
    this.logger.log(
      `memory usage: rss: ${memoryUsage.rss}, heapTotal: ${memoryUsage.heapTotal}, heapUsed: ${memoryUsage.heapUsed}, external: ${memoryUsage.external}, arrayBuffers: ${memoryUsage.arrayBuffers}`
    );
    const attrs = {
      flavor: env.FLAVOR,
    };
    metrics.process.gauge('node_process_rss').record(memoryUsage.rss, attrs);
    metrics.process
      .gauge('node_process_heap_total')
      .record(memoryUsage.heapTotal, attrs);
    metrics.process
      .gauge('node_process_heap_used')
      .record(memoryUsage.heapUsed, attrs);
    metrics.process
      .gauge('node_process_external')
      .record(memoryUsage.external, attrs);
    metrics.process
      .gauge('node_process_array_buffers')
      .record(memoryUsage.arrayBuffers, attrs);
  }
}
