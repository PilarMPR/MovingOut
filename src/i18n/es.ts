/**
 * Every Spanish string in the app (IND008). Components are built against these
 * keys, never against literals — sweeping them out later never happens.
 *
 * Prose is deliberately plain. The app answers one question, and the copy is
 * allowed to say the uncomfortable version of the answer.
 */
import type {
  DefaultCategoryId,
  DefaultRoomId,
  Direction,
  Frequency,
  Priority,
  Situacion,
  Status,
} from '../types';

/**
 * Spanish agrees in number, and "1 conceptos" is the kind of small wrongness
 * that makes a whole screen feel machine-generated. Every count that reaches
 * the UI goes through here.
 */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export const es = {
  app: {
    name: 'MOVINGOUT',
    place: 'Madrid · EUR',
    scenarioLabel: 'Escenario',
    situacionLabel: 'Situación',
    compare: 'Comparar',
    export: 'Exportar',
    import: 'Importar',
    newScenario: 'Nuevo escenario',
  },

  tabs: {
    resumen: 'Resumen',
    costes: 'Costes',
    muebles: 'Muebles',
    proyectos: 'Proyectos',
    historial: 'Historial',
    ajustes: 'Ajustes',
    comparar: 'Comparar',
    sistema: '◇ Sistema',
  },

  tabsShort: {
    resumen: 'Resumen',
    costes: 'Costes',
    muebles: 'Muebles',
    proyectos: 'Proyec.',
    historial: 'Hist.',
    ajustes: 'Ajustes',
    comparar: 'Comp.',
  },

  direction: {
    entrada: 'Entrada',
    salida: 'Salida',
  } satisfies Record<Direction, string>,

  /**
   * The labels of the *shipped* categories only. Anything the user adds later
   * is data, carries its own label, and never passes through here — which is
   * the line IND008 actually draws: app copy is translated, user content is not.
   */
  category: {
    vivienda: 'Vivienda',
    suministros: 'Suministros',
    consumibles: 'Consumibles',
    alimentacion: 'Alimentación',
    transporte: 'Transporte',
    ocio: 'Ocio',
    impuestos: 'Impuestos',
    ingresos: 'Ingresos',
    mobiliario: 'Mobiliario',
    otros: 'Otros',
  } satisfies Record<DefaultCategoryId, string>,

  frequency: {
    mensual: 'Mensual',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
    anual: 'Anual',
    unico: 'Único',
  } satisfies Record<Frequency, string>,

  priority: {
    esencial: 'Esencial',
    deseable: 'Deseable',
  } satisfies Record<Priority, string>,

  status: {
    activo: 'Activo',
    pausado: 'Pausado',
    pendiente: 'Pendiente',
    pagado: '✓ Pagado',
  } satisfies Record<Status, string>,

  room: {
    cocina: 'Cocina',
    salon: 'Salón',
    dormitorio: 'Dormitorio',
    bano: 'Baño',
    otros: 'Otros',
  } satisfies Record<DefaultRoomId, string>,

  situacion: {
    estudiante: 'Estudiante',
    becario: 'Becario',
    empleado: 'Empleado',
    autonomo: 'Autónomo',
  } satisfies Record<Situacion, string>,

  verdict: {
    sindatos: 'Sin datos todavía',
    ok: '✓ Te lo puedes permitir',
    justo: '⚠ Justo',
    faltaPrefix: '✗ Te faltan ',
    faltaSuffix: '/mes',
    // The one-line gloss each verdict used to carry is gone: the insight
    // banner at the foot of Resumen now says more, in the same voice, and two
    // sentences explaining one pill is one too many.
  },

  resumen: {
    verdictPanel: 'Resumen',
    kpiIn: 'Entradas / mes',
    kpiOut: 'Salidas / mes',
    kpiBalance: 'Balance',
    kpiUpfront: 'Dinero al entrar',
    kpiSpend: 'Gasto real',
    kpiRunway: 'Meses de margen',
    kpiMargin: 'Margen',
    kpiBuffer: 'Colchón',
    kpiMaxRent: 'Alquiler máx. orientativo',
    kpiDrift: 'Desviación',
    driftSub: 'frente a cuando creaste el escenario',
    driftNone: 'sin revisiones todavía',
    inSub: 'ninguna entrada es fija',
    outSubPrefix: 'sobre',
    outSubMiddle: 'de',
    outSubSuffix: 'conceptos con importe',
    balanceSub: 'entradas − salidas',
    balanceShare: 'de las entradas',
    upfrontSub: 'fianza incluida',
    spendSubPrefix: 'menos',
    spendSub: 'de fianza, que vuelve',
    runwayNone: 'sin ahorro tras entrar',
    runwaySubPrefix: 'de ahorro tras entrar ÷',
    runwaySubSuffix: '/mes de déficit',
    marginShockPrefix: 'cada 100 € de imprevisto se comen',
    marginShockSuffix: 'meses de margen',
    bufferCovered: 'Cubierto',
    bufferShort: 'A medias',
    bufferNoTarget: 'Sin objetivo',
    bufferNoTargetSub: 'ponle un objetivo en Ajustes y aquí verás si llegas',
    bufferSubPrefix: 'objetivo',
    bufferSubMiddle: '· te quedan',
    bufferSubSuffix: 'tras entrar',
    guideWhyPrefix: 'Regla del',
    guideWhyMiddle: 'sobre',
    guideWhySuffix: 'Es una referencia, no un límite.',
    guideNoIncome: 'Sin entradas registradas no hay referencia que dar.',
    barsPanel: 'A dónde va el dinero',
    barsPaused: 'pausado',
    upfrontPanel: 'Dinero al entrar',
    ledgerUpfront: 'Necesitas tener',
    ledgerSpend: 'Gasto real',
    ledgerNote:
      'La fianza está en «al entrar» y fuera de «gasto real». El margen nunca la cuenta como quemada.',
    fianzaNotePrefix: 'La fianza de',
    fianzaNoteMiddle: 'es',
    fianzaNoteWord: 'recuperable',
    fianzaNoteSuffix:
      'al salir si dejas el piso bien. Es dinero que necesitas tener, no dinero que gastas.',
    ledgerMissing: 'conceptos únicos sin importe — la cifra puede subir',
    ledgerMissingOne: 'concepto único sin importe — la cifra puede subir',
    ledgerEmpty: 'Todavía no hay ningún gasto único con importe.',
    insightPanel: 'La respuesta',
    refundable: 'Devolvible',
    shouldNotPay: 'No deberías pagarlo',
    furnitureLine: 'Muebles esenciales',

    insightOkPrefix: 'Con este piso te sobran',
    insightOkSuffix: 'al mes.',
    insightJustoPrefix: 'Con este piso te quedan',
    insightJustoSuffix: 'al mes. No es un no, pero no hay nada detrás:',
    insightFaltaPrefix: 'Con este piso te faltan',
    insightFaltaSuffix: 'al mes.',
    insightBufferCovered: 'El colchón ya está cubierto por el ahorro que queda después de entrar.',
    insightBufferShortPrefix: 'El colchón todavía no está cubierto: te quedan',
    insightBufferShortMiddle: 'tras entrar, sobre un objetivo de',
    insightBufferNoTarget: 'No has puesto objetivo de colchón, así que no hay nada que comprobar.',
    insightRunwayPrefix: 'El ahorro aguanta',
    insightRunwaySuffix: 'meses después de entrar, y luego no queda nada.',
    insightNoRunway: 'Después de entrar no queda ahorro que aguante el déficit.',
    insightCoveragePrefix: 'Faltan',
    insightCoveragePrefixOne: 'Falta',
    insightCoverageSuffix: 'conceptos por rellenar, así que la cifra todavía se puede mover.',
    insightCoverageSuffixOne: 'concepto por rellenar, así que la cifra todavía se puede mover.',
    insightNoData:
      'Todavía no hay importes suficientes para responder. Rellena Costes y esta frase se escribe sola.',
  },

  costes: {
    panel: 'Conceptos',
    coverage: 'con importe',
    coverageMissing: 'sin rellenar',
    filterDirection: 'Dirección',
    filterPriority: 'Prioridad',
    filterStatus: 'Estado',
    filterAll: 'Todo',
    filterIn: 'Entradas',
    filterOut: 'Salidas',
    filterNoAmount: 'Sin importe',
    colConcept: 'Concepto',
    colType: 'Tipo',
    colCategory: 'Categoría',
    colFrequency: 'Frecuencia',
    colPriority: 'Prioridad',
    colStatus: 'Estado',
    colAmount: 'Importe',
    colMonthly: 'Equiv. mensual',
    colNote: 'Nota',
    notePlaceholder: '—',
    empty: '— —',
    noCount: 'no cuenta',
    oneOff: 'único',
    eqOneOff: 'Pago único',
    /** The `≡` says the figure was normalised, and from which real frequency. */
    eqFrom: '≡',
    totalRow: 'Totales · normalizado a mes',
    totalFiltered: 'filtrado',
    totalAll: 'todo el escenario',
    totalBalance: 'Balance',
    totalConcepts: 'conceptos',
    totalConcept: 'concepto',
    add: '+ Añadir concepto',
    newLabel: 'Concepto nuevo',
    delete: 'Borrar',
    historyOpen: 'Ver historial',
    historyClose: 'Ocultar historial',
    historyTitle: 'Historial de estimaciones',
    historyRevisions: 'revisiones',
    vsPrevious: 'vs anterior',
    vsOriginal: 'vs original',
    firstEstimate: 'estimación inicial',
    noChange: 'sin cambio',
    emptyList: 'Ningún concepto pasa estos filtros.',
    /** A blank scenario is the normal starting state, so it reads as an invitation. */
    emptyScenario: 'Escenario en blanco. Añade el primer concepto abajo, o carga la checklist desde Ajustes.',
    filters: 'Filtros',
  },

  muebles: {
    heroLabel: 'Mínimo real para entrar a vivir',
    heroSubEssential: 'sólo lo esencial pendiente de comprar',
    heroSubAll: 'todo lo pendiente, esencial y deseable',
    rooms: 'estancias',
    roomOne: 'estancia',
    kpiWhole: 'Toda la lista',
    kpiWholeSub: 'esenciales + deseables pendientes',
    kpiPaid: 'Ya comprado',
    kpiPaidSub: 'artículos pagados',
    kpiPaidSubOne: 'artículo pagado',
    kpiMissing: 'Sin precio',
    kpiMissingSub: 'artículos sin importe — el mínimo puede subir',
    kpiMissingSubOne: 'artículo sin importe — el mínimo puede subir',
    kpiMissingNone: 'todo lo pendiente tiene precio',
    panel: 'Lista por habitación',
    onlyEssential: 'Sólo esenciales',
    onlyEssentialOn: 'Sólo esenciales · activo',
    pending: 'pendientes',
    pendingOne: 'pendiente',
    add: '+ Añadir artículo',
    newLabel: 'Artículo nuevo',
    articles: 'artículos',
    article: 'artículo',
    empty: 'Ningún artículo en esta lista todavía.',
    colProject: 'Proyecto',
    noProject: 'Sin proyecto',
  },

  proyectos: {
    panel: 'Proyectos de compra',
    add: '+ Nuevo proyecto',
    newName: 'Proyecto nuevo',
    budget: 'Presupuesto',
    spent: 'Gastado',
    until: 'Hasta',
    ofDeadline: 'del plazo',
    items: 'artículos',
    item: 'artículo',
    tagNotStarted: 'Sin empezar',
    tagTight: 'Vas justo de tiempo',
    tagOver: 'Te has pasado del presupuesto',
    tagOnTrack: 'En plazo',
    tagStalled: 'Parado',
    remaining: 'Queda',
    empty: 'Todavía no hay ningún proyecto. Un proyecto agrupa compras con un presupuesto y una fecha.',
    delete: 'Borrar proyecto',
    noDate: 'sin fecha',
  },

  historial: {
    driftPanel: 'Desviación de este escenario',
    driftUpPrefix: 'Este piso sale hoy',
    driftUpSuffix:
      'al mes más caro que cuando lo apuntaste. Merece la pena mirar qué línea se ha movido antes de dar el escenario por bueno.',
    driftDownPrefix: 'Este escenario sale hoy',
    driftDownSuffix: 'al mes más barato que cuando lo apuntaste.',
    driftFlatNote: 'Las revisiones se compensan: hoy cuesta lo mismo que cuando lo apuntaste.',
    driftNoneNote:
      'Sin cambios desde que lo apuntaste. Ninguna estimación se ha revisado todavía, así que no hay desviación que medir.',
    kpiRevisions: 'Revisiones',
    kpiRevisionsSub: 'conceptos revisados',
    kpiRevisionsSubOne: 'concepto revisado',
    kpiLastSub: 'sólo estimaciones, no gastos',
    kpiBiggest: 'Mayor subida',
    kpiBiggestNone: 'Ninguna',
    kpiLast: 'Última revisión',
    kpiLastNone: 'Nunca',
    panel: 'Todas las revisiones',
    newestFirst: 'Más recientes primero',
    filterView: 'Ver',
    filterAll: 'Todo',
    filterUp: 'Sólo subidas',
    filterDown: 'Sólo bajadas',
    colDate: 'Fecha',
    colConcept: 'Concepto',
    colAmount: 'Importe',
    colVsPrevious: 'vs anterior',
    colVsOriginal: 'vs original',
    colNote: 'Nota',
    initial: 'inicial',
    noChange: 'sin cambio',
    empty:
      'Todavía no hay revisiones. Cada vez que cambies un importe se apunta aquí, y así se ve si el piso se ha encarecido desde que lo planeaste.',
    note: 'Esto es un registro de estimaciones, no de gastos. No hay que apuntar nada a diario.',
    noteShort: 'No es un registro de gastos',
  },

  ajustes: {
    panelNumbers: 'Números del escenario',
    panelApp: 'Aplicación',
    panelData: 'Datos',
    scenarioName: 'Nombre del escenario',
    situacion: 'Situación',
    savings: 'Ahorro disponible',
    savingsHint: 'Lo que tienes hoy, antes de entrar. De aquí sale el margen y el colchón.',
    bufferTarget: 'Objetivo de colchón',
    bufferHint:
      'La reserva que quieres tener detrás. Lo que aportas cada mes es un concepto más en Costes, no un campo aparte.',
    maxRent: 'Regla de alquiler máximo',
    maxRentHint:
      'El único número constante de la app, y por eso se edita aquí. Se muestra como orientación en Resumen; nunca bloquea nada.',
    percentSuffix: '% de las entradas',
    exportTitle: 'Exportar / importar',
    exportHint:
      'Los datos viven en este dispositivo. El JSON es la copia de seguridad y la forma de pasarlos a otro sitio.',
    backupTitle: 'Sin cuenta, sin servidor, sin sincronización',
    backupNote:
      'Todo vive en este dispositivo. El fichero JSON es la única copia que existe: descárgalo antes de cambiar de móvil.',
    exportButton: 'Exportar JSON',
    importButton: 'Importar JSON',
    importError: 'Ese archivo no tiene la forma esperada. No se ha tocado nada.',
    importOk: 'Datos importados.',
    reset: 'Empezar de cero',
    resetConfirm: '¿Seguro? Se borra todo lo guardado en este dispositivo.',
    duplicate: 'Duplicar escenario',
    deleteScenario: 'Borrar escenario',
    deleteScenarioConfirm: '¿Borrar este escenario y todos sus conceptos?',
    lastScenario: 'Es el único escenario que queda.',
    createdOn: 'Creado el',

    panelStart: 'Punto de partida',
    checklistTitle: 'Checklist de gastos',
    checklistHint:
      'Un escenario nuevo nace vacío: los conceptos los pones tú, uno a uno, con el botón de añadir. Si prefieres empezar desde una lista hecha, esto añade la checklist completa —alquiler, suministros, consumibles, muebles— sin ningún importe puesto.',
    checklistButton: 'Cargar checklist',
    checklistNote: 'Se añade a lo que ya haya en este escenario; no borra nada.',
    checklistConfirmPrefix: '¿Añadir',
    checklistConfirmSuffix: 'conceptos a este escenario?',
    checklistDone: 'Checklist cargada en este escenario.',

    panelCategories: 'Categorías',
    categoriesHint:
      'Las categorías son tuyas y valen para todos los escenarios: renómbralas, bórralas o crea las que necesites. Cambiar el nombre no recoloca nada, sólo cambia cómo se llama.',
    categoryAdd: '+ Añadir categoría',
    categoryNew: 'Categoría nueva',
    deleteCategory: 'Borrar categoría',

    panelRooms: 'Habitaciones',
    roomsHint:
      'Lo mismo para las estancias de Muebles. Un piso tiene las habitaciones que tiene, y esta lista debería parecerse al que estás mirando.',
    roomAdd: '+ Añadir habitación',
    roomNew: 'Habitación nueva',
    deleteRoom: 'Borrar habitación',

    taxonUnused: 'sin usar',
    taxonFallback: 'no se puede borrar',
    taxonFallbackHint:
      'Otros no se borra: es donde caen las filas de cualquier categoría que quites, y por eso borrar nunca pierde datos.',
    confirmDeletePrefix: '¿Borrar',
    confirmDeleteMovedOne: 'pasa a',
    confirmDeleteMovedMany: 'pasan a',
    confirmDeleteSafe: 'No se pierde ningún importe.',
  },

  comparar: {
    panel: 'Comparar escenarios',
    onlyDifferences: 'Sólo diferencias',
    onlyDifferencesOn: 'Sólo diferencias · activo',
    against: 'Diferencias contra',
    here: 'aquí estás',
    equal: 'igual',
    insightLabel: 'La respuesta',
    note: 'Las diferencias se calculan contra el escenario activo. Cambiar la situación en la cabecera recalcula todas las columnas a la vez: es la forma de responder «¿y si consigo trabajo?» sin duplicar escenarios.',
    rowVerdict: 'Veredicto',
    rowFianza: 'Fianza (devolvible)',
    rowBalance: 'Balance / mes',
    rowIn: 'Entradas / mes',
    rowOut: 'Salidas / mes',
    rowUpfront: 'Dinero al entrar',
    rowSpend: 'Gasto real',
    rowSavingsLeft: 'Ahorro que queda',
    rowMargin: 'Margen / colchón',
    rowMissing: 'Conceptos sin importe',
    sameRowPrefix: 'conceptos idénticos en todos —',
    show: 'Mostrar',
    hide: 'Ocultar',
    bufferCovered: 'Colchón cubierto',
    monthsSuffix: 'meses',
    needTwo: 'Hace falta más de un escenario para comparar. Crea otro en Ajustes.',
    pick: 'Escenarios a comparar',
    insightBestPrefix: 'La opción que más margen deja es',
    insightBestMiddle: 'con',
    insightWorstPrefix: 'La que menos,',
    insightWorstMiddle: 'con',
    insightGapPrefix: 'Entre las dos hay',
    insightGapSuffix: 'de diferencia cada mes.',
    insightTie: 'Los escenarios comparados dejan exactamente el mismo margen.',
  },

  /**
   * The Sistema tab: the component sheet rendered against the live tokens.
   * Reference copy rather than product copy, but it is still Spanish on screen,
   * so it still lives here (IND008).
   */
  sistema: {
    tokensPanel: 'Tokens · :root',
    tokensNote: 'Una sola paleta · Papel',
    roles: {
      bg: 'fondo',
      card: 'tarjeta',
      sunk: 'relleno',
      ink: 'cabeceras',
      border: 'hairline',
      text: 'texto',
      muted: 'secundario',
      accent: 'acento · interacción',
      green: 'positivo',
      red: 'negativo',
      amber: 'aviso',
      blue: 'informativo',
    },
    typePanel: 'Tipografía · tres papeles fijos',
    typeNote: 'Archivo · JetBrains Mono · Public Sans',
    typeDisplay: 'Display · Archivo',
    typeDisplayUse: 'sólo cifras KPI y títulos',
    typeMono: 'Mono · JetBrains',
    typeMonoUse: 'etiquetas, tablas, botones, tags',
    typeBody: 'Body · Public Sans',
    typeBodySample: 'Con este piso te faltan 120 € al mes.',
    typeBodyUse: 'prosa e insights',
    componentsPanel: 'Componentes',
    sheetTags: 'Tags de veredicto y estado',
    sheetTagsNote:
      'El color es significado: verde, ámbar y rojo por signo. Azul es informativo — pagado, devolvible, pago único — y no es ni bueno ni malo. Pausado no lleva color: es una ausencia, no un juicio.',
    sheetCell: 'Celda editable · reposo / foco',
    sheetCellNote: 'el foco levanta la celda; no hay botón de guardar',
    sheetSelects: 'Selects de estado y dirección',
    sheetSelectsNote: 'el color lo decide el valor seleccionado, para leer la tabla de un vistazo',
    sheetButtons: 'Botones',
    sheetBars: 'Barras de reparto',
    sheetBarsNote:
      'Un solo tono de acento a opacidad descendente. Una categoría nunca tiene color propio: en cuanto vivienda es azul, el verde deja de significar «bien».',
  },

  common: {
    yes: 'Sí',
    no: 'No',
    none: '—',
    euro: '€',
    of: 'de',
    perMonth: '/mes',
    monthsShort: 'meses',
  },

  /**
   * The seeded checklist (docs/COST-CHECKLIST.md). Deliberately no prices:
   * a number baked into a repo is stale within a year and reads as
   * authoritative anyway.
   */
  seed: {
    alquiler: { label: 'Alquiler' },
    comunidad: { label: 'Gastos de comunidad', note: 'suele ser del casero — lee el contrato' },
    fianza: { label: 'Fianza', note: 'devolvible al salir; no es gasto, es dinero inmovilizado' },
    mesAnticipado: { label: 'Mes anticipado' },
    agencia: {
      label: 'Honorarios de agencia',
      note: 'del casero por ley desde 2023 — si te lo cobran, recláma­lo',
    },
    aval: { label: 'Aval o seguro de impago', note: 'si lo exige el casero; puede ser un mes de alquiler' },
    seguroHogar: { label: 'Seguro de hogar', note: 'anual, y muchos contratos lo exigen' },
    ibi: { label: 'IBI', note: 'del casero salvo que el contrato diga otra cosa' },
    tasaBasuras: { label: 'Tasa de basuras', note: 'consultar el importe en el ayuntamiento' },

    luz: { label: 'Luz', note: 'estacional — una media plana se queda corta en invierno' },
    agua: { label: 'Agua', note: 'suele facturarse cada dos meses' },
    gas: { label: 'Gas', note: 'suele facturarse cada dos meses' },
    internet: { label: 'Internet', note: 'la promo suele durar 12 meses — apunta el precio de después' },
    movil: { label: 'Móvil' },
    altasSuministros: { label: 'Altas de luz, agua, gas e internet', note: 'el alta es aparte de la factura' },
    boletinElectrico: { label: 'Boletín eléctrico', note: 'si la instalación no tiene certificado válido' },
    revisionCaldera: { label: 'Revisión de caldera o gas', note: 'la inspección periódica es obligatoria' },

    consumibles: {
      label: 'Consumibles del hogar',
      note: 'detergente, lejía, papel, bolsas — cada cosa es demasiado barata para pensarla, juntas son una línea real',
    },
    higiene: { label: 'Higiene personal' },
    botiquin: { label: 'Botiquín', note: 'analgésicos, tiritas, termómetro' },

    compraSemanal: { label: 'Compra semanal' },
    primeraCompra: {
      label: 'Primera compra grande',
      note: 'llenar una cocina vacía es un evento único, no una compra semanal',
    },
    comerFuera: { label: 'Comer fuera y vida social', note: 'lo primero que se subestima y lo último que se recorta' },

    abonoTransporte: { label: 'Abono de transporte' },
    viajesCasa: { label: 'Viajes a casa' },

    ocio: { label: 'Ocio' },
    suscripciones: { label: 'Suscripciones anuales', note: 'las que se renuevan sin que te enteres' },
    gimnasio: { label: 'Gimnasio', note: 'la matrícula es aparte de la cuota' },

    colchonEmergencia: { label: 'Colchón de emergencia', note: 'se construye mes a mes, no de golpe' },
    fondoElectrodomesticos: {
      label: 'Fondo de electrodomésticos',
      note: 'la lavadora se va a romper; la única pregunta es cuándo',
    },
    reparaciones: { label: 'Reparaciones y roturas', note: 'el primer año no hay repuesto de nada' },
    renovacionMovil: { label: 'Renovación de móvil', note: 'amortizar el coste real de reponerlo' },
    ropaCalzado: { label: 'Ropa y calzado', note: 'estacional y a golpes, no una línea mensual plana' },
    peluqueria: { label: 'Peluquería' },
    dentistaOptica: { label: 'Dentista y óptica' },
    regalos: { label: 'Regalos y bodas', note: 'una boda son regalo + ropa + viaje' },
    empadronamiento: { label: 'Empadronamiento', note: 'gratis, pero desbloquea el resto del papeleo' },
    duplicadoLlaves: { label: 'Duplicado de llaves' },
    cambioCerradura: { label: 'Cambio de cerradura', note: 'merece la pena si no sabes quién más tiene llave' },
    mudanza: { label: 'Mudanza', note: 'furgoneta, portes, cajas' },
    cambioDomicilio: { label: 'Cambio de domicilio', note: 'DNI, banco, tráfico, suscripciones' },

    beca: { label: 'Beca', note: 'comprueba hasta cuándo y si la renovación es segura' },
    ayudaFamiliar: { label: 'Ayuda familiar' },
    trabajoOcasional: { label: 'Trabajo ocasional', note: 'media de varios meses — no es un sueldo' },
  } as Record<string, { label: string; note?: string }>,

  seedFurniture: {
    sartenesOllas: { label: 'Sartenes y ollas' },
    cuchillosTabla: { label: 'Cuchillos y tabla de cortar' },
    vajilla: { label: 'Vajilla, cubiertos, vasos' },
    escurreplatos: { label: 'Escurreplatos, colador, abrelatas' },
    tuppers: { label: 'Tuppers' },
    microondas: { label: 'Microondas' },
    nevera: { label: 'Nevera', note: 'comprueba si el piso ya la lleva' },
    lavadora: { label: 'Lavadora', note: 'comprueba si el piso ya la lleva' },
    cafetera: { label: 'Cafetera' },
    mesaSillasCocina: { label: 'Mesa y sillas de cocina' },

    sofa: { label: 'Sofá' },
    mesaComedor: { label: 'Mesa de comedor' },
    sillas: { label: 'Sillas' },
    estanteria: { label: 'Estantería' },
    lamparaSalon: { label: 'Lámpara', note: 'muchos pisos se entregan sin ninguna' },
    cortinas: { label: 'Cortinas y barras' },

    colchon: { label: 'Colchón', note: 'esto sí, nuevo' },
    somier: { label: 'Somier o canapé' },
    sabanas: { label: 'Sábanas · dos juegos', note: 'uno puesto y otro lavando' },
    nordico: { label: 'Nórdico y funda' },
    almohadas: { label: 'Almohadas y fundas' },
    armario: { label: 'Armario' },
    mesillaLampara: { label: 'Mesilla y lámpara' },

    toallas: { label: 'Toallas · ducha y manos' },
    cortinaDucha: { label: 'Cortina de ducha' },
    espejoBano: { label: 'Espejo' },
    muebleBano: { label: 'Mueble de baño' },

    escobaFregona: { label: 'Escoba, recogedor, cubo y fregona' },
    tendedero: { label: 'Tendedero y pinzas' },
    cestoRopa: { label: 'Cesto de la ropa' },
    aspiradora: { label: 'Aspiradora' },
    planchaTabla: { label: 'Plancha y tabla' },
    alfombras: { label: 'Alfombras y mantas' },
  } as Record<string, { label: string; note?: string }>,

  scenario: {
    firstName: 'Mi primer escenario',
    /** Distinct from `firstName` on purpose: the header picker lists names, and
     *  two identical entries read as a button that did nothing. */
    newName: 'Escenario nuevo',
    copySuffix: '(copia)',
  },
} as const;

export type Strings = typeof es;
