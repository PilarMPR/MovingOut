/**
 * The one piece of mutable state in the app, and the only thing that calls
 * into storage. Tabs receive it as a prop; there is no context, because with
 * seven tabs and one store the indirection would cost more than it saves.
 *
 * Every writer here replaces rather than patches in place — in particular
 * `history`, which is append-only (IND002).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Cents, Entry, PurchaseProject, SavedState, Scenario, Settings } from '../types';
import { FALLBACK_CATEGORY, FALLBACK_ROOM } from '../types';
import { derive, type Derived } from '../lib/derive';
import { pushRevision, today } from '../lib/history';
import { newId } from '../lib/id';
import { uniqueName } from '../lib/naming';
import { seedEntries, seedTaxonomy } from '../lib/seed';
import { templateCategories, templateScenario } from '../lib/template';
import {
  PREFIX,
  addTaxon,
  mergeTaxa,
  refileCategory,
  refileRoom,
  removeTaxon,
  renameTaxon,
} from '../lib/taxonomy';
import { DEFAULTS, load, newScenario, save, clear } from '../lib/storage';

export interface Store {
  state: SavedState;
  scenario: Scenario;
  derived: Derived;

  /** Everything about a scenario except its name — see `renameScenario`. */
  patchScenario: (patch: Omit<Partial<Scenario>, 'name'>) => void;
  selectScenario: (id: string) => void;
  addScenario: (name: string) => void;
  /**
   * Renaming has its own writer so it lands on the same rule the "Nuevo
   * escenario" button does: a name you can tell apart in the header picker
   * (lib/naming.ts). A free-for-all patch would let you type an existing name
   * back in and rebuild by hand the exact list of identical options that rule
   * exists to prevent — which is why `patchScenario` cannot reach `name`.
   */
  renameScenario: (id: string, name: string) => void;
  duplicateScenario: (name: string) => void;
  removeScenario: (id: string) => void;

  addEntry: (seed: Partial<Entry> & { label: string }) => void;
  patchEntry: (id: string, patch: Partial<Entry>) => void;
  /** Commits an estimate. Pushes a revision only when something actually changed. */
  reviseAmount: (id: string, amountCents: Cents | null) => void;
  removeEntry: (id: string) => void;

  addProject: (name: string) => void;
  patchProject: (id: string, patch: Partial<PurchaseProject>) => void;
  removeProject: (id: string) => void;

  /**
   * The two taxonomies. App-wide, so every one of these writes reaches every
   * scenario — which is the price of Comparar sharing an axis, and the reason
   * `removeCategory` re-files across the whole list rather than the active one.
   */
  addCategory: (label: string) => void;
  renameCategory: (id: string, label: string) => void;
  removeCategory: (id: string) => void;
  addRoom: (label: string) => void;
  renameRoom: (id: string, label: string) => void;
  removeRoom: (id: string) => void;

  /** Pours the seeded checklist into the active scenario. Adds; never replaces. */
  loadChecklist: () => void;
  /**
   * Creates the worked-budget template as a *new* scenario and opens it. Unlike
   * the checklist it carries a situación, a savings figure and a colchón target,
   * and those are scenario-level — pouring them into whatever is open would
   * overwrite a budget rather than add to one. Takes its name for the same
   * reason `addScenario` does: the store owns uniqueness, i18n owns the words.
   */
  loadTemplate: (name: string) => void;

  patchSettings: (patch: Partial<Settings>) => void;
  setCompareIds: (ids: string[]) => void;

  replaceAll: (next: SavedState) => void;
  resetAll: () => void;
}

