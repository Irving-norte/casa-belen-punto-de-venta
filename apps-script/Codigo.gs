/**
 * Cerería Casa Belén — Punto de venta
 * Apps Script de la hoja de inventario (fase 2).
 *
 *  - Menú «Casa Belén» en la hoja: preparar la hoja, registrar entradas y
 *    conteos, revisar productos y vincular la tablet.
 *  - Aplicación web (doPost): recibe de la tablet ventas, pagos, gastos y
 *    cortes, y le regresa el catálogo (pestaña Productos) y las existencias.
 *
 * Este archivo vive en el repo Irving-norte/casa-belen-punto-de-venta
 * (carpeta apps-script/). No lo edites en la hoja: cámbialo en el repo y
 * vuelve a pegarlo, para que los dos nunca se separen. Instalación:
 * apps-script/README.md.
 *
 * Reglas:
 *  - Las existencias nunca se escriben a mano: son la suma de la pestaña
 *    Movimientos (ventas restan; entradas y conteos se registran con el menú).
 *  - Todo lo que sube la tablet lleva un ID: si llega dos veces, no se duplica.
 *  - El dinero llega en centavos (enteros) y se escribe en pesos.
 */

var VERSION_PROTOCOLO = 1;

var URL_APP = {
  produccion: 'https://irving-norte.github.io/casa-belen-punto-de-venta/',
  qa: 'https://irving-norte.github.io/casa-belen-punto-de-venta-qa/',
};

var ZONA_HORARIA = 'America/Mexico_City';
var FORMATO_DINERO = '$#,##0.00';
var FORMATO_FECHA = 'dd/mm/yyyy hh:mm';
var UNIDAD_POR_DEFECTO = 'pieza';

/** Propiedades del script (no visibles en la hoja compartida). */
var PROP = { entorno: 'ENTORNO', clave: 'CLAVE_TABLET', urlScript: 'URL_SCRIPT' };

var TABLAS = {
  productos: {
    nombre: 'Productos',
    columnas: ['ID', 'Categoría', 'Nombre', 'Precio General', 'Precio Alumno', 'Precio mínimo',
      'Precio máximo', 'Variantes', 'Artículo', 'Descuenta', 'Activo'],
  },
  categorias: { nombre: 'Categorías', columnas: ['ID', 'Nombre'] },
  existencias: {
    nombre: 'Existencias',
    columnas: ['Clave', 'Artículo', 'Variante', 'Unidad', 'Existencia', 'Mínimo', 'Estado',
      'Entrada', 'Conteo', 'Nota'],
  },
  movimientos: {
    nombre: 'Movimientos',
    columnas: ['ID', 'Fecha', 'Tipo', 'Clave', 'Artículo', 'Variante', 'Cantidad', 'Unidad',
      'Referencia', 'Nota'],
  },
  ventas: {
    nombre: 'Ventas',
    columnas: ['ID', 'Folio', 'Fecha', 'Caja', 'Cliente', 'Piezas', 'Total', 'Efectivo', 'Tarjeta',
      'Transferencia', 'Cambio', 'Subida'],
  },
  detalle: {
    nombre: 'Detalle de ventas',
    columnas: ['Venta', 'Folio', 'Fecha', 'Producto ID', 'Producto', 'Categoría', 'Variante',
      'Cantidad', 'Precio unitario', 'Subtotal', 'Cliente', 'Precio capturado', 'Fuera de rango'],
  },
  pagos: { nombre: 'Pagos', columnas: ['Venta', 'Folio', 'Fecha', 'Forma', 'Monto', 'Referencia'] },
  gastos: {
    nombre: 'Gastos',
    columnas: ['ID', 'Fecha', 'Caja', 'Concepto', 'Monto', 'Nota', 'Subido'],
  },
  cortes: {
    nombre: 'Cortes',
    columnas: ['Caja', 'Apertura', 'Cierre', 'Fondo inicial', 'Ventas', 'Efectivo', 'Tarjeta',
      'Transferencia', 'Total vendido', 'Gastos', 'Efectivo esperado', 'Efectivo contado',
      'Diferencia', 'Subido'],
  },
};

/** Orden de las pestañas en la hoja. */
var ORDEN_TABLAS = ['productos', 'categorias', 'existencias', 'movimientos', 'ventas', 'detalle',
  'pagos', 'gastos', 'cortes'];

/** Pestañas que solo escribe la tablet o el menú: se protegen con advertencia. */
var TABLAS_AUTOMATICAS = ['movimientos', 'ventas', 'detalle', 'pagos', 'gastos', 'cortes'];

var FORMAS_PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
var TIPOS_CLIENTE = { general: 'General', alumno: 'Alumno' };

// ===========================================================================
// Menú
// ===========================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Casa Belén')
    .addItem('Registrar entradas y conteos', 'menuRegistrarEntradasYConteos')
    .addItem('Revisar productos', 'menuRevisarProductos')
    .addSeparator()
    .addItem('Vincular tablet', 'menuVincularTablet')
    .addItem('Cambiar clave de la tablet', 'menuCambiarClave')
    .addItem('Cambiar dirección del script', 'menuCambiarUrlScript')
    .addSeparator()
    .addItem('Preparar hoja', 'menuPrepararHoja')
    .addToUi();
}

