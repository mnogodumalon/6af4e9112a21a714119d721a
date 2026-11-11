/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'stammdaten'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.stammdaten.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.stammdaten.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.stammdaten.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.stammdaten              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   stammdaten: kunden_csv, ansprechpartner_csv, artikel_csv, lieferanschriften_csv
 *   mkk_angebotmanager: pk_id, anfrage_datei, ergebnis_json
 */
import { useState, type ReactNode } from 'react';
import type { Stammdaten, MkkAngebotmanager } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { StammdatenDialog, type StammdatenDialogDefaults } from '@/components/dialogs/StammdatenDialog';
import { StammdatenDetails } from '@/components/details/StammdatenDetails';
import { MkkAngebotmanagerDialog, type MkkAngebotmanagerDialogDefaults } from '@/components/dialogs/MkkAngebotmanagerDialog';
import { MkkAngebotmanagerDetails } from '@/components/details/MkkAngebotmanagerDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'stammdaten'; record: Stammdaten }
  | { type: 'mkkAngebotmanager'; record: MkkAngebotmanager };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  stammdaten: EntityCrudApi<Stammdaten, StammdatenDialogDefaults>;
  mkkAngebotmanager: EntityCrudApi<MkkAngebotmanager, MkkAngebotmanagerDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { stammdaten: Stammdaten[]; mkkAngebotmanager: MkkAngebotmanager[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [stammdatenDialog, setStammdatenDialog] = useState<{ defaults?: StammdatenDialogDefaults; editing?: Stammdaten } | null>(null);
  const [mkkAngebotmanagerDialog, setMkkAngebotmanagerDialog] = useState<{ defaults?: MkkAngebotmanagerDialogDefaults; editing?: MkkAngebotmanager } | null>(null);

  function detailStammdaten(record: Stammdaten, push = false) {
    const item: OverlayItem = { type: 'stammdaten', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitStammdaten(fields: Stammdaten['fields']) {
    const editing = stammdatenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setStammdaten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateStammdatenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('stammdaten')} — ${t('crud_updated')}`, async () => {
        data.setStammdaten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateStammdatenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createStammdatenEntry(fields);
      undoToast(`${appLabel('stammdaten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailMkkAngebotmanager(record: MkkAngebotmanager, push = false) {
    const item: OverlayItem = { type: 'mkkAngebotmanager', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitMkkAngebotmanager(fields: MkkAngebotmanager['fields']) {
    const editing = mkkAngebotmanagerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setMkkAngebotmanager(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateMkkAngebotmanagerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('mkk_angebotmanager')} — ${t('crud_updated')}`, async () => {
        data.setMkkAngebotmanager(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateMkkAngebotmanagerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createMkkAngebotmanagerEntry(fields);
      undoToast(`${appLabel('mkk_angebotmanager')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <StammdatenDialog
        open={stammdatenDialog !== null}
        onClose={() => setStammdatenDialog(null)}
        onSubmit={submitStammdaten}
        defaultValues={stammdatenDialog?.defaults}
        recordId={stammdatenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Stammdaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Stammdaten']}
      />
      <MkkAngebotmanagerDialog
        open={mkkAngebotmanagerDialog !== null}
        onClose={() => setMkkAngebotmanagerDialog(null)}
        onSubmit={submitMkkAngebotmanager}
        defaultValues={mkkAngebotmanagerDialog?.defaults}
        recordId={mkkAngebotmanagerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['MkkAngebotmanager']}
        enablePhotoLocation={AI_PHOTO_LOCATION['MkkAngebotmanager']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'stammdaten') {
            return (
              <>
                <RecordHeader title={appLabel('stammdaten')} subtitle={undefined} />
                <StammdatenDetails
                  record={top.record}
                />
              </>
            );
          }
          if (top.type === 'mkkAngebotmanager') {
            return (
              <>
                <RecordHeader title={top.record.fields.pk_id ?? appLabel('mkk_angebotmanager')} subtitle={undefined} />
                <MkkAngebotmanagerDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'stammdaten') return perms.canWrite('stammdaten');
          if (top.type === 'mkkAngebotmanager') return perms.canWrite('mkk_angebotmanager');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'stammdaten') setStammdatenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'mkkAngebotmanager') setMkkAngebotmanagerDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    stammdaten: {
      openCreate: (defaults?: StammdatenDialogDefaults) => (perms.canWrite('stammdaten') ? setStammdatenDialog({ defaults }) : refuse()),
      openEdit: (record: Stammdaten) => (perms.canWrite('stammdaten') ? setStammdatenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Stammdaten) => detailStammdaten(record, false),
      canWrite: perms.canWrite('stammdaten'),
    },
    mkkAngebotmanager: {
      openCreate: (defaults?: MkkAngebotmanagerDialogDefaults) => (perms.canWrite('mkk_angebotmanager') ? setMkkAngebotmanagerDialog({ defaults }) : refuse()),
      openEdit: (record: MkkAngebotmanager) => (perms.canWrite('mkk_angebotmanager') ? setMkkAngebotmanagerDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: MkkAngebotmanager) => detailMkkAngebotmanager(record, false),
      canWrite: perms.canWrite('mkk_angebotmanager'),
    },
    enriched: { stammdaten: data.stammdaten, mkkAngebotmanager: data.mkkAngebotmanager },
  };
}
