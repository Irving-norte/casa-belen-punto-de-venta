# Hoja de inventario (Google Sheets + Apps Script)

El script de esta carpeta vive dentro de la hoja de Google de la tienda. Hace
dos cosas:

- **Menú «Casa Belén»** en la hoja: preparar la hoja, registrar entradas y
  conteos, revisar productos y vincular la tablet.
- **Aplicación web** que llama la tablet: recibe ventas, pagos, gastos y
  cortes, y le regresa los productos, precios y existencias.

| Archivo | Qué es |
|---|---|
| `Codigo.gs` | Todo el script. |
| `CatalogoInicial.gs` | Los productos con los que arranca una hoja nueva. **Generado** con `npm run catalogo:hoja` desde `src/data/catalogo.ts`. |
| `appsscript.json` | Manifiesto (zona horaria y permisos de la aplicación web). Opcional. |

> **Dos hojas, nunca mezcladas.** La hoja real de la tienda y una hoja de
> pruebas aparte para QA. Al preparar cada una se le dice cuál es; la tablet de
> la tienda (app de producción) no puede sincronizar con la de pruebas, ni la
> app de QA con la real.

---

## Instalar (una vez por hoja)

1. **Crear la hoja.** En Google Sheets, con la cuenta de la tienda, crea una
   hoja nueva. Nombre sugerido: «Casa Belén · Inventario» (la de pruebas:
   «Casa Belén · Inventario QA»).
2. **Pegar el script.** En la hoja: **Extensiones → Apps Script**.
   - Borra lo que trae `Código.gs` y pega el contenido de `Codigo.gs`.
   - Agrega un archivo (**+ → Secuencia de comandos**) llamado `CatalogoInicial`
     y pega `CatalogoInicial.gs`.
   - Guarda (ícono de disco).
3. **Preparar la hoja.** Recarga la hoja. Aparece el menú **Casa Belén**.
   **Casa Belén → Preparar hoja**.
   - Google pide autorizar: elige la cuenta → «Configuración avanzada» → «Ir a
     … (no seguro)» → Permitir. Es tu propio script; Google avisa porque no lo
     revisó.
   - Pregunta si es la hoja de PRUEBAS: **No** para la hoja real, **Sí** para
     la de QA. No se puede cambiar después.
   - Crea las pestañas y carga los 206 productos y sus existencias en 0.
4. **Publicar la aplicación web.** En Apps Script: **Implementar → Nueva
   implementación → ⚙ → Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**. La tablet no inicia sesión en
     Google. Lo que protege la hoja es la clave de la tablet.
   - **Implementar** y copia la URL que termina en `/exec`.
5. **Vincular la tablet.** En la hoja: **Casa Belén → Vincular tablet**. La
   primera vez te pide la URL `/exec` del paso 4: pégala. Copia el enlace,
   mándatelo (por ejemplo, por WhatsApp) y ábrelo **en Chrome de la tablet** →
   **Vincular esta tablet**. La tablet sube lo pendiente y descarga productos y
   existencias. Para la hoja de pruebas, ábrelo en una computadora o teléfono,
   nunca en la tablet de la tienda.

   Si la tablet dice «No se pudo conectar con la hoja» y sí hay internet:
   abre la URL `/exec` en una ventana de incógnito (debe mostrar
   `{"ok":true,…}`; si pide iniciar sesión, el acceso no es «Cualquier
   usuario»), revisa con **Casa Belén → Cambiar dirección del script** que la
   URL guardada sea la tuya y genera un enlace nuevo.
6. **Inventario inicial.** En la pestaña **Existencias**, escribe en la
   columna **Conteo** lo que hay de cada cosa (piezas; gramos para las ceras)
   y usa **Casa Belén → Registrar entradas y conteos**. Lo que no se cuenta no
   muestra existencia en la tablet.

## Uso diario

