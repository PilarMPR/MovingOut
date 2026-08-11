import { AddRow } from '../components/AddRow';
import { Button } from '../components/Button';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { Select, StatusSelect } from '../components/Select';
import { es, plural } from '../i18n/es';
import { formatEUR } from '../lib/money';
import { furnitureByRoom, furnitureTotals } from '../lib/derive';
import type { Store } from '../state/store';
import { PRIORITIES, ROOMS, STATUSES } from '../types';

/** Furniture is `pendiente` / `pagado`; the other two states do not apply here. */
const FURNITURE_STATUSES = STATUSES.filter(
  (status) => status === 'pendiente' || status === 'pagado' || status === 'pausado',
);

interface Props {
  store: Store;
  onlyEssential: boolean;
  onOnlyEssential: (value: boolean) => void;
}

export function Muebles({ store, onlyEssential, onOnlyEssential }: Props) {
  const { furniture } = store.derived;
  const totals = furnitureTotals(furniture);
  const groups = furnitureByRoom(furniture, onlyEssential);

  const projectOptions = ['', ...store.scenario.projects.map((p) => p.id)];
  const projectLabels: Record<string, string> = { '': es.muebles.noProject };
  for (const project of store.scenario.projects) projectLabels[project.id] = project.name;

  return (
    <div className="stack">
      {/* The one figure this tab exists for, and the control that defines it:
          the minimum is only a minimum while the essentials filter is on. */}
      <div className="mhero">
        <div className="mh">
          <div className="ml">{es.muebles.heroLabel}</div>
          <div className="mv">{formatEUR(totals.minimumCents)}</div>
          <div className="ms">
            {onlyEssential ? es.muebles.heroSubEssential : es.muebles.heroSubAll} ·{' '}
            {groups.length} {plural(groups.length, es.muebles.roomOne, es.muebles.rooms)}
            {totals.missingPriceCount > 0 && (
              <>
                {' · '}
                {totals.missingPriceCount}{' '}
                {plural(
                  totals.missingPriceCount,
                  es.muebles.kpiMissingSubOne,
                  es.muebles.kpiMissingSub,
                )}
              </>
            )}
          </div>
        </div>
        <Button variant="pill" on={onlyEssential} onClick={() => onOnlyEssential(!onlyEssential)}>
          {onlyEssential ? es.muebles.onlyEssentialOn : es.muebles.onlyEssential}
        </Button>
      </div>

      <div className="kgrid k3">
        <KpiCard label={es.muebles.kpiWhole} cents={totals.wholeListCents} sub={es.muebles.kpiWholeSub} />
        <KpiCard
          label={es.muebles.kpiPaid}
          cents={totals.paidCents}
          tone={totals.paidCents > 0 ? 'info' : 'plain'}
          sub={`${totals.paidCount} ${plural(totals.paidCount, es.muebles.kpiPaidSubOne, es.muebles.kpiPaidSub)}`}
        />
        <KpiCard
          label={es.muebles.kpiMissing}
          value={totals.missingPriceCount}
          tone={totals.missingPriceCount > 0 ? 'warn' : 'plain'}
          sub={
            totals.missingPriceCount === 0
              ? es.muebles.kpiMissingNone
              : plural(totals.missingPriceCount, es.muebles.kpiMissingSubOne, es.muebles.kpiMissingSub)
          }
        />
      </div>

      {groups.length === 0 && (
        <Panel label={es.muebles.panel} body={<div className="empty-note">{es.muebles.empty}</div>} />
      )}

      {groups.map((group) => {
        const done = group.totalCents === 0 ? 0 : (group.paidCents / group.totalCents) * 100;
        return (
          <Panel
            key={group.room}
            label={es.room[group.room]}
            tone={group.pendingCount === 0 ? 'green' : 'amber'}
            actions={
              <span>
                {formatEUR(group.paidCents)} / {formatEUR(group.totalCents)}
                {group.missingPriceCount > 0 && ` · +${group.missingPriceCount}`}
              </span>
            }
          >
            {/* Flush under the header: how much of this room is already bought. */}
            <div className="rprog">
              <i style={{ width: `${done}%` }} />
            </div>

            <div className="tblwrap">
              <table className="tbl-rooms">
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.id} className={item.status === 'pausado' ? 'paused' : undefined}>
                      <td style={{ width: '34%' }}>
                        <EditableText
                          value={item.label}
                          ariaLabel={es.costes.colConcept}
                          onChange={(label) => store.patchEntry(item.id, { label })}
                        />
                      </td>
                      <td style={{ width: 96 }}>
                        <Select
                          value={item.priority}
                          options={PRIORITIES}
                          labels={es.priority}
                          ariaLabel={es.costes.colPriority}
                          variant={item.priority === 'esencial' ? 'strong' : 'plain'}
                          onChange={(priority) => store.patchEntry(item.id, { priority })}
                        />
                      </td>
                      <td style={{ width: 116 }}>
                        <StatusSelect
                          value={item.status}
                          options={FURNITURE_STATUSES}
                          labels={es.status}
                          ariaLabel={es.costes.colStatus}
                          onChange={(status) => store.patchEntry(item.id, { status })}
                        />
                      </td>
                      <td style={{ width: 100 }}>
                        <Select
                          value={item.room ?? 'otros'}
                          options={ROOMS}
                          labels={es.room}
                          ariaLabel={es.muebles.panel}
                          onChange={(room) => store.patchEntry(item.id, { room })}
                        />
                      </td>
                      <td style={{ width: 120 }}>
                        <Select
                          value={item.projectId ?? ''}
                          options={projectOptions}
                          labels={projectLabels}
                          ariaLabel={es.muebles.colProject}
                          onChange={(projectId) =>
                            store.patchEntry(item.id, {
                              projectId: projectId === '' ? undefined : projectId,
                            })
                          }
                        />
                      </td>
                      <td className="r amount-col">
                        <div className="amount">
                          <EditableAmount
                            cents={item.amountCents}
                            hasAmount={item.hasAmount}
                            emptyLabel={es.costes.empty}
                            ariaLabel={es.costes.colAmount}
                            onCommit={(cents) => store.reviseAmount(item.id, cents)}
                          />
                          <span className="cur">{es.common.euro}</span>
                        </div>
                      </td>
                      <td className="note-col">
                        <div className="rowend">
                          <EditableText
                            value={item.note ?? ''}
                            ariaLabel={es.costes.colNote}
                            placeholder={es.costes.notePlaceholder}
                            onChange={(note) => store.patchEntry(item.id, { note })}
                          />
                          <button
                            type="button"
                            className="hist off"
                            aria-label={es.costes.delete}
                            onClick={() => store.removeEntry(item.id)}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}

      <AddRow
        label={es.muebles.add}
        onClick={() =>
          store.addEntry({
            label: es.muebles.newLabel,
            category: 'mobiliario',
            frequency: 'unico',
            status: 'pendiente',
            priority: 'esencial',
            room: 'otros',
          })
        }
      />
    </div>
  );
}
