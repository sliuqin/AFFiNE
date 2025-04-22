import { WorkspaceServerService } from '@affine/core/modules/cloud';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { DatabaseConfigExtension } from '@blocksuite/affine/blocks/database';
import { ToolbarMoreMenuConfigExtension } from '@blocksuite/affine/components/toolbar';
import { EditorSettingExtension } from '@blocksuite/affine/shared/services';
import type { ExtensionType } from '@blocksuite/affine/store';
import { LinkedWidgetConfigExtension } from '@blocksuite/affine/widgets/linked-doc';
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
    EditorSettingExtension({
      // eslint-disable-next-line rxjs/finnish
      setting$: editorSettingService.editorSetting.settingSignal,
      set: (k, v) => editorSettingService.editorSetting.set(k, v),
    }),
    DatabaseConfigExtension(createDatabaseOptionsConfig(framework)),
    LinkedWidgetConfigExtension(createLinkedWidgetConfig(framework)),
    ToolbarMoreMenuConfigExtension(createToolbarMoreMenuConfig(framework)),

    createCustomToolbarExtension(editorSettingService.editorSetting, baseUrl),
  ].flat();
}