| Para… | En la hoja |
|---|---|
| Registrar mercancía que llegó | Existencias → columna **Entrada** → Casa Belén → Registrar entradas y conteos |
| Corregir con un conteo físico | Existencias → columna **Conteo** → Casa Belén → Registrar entradas y conteos (registra la diferencia como ajuste). Antes de registrar, la hoja dice cuándo sincronizó la tablet por última vez. |
| Cambiar un precio o un nombre | Productos → edita la celda. La tablet lo recibe en su siguiente sincronización (o con «Sincronizar ahora»). |
| Agregar un producto | Productos → renglón nuevo con Categoría, Nombre y precio; deja el **ID vacío** (lo pone el script). |
| Dejar de vender algo | Productos → **Activo = No**. No borres renglones: las ventas pasadas los usan. |
| Ver si algo tiene errores | Casa Belén → Revisar productos |
| Ver qué falta reabastecer | Existencias → columna **Mínimo**; «Estado» dice «Reabastecer» al llegar a ese número |

**Regla de conteo.** Un conteo compara lo que contaste contra lo que dice la
hoja en ese momento. Si la tablet tiene una venta sin subir, esa venta se
descontaría dos veces (en el ajuste y al subir). Por eso: cuenta con la
tablet en **«Hoja al día»** y no vendas entre que cuentas y le das
*Registrar*. Lo más fácil es contar al cerrar, después del corte. Si algo
queda mal, vuelve a contar ese producto: el conteo deja la existencia en lo
que contaste. Las entradas solo suman: se registran a cualquier hora.

Las columnas **Existencia** y **Estado** son fórmulas (la suma de
Movimientos): no escribas en ellas. Si alguien escribe encima o aparece
`#ERROR!`, el script vuelve a poner las fórmulas en la siguiente
sincronización de la tablet (o al usar Registrar entradas y conteos). Lo que
ve la tablet siempre sale de Movimientos, no de esa columna.

Reglas de la pestaña Productos:

- **Precio General** y **Precio Alumno**: si Alumno está vacío o es igual,
  el precio es el mismo para los dos.
- **Productos variables** (cirios, portavelas…): llena **Precio mínimo** y
  **Precio máximo** y deja vacíos los otros dos; el vendedor captura el precio.
- **Variantes**: colores separados por coma («Amarillo, Azul, Rojo»). Cada
  color lleva su propia existencia.
- **Artículo** y **Descuenta**: solo para lo que sale de un mismo costal. Ej.:
  «Soya APF 1 kg» y «Soya APF ½ kg» tienen Artículo «Soya APF» y descuentan
  1000 y 500 (gramos). Vacío = el producto lleva su propia existencia por pieza.

Las pestañas **Movimientos, Ventas, Detalle de ventas, Pagos, Gastos y
Cortes** las llena la tablet: están protegidas con advertencia porque
corregirlas a mano descuadra las existencias y el corte.

## Actualizar el script

Cuando cambie `Codigo.gs` en el repo:

1. Pega la versión nueva en Apps Script y guarda.
2. **Implementar → Administrar implementaciones → ✏️ (editar) → Versión:
   Nueva versión → Implementar.** Así la URL `/exec` no cambia y la tablet
   sigue vinculada. Una *Nueva implementación* crearía otra URL y habría que
   volver a vincular.

`CatalogoInicial.gs` solo se usa al preparar una hoja con Productos vacía; en
una hoja que ya está en uso no hace falta actualizarlo.

## Seguridad

- La **clave de la tablet** se guarda en las propiedades del script, no en
  una celda: quien tenga acceso a la hoja compartida no la ve. Va dentro del
  enlace de vinculación: no lo compartas. Si se filtra: **Casa Belén → Cambiar
  clave de la tablet** y vuelve a vincular.
- El texto que manda la tablet se guarda siempre como texto (nunca como
  fórmula).
- El **teléfono del cliente** del ticket no sale de la tablet.
- Con una cuenta de Google Workspace, el administrador puede impedir el acceso
  «Cualquier usuario»; con una cuenta normal de Gmail funciona.

## Pruebas

El repo [casa-belen-punto-de-venta-qa](https://github.com/Irving-norte/casa-belen-punto-de-venta-qa)
corre este mismo script sobre una hoja simulada (sin Google): módulos
`tests/hoja` (el script solo) y `tests/sincronizacion` (la app y el script
juntos). La instalación real en una hoja de pruebas de Google es el caso
manual MA-02.
