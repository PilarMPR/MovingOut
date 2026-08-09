import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import type { TagTone } from '../components/Tag';
import { es, plural } from '../i18n/es';
import { projectProgress, projectVerdict, type ProjectVerdict } from '../lib/derive';
import { today } from '../lib/history';
import { formatEUR, formatPercent, parseAmount, toEditableString } from '../lib/money';
import type { Store } from '../state/store';

const VERDICT_LABEL: Record<ProjectVerdict, string> = {
  notStarted: es.proyectos.tagNotStarted,
  over: es.proyectos.tagOver,
  tight: es.proyectos.tagTight,
  stalled: es.proyectos.tagStalled,
  onTrack: es.proyectos.tagOnTrack,
};

const VERDICT_TONE: Record<ProjectVerdict, TagTone> = {
  notStarted: 'neutral',
  over: 'red',
  tight: 'amber',
  stalled: 'amber',
  onTrack: 'green',
};

export function Proyectos({ store }: { store: Store }) {
  const { scenario } = store;
  const now = today();

  return (
    <Panel
      label={`${es.proyectos.panel} · ${scenario.projects.length}`}
      actions={
        <Button variant="onInk" onClick={() => store.addProject(es.proyectos.newName)}>
          {es.proyectos.add}
        </Button>
      }
    >
      {scenario.projects.length === 0 ? (
        <div className="empty-note">{es.proyectos.empty}</div>
      ) : (
        <div className="pcards">
          {scenario.projects.map((project) => {
            const progress = projectProgress(
              scenario.entries,
              project.id,
              project.budgetCents,
              project.startDate,
              project.targetDate,
              now,
            );
            const verdict = projectVerdict(progress);
            const moneyWidth = Math.min(100, progress.moneyPercent ?? 0);
            const timeWidth = Math.min(100, progress.timePercent ?? 0);

            return (
              <article className="pcard" key={project.id}>
                <h4>
                  <input
                    className="ie"
                    value={project.name}
                    aria-label={es.proyectos.panel}
                    onChange={(event) => store.patchProject(project.id, { name: event.target.value })}
                  />
                </h4>

                <div className="pmeta">
                  <span className="pfield">
                    {es.proyectos.budget}
                    <input
                      className="ie"
                      defaultValue={toEditableString(project.budgetCents)}
                      aria-label={es.proyectos.budget}
                      inputMode="decimal"
                      onBlur={(event) => {
                        const parsed = parseAmount(event.target.value);
                        if (parsed !== null) {
                          store.patchProject(project.id, { budgetCents: Math.abs(parsed) });
                        }
                      }}
                    />
                  </span>
                  <span>
                    {progress.itemCount}{' '}
                    {plural(progress.itemCount, es.proyectos.item, es.proyectos.items)}
                  </span>
                </div>

                <div>
                  <div className="prog">
                    <i className={progress.overBudget ? 'bad' : ''} style={{ width: `${moneyWidth}%` }} />
                  </div>
                  <div className="pmeta" style={{ marginTop: 4 }}>
                    <span>
                      {es.proyectos.spent} {formatEUR(progress.spentCents)}
                    </span>
                    <span className={progress.overBudget ? 'bad' : undefined}>
                      {progress.moneyPercent === null ? es.common.none : formatPercent(progress.moneyPercent)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="prog">
                    <i
                      className={timeWidth > moneyWidth + 25 ? 'warn' : ''}
                      style={{ width: `${timeWidth}%` }}
                    />
                  </div>
                  <div className="pmeta" style={{ marginTop: 4 }}>
                    <span className="pfield">
                      {es.proyectos.until}
                      <input
                        className="ie"
                        type="date"
                        value={project.targetDate}
                        aria-label={es.proyectos.until}
                        onChange={(event) =>
                          store.patchProject(project.id, { targetDate: event.target.value })
                        }
                      />
                    </span>
                    <span>
                      {progress.timePercent === null
                        ? es.proyectos.noDate
                        : `${formatPercent(progress.timePercent)} ${es.proyectos.ofDeadline}`}
                    </span>
                  </div>
                </div>

                <div className="row-actions">
                  <Tag tone={VERDICT_TONE[verdict]}>{VERDICT_LABEL[verdict]}</Tag>
                  <span className="micro">
                    {es.proyectos.remaining}{' '}
                    {formatEUR(Math.max(0, project.budgetCents - progress.spentCents))}
                  </span>
                </div>

                <Button small danger onClick={() => store.removeProject(project.id)}>
                  {es.proyectos.delete}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