function menuPrepararHoja() {
  var ui = SpreadsheetApp.getUi();
  var entorno = entornoDeLaHoja();
  if (!entorno) {
    var respuesta = ui.alert(
      '¿Esta es la hoja de PRUEBAS (QA)?',
      'Responde «Sí» solo si esta hoja es para pruebas. La hoja real de la tienda es «No».\n\n' +
        'Esto no se puede cambiar después: la tablet de la tienda solo sincroniza con la hoja real.',
      ui.ButtonSet.YES_NO_CANCEL,
    );
    if (respuesta === ui.Button.CANCEL || respuesta === ui.Button.CLOSE) return;
    entorno = respuesta === ui.Button.YES ? 'qa' : 'produccion';
  }
  var resumen = prepararHoja(entorno);
  ui.alert(
    'Hoja lista' + (entorno === 'qa' ? ' (PRUEBAS)' : ''),
    resumen.categorias + ' categorías, ' + resumen.productos + ' productos y ' +
      resumen.existencias + ' renglones de existencias.\n\n' +
      (resumen.errores.length ? 'Hay ' + resumen.errores.length +
        ' productos con errores: usa «Revisar productos».\n\n' : '') +
      'Siguiente paso: Implementar → Nueva implementación → Aplicación web, y luego ' +
      'Casa Belén → Vincular tablet.',
    ui.ButtonSet.OK,
  );
}

function menuRegistrarEntradasYConteos() {
  var ui = SpreadsheetApp.getUi();
  if (!entornoDeLaHoja()) return ui.alert('Primero usa Casa Belén → Preparar hoja.');
  var r = registrarEntradasYConteos();
  var partes = [];
  partes.push(r.entradas + (r.entradas === 1 ? ' entrada registrada' : ' entradas registradas'));
  partes.push(r.ajustes + (r.ajustes === 1 ? ' conteo con diferencia' : ' conteos con diferencia') +
    ' (se registró el ajuste)');
  if (r.sinDiferencia) partes.push(r.sinDiferencia + ' conteos sin diferencia');
  var texto = partes.join('\n');
  if (r.errores.length) {
    texto += '\n\nNo se registraron (se quedaron en la hoja):\n' + r.errores.map(function (e) {
      return '• Renglón ' + e.fila + ': ' + e.mensaje;
    }).join('\n');
  }
  ui.alert('Entradas y conteos', texto, ui.ButtonSet.OK);
}

function menuRevisarProductos() {
  var ui = SpreadsheetApp.getUi();
  if (!entornoDeLaHoja()) return ui.alert('Primero usa Casa Belén → Preparar hoja.');
  var catalogo = construirCatalogo();
  if (!catalogo.errores.length) {
    return ui.alert('Productos', 'Todo bien: ' + catalogo.productos.length +
      ' productos activos se mandan a la tablet.', ui.ButtonSet.OK);
  }
  ui.alert('Productos con errores (no llegan a la tablet)', catalogo.errores.map(function (e) {
    return '• ' + e.pestana + ', renglón ' + e.fila + ': ' + e.mensaje;
  }).join('\n'), ui.ButtonSet.OK);
}

function menuVincularTablet() {
  var ui = SpreadsheetApp.getUi();
  var entorno = entornoDeLaHoja();
  if (!entorno) return ui.alert('Primero usa Casa Belén → Preparar hoja.');

  var url = urlDelScript();
  if (!url) {
    url = pedirUrlScript();
    if (!url) return;
  }
  var enlace = enlaceDeVinculacion(entorno, url, claveDeLaTablet(true));
  var html = HtmlService.createHtmlOutput(htmlVinculacion(entorno, enlace)).setWidth(560).setHeight(380);
  ui.showModalDialog(html, 'Vincular tablet' + (entorno === 'qa' ? ' (PRUEBAS)' : ''));
}

function menuCambiarClave() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert(
    '¿Cambiar la clave de la tablet?',
    'La tablet dejará de sincronizar hasta que la vuelvas a vincular con el enlace nuevo ' +
      '(Casa Belén → Vincular tablet). Úsalo si el enlace se compartió por error.',
    ui.ButtonSet.YES_NO,
  );
  if (r !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().setProperty(PROP.clave, nuevaClave());
  ui.alert('Clave cambiada. Ahora usa Casa Belén → Vincular tablet.');
}

function menuCambiarUrlScript() {
  if (pedirUrlScript()) SpreadsheetApp.getUi().alert('Dirección guardada.');
}

function pedirUrlScript() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt(
    'Dirección de la aplicación web',
    'Pégala desde Implementar → Administrar implementaciones (termina en /exec).',
    ui.ButtonSet.OK_CANCEL,
  );
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  var url = String(r.getResponseText()).trim();
  if (!esUrlScript(url)) {
    ui.alert('Esa dirección no parece de una aplicación web de Apps Script (debe terminar en /exec).');
    return null;
  }
  PropertiesService.getScriptProperties().setProperty(PROP.urlScript, url);
  return url;
}

function htmlVinculacion(entorno, enlace) {
  var seguro = escaparHtml(enlace);
  return '<div style="font:14px/1.5 Arial,sans-serif;color:#2C1810">' +
    (entorno === 'qa'
      ? '<p style="background:#F7EACB;padding:6px 10px;border-radius:6px"><b>Hoja de PRUEBAS.</b> ' +
        'Este enlace abre la app de QA. Nunca lo abras en la tablet de la tienda.</p>'
      : '') +
    '<ol style="padding-left:18px;margin:0 0 10px">' +
    '<li>Copia el enlace.</li>' +
    '<li>Ábrelo en Chrome de la tablet (por ejemplo, mándatelo por WhatsApp).</li>' +
    '<li>En la tablet toca <b>Vincular</b>.</li></ol>' +
    '<textarea id="e" readonly style="width:100%;height:110px;font:12px monospace">' + seguro +
    '</textarea>' +
    '<p><button onclick="var t=document.getElementById(\'e\');t.select();' +
    'try{navigator.clipboard.writeText(t.value);}catch(x){document.execCommand(\'copy\');}' +
    'this.textContent=\'Copiado\'">Copiar enlace</button></p>' +
    '<p style="color:#6B5B4E;font-size:12px">El enlace incluye la clave de la tablet: no lo ' +
    'compartas con nadie más. Si se filtra, usa Casa Belén → Cambiar clave de la tablet.</p></div>';
}

