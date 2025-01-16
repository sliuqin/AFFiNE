import {
  Checkbox,
  type ConfirmModalProps,
  PropertyValue,
  useConfirmModal,
} from '@affine/component';
import { DocService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { stopPropagation } from '@affine/core/utils';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { type ChangeEvent, useCallback } from 'react';

import { useAsyncCallback } from '../../hooks/affine-async-hooks';
import * as styles from './template.css';

export const useCheckTemplateJournalConflict = (
  where: 'template' | 'journal'
) => {
  const t = useI18n();
  const journalService = useService(JournalService);
  const docService = useService(DocService);
  const { openConfirmModal } = useConfirmModal();

  const docRecord = docService.doc.record;

  const removeTemplate = useCallback(() => {
    docService.doc.record.setProperty('isTemplate', false);
  }, [docService.doc.record]);

  const removeJournal = useCallback(() => {
    journalService.removeJournalDate(docRecord.id);
  }, [journalService, docRecord.id]);

  return useCallback(
    async (checked: boolean) => {
      if (!checked) return true;

      const isJournal = journalService.journalDate$(docRecord.id).value;
      const isTemplate = docRecord.getProperties().isTemplate;

      const baseConfirmProps: ConfirmModalProps = {
        title: t['com.affine.template-journal-conflict.title'](),
        description: t['com.affine.template-journal-conflict.description'](),
        reverseFooter: true,
        cancelButtonOptions: {
          variant: 'primary',
        },
      };

      return new Promise(resolve => {
        if (where === 'template' && isJournal) {
          openConfirmModal({
            ...baseConfirmProps,
            cancelText:
              t['com.affine.template-journal-conflict.keep-journal'](),
            confirmText:
              t['com.affine.template-journal-conflict.set-template'](),
            onConfirm: () => {
              removeJournal();
              resolve(true);
            },
            onCancel: () => resolve(false),
          });
        } else if (where === 'journal' && isTemplate) {
          openConfirmModal({
            ...baseConfirmProps,
            cancelText:
              t['com.affine.template-journal-conflict.keep-template'](),
            confirmText:
              t['com.affine.template-journal-conflict.set-journal'](),
            onConfirm: () => {
              removeTemplate();
              resolve(true);
            },
            onCancel: () => resolve(false),
          });
        } else {
          resolve(true);
        }
      });
    },
    [
      docRecord,
      journalService,
      openConfirmModal,
      removeJournal,
      removeTemplate,
      t,
      where,
    ]
  );
};

export const TemplateValue = () => {
  const docService = useService(DocService);
  const check = useCheckTemplateJournalConflict('template');

  const isTemplate = useLiveData(
    docService.doc.record.properties$.selector(p => p.isTemplate)
  );

  const handleSetTemplate = useAsyncCallback(
    async (v: boolean) => {
      if (!(await check(v))) return;
      docService.doc.record.setProperty('isTemplate', v);
    },
    [check, docService.doc.record]
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleSetTemplate(e.target.checked);
    },
    [handleSetTemplate]
  );

  const toggle = useCallback(() => {
    handleSetTemplate(!isTemplate);
  }, [handleSetTemplate, isTemplate]);

  return (
    <PropertyValue className={styles.property} onClick={toggle}>
      <Checkbox
        onClick={stopPropagation}
        data-testid="toggle-template-checkbox"
        checked={!!isTemplate}
        onChange={onChange}
        className={styles.checkbox}
      />
    </PropertyValue>
  );
};
