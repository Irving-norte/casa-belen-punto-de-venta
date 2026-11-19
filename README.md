# Casa Belén — Punto de venta

Punto de venta de la tienda física de Cerería Casa Belén, para usarse en una
tablet. Es una PWA (app web instalable) que funciona sin internet: todo se
guarda primero en la tablet (IndexedDB) y se sincroniza con la hoja de
inventario de Google cuando hay conexión.

**App en vivo:** https://irving-norte.github.io/casa-belen-punto-de-venta/

Pruebas end-to-end (Playwright): [casa-belen-punto-de-venta-qa](https://github.com/Irving-norte/casa-belen-punto-de-venta-qa)

---

## Qué hace

### Fase 1 — la caja

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

### Fase 2 — la hoja de inventario

- **Hoja de Google + Apps Script** (`apps-script/`, ver su
  [README](apps-script/README.md) para instalarla): Productos, Categorías,
  Existencias, Movimientos, Ventas, Detalle de ventas, Pagos, Gastos y Cortes.
- **Sincronización automática**: al abrir la app, al volver el internet,
  segundos después de cada venta, gasto o corte, y cada 3 minutos. También con
  «Sincronizar ahora». Cada registro lleva un ID: reenviar nunca duplica.
- **Productos y precios desde la hoja**: la tablet los descarga; cambiar un
  precio ya no requiere publicar la app. `src/data/catalogo.ts` queda como
  catálogo de arranque (antes de la primera descarga).
- **Existencias** por movimientos (ventas, entradas y conteos). La tablet
  muestra «Quedan 3» / «Quedan 1.5 kg» y avisa «Sin existencias», pero nunca
  bloquea una venta. Las ceras se descuentan en gramos del mismo costal (1 kg y
  ½ kg). Lo que nunca se ha contado no muestra existencia.
- **Vinculación** con un enlace que genera la hoja (Casa Belén → Vincular
  tablet). La clave no está en el código: la app es pública.
- **Indicador** en el encabezado («Hoja al día», «2 por subir», «Sin
  internet…») que lleva a la pantalla de la hoja.
- **Entornos separados**: la app de producción solo sincroniza con la hoja
  real y la de QA solo con la de pruebas (lo revisan la app y el script).
- **Privacidad**: el teléfono del cliente del ticket no se sube a la hoja.

## Stack

Vite + React + TypeScript + Tailwind CSS 4 + Dexie (IndexedDB) +
`vite-plugin-pwa`. Sin servidor: el sitio es 100% estático y se publica en
GitHub Pages.

```bash
npm install
npm run dev            # servidor local con recarga en vivo
npm run build          # typecheck + build de producción
npm run catalogo:hoja  # regenera apps-script/CatalogoInicial.gs desde src/data/catalogo.ts
```

Cada `git push` a `main` corre `.github/workflows/desplegar.yml`
(typecheck, build y publicación). En cada Pull Request, `ci.yml` corre el
typecheck, el build y revisa que `apps-script/CatalogoInicial.gs` esté al día.

## Entorno de QA

La misma app se construye en modo QA desde el repo
[casa-belen-punto-de-venta-qa](https://github.com/Irving-norte/casa-belen-punto-de-venta-qa),
que la publica en https://irving-norte.github.io/casa-belen-punto-de-venta-qa/ y
corre las pruebas de Playwright contra ella.

```bash
VITE_ENTORNO=qa VITE_BASE=/casa-belen-punto-de-venta-qa/ npm run build
```

En QA la app muestra la franja «QA · datos de prueba» y usa su propia base de
datos (`casa-belen-pos-qa`) y sus propias claves de almacenamiento. Producción y
QA viven en el mismo dominio y el navegador separa los datos por dominio, así
que sin esto se mezclarían si un mismo navegador abre los dos. Regla: la tablet
de la tienda solo abre producción.

Los elementos que usan las pruebas llevan `data-testid`. Si cambias uno,
actualiza el localizador correspondiente en el repo de QA.

## Estructura

```
apps-script/         ← Script de la hoja de Google (se pega en la hoja).
scripts/             ← catalogo-hoja.ts (genera el catálogo inicial de la hoja).
src/
  data/catalogo.ts   ← Catálogo de arranque (precios en pesos, legibles).
  lib/
    dominio/         ← Reglas de negocio puras: precios, carrito, pagos,
                       corte, ticket, existencias. Sin React ni base de datos.
    db/              ← Base local (Dexie): cajas, ventas, gastos y lo que
                       se recibe de la hoja (hoja.repo.ts).
    sincronizacion/  ← Formato de los mensajes con la hoja, llamada al
                       script, validación y el ciclo de sincronización.
    hooks/           ← Conecta dominio y base con React (catálogo vigente,
                       existencias, sincronización, venta en curso).
  componentes/       ← Teclado numérico, modal, indicador de la hoja, estilos.
  pantallas/         ← Apertura, Vender, Cobrar, Ticket, Ventas, Gastos, Corte,
                       Vincular, Sincronización.
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
- **La hoja manda en productos, precios y existencias; la tablet manda en
  ventas, gastos y cortes.** La tablet nunca edita la hoja salvo para agregar
  lo que vendió.
- **Existencias = hoja − lo vendido sin subir.** La hoja manda la foto y marca
  lo subido en la misma respuesta; la tablet aplica las dos cosas en una sola
  transacción, así nunca descuenta una venta dos veces.
- **POST con `text/plain`** al Apps Script: evita la consulta previa de CORS,
  que Apps Script no contesta.