// ===========================================================================
// Aplicación web (lo que llama la tablet)
// ===========================================================================

function doGet() {
  return respuestaJson({ ok: true, servicio: 'Casa Belén · punto de venta', version: VERSION_PROTOCOLO });
}

/**
 * La tablet manda POST con cuerpo text/plain (JSON). Así el navegador no
 * hace la consulta previa de CORS que Apps Script no contesta.
 */
function doPost(e) {
  var peticion;
  try {
    peticion = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    return respuestaJson(fallo('datos', 'La petición no es JSON válido'));
  }
  try {
    return respuestaJson(atender(peticion));
  } catch (err) {
    console.error(err);
    return respuestaJson(fallo('interno', String((err && err.message) || err)));
  }
}

function atender(p) {
  if (!p || typeof p !== 'object') return fallo('datos', 'Petición vacía');
  if (p.version !== VERSION_PROTOCOLO) {
    return fallo('version', 'La app y la hoja usan versiones distintas: actualiza el script de la hoja');
  }
  var entorno = entornoDeLaHoja();
  if (!entorno) return fallo('sin-preparar', 'La hoja no está preparada: Casa Belén → Preparar hoja');
  var clave = claveDeLaTablet(false);
  if (!clave) return fallo('sin-clave', 'La hoja no tiene clave: Casa Belén → Vincular tablet');
  if (typeof p.clave !== 'string' || !igualesSeguro(p.clave, clave)) {
    return fallo('clave', 'La clave no coincide: vuelve a vincular la tablet');
  }
  if (p.entorno !== entorno) {
    return fallo('entorno', entorno === 'qa'
      ? 'Esta es la hoja de PRUEBAS: solo la app de QA puede usarla'
      : 'Esta es la hoja real de la tienda: la app de QA no puede usarla');
  }

  var base = {
    ok: true,
    version: VERSION_PROTOCOLO,
    entorno: entorno,
    hoja: SpreadsheetApp.getActiveSpreadsheet().getName(),
  };

  if (p.accion === 'estado') return base;
  if (p.accion === 'sincronizar') return conCandado(function () { return sincronizar(p.datos || {}, base); });
  return fallo('datos', 'Acción desconocida: ' + p.accion);
}

/**
 * Sube lo pendiente de la tablet y regresa el catálogo y las existencias
 * ya con lo subido descontado (en ese orden, en la misma llamada).
 */
function sincronizar(datos, base) {
  var ahora = new Date();
  var catalogo = construirCatalogo();
  asegurarExistencias(catalogo);
  var unidades = unidadesPorClave();

  var ventas = registrarVentas(lista(datos.ventas), catalogo, unidades, ahora);
  var gastos = registrarGastos(lista(datos.gastos), ahora);
  var cortes = registrarCortes(lista(datos.cajas), ahora);

  return Object.assign({}, base, {
    generadoEn: Date.now(),
    aceptados: { ventas: ventas.aceptados, gastos: gastos.aceptados, cajas: cortes.aceptados },
    rechazados: ventas.rechazados.concat(gastos.rechazados, cortes.rechazados),
    catalogo: {
      categorias: catalogo.categorias,
      productos: catalogo.productos,
      errores: catalogo.errores,
    },
    existencias: calcularExistencias(),
  });
}

function respuestaJson(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

function fallo(error, mensaje) {
  return { ok: false, version: VERSION_PROTOCOLO, error: error, mensaje: mensaje };
}

function conCandado(fn) {
  var candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    return fn();
  } finally {
    candado.releaseLock();
  }
}

// ===========================================================================
// Preparar hoja
// ===========================================================================

/** Crea pestañas, encabezados, formatos y el catálogo inicial. Se puede repetir. */
function prepararHoja(entorno) {
  if (entorno !== 'produccion' && entorno !== 'qa') throw new Error('Entorno inválido: ' + entorno);
  var props = PropertiesService.getScriptProperties();
  var actual = props.getProperty(PROP.entorno);
  if (actual && actual !== entorno) throw new Error('Esta hoja ya está preparada como ' + actual);
  props.setProperty(PROP.entorno, entorno);

  var libro = SpreadsheetApp.getActiveSpreadsheet();
  libro.setSpreadsheetTimeZone(ZONA_HORARIA);

  ORDEN_TABLAS.forEach(function (clave, i) {
    var t = TABLAS[clave];
    var hoja = libro.getSheetByName(t.nombre);
    if (!hoja) hoja = libro.insertSheet(t.nombre, i);
    var encabezado = hoja.getRange(1, 1, 1, t.columnas.length);
    if (String(encabezado.getValues()[0][0]) === '') encabezado.setValues([t.columnas]);
    encabezado.setFontWeight('bold').setBackground('#F2EAD8');
    hoja.setFrozenRows(1);
  });

  // Quita la pestaña vacía que trae una hoja nueva.
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (nombre) {
    var hoja = libro.getSheetByName(nombre);
    if (hoja && hoja.getLastRow() === 0 && libro.getSheets().length > 1) libro.deleteSheet(hoja);
  });

  sembrarCatalogoInicial();
  darFormato(libro);

  var catalogo = construirCatalogo();
  asegurarExistencias(catalogo);
  proteger(libro);

  return {
    categorias: catalogo.categorias.length,
    productos: catalogo.productos.length,
    existencias: Math.max(0, hoja('existencias').getLastRow() - 1),
    errores: catalogo.errores,
  };
}

