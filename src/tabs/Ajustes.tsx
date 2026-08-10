import { useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { es } from '../i18n/es';
import { formatDate } from '../lib/history';
import { formatEUR, parseAmount, toEditableString } from '../lib/money';
import { exportJson, importJson } from '../lib/storage';
import type { Store } from '../state/store';
import { SITUACIONES } from '../types';

export function Ajustes({ store }: { store: Store }) {
  const { scenario, state, derived } = store;
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportJson(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movingout-${scenario.createdAt}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = (file: File) => {
    void file.text().then(
      (text) => {
        try {
          store.replaceAll(importJson(text));
          setMessage(es.ajustes.importOk);
        } catch {
          setMessage(es.ajustes.importError);
        }
      },
      () => setMessage(es.ajustes.importError),
    );
  };

  return (
    <div className="stack">
      <Panel
        label={es.ajustes.panelNumbers}
        actions={
          <span>
            {es.ajustes.createdOn} {formatDate(scenario.createdAt)}
          </span>
        }
        body={
          <div className="fields">
            <label className="field">
              <span className="flab">{es.ajustes.scenarioName}</span>
              <input
                className="fin"
                value={scenario.name}
                onChange={(event) => store.patchScenario({ name: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="flab">{es.ajustes.situacion}</span>
              <select
                className="fin"
                value={scenario.situacion}
                onChange={(event) =>
                  store.patchScenario({ situacion: event.target.value as typeof scenario.situacion })
                }
              >
                {SITUACIONES.map((situacion) => (
                  <option key={situacion} value={situacion}>
                    {es.situacion[situacion]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="flab">{es.ajustes.savings}</span>
              <input
                className="fin"
                defaultValue={toEditableString(scenario.savingsCents)}
                inputMode="decimal"
                onBlur={(event) => {
                  const parsed = parseAmount(event.target.value);
                  if (parsed !== null) store.patchScenario({ savingsCents: Math.abs(parsed) });
                }}
              />
              <span className="fhint">{es.ajustes.savingsHint}</span>
            </label>

            <label className="field">
              <span className="flab">{es.ajustes.bufferTarget}</span>
              <input
                className="fin"
                defaultValue={toEditableString(scenario.buffer.targetCents)}
                inputMode="decimal"
                onBlur={(event) => {
                  const parsed = parseAmount(event.target.value);
                  if (parsed !== null) {
                    store.patchScenario({ buffer: { targetCents: Math.abs(parsed) } });
                  }
                }}
              />
              <span className="fhint">{es.ajustes.bufferHint}</span>
            </label>
          </div>
        }
      />

      <Panel
        label={es.ajustes.panelApp}
        body={
          <div className="fields">
            <label className="field">
              <span className="flab">{es.ajustes.maxRent}</span>
              <input
                className="fin"
                type="number"
                min={1}
                max={100}
                value={state.settings.maxRentPercent}
                onChange={(event) =>
                  store.patchSettings({ maxRentPercent: Number(event.target.value) })
                }
              />
              <span className="fhint">
                {state.settings.maxRentPercent} {es.ajustes.percentSuffix} ·{' '}
                {formatEUR(derived.maxAffordableRentCents)}
                {es.common.perMonth}
              </span>
              <span className="fhint">{es.ajustes.maxRentHint}</span>
            </label>

            <div className="field">
              <span className="flab">{es.app.scenarioLabel}</span>
              <div className="row-actions">
                <Button
                  onClick={() => store.duplicateScenario(`${scenario.name} ${es.scenario.copySuffix}`)}
                >
                  {es.ajustes.duplicate}
                </Button>
                <Button
                  danger
                  disabled={state.scenarios.length <= 1}
                  onClick={() => {
                    if (window.confirm(es.ajustes.deleteScenarioConfirm)) {
                      store.removeScenario(scenario.id);
                    }
                  }}
                >
                  {es.ajustes.deleteScenario}
                </Button>
              </div>
              {state.scenarios.length <= 1 && (
                <span className="fhint">{es.ajustes.lastScenario}</span>
              )}
            </div>
          </div>
        }
      />

      <Panel
        label={es.ajustes.panelData}
        body={
          <div className="field">
            <span className="flab">{es.ajustes.exportTitle}</span>
            <span className="fhint">{es.ajustes.exportHint}</span>
            <div className="row-actions" style={{ marginTop: 4 }}>
              <Button variant="accent" onClick={download}>
                {es.ajustes.exportButton}
              </Button>
              <Button onClick={() => fileInput.current?.click()}>{es.ajustes.importButton}</Button>
              <Button
                danger
                onClick={() => {
                  if (window.confirm(es.ajustes.resetConfirm)) store.resetAll();
                }}
              >
                {es.ajustes.reset}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) upload(file);
                  event.target.value = '';
                }}
              />
            </div>
            {message !== null && <span className="fhint">{message}</span>}
          </div>
        }
      />
    </div>
  );
}
