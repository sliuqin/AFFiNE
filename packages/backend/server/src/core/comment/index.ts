import { Module } from '@nestjs/common';

import { PermissionModule } from '../permission';
import { CommentResolver } from './resolver';

@Module({
  imports: [PermissionModule],
  providers: [CommentResolver],
  // exports: [CommentService],
})
export class CommentModule {}