function sembrarCatalogoInicial() {
  if (typeof CATALOGO_INICIAL === 'undefined') return;
  var cats = hoja('categorias');
  if (cats.getLastRow() < 2) {
    escribirFilas(cats, CATALOGO_INICIAL.categorias.map(function (c) { return [celda(c[0]), celda(c[1])]; }));
  }
  var prods = hoja('productos');
  if (prods.getLastRow() < 2) {
    escribirFilas(prods, CATALOGO_INICIAL.productos.map(function (f) {
      return f.map(function (v) { return typeof v === 'string' ? celda(v) : v; });
    }));
  }
}

function darFormato(libro) {
  var formatos = {
    productos: { 'D2:G': FORMATO_DINERO, 'J2:J': '0.###' },
    existencias: { 'E2:F': '#,##0.###', 'H2:I': '#,##0.###' },
    movimientos: { 'B2:B': FORMATO_FECHA, 'G2:G': '#,##0.###' },
    ventas: { 'C2:C': FORMATO_FECHA, 'G2:K': FORMATO_DINERO, 'L2:L': FORMATO_FECHA },
    detalle: { 'C2:C': FORMATO_FECHA, 'I2:J': FORMATO_DINERO },
    pagos: { 'C2:C': FORMATO_FECHA, 'E2:E': FORMATO_DINERO },
    gastos: { 'B2:B': FORMATO_FECHA, 'E2:E': FORMATO_DINERO, 'G2:G': FORMATO_FECHA },
    cortes: { 'B2:C': FORMATO_FECHA, 'D2:D': FORMATO_DINERO, 'F2:K': FORMATO_DINERO,
      'L2:M': FORMATO_DINERO, 'N2:N': FORMATO_FECHA },
  };
  Object.keys(formatos).forEach(function (clave) {
    var h = hoja(clave);
    Object.keys(formatos[clave]).forEach(function (a1) {
      h.getRange(a1).setNumberFormat(formatos[clave][a1]);
    });
  });

  var categorias = hoja('categorias');
  var productos = hoja('productos');
  productos.getRange('B2:B').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInRange(categorias.getRange('B2:B'), true)
      .setAllowInvalid(false)
      .setHelpText('Elige una categoría de la pestaña Categorías')
      .build(),
  );
  productos.getRange('K2:K').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).setAllowInvalid(false).build(),
  );
  productos.getRange('A1').setNote(
    'ID: lo llena el script. No lo cambies: las ventas y las existencias lo usan.\n' +
      'Para dejar de vender un producto pon Activo = No (no borres el renglón).',
  );
  productos.getRange('I1').setNote(
    'Artículo: solo para lo que sale de un mismo costal o garrafa (p. ej. «Soya APF»). ' +
      'Vacío = el producto lleva su propia existencia.',
  );
  productos.getRange('J1').setNote(
    'Descuenta: cuánto resta cada venta de la existencia del artículo (p. ej. 1000 g). Vacío = 1.',
  );
  productos.getRange('H1').setNote('Variantes: separadas por coma (p. ej. «Amarillo, Azul, Rojo»).');

  var existencias = hoja('existencias');
  existencias.hideColumns(1);
  existencias.getRange('H1').setNote(
    'Entrada: lo que llegó (piezas o gramos). Luego usa Casa Belén → Registrar entradas y conteos.',
  );
  existencias.getRange('I1').setNote(
    'Conteo: lo que contaste físicamente. El script registra la diferencia como ajuste.',
  );
  existencias.getRange('F1').setNote('Mínimo: si la existencia llega a este número, Estado dice «Reabastecer».');
  existencias.getRange('H2:I').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(0)
      .setAllowInvalid(false)
      .setHelpText('Escribe un número (piezas o gramos)')
      .build(),
  );
}

function proteger(libro) {
  TABLAS_AUTOMATICAS.forEach(function (clave) {
    var h = hoja(clave);
    if (h.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) return;
    h.protect()
      .setDescription('La llena la tablet o el menú Casa Belén. Corregir aquí descuadra la hoja.')
      .setWarningOnly(true);
  });
  var existencias = hoja('existencias');
  if (!existencias.getProtections(SpreadsheetApp.ProtectionType.RANGE).length) {
    existencias.getRange('A:E').protect()
      .setDescription('Existencia calculada: usa las columnas Entrada y Conteo')
      .setWarningOnly(true);
  }
  libro.setActiveSheet(hoja('productos'));
}

// ===========================================================================
// Catálogo (pestañas Categorías y Productos)
// ===========================================================================

/**
 * Lee Categorías y Productos y arma lo que recibe la tablet. Completa los ID
 * vacíos (y los escribe en la hoja). Los renglones con error no se mandan.
 *
 * Regresa también `todos`: el artículo y lo que descuenta cada producto,
 * activo o no, para descontar ventas de productos que ya se desactivaron.
 */
