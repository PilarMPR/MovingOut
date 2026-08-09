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
      <div className="kgrid k4">
        <KpiCard
          label={es.muebles.kpiMinimum}
          cents={totals.minimumCents}
          tone="warn"
          hero
          sub={
            <>
              {es.muebles.kpiMinimumSub}
              <br />
              {totals.minimumCount} {es.common.of} {totals.total}{' '}
              {plural(totals.total, es.muebles.article, es.muebles.articles)}
            </>
          }
        />
        <KpiCard
          label={es.muebles.kpiWhole}
          cents={totals.wholeListCents}
          sub={es.muebles.kpiWholeSub}
        />
        <KpiCard
          label={es.muebles.kpiPaid}
          cents={totals.paidCents}
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

      <Panel
        label={es.muebles.panel}
        tone={totals.missingPriceCount > 0 ? 'amber' : 'green'}
        actions={
          <Button
            variant={onlyEssential ? 'outline' : 'onInk'}
            onClick={() => onOnlyEssential(!onlyEssential)}
          >
            {onlyEssential ? es.muebles.onlyEssentialOn : es.muebles.onlyEssential}
          </Button>
        }
      >
        {groups.length === 0 && <div className="empty-note">{es.muebles.empty}</div>}

        {groups.map((group) => (
          <div key={group.room}>
            <div className="room">
              <span>{es.room[group.room]}</span>
              <span className="cnt">
                {group.pendingCount}{' '}
                {plural(group.pendingCount, es.muebles.pendingOne, es.muebles.pending)} ·{' '}
                {formatEUR(group.pendingCents)}
                {group.missingPriceCount > 0 && ` · +${group.missingPriceCount}`}
              </span>
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
                          onChange={(priority) => store.patchEntry(item.id, { priority })}
                        />
                      </td>
                      <td style={{ width: 108 }}>
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
                        <EditableAmount
                          cents={item.amountCents}
                          hasAmount={item.hasAmount}
                          emptyLabel={es.costes.empty}
                          ariaLabel={es.costes.colAmount}
                          onCommit={(cents) => store.reviseAmount(item.id, cents)}
                        />
                      </td>
                      <td className="note-col">
                        <EditableText
                          value={item.note ?? ''}
                          ariaLabel={es.costes.colNote}
                          placeholder={es.costes.notePlaceholder}
                          onChange={(note) => store.patchEntry(item.id, { note })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="caret"
                          aria-label={es.costes.delete}
                          onClick={() => store.removeEntry(item.id)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

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
      </Panel>
    </div>
  );
}
