import { useEffect, useState } from 'react';
import { Button } from './components/Button';
import { es } from './i18n/es';
import { useStore } from './state/store';
import { Ajustes } from './tabs/Ajustes';
import { Comparar } from './tabs/Comparar';
import { Costes, NO_FILTERS, type Filters } from './tabs/Costes';
import { CostesMobile } from './tabs/CostesMobile';
import { Historial } from './tabs/Historial';
import { Muebles } from './tabs/Muebles';
import { Proyectos } from './tabs/Proyectos';
import { Resumen } from './tabs/Resumen';
import { SITUACIONES } from './types';

const TABS = ['resumen', 'costes', 'muebles', 'proyectos', 'historial', 'ajustes'] as const;
type Tab = (typeof TABS)[number] | 'comparar';

/** The fork is real at 820 px: mobile renders a different component, not a
 *  reflowed table. src/lib does not know which one is mounted. */
const MOBILE_QUERY = '(max-width: 820px)';

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
  const isMobile = useIsMobile();

  const { scenario, state } = store;

  const content = () => {
    switch (tab) {
      case 'costes':
        return isMobile ? (
          <CostesMobile store={store} filters={filters} onFilters={setFilters} />
        ) : (
          <Costes store={store} filters={filters} onFilters={setFilters} />
        );
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
      default:
        return <Resumen store={store} />;
    }
  };

  // Costes on mobile renders edge to edge: the card list is the page.
  const bare = isMobile && tab === 'costes';

  return (
    <div className="shell">
      <header className="hdr">
        <div className="hdr-id">
          <b>{es.app.name}</b>
          <em>{es.app.place}</em>
        </div>
        <div className="hdr-r">
          <select
            className="sel-dark acc"
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
          <Button variant="onInk" onClick={() => setTab('comparar')}>
            {es.app.compare}
          </Button>
          <Button variant="onInk" onClick={() => store.addScenario(es.scenario.firstName)}>
            {es.app.newScenario}
          </Button>
        </div>
      </header>

      {!isMobile && (
        <nav className="tabs">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              className={tab === name ? 'tab on' : 'tab'}
              onClick={() => setTab(name)}
            >
              {es.tabs[name]}
            </button>
          ))}
          <button
            type="button"
            className={tab === 'comparar' ? 'tab on' : 'tab'}
            onClick={() => setTab('comparar')}
          >
            {es.tabs.comparar}
          </button>
        </nav>
      )}

      {bare ? content() : <main className="body">{content()}</main>}

      {isMobile && (
        <nav className="mnav">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              className={tab === name ? 'on' : undefined}
              onClick={() => setTab(name)}
            >
              <i />
              {es.tabsShort[name]}
            </button>
          ))}
          <button
            type="button"
            className={tab === 'comparar' ? 'on' : undefined}
            onClick={() => setTab('comparar')}
          >
            <i />
            {es.tabsShort.comparar}
          </button>
        </nav>
      )}
    </div>
  );
}