function construirCatalogo() {
  var errores = [];

  // ---- Categorías ----
  var tc = leerTabla('categorias');
  var idsCat = completarIds(tc, 0, function (f) { return f[1]; }, function (f) { return slug(f[1]); });
  var categorias = [];
  var categoriaPorNombre = {};
  var nombreCategoria = {};
  var vistosCat = {};
  tc.filas.forEach(function (f, i) {
    var nombre = texto(f[1]);
    if (!nombre) return;
    var id = idsCat[i];
    if (vistosCat[id]) return errores.push(error('Categorías', i + 2, 'ID repetido «' + id + '»'));
    vistosCat[id] = true;
    categorias.push({ id: id, nombre: nombre });
    categoriaPorNombre[normalizar(nombre)] = id;
    nombreCategoria[id] = nombre;
  });

  // ---- Productos ----
  var tp = leerTabla('productos');
  var ids = completarIds(tp, 0, function (f) { return f[2]; }, function (f) {
    var cat = categoriaPorNombre[normalizar(f[1])] || slug(f[1]);
    return slug(cat + '-' + f[2]);
  });
  var productos = [];
  var todos = {};
  var vistos = {};

  tp.filas.forEach(function (f, i) {
    var fila = i + 2;
    var nombre = texto(f[2]);
    if (!nombre && !texto(f[1])) return; // renglón vacío
    var id = ids[i];
    var mal = function (m) { errores.push(error('Productos', fila, (nombre || id) + ': ' + m)); };
    if (!nombre) return mal('falta el nombre');
    if (vistos[id]) return mal('ID repetido «' + id + '»');
    vistos[id] = true;

    var articulo = texto(f[8]);
    var descuenta = numero(f[9]);
    if (descuenta === null) descuenta = 1;
    if (isNaN(descuenta) || descuenta <= 0) return mal('«Descuenta» debe ser un número mayor a cero');
    todos[id] = { articulo: articulo, descuenta: descuenta, nombre: nombre };

    if (normalizar(f[10]) === 'no') return; // inactivo

    var categoriaId = categoriaPorNombre[normalizar(f[1])];
    if (!categoriaId) return mal('la categoría «' + texto(f[1]) + '» no existe en Categorías');

    var precio = leerPrecio(f);
    if (precio.error) return mal(precio.error);

    var producto = { id: id, categoriaId: categoriaId, nombre: nombre, precio: precio.precio };
    var variantes = texto(f[7]).split(',').map(texto).filter(function (v, j, arr) {
      return v && arr.indexOf(v) === j;
    });
    if (variantes.length) producto.variantes = variantes;
    if (articulo) producto.articulo = articulo;
    if (descuenta !== 1) producto.descuenta = descuenta;
    productos.push(producto);
  });

  return {
    categorias: categorias,
    productos: productos,
    errores: errores,
    todos: todos,
    nombreCategoria: nombreCategoria,
  };
}

/** Precio en pesos de la hoja → precio en centavos de la app. */
function leerPrecio(f) {
  var general = numero(f[3]);
  var alumno = numero(f[4]);
  var minimo = numero(f[5]);
  var maximo = numero(f[6]);
  var invalido = [general, alumno, minimo, maximo].some(function (n) { return n !== null && (isNaN(n) || n < 0); });
  if (invalido) return { error: 'algún precio no es un número válido' };

  if (minimo !== null || maximo !== null) {
    if (minimo === null || maximo === null) return { error: 'un producto variable necesita precio mínimo y máximo' };
    if (minimo <= 0 || maximo < minimo) return { error: 'el precio mínimo debe ser mayor a 0 y menor o igual al máximo' };
    return { precio: { tipo: 'variable', minimo: centavos(minimo), maximo: centavos(maximo) } };
  }
  if (general === null || general <= 0) return { error: 'falta el Precio General' };
  if (alumno === null || centavos(alumno) === centavos(general)) {
    return { precio: { tipo: 'fijo', centavos: centavos(general) } };
  }
  if (alumno <= 0) return { error: 'el Precio Alumno debe ser mayor a cero (o déjalo vacío)' };
  return { precio: { tipo: 'tarifas', general: centavos(general), alumno: centavos(alumno) } };
}

/**
 * Llena los ID vacíos de una tabla con `base(fila)` (sin repetir) y los
 * escribe en la hoja. Regresa la lista de ID por renglón.
 */
function completarIds(tabla, columna, tieneDatos, base) {
  var usados = {};
  tabla.filas.forEach(function (f) {
    var id = texto(f[columna]);
    if (id) usados[id] = true;
  });
  var cambio = false;
  var ids = tabla.filas.map(function (f) {
    var id = texto(f[columna]);
    if (id || !texto(tieneDatos(f))) return id;
    var raiz = base(f) || 'producto';
    id = raiz;
    for (var n = 2; usados[id]; n++) id = raiz + '-' + n;
    usados[id] = true;
    cambio = true;
    return id;
  });
  if (cambio) {
    tabla.hoja.getRange(2, columna + 1, ids.length, 1).setValues(ids.map(function (id) { return [id]; }));
  }
  return ids;
}

// ===========================================================================
// Existencias y movimientos
// ===========================================================================

/** Clave de existencia: el artículo (o el ID del producto) y la variante. */
function claveExistencia(base, variante) {
  return variante ? base + ' | ' + variante : base;
}

