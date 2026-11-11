/**
 * Anfrage hochladen — 2-Schritt-Wizard.
 * Steps: 1) Anfrage-Datei hochladen → 2) Prüfen & speichern; danach Erfolgsseite mit Datei und Ergebnis_Json.
 * Reads: nichts. Writes: mkk_angebotmanager (Anfrage_Datei; Ergebnis_Json setzt das Werkzeug anfrage-auswerten).
 * Composes: IntentWizardShell, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useAnfrageHochladenFlow } from '@/lib/journey/flows/AnfrageHochladen';
import { tx } from '@/i18n';

export default function AnfrageHochladenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnfrageHochladenFlow({
    steps: { anfrage_datei: 1 },
    messages: { anfrage_datei: tx('Bitte zuerst eine Anfrage-Datei hochladen.') },
  });

  const ergebnis = flow.submit.result ? fieldText(flow.submit.result.primary, 'ergebnis_json') : '';

  return (
    <IntentWizardShell
      title={tx('Anfrage hochladen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Lege eine Kundenanfrage im Angebotmanager ab.'),
        needs: [tx('Die Anfrage als PDF, Bild oder Textdatei')],
      }}
    >
      <WizardStep label={tx('Anfrage-Datei')} description={tx('Lade die Kundenanfrage als Datei hoch.')}>
        <div className="space-y-4">
          <Bound form={flow.forms.mkk_angebotmanager} name="anfrage_datei" />
          <StepNav hideBack onNext={() => flow.validateStep(1)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            confirmLabel={tx('Anfrage speichern')}
            whatHappensNext={tx('Die Anfrage wird automatisch ausgewertet. Das Ergebnis erscheint danach am Datensatz.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          title={tx('Anfrage gespeichert')}
          whatHappensNext={
            ergebnis ? (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-xs">{ergebnis}</pre>
            ) : (
              tx('Die Auswertung läuft. Ergebnis_Json erscheint in Kürze am Datensatz.')
            )
          }
          next={[{ label: tx('Zum Dashboard'), href: '#/' }]}
        />
      )}
    </IntentWizardShell>
  );
}
