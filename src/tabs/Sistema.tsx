import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { es } from '../i18n/es';
import { formatEUR } from '../lib/money';

/**
 * The component sheet, rendered against the live tokens.
 *
 * It is not a product screen — it is DESIGN-SYSTEM.md §2–§4 with the CSS
 * actually applied, so the sheet cannot quietly disagree with what ships. A
 * swatch here is `var(--accent)`, not a hex copied out of a document, which is
 * the whole reason this is a tab and not a picture.
 */

/** Token name → the role it plays. Order is the order of DESIGN-SYSTEM.md §2. */
const SWATCHES: { name: string; role: keyof typeof es.sistema.roles }[] = [
  { name: '--bg', role: 'bg' },
  { name: '--card', role: 'card' },
  { name: '--sunk', role: 'sunk' },
  { name: '--ink', role: 'ink' },
  { name: '--border', role: 'border' },
  { name: '--text', role: 'text' },
  { name: '--muted', role: 'muted' },
  { name: '--accent', role: 'accent' },
  { name: '--green', role: 'green' },
  { name: '--red', role: 'red' },
  { name: '--amber', role: 'amber' },
  { name: '--blue', role: 'blue' },
];

export function Sistema() {
  return (
    <div className="stack">
      <Panel label={es.sistema.tokensPanel} actions={<span>{es.sistema.tokensNote}</span>}>
        <div className="swatches">
          {SWATCHES.map((swatch) => (
            <div className="swatch" key={swatch.name}>
              <i style={{ background: `var(${swatch.name})` }} />
              <b>{swatch.name}</b>
              <em>{es.sistema.roles[swatch.role]}</em>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label={es.sistema.typePanel} tone="green" actions={<span>{es.sistema.typeNote}</span>}>
        <div className="typerows">
          <div className="typerow">
            <span className="tl">{es.sistema.typeDisplay}</span>
            <span className="tn">{formatEUR(123456)}</span>
            <span className="tw">{es.sistema.typeDisplayUse}</span>
          </div>
          <div className="typerow">
            <span className="tl">{es.sistema.typeMono}</span>
            <span className="tm">
              {es.costes.colConcept} · {es.costes.colFrequency} · {es.costes.colAmount}
            </span>
            <span className="tw">{es.sistema.typeMonoUse}</span>
          </div>
          <div className="typerow">
            <span className="tl">{es.sistema.typeBody}</span>
            <span className="tb">{es.sistema.typeBodySample}</span>
            <span className="tw">{es.sistema.typeBodyUse}</span>
          </div>
        </div>
      </Panel>

      <Panel label={es.sistema.componentsPanel} tone="amber">
        <div className="sheet">
          <div>
            <div className="sh">{es.sistema.sheetTags}</div>
            <div className="srow">
              <Tag tone="green">{es.verdict.ok}</Tag>
              <Tag tone="amber">{es.verdict.justo}</Tag>
              <Tag tone="red">{es.verdict.faltaPrefix + formatEUR(12000) + es.verdict.faltaSuffix}</Tag>
              <Tag tone="neutral">{es.verdict.sindatos}</Tag>
            </div>
            <div className="srow" style={{ marginTop: 8 }}>
              <Tag tone="green">{es.status.activo}</Tag>
              <Tag tone="neutral">{es.status.pausado}</Tag>
              <Tag tone="amber">{es.status.pendiente}</Tag>
              <Tag tone="blue">{es.status.pagado}</Tag>
              <Tag tone="blue">{es.resumen.refundable}</Tag>
              <Tag tone="accent">{es.priority.esencial}</Tag>
            </div>
            <div className="snote" style={{ marginTop: 8 }}>
              {es.sistema.sheetTagsNote}
            </div>
          </div>

          <div>
            <div className="sh">{es.sistema.sheetCell}</div>
            <div className="srow">
              <input className="ie" defaultValue={es.seed.alquiler.label} style={{ width: 150 }} />
              <input
                className="ie r demo-focus"
                defaultValue="900,00"
                style={{ width: 90 }}
                readOnly
              />
              <span className="snote">{es.sistema.sheetCellNote}</span>
            </div>
          </div>

          <div>
            <div className="sh">{es.sistema.sheetSelects}</div>
            <div className="srow">
              <span className="pillsel st-activo">{es.status.activo}</span>
              <span className="pillsel st-pausado">{es.status.pausado}</span>
              <span className="pillsel st-pendiente">{es.status.pendiente}</span>
              <span className="pillsel st-pagado">{es.status.pagado}</span>
              <span className="pillsel dir-entrada">{es.direction.entrada}</span>
              <span className="pillsel dir-salida">{es.direction.salida}</span>
            </div>
            <div className="snote" style={{ marginTop: 8 }}>
              {es.sistema.sheetSelectsNote}
            </div>
          </div>

          <div>
            <div className="sh">{es.sistema.sheetButtons}</div>
            <div className="srow">
              <Button variant="accent">{es.app.newScenario}</Button>
              <Button>{es.app.compare}</Button>
              <Button variant="outline">{es.ajustes.exportButton}</Button>
              <Button variant="pill" on>
                {es.muebles.onlyEssentialOn}
              </Button>
              <div className="btn add" style={{ width: 200 }}>
                {es.costes.add}
              </div>
            </div>
          </div>

          <div>
            <div className="sh">{es.sistema.sheetBars}</div>
            <div className="bars" style={{ padding: 0 }}>
              {[
                { label: es.category.vivienda, pct: '58 %', width: 92, opacity: 1 },
                { label: es.category.alimentacion, pct: '19 %', width: 30, opacity: 0.74 },
                { label: es.category.suministros, pct: '12 %', width: 19, opacity: 0.55 },
              ].map((bar) => (
                <div className="bar" key={bar.label}>
                  <div className="bh">
                    <span className="bl">{bar.label}</span>
                    <span className="lead" />
                    <span className="ba">{bar.pct}</span>
                    <span className="bp" />
                  </div>
                  <span className="bt">
                    <span className="bf" style={{ width: `${bar.width}%`, opacity: bar.opacity }} />
                  </span>
                </div>
              ))}
            </div>
            <div className="snote" style={{ marginTop: 8 }}>
              {es.sistema.sheetBarsNote}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
