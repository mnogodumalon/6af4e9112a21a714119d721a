import { useMemo, useState } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { IconAlertTriangle, IconFileUpload, IconFileText, IconDatabase, IconPlus } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { MkkAngebotmanager } from '@/types/app';
import { dateFnsLocale, appLabel, fieldLabel, tx } from '@/i18n';
import { useClock, gruss, namen } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCardRow, StatCard } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';

type Parsed = {
  state: 'ok' | 'empty' | 'invalid';
  nummer?: string;
  absender?: string;
  empfaenger?: string;
  ort?: string;
  artikel: number;
  kahelit: boolean;
};

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined;
}

function parseResult(raw: string | undefined): Parsed {
  const base: Parsed = { state: 'empty', artikel: 0, kahelit: false };
  if (!raw || !raw.trim()) return base;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') return { ...base, state: 'invalid' };
    return {
      state: 'ok',
      nummer: str(j.nummer),
      absender: str(j.anfrageabsender?.bezeichnung),
      empfaenger: str(j.anfrageempfaenger?.bezeichnung),
      ort: str(j.lieferanschrift?.ort),
      artikel: Array.isArray(j.artikel) ? j.artikel.length : 0,
      kahelit: j.kahelit === 1 || j.kahelit === '1' || j.kahelit === true,
    };
  } catch {
    return { ...base, state: 'invalid' };
  }
}

function csvRows(s: string | undefined): number {
  if (!s) return 0;
  const lines = s.split(/\r?\n/).filter(l => l.trim());
  return Math.max(0, lines.length - 1);
}

