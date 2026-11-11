// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Stammdaten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kunden_csv?: string;
    ansprechpartner_csv?: string;
    artikel_csv?: string;
    lieferanschriften_csv?: string;
  };
}

export interface MkkAngebotmanager {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    pk_id?: string;
    anfrage_datei?: string;
    ergebnis_json?: string;
  };
}

export const APP_IDS = {
  STAMMDATEN: '6af4e8fd90dae08976f48f13',
  MKK_ANGEBOTMANAGER: '6af4e90279ac2f1d03b2cce8',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'stammdaten': {
    'kunden_csv': 'string/textarea',
    'ansprechpartner_csv': 'string/textarea',
    'artikel_csv': 'string/textarea',
    'lieferanschriften_csv': 'string/textarea',
  },
  'mkk_angebotmanager': {
    'pk_id': 'string/text',
    'anfrage_datei': 'file',
    'ergebnis_json': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateStammdaten = StripLookup<Stammdaten['fields']>;
export type CreateMkkAngebotmanager = StripLookup<MkkAngebotmanager['fields']>;