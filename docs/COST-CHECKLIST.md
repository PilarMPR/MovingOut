# Cost checklist — the things nobody budgets for

The reference list of costs that get left out of "I need X for rent and Y for food", and the source for the app's **default seeded entries**. Madrid-flavoured.

The failure mode this file exists to prevent: a budget that looks fine, and then month one costs 400 € more than planned because every item below is individually too small to think about.

**Deliberately no prices.** Every item has a suggested `direction` and `frequency`, and the amount is left blank. Real figures come from the user's own research at the time they need them — a number baked into a repo is stale within a year and reads as authoritative anyway. See the corresponding warning in [`../CLAUDE.md`](../CLAUDE.md#taxes--local-charges).

Columns map onto `Entry` in `src/types.ts`. `dir` is `entrada`/`salida`; `esencial` marks what you genuinely cannot move in without.

---

## 1. Consumables — the detergent problem

The category this whole file is named after. Every item is too cheap to think about; together they are a real monthly line, and almost every first budget omits them entirely. Model them as **one `consumibles` entry** with a monthly amount rather than thirty rows — the point is that the line exists, not that it is itemised.

| item | freq | esencial |
|---|---|---|
| Detergente, suavizante, pastillas de lavavajillas | mensual | ✓ |
| Lejía, limpiacristales, friegasuelos, limpiador multiusos | mensual | ✓ |
| Papel higiénico | mensual | ✓ |
| Papel de cocina, servilletas | mensual | |
| Bolsas de basura | mensual | ✓ |
| Bayetas, estropajos, esponjas, recambios de fregona | trimestral | ✓ |
| Film transparente, papel de aluminio, papel de horno, bolsas zip | trimestral | |
| Pilas, bombillas | trimestral | |
| Higiene personal — champú, gel, pasta y cepillo de dientes, desodorante, cuchillas | mensual | ✓ |
| Productos menstruales | mensual | ✓ |
| Botiquín — analgésicos, tiritas, termómetro, antiséptico | anual | ✓ |
| Ambientador, insecticida | anual | |

## 2. The first big shop

Stocking an empty kitchen is **a one-off event, not a weekly shop**, and folding it into `alimentacion` is what silently blows month one. Give it its own `unico` entry.

| item | freq | esencial |
|---|---|---|
| Despensa base — aceite, sal, azúcar, harina, vinagre, especias | único | ✓ |
| Conservas y básicos de armario — legumbres, pasta, arroz, tomate | único | ✓ |
| Café, té, y whatever makes a kitchen feel like yours | único | |

## 3. Kitchen starter kit

You cannot cook anything on day one without these, and they are rarely in the "furniture" mental list.

| item | freq | esencial |
|---|---|---|
| Sartenes y ollas | único | ✓ |
| Cuchillos, tabla de cortar | único | ✓ |
| Vajilla, cubiertos, vasos, tazas | único | ✓ |
| Escurreplatos, colador, abrelatas, sacacorchos | único | ✓ |
| Tuppers | único | ✓ |
| Rallador, batidora, cafetera | único | |

## 4. Textiles

| item | freq | esencial |
|---|---|---|
| Sábanas — **two sets**, so one can be in the wash | único | ✓ |
| Nórdico o edredón, funda | único | ✓ |
| Almohadas y fundas | único | ✓ |
| Toallas — ducha y manos | único | ✓ |
| Cortinas y barras | único | |
| Alfombras, mantas | único | |

## 5. Cleaning kit

| item | freq | esencial |
|---|---|---|
| Escoba, recogedor, cubo y fregona | único | ✓ |
| Aspiradora | único | |
| Tendedero y pinzas | único | ✓ |
| Cesto de la ropa | único | |
| Plancha y tabla | único | |

## 6. Admin & setup one-offs

The invisible tax of arriving. Almost none of this appears in a rent calculation.

| item | freq | esencial | note |
|---|---|---|---|
| Altas de luz, agua, gas, internet | único | ✓ | connection fees are separate from the monthly bill |
| Boletín eléctrico | único | | required if the installation has no valid certificate |
| Empadronamiento | único | ✓ | free, but gates other paperwork |
| Cambio de domicilio — DNI, banco, tráfico, suscripciones | único | | mostly time, occasionally a fee |
| Duplicado de llaves | único | ✓ | |
| Cambio de cerradura | único | | worth it if you don't know who else has a key |
| Mudanza — furgoneta, portes, cajas | único | ✓ | |
| Montaje de muebles | único | | assembly service, if you'd rather not |
| Aval o seguro de impago | único | | if the landlord demands one; can be a month's rent |
| Fianza | único | ✓ | **refundable** — belongs in `upfrontCash`, never in `actualSpend` |
| Honorarios de agencia | único | | **should be 0** — the landlord's by law since 2023. Challenge it, don't budget it |

## 7. Lumpy non-monthly costs

The category that breaks flat monthly budgets. None of these are monthly, all of them arrive. Store each with its **real** frequency and let `toMonthly()` do the work (`IND004`).

| item | freq | note |
|---|---|---|
| Seguro de hogar | anual | often required by the contract |
| Revisión de caldera / gas | anual | periodic inspection is a legal requirement |
| Tasa de basuras | anual | municipal waste charge, now billed to residents |
| Gastos de comunidad | mensual | usually the landlord's — **read the contract** |
| Dentista, óptica — gafas o lentillas | anual | |
| Peluquería | trimestral | every few weeks in practice |
| Ropa y calzado | trimestral | seasonal and lumpy, not a flat monthly line |
| Regalos — cumpleaños, Navidad | anual | |
| Bodas | anual | 100–200 € gift *plus* an outfit *plus* travel |
| Viajes a casa | trimestral | |
| Gimnasio — matrícula | único | the joining fee is separate from the monthly cuota |
| Suscripciones anuales | anual | the ones that renew without you noticing |
| Renovación de DNI / pasaporte | anual | |
| Mascota — pienso, veterinario, vacunas | mensual + anual | routine monthly, vet is lumpy |

## 8. Replacement funds

Nothing lasts forever, and in year one there are **no spares of anything**. Model these as a monthly contribution toward a known future cost — the same shape as the emergency buffer.

| item | freq | note |
|---|---|---|
| Fondo de electrodomésticos | mensual | the washing machine will break; the only question is when |
| Renovación de móvil | mensual | amortise the real replacement cost |
| Renovación de portátil | mensual | |
| Reparaciones y roturas | mensual | the "broken things" budget this app was started for |

## 9. Underestimated by default

Not forgotten so much as wishfully small. Worth an explicit entry precisely because the honest number is uncomfortable.

- **Vida social y comer fuera** — the first thing underestimated and the last thing actually cut.
- **The cost of having no spare** — every small failure in year one is a full-price purchase, not a swap from the cupboard.
- **Income timing** — the first money in may land after the first bills go out. A budget that balances monthly can still fail in week one.
- **Second-hand vs new** — Wallapop and a bit of patience move real money; worth recording as a `note` on the expensive furniture rows so the plan and the reality can be compared later.

---

## Using this list

- Seed a new scenario with the `esencial` rows from sections 1–6 and all of 7–8, amounts blank.
- Filtering the Muebles tab to `esencial` gives the true minimum to move in.
- When an amount is filled in for the first time, that is the first `history` entry — everything after it is a revision, and the Historial tab shows the drift (`IND002`).
