import { useRef, useState } from 'react';
import { AddRow } from '../components/AddRow';
import { Button } from '../components/Button';
import { EditableName } from '../components/EditableCell';
import { Panel } from '../components/Panel';
import { es, plural } from '../i18n/es';
import { formatDate } from '../lib/history';
import { formatEUR, parseAmount, toEditableString } from '../lib/money';
import { seedCount } from '../lib/seed';
import { exportJson, importJson } from '../lib/storage';
import { countCategoryUse, countRoomUse, labelOf } from '../lib/taxonomy';
import type { Store } from '../state/store';
import type { Taxon } from '../types';
import { FALLBACK_CATEGORY, FALLBACK_ROOM, SITUACIONES } from '../types';

/**
 * The bin. A category delete re-files rows across every scenario, so it gets a
 * heavier affordance than the `×` that removes a single line from the grid —
 * the glyph is doing the warning that the confirm then spells out.
 */
function BinIcon() {
  return (
    <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M2.5 3.5h9M5.5 3.5V2.2h3v1.3M3.6 3.5l.5 8.1h5.8l.5-8.1M6 5.8v3.6M8 5.8v3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TaxonomyProps {
  taxa: Taxon[];
  /** The undeletable one — every removal re-files onto it. */
  fallbackId: string;
  /** How many entries, across every scenario, are filed under this taxon. */
  countOf: (id: string) => number;
  /** Singular / plural of what it holds: conceptos for categories, artículos for rooms. */
  nounOne: string;
  nounMany: string;
  addLabel: string;
  newLabel: string;
  deleteLabel: string;
  /** Stable accessible name for the label inputs — the label itself can be emptied. */
  inputLabel: string;
  onRename: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onAdd: (label: string) => void;
}

/**
 * One editable list. Both axes are the same widget with different words, which
 * is also the promise the feature makes: whatever you can do to a category you
 * can do to a room.
 */
function TaxonomyEditor({
  taxa,
  fallbackId,
  countOf,
  nounOne,
  nounMany,
  addLabel,
  newLabel,
  deleteLabel,
  inputLabel,
  onRename,
  onRemove,
  onAdd,
}: TaxonomyProps) {
  const confirmRemove = (taxon: Taxon) => {
    const count = countOf(taxon.id);
    if (count > 0) {
      const moved = count === 1 ? es.ajustes.confirmDeleteMovedOne : es.ajustes.confirmDeleteMovedMany;
      const question =
        `${es.ajustes.confirmDeletePrefix} «${taxon.label}»? ` +
        `${count} ${plural(count, nounOne, nounMany)} ${moved} «${labelOf(taxa, fallbackId)}». ` +
        es.ajustes.confirmDeleteSafe;
      if (!window.confirm(question)) return;
    }
    onRemove(taxon.id);
  };

  return (
    <>
      <div className="taxlist">
        {taxa.map((taxon) => {
          const locked = taxon.id === fallbackId;
          const count = countOf(taxon.id);
          return (
            <div className="taxrow" key={taxon.id}>
              <input
                className="fin"
                value={taxon.label}
                aria-label={inputLabel}
                onChange={(event) => onRename(taxon.id, event.target.value)}
              />
              <span className="taxuse">
                {count === 0
                  ? es.ajustes.taxonUnused
                  : `${count} ${plural(count, nounOne, nounMany)}`}
              </span>
              <button
                type="button"
                className="taxbin"
                disabled={locked}
                aria-label={deleteLabel}
                title={locked ? es.ajustes.taxonFallback : deleteLabel}
                onClick={() => confirmRemove(taxon)}
              >
                <BinIcon />
              </button>
            </div>
          );
        })}
      </div>
      <AddRow label={addLabel} onClick={() => onAdd(newLabel)} />
    </>
  );
}

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
              <EditableName
                value={scenario.name}
                ariaLabel={es.ajustes.scenarioName}
                onCommit={(name) => store.renameScenario(scenario.id, name)}
              />
              <span className="fhint">{es.ajustes.scenarioNameHint}</span>
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

      {/* A blank scenario is the default now, so the checklist has to be
          somewhere findable — and it says how many rows it is about to add. */}
      <Panel
        label={es.ajustes.panelStart}
        body={
          <div className="field">
            <span className="flab">{es.ajustes.checklistTitle}</span>
            <span className="fhint">{es.ajustes.checklistHint}</span>
            <div className="row-actions" style={{ marginTop: 4 }}>
              <Button
                onClick={() => {
                  const rows = seedCount();
                  const question = `${es.ajustes.checklistConfirmPrefix} ${rows} ${es.ajustes.checklistConfirmSuffix}`;
                  if (window.confirm(question)) {
                    store.loadChecklist();
                    setMessage(es.ajustes.checklistDone);
                  }
                }}
              >
                {es.ajustes.checklistButton} · {seedCount()}
              </Button>
            </div>
            <span className="fhint">{es.ajustes.checklistNote}</span>
          </div>
        }
      />

      {/* The hint goes in `children` rather than `body`: Panel renders body
          last, and an explanation under the list it explains reads backwards. */}
      <Panel label={es.ajustes.panelCategories} actions={<span>{state.categories.length}</span>}>
        <div className="pb field">
          <span className="fhint">{es.ajustes.categoriesHint}</span>
          <span className="fhint">{es.ajustes.taxonFallbackHint}</span>
        </div>
        <TaxonomyEditor
          taxa={state.categories}
          fallbackId={FALLBACK_CATEGORY}
          countOf={(id) => countCategoryUse(state.scenarios, id)}
          nounOne={es.costes.totalConcept}
          nounMany={es.costes.totalConcepts}
          addLabel={es.ajustes.categoryAdd}
          newLabel={es.ajustes.categoryNew}
          deleteLabel={es.ajustes.deleteCategory}
          inputLabel={es.costes.colCategory}
          onRename={store.renameCategory}
          onRemove={store.removeCategory}
          onAdd={store.addCategory}
        />
      </Panel>

      <Panel label={es.ajustes.panelRooms} actions={<span>{state.rooms.length}</span>}>
        <div className="pb field">
          <span className="fhint">{es.ajustes.roomsHint}</span>
        </div>
        <TaxonomyEditor
          taxa={state.rooms}
          fallbackId={FALLBACK_ROOM}
          countOf={(id) => countRoomUse(state.scenarios, id)}
          nounOne={es.muebles.article}
          nounMany={es.muebles.articles}
          addLabel={es.ajustes.roomAdd}
          newLabel={es.ajustes.roomNew}
          deleteLabel={es.ajustes.deleteRoom}
          inputLabel={es.muebles.panel}
          onRename={store.renameRoom}
          onRemove={store.removeRoom}
          onAdd={store.addRoom}
        />
      </Panel>

      <Panel
        label={es.ajustes.panelData}
        tone="blue"
        body={
          <div className="field">
            <span className="flab">{es.ajustes.exportTitle}</span>
            <span className="fhint">{es.ajustes.exportHint}</span>
            {/* The JSON is not a convenience, it is the only copy that exists.
                Saying so quietly, in the amber box, is the whole backup story. */}
            <div className="callout" style={{ marginTop: 4 }}>
              <div className="cl">{es.ajustes.backupTitle}</div>
              <p>{es.ajustes.backupNote}</p>
            </div>
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