/** Agrega a Existencias los artículos y variantes que aún no tienen renglón. */
function asegurarExistencias(catalogo) {
  var h = hoja('existencias');
  var t = leerTabla('existencias');
  var existentes = {};
  t.filas.forEach(function (f) { existentes[texto(f[0])] = true; });

  var nuevas = [];
  catalogo.productos.forEach(function (p) {
    var base = p.articulo || p.id;
    var nombre = p.articulo || p.nombre;
    (p.variantes || ['']).forEach(function (v) {
      var clave = claveExistencia(base, v);
      if (existentes[clave]) return;
      existentes[clave] = true;
      nuevas.push([clave, nombre, v, unidadInicial(p.articulo)]);
    });
  });
  if (!nuevas.length) return 0;

  var primera = h.getLastRow() + 1;
  escribirFilas(h, nuevas.map(function (n, i) {
    var r = primera + i;
    return [
      celda(n[0]), celda(n[1]), celda(n[2]), n[3],
      '=SUMIF(Movimientos!D:D,A' + r + ',Movimientos!G:G)',
      '',
      '=IF(F' + r + '="","",IF(E' + r + '<=F' + r + ',"Reabastecer",""))',
      '', '', '',
    ];
  }));
  return nuevas.length;
}

function unidadInicial(articulo) {
  if (articulo && typeof CATALOGO_INICIAL !== 'undefined' && CATALOGO_INICIAL.unidades[articulo]) {
    return CATALOGO_INICIAL.unidades[articulo];
  }
  return UNIDAD_POR_DEFECTO;
}

function unidadesPorClave() {
  var unidades = {};
  leerTabla('existencias').filas.forEach(function (f) {
    unidades[texto(f[0])] = texto(f[3]) || UNIDAD_POR_DEFECTO;
  });
  return unidades;
}

/** Suma de Movimientos por clave. Es la misma cuenta que la fórmula de Existencias. */
function sumasDeMovimientos() {
  var sumas = {};
  leerTabla('movimientos').filas.forEach(function (f) {
    var clave = texto(f[3]);
    var cantidad = Number(f[6]);
    if (!clave || isNaN(cantidad)) return;
    sumas[clave] = (sumas[clave] || 0) + cantidad;
  });
  return sumas;
}

/**
 * Existencia de cada renglón de Existencias: { clave: { cantidad, unidad } }.
 * Solo los que tienen algún movimiento: sin conteo, entrada ni venta, la
 * hoja no sabe cuánto hay y la tablet no muestra nada (en vez de «0»).
 */
function calcularExistencias() {
  var sumas = sumasDeMovimientos();
  var resultado = {};
  leerTabla('existencias').filas.forEach(function (f) {
    var clave = texto(f[0]);
    if (!clave || !Object.prototype.hasOwnProperty.call(sumas, clave)) return;
    resultado[clave] = { cantidad: redondear(sumas[clave]), unidad: texto(f[3]) || UNIDAD_POR_DEFECTO };
  });
  return resultado;
}

/**
 * Convierte las columnas Entrada y Conteo de Existencias en movimientos y
 * las limpia. Conteo registra un ajuste por la diferencia con la existencia
 * (de 0 si no hubo diferencia: así queda constancia de cuándo se contó, y un
 * artículo contado en 0 pasa a «Sin existencias» en la tablet).
 */
function registrarEntradasYConteos() {
  return conCandado(function () {
    var t = leerTabla('existencias');
    var sumas = sumasDeMovimientos();
    var ahora = new Date();
    var movimientos = [];
    var errores = [];
    var r = { entradas: 0, ajustes: 0, sinDiferencia: 0, errores: errores };
    var captura = t.filas.map(function (f) { return [f[7], f[8], f[9]]; });
    var cambio = false;

    t.filas.forEach(function (f, i) {
      var fila = i + 2;
      var entrada = numero(f[7]);
      var conteo = numero(f[8]);
      if (entrada === null && conteo === null) return;
      var clave = texto(f[0]);
      var nombre = texto(f[1]) + (texto(f[2]) ? ' · ' + texto(f[2]) : '');
      if (!clave) return errores.push({ fila: fila, mensaje: 'renglón sin clave' });
      if (entrada !== null && (isNaN(entrada) || entrada <= 0)) {
        return errores.push({ fila: fila, mensaje: nombre + ': la entrada debe ser mayor a cero' });
      }
      if (conteo !== null && (isNaN(conteo) || conteo < 0)) {
        return errores.push({ fila: fila, mensaje: nombre + ': el conteo no puede ser negativo' });
      }

      var nota = texto(f[9]);
      var actual = sumas[clave] || 0;
      var mov = function (tipo, cantidad, notaMov) {
        return [Utilities.getUuid(), ahora, tipo, celda(clave), celda(f[1]), celda(f[2]), redondear(cantidad),
          celda(f[3]) || UNIDAD_POR_DEFECTO, 'Hoja', celda(notaMov)];
      };
      if (entrada !== null) {
        movimientos.push(mov('Entrada', entrada, nota));
        actual += entrada;
        r.entradas++;
      }
      if (conteo !== null) {
        var diferencia = redondear(conteo - actual);
        movimientos.push(mov('Ajuste', diferencia, 'Conteo: ' + conteo + (nota ? ' · ' + nota : '')));
        if (diferencia !== 0) r.ajustes++;
        else r.sinDiferencia++;
      }
      sumas[clave] = conteo !== null ? conteo : actual;
      captura[i] = ['', '', ''];
      cambio = true;
    });

    escribirFilas(hoja('movimientos'), movimientos);
    if (cambio) t.hoja.getRange(2, 8, captura.length, 3).setValues(captura);
    return r;
  });
}

// ===========================================================================
// Lo que sube la tablet
// ===========================================================================

