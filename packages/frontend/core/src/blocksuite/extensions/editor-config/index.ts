import { WorkspaceServerService } from '@affine/core/modules/cloud';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import {
  DatabaseConfigExtension,
  EditorSettingExtension,
  RootBlockConfigExtension,
  ToolbarMoreMenuConfigExtension,
} from '@blocksuite/affine/blocks';
import type { ExtensionType } from '@blocksuite/affine/store';
import type { FrameworkProvider } from '@toeverything/infra';

import { createDatabaseOptionsConfig } from './database';
import { createLinkedWidgetConfig } from './linked';
import {
  createCustomToolbarExtension,
  createToolbarMoreMenuConfig,
} from './toolbar';

export function getEditorConfigExtension(
  framework: FrameworkProvider
): ExtensionType[] {
  const editorSettingService = framework.get(EditorSettingService);
  const workspaceServerService = framework.get(WorkspaceServerService);
  const baseUrl = workspaceServerService.server?.baseUrl ?? location.origin;

  return [
    EditorSettingExtension(editorSettingService.editorSetting.settingSignal),
    DatabaseConfigExtension(createDatabaseOptionsConfig(framework)),
    RootBlockConfigExtension({
      linkedWidget: createLinkedWidgetConfig(framework),
    }),
    ToolbarMoreMenuConfigExtension(createToolbarMoreMenuConfig(framework)),

    createCustomToolbarExtension(baseUrl),
  ].flat();
}