export function useStore(furnitureLabel: string, firstScenarioName: string): Store {
  const [state, setState] = useState<SavedState>(load);
  const firstRender = useRef(true);

  // Persist on every change but not on mount: writing back what we just read
  // would rewrite a v1 payload as v2 before the user has touched anything.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    save(state);
  }, [state]);

  const scenario = useMemo(() => {
    const found = state.scenarios.find((s) => s.id === state.activeScenarioId);
    return found ?? state.scenarios[0];
  }, [state]);

  const derived = useMemo(
    () => derive(scenario, state.settings, furnitureLabel),
    [scenario, state.settings, furnitureLabel],
  );

  const mapActive = useCallback((fn: (s: Scenario) => Scenario) => {
    setState((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === prev.activeScenarioId ? fn(s) : s)),
    }));
  }, []);

  const patchScenario = useCallback(
    (patch: Omit<Partial<Scenario>, 'name'>) => mapActive((s) => ({ ...s, ...patch })),
    [mapActive],
  );

  // By id rather than "the active one": the header renames what is selected,
  // but nothing about this needs it to be.
  const renameScenario = useCallback((id: string, name: string) => {
    setState((prev) => {
      const current = prev.scenarios.find((s) => s.id === id);
      if (current === undefined) return prev;

      // A blank is not a name. The picker lists names, so an empty one is a
      // scenario you can no longer point at — the field reverts instead.
      const wanted = name.trim();
      if (wanted === '') return prev;

      const unique = uniqueName(
        prev.scenarios.filter((s) => s.id !== id).map((s) => s.name),
        wanted,
      );
      // Leaving the field without having changed anything is not an edit, and
      // should not rewrite localStorage.
      if (unique === current.name) return prev;

      return {
        ...prev,
        scenarios: prev.scenarios.map((s) => (s.id === id ? { ...s, name: unique } : s)),
      };
    });
  }, []);

  const selectScenario = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeScenarioId: id }));
  }, []);

  // Every "add" below names through uniqueName(). The store is where it belongs:
  // it is the only thing that knows what is already called what (lib/naming.ts).
  const addScenario = useCallback((name: string) => {
    setState((prev) => {
      const created = newScenario(uniqueName(prev.scenarios.map((s) => s.name), name));
      return {
        ...prev,
        scenarios: [...prev.scenarios, created],
        activeScenarioId: created.id,
        compareIds: [...prev.compareIds, created.id],
      };
    });
  }, []);

  const duplicateScenario = useCallback((name: string) => {
    setState((prev) => {
      const source = prev.scenarios.find((s) => s.id === prev.activeScenarioId);
      if (source === undefined) return prev;
      const copy: Scenario = {
        ...source,
        id: newId('s'),
        // Duplicating twice would otherwise give two "Piso (copia)".
        name: uniqueName(prev.scenarios.map((s) => s.name), name),
        createdAt: today(),
        entries: source.entries.map((e) => ({ ...e, id: newId('e'), history: [...e.history] })),
        projects: source.projects.map((p) => ({ ...p, id: newId('p') })),
      };
      return {
        ...prev,
        scenarios: [...prev.scenarios, copy],
        activeScenarioId: copy.id,
        compareIds: [...prev.compareIds, copy.id],
      };
    });
  }, []);

  const removeScenario = useCallback((id: string) => {
    setState((prev) => {
      if (prev.scenarios.length <= 1) return prev;
      const scenarios = prev.scenarios.filter((s) => s.id !== id);
      const compareIds = prev.compareIds.filter((c) => c !== id);
      const activeScenarioId = prev.activeScenarioId === id ? scenarios[0].id : prev.activeScenarioId;
      return {
        ...prev,
        scenarios,
        activeScenarioId,
        compareIds: compareIds.length > 0 ? compareIds : [activeScenarioId],
      };
    });
  }, []);

  const addEntry = useCallback(
    (seed: Partial<Entry> & { label: string }) => {
      mapActive((s) => ({
        ...s,
        entries: [
          ...s.entries,
          {
            id: newId('e'),
            direction: 'salida',
            category: 'otros',
            frequency: 'mensual',
            priority: 'deseable',
            status: 'activo',
            amountCents: 0,
            hasAmount: false,
            history: [],
            ...seed,
          },
        ],
      }));
    },
    [mapActive],
  );

  const patchEntry = useCallback(
    (id: string, patch: Partial<Entry>) => {
      mapActive((s) => ({
        ...s,
        entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [mapActive],
  );

  const reviseAmount = useCallback(
    (id: string, amountCents: Cents | null) => {
      mapActive((s) => ({
        ...s,
        entries: s.entries.map((e) => {
          if (e.id !== id) return e;
          if (amountCents === null) {
            // Clearing an amount is not a revision — it is an admission that
            // there is no estimate. The log of what there *was* stays.
            return { ...e, amountCents: 0, hasAmount: false };
          }
          if (e.hasAmount && e.amountCents === amountCents) return e;
          return pushRevision(e, amountCents, today());
        }),
      }));
    },
    [mapActive],
  );

  const removeEntry = useCallback(
    (id: string) => {
      mapActive((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    },
    [mapActive],
  );

  const addProject = useCallback(
    (name: string) => {
      mapActive((s) => ({
        ...s,
        projects: [
          ...s.projects,
          {
            id: newId('p'),
            name,
            budgetCents: 0,
            startDate: today(),
            targetDate: today(),
          },
        ],
      }));
    },
    [mapActive],
  );

  const patchProject = useCallback(
    (id: string, patch: Partial<PurchaseProject>) => {
      mapActive((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [mapActive],
  );

  const removeProject = useCallback(
    (id: string) => {
      mapActive((s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        entries: s.entries.map((e) => (e.projectId === id ? { ...e, projectId: undefined } : e)),
      }));
    },
    [mapActive],
  );

  const addCategory = useCallback((label: string) => {
    setState((prev) => ({
      ...prev,
      categories: addTaxon(
        prev.categories,
        uniqueName(prev.categories.map((t) => t.label), label),
        PREFIX.category,
      ),
    }));
  }, []);

  const renameCategory = useCallback((id: string, label: string) => {
    // Label only. Nothing re-files, because entries point at the id (types.ts § Taxon).
    setState((prev) => ({ ...prev, categories: renameTaxon(prev.categories, id, label) }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      categories: removeTaxon(prev.categories, id, FALLBACK_CATEGORY),
      scenarios: prev.scenarios.map((s) => ({
        ...s,
        entries: refileCategory(s.entries, id, FALLBACK_CATEGORY),
      })),
    }));
  }, []);

  const addRoom = useCallback((label: string) => {
    setState((prev) => ({
      ...prev,
      rooms: addTaxon(prev.rooms, uniqueName(prev.rooms.map((t) => t.label), label), PREFIX.room),
    }));
  }, []);

  const renameRoom = useCallback((id: string, label: string) => {
    setState((prev) => ({ ...prev, rooms: renameTaxon(prev.rooms, id, label) }));
  }, []);

  const removeRoom = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      rooms: removeTaxon(prev.rooms, id, FALLBACK_ROOM),
      scenarios: prev.scenarios.map((s) => ({
        ...s,
        entries: refileRoom(s.entries, id, FALLBACK_ROOM),
      })),
    }));
  }, []);

  const loadChecklist = useCallback(() => {
    setState((prev) => {
      // Restore any category or room the checklist files under and this install
      // has since binned; without it thirty rows would land in Otros at once.
      const required = seedTaxonomy();
      return {
        ...prev,
        categories: mergeTaxa(prev.categories, required.categories),
        rooms: mergeTaxa(prev.rooms, required.rooms),
        scenarios: prev.scenarios.map((s) =>
          s.id === prev.activeScenarioId ? { ...s, entries: [...s.entries, ...seedEntries()] } : s,
        ),
      };
    });
  }, []);

  const loadTemplate = useCallback((name: string) => {
    setState((prev) => {
      // Same restore as the checklist: two of these categories are ones the
      // template invents, and the rest are shipped ones this install may have
      // binned. Without the merge a third of the rows land in Otros on the very
      // next read, and the breakdown it was built for stops existing.
      const created = templateScenario(uniqueName(prev.scenarios.map((s) => s.name), name));
      return {
        ...prev,
        categories: mergeTaxa(prev.categories, templateCategories()),
        scenarios: [...prev.scenarios, created],
        activeScenarioId: created.id,
        compareIds: [...prev.compareIds, created.id],
      };
    });
  }, []);

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const setCompareIds = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, compareIds: ids }));
  }, []);

  const replaceAll = useCallback((next: SavedState) => setState(next), []);

  const resetAll = useCallback(() => {
    clear();
    setState(DEFAULTS(newScenario(firstScenarioName)));
  }, [firstScenarioName]);

  return {
    state,
    scenario,
    derived,
    patchScenario,
    selectScenario,
    addScenario,
    renameScenario,
    duplicateScenario,
    removeScenario,
    addEntry,
    patchEntry,
    reviseAmount,
    removeEntry,
    addProject,
    patchProject,
    removeProject,
    addCategory,
    renameCategory,
    removeCategory,
    addRoom,
    renameRoom,
    removeRoom,
    loadChecklist,
    loadTemplate,
    patchSettings,
    setCompareIds,
    replaceAll,
    resetAll,
  };
}
