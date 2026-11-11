import type { Stammdaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface StammdatenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Stammdaten;
}

export function StammdatenDetails({
  record,
}: StammdatenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('stammdaten', 'kunden_csv')} value={record.fields.kunden_csv} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('stammdaten', 'ansprechpartner_csv')} value={record.fields.ansprechpartner_csv} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('stammdaten', 'artikel_csv')} value={record.fields.artikel_csv} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('stammdaten', 'lieferanschriften_csv')} value={record.fields.lieferanschriften_csv} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.STAMMDATEN} recordId={record.record_id} readOnly={!perms.canWrite('stammdaten')} />
    </>
  );
}