function registrarVentas(ventas, catalogo, unidades, ahora) {
  var hv = hoja('ventas');
  var yaEstan = idsDe('ventas', 0);
  var r = { aceptados: [], rechazados: [] };
  var filasVentas = [];
  var filasDetalle = [];
  var filasPagos = [];
  var filasMov = [];

  ventas.forEach(function (v) {
    var motivo = problemaDeVenta(v);
    if (motivo) return r.rechazados.push({ tipo: 'venta', id: idSeguro(v), motivo: motivo });
    r.aceptados.push(v.id);
    if (yaEstan[v.id]) return;
    yaEstan[v.id] = true;

    var fecha = new Date(v.creadaEn);
    var cliente = TIPOS_CLIENTE[v.tipoCliente];
    var porForma = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    v.pagos.forEach(function (p) { porForma[p.forma] += p.monto; });
    var piezas = v.lineas.reduce(function (s, l) { return s + l.cantidad; }, 0);

    filasVentas.push([celda(v.id), v.folio, fecha, celda(v.cajaId), cliente, piezas, pesos(v.total),
      pesos(porForma.efectivo), pesos(porForma.tarjeta), pesos(porForma.transferencia),
      pesos(v.cambio), ahora]);

    v.lineas.forEach(function (l, i) {
      filasDetalle.push([celda(v.id), v.folio, fecha, celda(l.productoId), celda(l.nombre),
        celda(catalogo.nombreCategoria[l.categoriaId] || l.categoriaId), celda(l.variante),
        l.cantidad, pesos(l.precioUnitario), pesos(l.precioUnitario * l.cantidad), cliente,
        l.precioCapturado ? 'Sí' : 'No', l.fueraDeRango ? 'Sí' : '']);

      var info = catalogo.todos[l.productoId] || { articulo: '', descuenta: 1, nombre: l.nombre };
      var base = info.articulo || l.productoId;
      var clave = claveExistencia(base, l.variante);
      filasMov.push([celda(v.id + ':' + (i + 1)), fecha, 'Venta', celda(clave), celda(info.articulo || l.nombre),
        celda(l.variante), -redondear(l.cantidad * info.descuenta), unidades[clave] || UNIDAD_POR_DEFECTO,
        'Venta #' + v.folio, '']);
    });

    v.pagos.forEach(function (p) {
      filasPagos.push([celda(v.id), v.folio, fecha, FORMAS_PAGO[p.forma], pesos(p.monto), celda(p.referencia)]);
    });
  });

  escribirFilas(hv, filasVentas);
  escribirFilas(hoja('detalle'), filasDetalle);
  escribirFilas(hoja('pagos'), filasPagos);
  escribirFilas(hoja('movimientos'), filasMov);
  return r;
}

function problemaDeVenta(v) {
  if (!v || typeof v !== 'object' || !esId(v.id)) return 'venta sin ID';
  if (!esEntero(v.folio) || v.folio < 1) return 'folio inválido';
  if (!esFecha(v.creadaEn)) return 'fecha inválida';
  if (!esId(v.cajaId)) return 'venta sin caja';
  if (!TIPOS_CLIENTE[v.tipoCliente]) return 'tipo de cliente inválido';
  if (!Array.isArray(v.lineas) || !v.lineas.length) return 'venta sin productos';
  if (!Array.isArray(v.pagos) || !v.pagos.length) return 'venta sin pagos';
  var lineasMal = v.lineas.some(function (l) {
    return !l || !esId(l.productoId) || typeof l.nombre !== 'string' || !esEntero(l.cantidad) ||
      l.cantidad < 1 || !esEntero(l.precioUnitario) || l.precioUnitario < 0;
  });
  if (lineasMal) return 'algún producto de la venta es inválido';
  var pagosMal = v.pagos.some(function (p) { return !p || !FORMAS_PAGO[p.forma] || !esEntero(p.monto) || p.monto <= 0; });
  if (pagosMal) return 'algún pago de la venta es inválido';
  if (!esEntero(v.total) || !esEntero(v.cambio) || v.cambio < 0) return 'total o cambio inválido';
  var suma = v.lineas.reduce(function (s, l) { return s + l.precioUnitario * l.cantidad; }, 0);
  var abonado = v.pagos.reduce(function (s, p) { return s + p.monto; }, 0);
  if (suma !== v.total || abonado !== v.total) return 'el total no cuadra con productos y pagos';
  return '';
}

function registrarGastos(gastos, ahora) {
  var yaEstan = idsDe('gastos', 0);
  var r = { aceptados: [], rechazados: [] };
  var filas = [];
  gastos.forEach(function (g) {
    var motivo = !g || !esId(g.id) ? 'gasto sin ID'
      : !esFecha(g.creadoEn) ? 'fecha inválida'
        : !esId(g.cajaId) ? 'gasto sin caja'
          : !texto(g.concepto) ? 'gasto sin concepto'
            : !esEntero(g.monto) || g.monto <= 0 ? 'monto inválido' : '';
    if (motivo) return r.rechazados.push({ tipo: 'gasto', id: idSeguro(g), motivo: motivo });
    r.aceptados.push(g.id);
    if (yaEstan[g.id]) return;
    yaEstan[g.id] = true;
    filas.push([celda(g.id), new Date(g.creadoEn), celda(g.cajaId), celda(g.concepto), pesos(g.monto),
      celda(g.nota), ahora]);
  });
  escribirFilas(hoja('gastos'), filas);
  return r;
}

