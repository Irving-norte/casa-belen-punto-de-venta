# Casa Belén — Punto de venta

Punto de venta de la tienda física de Cerería Casa Belén, para usarse en una
tablet. Es una PWA (app web instalable) que funciona sin internet: todo se
guarda primero en la tablet (IndexedDB).

**App en vivo:** https://irving-norte.github.io/casa-belen-punto-de-venta/

Pruebas end-to-end (Playwright): [casa-belen-punto-de-venta-qa](https://github.com/Irving-norte/casa-belen-punto-de-venta-qa)

---

## Qué hace (fase 1)

- **Apertura de caja** con fondo inicial en efectivo. Sin caja abierta no se vende.
- **Venta**: catálogo por categoría y buscador, tarifa General / Alumno,
  pigmentos por color y productos variables con precio capturado.
- **Productos variables** (cirios, portavelas, copaleros, cera escamada):
  el vendedor escribe el precio; fuera del rango mínimo–máximo la app pide
  confirmar, pero no bloquea.
- **Cobro** en efectivo, tarjeta, transferencia o mixto. El efectivo
  calcula el cambio; tarjeta y transferencia solo se registran.
- **Ticket por WhatsApp**: abre WhatsApp con el ticket escrito.
- **Gastos del día** (bolsas, cajas…) que salen del efectivo.
- **Corte de caja**: efectivo esperado = fondo + ventas en efectivo − gastos,
  contra el efectivo contado.

Pendiente (fase 2): sincronizar con la hoja de inventario en Google Sheets
(Apps Script en `apps-script/`).

## Stack

Vite + React + TypeScript + Tailwind CSS 4 + Dexie (IndexedDB) +
`vite-plugin-pwa`. Sin servidor: el sitio es 100% estático y se publica en
GitHub Pages.

```bash
npm install
npm run dev       # servidor local con recarga en vivo
npm run build     # typecheck + build de producción
```

Cada `git push` a `main` corre `.github/workflows/desplegar.yml`
(typecheck, build y publicación). En cada Pull Request, `ci.yml` corre el
typecheck y el build.

## Estructura

```
src/
  data/catalogo.ts   ← Catálogo completo (precios en pesos, legibles).
  lib/
    dominio/         ← Reglas de negocio puras: precios, carrito, pagos,
                       corte, ticket. Sin React ni base de datos.
    db/              ← Base local (Dexie): cajas, ventas, gastos.
    hooks/           ← Conecta dominio y base con React.
  componentes/       ← Teclado numérico, modal, estilos compartidos.
  pantallas/         ← Apertura, Vender, Cobrar, Ticket, Ventas, Gastos, Corte.
```

## Decisiones que vale la pena recordar

- **Dinero en centavos, siempre.** Nunca flotantes (`src/lib/dominio/dinero.ts`).
- **El precio se congela al agregar la línea.** Cambiar el catálogo no altera
  ventas ya hechas. Cambiar General ↔ Alumno antes de cobrar sí recalcula,
  excepto los precios capturados a mano.
- **El folio se asigna dentro de la misma transacción** que guarda la venta:
  dos ventas nunca comparten número.
- **El carrito sobrevive a una recarga** (se guarda en el navegador).
- **Una sola tablet y una sola caja.**
- **Inventario de la tienda física separado** del de la tienda en línea.
