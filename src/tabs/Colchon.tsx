import { AddRow } from '../components/AddRow';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { es, plural } from '../i18n/es';
import { formatEUR, formatPercent } from '../lib/money';
import type { Store } from '../state/store';

/**
 * The colchón — a section of Costes, and deliberately not part of its grid.
 *
 * What is written here is **not a cost**. It has never been paid, it may never
 * be, and it is in no total anywhere in the app: not in salidas, not in the
 * balance, not in the money you need at the door. What the list does instead is
 * decide how big the cushion has to be — the target is its sum, and there is
 * nowhere else to type one (types.ts).
 *
 * It is a separate section rather than a filter over the grid because those are
 * two different acts of writing. A row in the grid is a claim that money will
 * leave; a row here is a claim that it might. Mixed into one table, sorted by
 * amount, they read identically — which is the confusion that once put 8.400 €
 * of things that had not happened into `dinero al entrar`.
 *
 * The columns say it too: `PODRÍA PASAR` and `COSTARÍA`, in the conditional,
 * against the grid's `CONCEPTO` and `IMPORTE`.
 */
export function Colchon({ store }: { store: Store }) {
  const { cushion } = store.derived;
  const { lines, targetCents, missingCount } = cushion;

  return (
    <Panel
      label={es.colchon.panel}
      tone={lines.length === 0 ? 'accent' : cushion.covered ? 'green' : 'amber'}
      actions={<span>{es.colchon.note}</span>}
    >
      {lines.length === 0 ? (
        <div className="empty-note">{es.colchon.emptyList}</div>
      ) : (
        <div className="tblwrap">
          <table className="tbl-colchon">
            <thead>
              <tr>
                <th>{es.colchon.colConcept}</th>
                <th className="r">{es.colchon.colAmount}</th>
                <th>{es.colchon.colNote}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="concepto">
                      {/* No direction dot: a possibility has no direction. The
                          hollow mark says "not yet", which is the whole state. */}
                      <span className="pdot" />
                      <EditableText
                        value={line.label}
                        ariaLabel={es.colchon.colConcept}
                        onChange={(label) => store.patchEntry(line.id, { label })}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="amount">
                      <EditableAmount
                        cents={line.amountCents}
                        hasAmount={line.hasAmount}
                        emptyLabel={es.colchon.empty}
                        ariaLabel={es.colchon.colAmount}
                        onCommit={(cents) => store.reviseAmount(line.id, cents)}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="rowend">
                      <EditableText
                        value={line.note ?? ''}
                        ariaLabel={es.colchon.colNote}
                        placeholder={es.costes.notePlaceholder}
                        onChange={(note) => store.patchEntry(line.id, { note })}
                      />
                      {/* Back to being a real cost: the same retag as in the
                          grid, in the direction that undoes it. */}
                      <button
                        type="button"
                        className="hist off"
                        aria-label={es.costes.delete}
                        onClick={() => store.removeEntry(line.id)}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="tot">
                <td colSpan={3}>
                  <div className="totstrip">
                    <span>
                      {es.colchon.target}
                      <br />
                      {es.colchon.targetNote}
                    </span>
                    <div className="tgap" />
                    {missingCount > 0 && (
                      <span className="micro">
                        {missingCount}{' '}
                        {plural(missingCount, es.colchon.missingOne, es.colchon.missing)}
                      </span>
                    )}
                    <div className="tcol">
                      {es.colchon.saved}
                      <span className="tv quiet">{formatEUR(cushion.coveredCents)}</span>
                    </div>
                    <div className="tcol">
                      {es.colchon.target}
                      <span className="tv warn">{formatEUR(targetCents)}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <AddRow
        label={es.colchon.add}
        onClick={() =>
          store.addEntry({
            label: es.colchon.newLabel,
            // `critico` is what puts it in this section and keeps it out of
            // every total; `unico` because a possibility happens once, if ever.
            kind: 'critico',
            frequency: 'unico',
          })
        }
      />

      <div className="pb">
        <p className="upnote">
          {es.colchon.intro}
          {targetCents > 0 && (
            <>
              <br />
              {cushion.covered ? (
                <>
                  <Tag tone="green">{es.colchon.covered}</Tag> {es.colchon.coveredNote}
                </>
              ) : (
                <>
                  <Tag tone="amber">{es.colchon.short}</Tag> {es.colchon.shortPrefix}{' '}
                  <b>{formatEUR(Math.max(0, targetCents - cushion.coveredCents))}</b>{' '}
                  {es.colchon.shortSuffix}
                  {cushion.percent !== null && ` (${formatPercent(cushion.percent)})`}
                </>
              )}
            </>
          )}
          {targetCents === 0 && lines.length > 0 && (
            <>
              <br />
              {es.colchon.noTargetNote}
            </>
          )}
        </p>
      </div>
    </Panel>
  );
}