function registrarCortes(cajas, ahora) {
  var yaEstan = idsDe('cortes', 0);
  var r = { aceptados: [], rechazados: [] };
  var filas = [];
  cajas.forEach(function (c) {
    var k = c && c.corte;
    var campos = ['numeroVentas', 'ventasEfectivo', 'ventasTarjeta', 'ventasTransferencia', 'totalVentas',
      'gastos', 'efectivoEsperado', 'efectivoContado', 'diferencia'];
    var motivo = !c || !esId(c.id) ? 'caja sin ID'
      : !esFecha(c.abiertaEn) || !esFecha(c.cerradaEn) ? 'la caja no está cerrada'
        : !esEntero(c.fondoInicial) ? 'fondo inválido'
          : !k || campos.some(function (n) { return !esEntero(k[n]); }) ? 'corte incompleto' : '';
    if (motivo) return r.rechazados.push({ tipo: 'caja', id: idSeguro(c), motivo: motivo });
    r.aceptados.push(c.id);
    if (yaEstan[c.id]) return;
    yaEstan[c.id] = true;
    filas.push([celda(c.id), new Date(c.abiertaEn), new Date(c.cerradaEn), pesos(c.fondoInicial), k.numeroVentas,
      pesos(k.ventasEfectivo), pesos(k.ventasTarjeta), pesos(k.ventasTransferencia), pesos(k.totalVentas),
      pesos(k.gastos), pesos(k.efectivoEsperado), pesos(k.efectivoContado), pesos(k.diferencia), ahora]);
  });
  escribirFilas(hoja('cortes'), filas);
  return r;
}

// ===========================================================================
// Vinculación
// ===========================================================================

function entornoDeLaHoja() {
  return PropertiesService.getScriptProperties().getProperty(PROP.entorno) || '';
}

function claveDeLaTablet(crearSiFalta) {
  var props = PropertiesService.getScriptProperties();
  var clave = props.getProperty(PROP.clave);
  if (!clave && crearSiFalta) {
    clave = nuevaClave();
    props.setProperty(PROP.clave, clave);
  }
  return clave || '';
}

function nuevaClave() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function urlDelScript() {
  var guardada = PropertiesService.getScriptProperties().getProperty(PROP.urlScript);
  if (guardada) return guardada;
  var url = '';
  try {
    url = ScriptApp.getService().getUrl() || '';
  } catch (e) {
    url = '';
  }
  return esUrlScript(url) ? url : '';
}

function esUrlScript(url) {
  return /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/.test(String(url));
}

/** Enlace que abre la app en la tablet y la deja vinculada a esta hoja. */
function enlaceDeVinculacion(entorno, urlScript, clave) {
  return URL_APP[entorno] + '#/vincular?u=' + encodeURIComponent(urlScript) + '&c=' + encodeURIComponent(clave);
}

// ===========================================================================
// Ayudantes
// ===========================================================================

function hoja(clave) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABLAS[clave].nombre);
  if (!h) throw new Error('Falta la pestaña «' + TABLAS[clave].nombre + '»: usa Casa Belén → Preparar hoja');
  return h;
}

/** Renglones de datos (sin encabezado), con el ancho de columnas de la tabla. */
function leerTabla(clave) {
  var h = hoja(clave);
  var n = h.getLastRow() - 1;
  var columnas = TABLAS[clave].columnas.length;
  return { hoja: h, filas: n > 0 ? h.getRange(2, 1, n, columnas).getValues() : [] };
}

function idsDe(clave, columna) {
  var ids = {};
  leerTabla(clave).filas.forEach(function (f) {
    var id = texto(f[columna]);
    if (id) ids[id] = true;
  });
  return ids;
}

/**
 * Agrega renglones al final (y más renglones a la pestaña si ya no caben).
 * El texto que viene de la tablet pasa antes por celda().
 */
function escribirFilas(h, filas) {
  if (!filas.length) return;
  var inicio = h.getLastRow() + 1;
  var fin = inicio + filas.length - 1;
  var maximo = h.getMaxRows();
  if (fin > maximo) h.insertRowsAfter(maximo, fin - maximo);
  h.getRange(inicio, 1, filas.length, filas[0].length).setValues(filas);
}

/** Texto limpio de una celda o de lo que manda la tablet. */
function texto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

/**
 * Texto para escribir en una celda, con ' al inicio: la hoja lo guarda tal
 * cual. Sin esto, «=…» se ejecutaría como fórmula y «1/2» o «007» se
 * convertirían en fecha o número.
 */
function celda(valor) {
  var t = texto(valor);
  return t === '' ? '' : "'" + t;
}

/** Número de una celda: null si está vacía, NaN si no es número. */
function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return valor;
  var t = String(valor).replace(/[$,\s]/g, '');
  return t === '' ? null : Number(t);
}

function normalizar(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Igual que en la app (src/data/catalogo.ts): «Aromas 30 ml» → «aromas-30-ml». */
function slug(valor) {
  return normalizar(valor).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function centavos(pesosValor) { return Math.round(pesosValor * 100); }
function pesos(centavosValor) { return Math.round(centavosValor) / 100; }
function redondear(n) { return Math.round(n * 1000) / 1000; }
function lista(valor) { return Array.isArray(valor) ? valor : []; }
function esEntero(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
function esFecha(n) { return esEntero(n) && n > 1600000000000; }
function esId(v) { return typeof v === 'string' && v.length > 0 && v.length <= 100; }
function idSeguro(o) { return o && esId(o.id) ? o.id : ''; }
function error(pestana, fila, mensaje) { return { pestana: pestana, fila: fila, mensaje: mensaje }; }

function escaparHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Compara sin cortar en el primer carácter distinto. */
function igualesSeguro(a, b) {
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
