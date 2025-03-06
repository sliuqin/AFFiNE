import { OnEvent, Service } from '@toeverything/infra';

import type { Editor } from '../../editor';
import { EditorInitialized } from '../../editor/events';
import type { WorkspaceServerService } from './workspace-server';

@OnEvent(EditorInitialized, i => i.onEditorInitialized)
export class EditorUserCursorLabelService extends Service {
  constructor(private readonly workspaceServerService: WorkspaceServerService) {
    super();
  }

  onEditorInitialized(editor: Editor) {
    if (this.workspaceServerService.server) {
      const subscription =
        this.workspaceServerService.server.account$.subscribe(account => {
          editor.doc.blockSuiteDoc.awarenessStore.awareness.setLocalStateField(
            'user',
            {
              name: account?.label,
            }
          );
        });
      this.disposables.push(() => subscription.unsubscribe());
    }
  }
}