type Filter = 'all' | 'heute' | 'kahelit';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { stammdaten, mkkAngebotmanager } = data;
  const crud = useEntityCrud(data);
  // WHAT THIS PAGE MAY WRITE ITSELF: nothing — this page only shows.
  const clock = useClock();
  const [filter, setFilter] = useState<Filter>('all');

  const anfragen = useMemo(
    () => [...mkkAngebotmanager]
      .sort((a, b) => (b.createdat || '').localeCompare(a.createdat || ''))
      .map(r => ({ rec: r, p: parseResult(r.fields.ergebnis_json) })),
    [mkkAngebotmanager],
  );

  const safeDate = (s: string | undefined) => {
    try { return s ? parseISO(s) : null; } catch { return null; }
  };

  const offen = anfragen.filter(a => a.p.state !== 'ok');
  const heute = anfragen.filter(a => {
    const d = safeDate(a.rec.createdat);
    return d ? isSameDay(d, clock) : false;
  });
  const kahelit = anfragen.filter(a => a.p.kahelit);

  const shown = anfragen.filter(a =>
    filter === 'heute' ? heute.includes(a)
      : filter === 'kahelit' ? a.p.kahelit
        : true,
  );

  const stamm = useMemo(
    () => [...stammdaten].sort((a, b) => (b.updatedat || b.createdat || '').localeCompare(a.updatedat || a.createdat || ''))[0] as typeof stammdaten[number] | undefined,
    [stammdaten],
  );

  const stammLists = stamm ? [
    { key: 'kunden_csv' as const, rows: csvRows(stamm.fields.kunden_csv) },
    { key: 'ansprechpartner_csv' as const, rows: csvRows(stamm.fields.ansprechpartner_csv) },
    { key: 'artikel_csv' as const, rows: csvRows(stamm.fields.artikel_csv) },
    { key: 'lieferanschriften_csv' as const, rows: csvRows(stamm.fields.lieferanschriften_csv) },
  ] : [];
  const stammMissing = stammLists.filter(l => l.rows === 0);
  const stammDate = stamm ? safeDate(stamm.updatedat || stamm.createdat) : null;
  const stammAge = stammDate ? Math.floor((clock.getTime() - stammDate.getTime()) / 86400000) : null;

  const label = (a: { rec: MkkAngebotmanager; p: Parsed }) =>
    a.p.absender ?? a.rec.fields.pk_id ?? tx('Anfrage ohne Auswertung');

  const dateOf = (r: MkkAngebotmanager) => {
    const d = safeDate(r.createdat);
    return d ? format(d, 'dd.MM.yyyy HH:mm', { locale: dateFnsLocale() }) : '—';
  };

  const first = offen[0];
  const contextLine = (() => {
    if (anfragen.length === 0) return tx('Lade die erste Kundenanfrage hoch — die Auswertung startet beim Speichern.');
    if (offen.length > 0) {
      const names = namen(offen.map(label));
      return offen.length === 1
        ? tx`${names} wartet noch auf eine Auswertung.`
        : tx`${names} warten noch auf eine Auswertung.`;
    }
    const latest = anfragen[0];
    return tx`Alle Anfragen sind ausgewertet — zuletzt ${label(latest)}.`;
  })();

  const canCreate = crud.mkkAngebotmanager.canWrite;

  const hero = first ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{ label: tx('Anfrage prüfen'), onClick: () => crud.mkkAngebotmanager.openDetail(first.rec) }}
    >
      {offen.length === 1
        ? tx`${label(first)} hat noch kein Ergebnis — Auswertung von Hand neu auslösen.`
        : tx`${offen.length} Anfragen ohne Ergebnis, zuerst ${label(first)} — Auswertung von Hand neu auslösen.`}
    </HeroBanner>
  ) : undefined;

  const kpis = (
    <StatCardRow>
      <StatCard
        title={tx('Heute eingegangen')}
        value={heute.length}
        description={heute.length > 0 ? namen(heute.map(label)) : tx('Noch nichts Neues heute')}
        icon={<IconFileUpload size={18} className="text-muted-foreground" />}
        onClick={() => setFilter(f => (f === 'heute' ? 'all' : 'heute'))}
        active={filter === 'heute'}
      />
      <StatCard
        title={tx('Kahelit-Anfragen')}
        value={kahelit.length}
        description={kahelit.length > 0 ? tx('Euroquarz mit festem Absender') : tx('Keine Kahelit-Anfrage')}
        icon={<IconFileText size={18} className="text-muted-foreground" />}
        onClick={() => setFilter(f => (f === 'kahelit' ? 'all' : 'kahelit'))}
        active={filter === 'kahelit'}
      />
      {stamm && (
        <StatCard
          title={tx('Stammdaten-Stand')}
          value={stammAge === null ? '—' : stammAge === 0 ? tx('Heute') : tx`vor ${stammAge} Tagen`}
          description={stammMissing.length > 0 ? tx`${stammMissing.length} Liste(n) leer` : tx('Alle vier Listen gefüllt')}
          icon={<IconDatabase size={18} className="text-muted-foreground" />}
          tone={stammMissing.length > 0 ? 'warning' : 'default'}
          onClick={() => crud.stammdaten.openEdit(stamm)}
        />
      )}
    </StatCardRow>
  );

  const primary = (
    <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b">
        <h2 className="font-semibold tracking-tight">{tx('Neueste Anfragen')}</h2>
        {canCreate && (
          <Button size="sm" onClick={() => crud.mkkAngebotmanager.openCreate({})}>
            <IconPlus size={16} className="shrink-0" />
            <span>{tx('Anfrage hochladen')}</span>
          </Button>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
          <IconFileUpload size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="text-sm text-muted-foreground max-w-sm">
            {anfragen.length === 0
              ? tx('Noch keine Anfrage. Lade eine PDF, ein Bild oder einen E-Mail-Text hoch.')
              : tx('Keine Anfrage in dieser Auswahl.')}
          </p>
          {anfragen.length === 0 && canCreate && (
            <Button onClick={() => crud.mkkAngebotmanager.openCreate({})}>{tx('Erste Anfrage hochladen')}</Button>
          )}
        </div>
      ) : (
        <ul className="divide-y">
          {shown.slice(0, 12).map(a => (
            <li key={a.rec.record_id}>
              <button
                type="button"
                onClick={() => crud.mkkAngebotmanager.openDetail(a.rec)}
                className="w-full text-left px-5 py-3 hover:bg-muted/50 transition-colors flex flex-wrap items-start justify-between gap-x-4 gap-y-1"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{label(a)}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {a.p.state === 'ok' ? (
                      <>
                        {a.p.nummer ? `${tx('Nr.')} ${a.p.nummer}` : fieldLabel('mkk_angebotmanager', 'ergebnis_json')}
                        {a.p.empfaenger ? ` → ${a.p.empfaenger}` : ''}
                        {a.p.ort ? ` · ${a.p.ort}` : ''}
                        {` · ${a.p.artikel} ${a.p.artikel === 1 ? tx('Position') : tx('Positionen')}`}
                      </>
                    ) : (
                      <span className={a.p.state === 'invalid' ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                        {a.p.state === 'invalid' ? tx('Ergebnis unlesbar') : tx('Noch kein Ergebnis')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-2">
                  {a.p.kahelit && <span className="font-medium text-primary">Kahelit</span> /* i18n-exempt */}
                  <span>{dateOf(a.rec)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const aside = (
    <WorkList
      title={appLabel('stammdaten')}
      items={stamm ? stammLists.map(l => ({
        id: l.key,
        title: fieldLabel('stammdaten', l.key),
        secondLine: l.rows === 0
          ? <span className="font-medium text-amber-600">{tx('Leer — bitte befüllen')}</span>
          : <span className="text-muted-foreground">{tx`${l.rows} Zeilen`}</span>,
        action: crud.stammdaten.canWrite ? { label: tx('Pflegen'), onClick: () => crud.stammdaten.openEdit(stamm) } : undefined,
      })) : []}
      onItemClick={() => { if (stamm) crud.stammdaten.openDetail(stamm); }}
      empty={{
        text: tx('Noch keine Stammdaten — ohne sie findet die Auswertung keine Kunden und Artikel.'),
        action: crud.stammdaten.canWrite ? { label: tx('Stammdaten anlegen'), onClick: () => crud.stammdaten.openCreate({}) } : undefined,
      }}
    />
  );

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
        <p className="text-muted-foreground">{contextLine}</p>
      </div>
      <DashboardGrid variant="split" hero={hero} kpis={kpis} aside={aside} primary={primary} />
      {crud.surfaces}
    </div>
  );
}
