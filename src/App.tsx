import { useEffect, useState } from 'react';
import { Button } from './components/Button';
import { EditableName } from './components/EditableCell';
import { VerdictTag } from './components/VerdictTag';
import { es } from './i18n/es';
import { useStore } from './state/store';
import { Ajustes } from './tabs/Ajustes';
import { Comparar } from './tabs/Comparar';
import { Compras } from './tabs/Compras';
import { ComprasMobile } from './tabs/ComprasMobile';
import { Costes, NO_FILTERS, type Filters } from './tabs/Costes';
import { CostesMobile } from './tabs/CostesMobile';
import { Desglose } from './tabs/Desglose';
import { Historial } from './tabs/Historial';
import { Muebles } from './tabs/Muebles';
import { Proyectos } from './tabs/Proyectos';
import { Resumen } from './tabs/Resumen';
import { Sistema } from './tabs/Sistema';
import { SITUACIONES } from './types';

/**
 * The product tabs, in the order the design puts them. Compras sits straight
 * after Costes: it is the same money seen from the other end — what you thought
 * it would cost, then what it did — and the two are read against each other.
 */
const TABS = [
  'resumen',
  'costes',
  // Desglose sits between the two for the same reason Compras follows them:
  // the three are one movement outward from a figure — what you think it costs,
  // what that figure is made of, then what you actually paid.
  'desglose',
  'compras',
  'muebles',
  'proyectos',
  'historial',
  'comparar',
  'ajustes',
] as const;

/**
 * Sistema is the component sheet rendered against the live tokens. It is not a
 * product screen, which is why it sits apart on the right of the tab row rather
 * than in the run of seven — and why the phone, where the sheet is unreadable
 * anyway, does not carry it at all.
 */
type Tab = (typeof TABS)[number] | 'sistema';

/** The fork is real at 820 px: mobile renders a different component, not a
 *  reflowed table. src/lib does not know which one is mounted. */
const MOBILE_QUERY = '(max-width: 820px)';

/** Rename. Paired with the picker, so the name is edited where it is read. */
function PencilIcon() {
  return (
    <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true" focusable="false">
      <path
        d="M2.6 11.4l.6-2.4 5.7-5.7 1.8 1.8-5.7 5.7-2.4.6zM8.9 3.3l1.2-1.2 1.8 1.8-1.2 1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export function App() {
  const store = useStore(es.resumen.furnitureLine, es.scenario.firstName);
  const [tab, setTab] = useState<Tab>('resumen');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [onlyEssential, setOnlyEssential] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const isMobile = useIsMobile();

  const { scenario, state, derived } = store;

  // Rotating onto a phone while on Sistema would otherwise strand the user on a
  // screen with no way back, because the bottom nav does not carry it.
  const active: Tab = isMobile && tab === 'sistema' ? 'resumen' : tab;

  const content = () => {
    switch (active) {
      case 'costes':
        return isMobile ? (
          <CostesMobile store={store} filters={filters} onFilters={setFilters} />
        ) : (
          <Costes store={store} filters={filters} onFilters={setFilters} />
        );
      case 'desglose':
        // No mobile fork: `.desg-split` stacks the picker above the table at
        // 1100 px, and the table is three columns rather than Costes' ten, so
        // there is nothing here that a phone cannot render as it stands.
        return <Desglose store={store} />;
      case 'compras':
        return isMobile ? <ComprasMobile store={store} /> : <Compras store={store} />;
      case 'muebles':
        return (
          <Muebles store={store} onlyEssential={onlyEssential} onOnlyEssential={setOnlyEssential} />
        );
      case 'proyectos':
        return <Proyectos store={store} />;
      case 'historial':
        return <Historial store={store} />;
      case 'ajustes':
        return <Ajustes store={store} />;
      case 'comparar':
        return <Comparar store={store} />;
      case 'sistema':
        return <Sistema />;
      default:
        return <Resumen store={store} />;
    }
  };

  // The two forked screens render edge to edge on mobile: the card list is the
  // page, and a padded body would inset cards that are meant to span it.
  const bare = isMobile && (active === 'costes' || active === 'compras');

  return (
    <div className="shell">
      <header className="hdr">
        <div className="hdr-bar">
          <div className="hdr-id">
            <b>{es.app.name}</b>
            <em>{es.app.place}</em>
          </div>

          {/* The picker turns into its own name field: the list is where you
              read the name, so it is where you should be able to fix it. */}
          <div className="hdr-grp">
            <span>{es.app.scenarioLabel}</span>
            {renaming ? (
              <EditableName
                className="in-dark"
                value={scenario.name}
                ariaLabel={es.app.renameScenario}
                autoFocus
                onCommit={(name) => store.renameScenario(scenario.id, name)}
                onDone={() => setRenaming(false)}
              />
            ) : (
              <>
                <select
                  className="sel-dark"
                  aria-label={es.app.scenarioLabel}
                  value={scenario.id}
                  onChange={(event) => store.selectScenario(event.target.value)}
                >
                  {state.scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="hdr-ico"
                  aria-label={es.app.renameScenario}
                  title={es.app.renameScenario}
                  onClick={() => setRenaming(true)}
                >
                  <PencilIcon />
                </button>
              </>
            )}
          </div>

          <div className="hdr-grp">
            <span>{es.app.situacionLabel}</span>
            <select
              className="sel-dark"
              aria-label={es.app.situacionLabel}
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
          </div>

          <div className="hdr-gap" />

          <div className="hdr-r">
            {/* The answer rides in the chrome: it is true on every tab, so it
                should not be something you navigate back to Resumen to read. */}
            <VerdictTag
              verdict={derived.verdict}
              shortfallCents={derived.shortfallCents}
              big
            />
            <Button variant="onInk" onClick={() => store.addScenario(es.scenario.newName)}>
              {es.app.newScenario}
            </Button>
          </div>
        </div>

        {!isMobile && (
          <nav className="tabs">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                className={active === name ? 'tab on' : 'tab'}
                onClick={() => setTab(name)}
              >
                {es.tabs[name]}
              </button>
            ))}
            <div className="hdr-gap" />
            <button
              type="button"
              className={active === 'sistema' ? 'tab sys on' : 'tab sys'}
              onClick={() => setTab('sistema')}
            >
              {es.tabs.sistema}
            </button>
          </nav>
        )}
      </header>

      {bare ? content() : <main className="body">{content()}</main>}

      {isMobile && (
        <nav className="mnav">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              className={active === name ? 'on' : undefined}
              onClick={() => setTab(name)}
            >
              <i />
              {es.tabsShort[name]}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
