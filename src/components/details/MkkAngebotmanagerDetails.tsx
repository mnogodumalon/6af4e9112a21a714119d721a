import type { MkkAngebotmanager } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { usePermissions } from '@/lib/permissions';

export interface MkkAngebotmanagerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: MkkAngebotmanager;
}

export function MkkAngebotmanagerDetails({
  record,
}: MkkAngebotmanagerDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('mkk_angebotmanager', 'pk_id')} value={record.fields.pk_id} format="text" />
        <RecordField label={fieldLabel('mkk_angebotmanager', 'anfrage_datei')} className="md:col-span-2">
          {record.fields.anfrage_datei ? (
            <MediaThumbnail src={record.fields.anfrage_datei as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('mkk_angebotmanager', 'ergebnis_json')} value={record.fields.ergebnis_json} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.MKK_ANGEBOTMANAGER} recordId={record.record_id} readOnly={!perms.canWrite('mkk_angebotmanager')} />
    </>
  );
}
