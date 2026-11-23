import { PREFIJO_ALMACENAMIENTO } from '../entorno'

/**
 * Conexión con la impresora térmica Bluetooth de la tablet.
 *
 * Dos caminos, según lo que hable la impresora:
 *  - Bluetooth clásico (puerto serie SPP), el de casi todas las impresoras de
 *    tickets. Chrome para Android lo permite con Web Serial (versión 138+).
 *    La impresora se empareja una vez en Ajustes › Bluetooth de la tablet;
 *    Chrome recuerda el permiso y la app la reconecta sola.
 *  - Bluetooth LE (Web Bluetooth), para modelos que solo hablan BLE. Chrome
 *    para Android no recuerda estos permisos: al reabrir la app se elige otra
 *    vez (en la misma sesión no).
 *
 * El estado vive aquí (fuera de React) para que la conexión siga abierta al
 * cambiar de pantalla; las pantallas lo leen con useImpresora().
 */

export type TipoConexion = 'serial' | 'ble'

export interface Ajustes {
  /** Letras por renglón: 48 (lo común en 80 mm) o 42. */
  columnas: 48 | 42
  acentos: boolean
  /** Última impresora elegida (para el texto en pantalla). */
  tipo?: TipoConexion
  nombre?: string
  bleId?: string
}

export interface EstadoImpresora {
  soporte: { serial: boolean; ble: boolean }
  /** Ya se buscó la impresora recordada. */
  revisada: boolean
  /** Lista para imprimir; null = hay que elegirla. */
  elegida: { tipo: TipoConexion; nombre: string } | null
  /** Conectando o imprimiendo. */
  ocupada: boolean
  ajustes: Ajustes
}

export type Motivo = 'sin-soporte' | 'cancelada' | 'sin-impresora' | 'no-responde' | 'sin-permiso' | 'no-compatible'

export class ErrorImpresora extends Error {
  constructor(
    readonly motivo: Motivo,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorImpresora'
  }
}

const MENSAJES: Record<Motivo, string> = {
  'sin-soporte': 'Este navegador no puede usar impresoras Bluetooth. Abre la app en Google Chrome de la tablet.',
  cancelada:
    'No se eligió ninguna impresora. Si no aparece en la lista, emparéjala primero en Ajustes › Bluetooth de la tablet.',
  'sin-impresora': 'Primero conecta la impresora.',
  'no-responde':
    'La impresora no responde. Revisa que esté encendida, con papel y cerca de la tablet, y vuelve a intentar.',
  'sin-permiso':
    'La tablet no dio permiso de usar Bluetooth. En Ajustes › Aplicaciones › Chrome › Permisos, activa «Dispositivos cercanos».',
  'no-compatible':
    'Esta impresora no acepta tickets por Bluetooth LE. Emparéjala en Ajustes › Bluetooth y conéctala con «Buscar impresora».',
}

/** Texto para la persona, sea cual sea el error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorImpresora) return error.message
  const nombre = error instanceof DOMException ? error.name : ''
  if (nombre === 'NotFoundError') return MENSAJES.cancelada
  if (nombre === 'SecurityError' || nombre === 'NotAllowedError') return MENSAJES['sin-permiso']
  return MENSAJES['no-responde']
}

// ---------------------------------------------------------------------------
// Ajustes (en el navegador de la tablet; no van a la hoja)
// ---------------------------------------------------------------------------

const CLAVE = `${PREFIJO_ALMACENAMIENTO}:impresora`
const AJUSTES_INICIALES: Ajustes = { columnas: 48, acentos: true }

function leerAjustes(): Ajustes {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Ajustes> | null
    if (guardado) {
      return {
        ...AJUSTES_INICIALES,
        ...guardado,
        columnas: guardado.columnas === 42 ? 42 : 48,
        acentos: guardado.acentos !== false,
      }
    }
  } catch {
    // sin almacenamiento o dato corrupto: valores iniciales
  }
  return { ...AJUSTES_INICIALES }
}

function guardarAjustes(ajustes: Ajustes): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ajustes))
  } catch {
    // sin almacenamiento: solo dura esta sesión
  }
}

// ---------------------------------------------------------------------------
// Conexiones
// ---------------------------------------------------------------------------

/** Puerto serie de Bluetooth clásico (Serial Port Profile). */
const SPP = '00001101-0000-1000-8000-00805f9b34fb'

/** Servicios BLE de las impresoras de tickets más comunes. */
const SERVICIOS_BLE = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
]
/** Dentro de esos servicios, la característica por la que entra el ticket. */
const ESCRITURA_BLE = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
]
/** BLE manda de 20 en 20 bytes: lo que cabe en cualquier conexión. */
const TROZO_BLE = 20

const ESPERA_CONECTAR = 15_000
const ESPERA_ENVIAR = 30_000

function conTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new ErrorImpresora('no-responde', MENSAJES['no-responde'])), ms)
    promesa.then(
      (valor) => {
        clearTimeout(reloj)
        resolver(valor)
      },
      (error) => {
        clearTimeout(reloj)
        rechazar(error)
      },
    )
  })
}

interface Conexion {
  tipo: TipoConexion
  nombre: string
  enviar(datos: Uint8Array): Promise<void>
  cerrar(): Promise<void>
  olvidar(): Promise<void>
}

class ConexionSerial implements Conexion {
  readonly tipo = 'serial'
  readonly nombre = 'Impresora Bluetooth'

  constructor(readonly puerto: SerialPort) {}

  async enviar(datos: Uint8Array): Promise<void> {
    try {
      await this.escribir(datos)
    } catch {
      // La conexión pudo quedar vieja (la impresora se apagó y prendió):
      // se cierra y se intenta una vez más desde cero.
      await this.cerrar()
      await this.escribir(datos)
    }
  }

  private async escribir(datos: Uint8Array): Promise<void> {
    if (!this.puerto.writable) await conTiempo(this.puerto.open({ baudRate: 9600 }), ESPERA_CONECTAR)
    const escritor = this.puerto.writable!.getWriter()
    try {
      await conTiempo(escritor.write(datos), ESPERA_ENVIAR)
    } finally {
      escritor.releaseLock()
    }
  }

  async cerrar(): Promise<void> {
    try {
      await conTiempo(this.puerto.close(), 3_000)
    } catch {
      // ya estaba cerrado
    }
  }

  async olvidar(): Promise<void> {
    await this.cerrar()
    await this.puerto.forget?.()
  }
}

class ConexionBle implements Conexion {
  readonly tipo = 'ble'
  readonly nombre: string
  private escritura: BluetoothRemoteGATTCharacteristic | null = null

  constructor(readonly dispositivo: BluetoothDevice) {
    this.nombre = dispositivo.name || 'Impresora Bluetooth LE'
    dispositivo.addEventListener('gattserverdisconnected', () => {
      this.escritura = null
    })
  }

  private async conectar(): Promise<BluetoothRemoteGATTCharacteristic> {
    const gatt = this.dispositivo.gatt
    if (!gatt) throw new ErrorImpresora('no-compatible', MENSAJES['no-compatible'])
    if (gatt.connected && this.escritura) return this.escritura

    const servidor = await conTiempo(gatt.connect(), ESPERA_CONECTAR)
    let servicios: BluetoothRemoteGATTService[] = []
    try {
      servicios = await servidor.getPrimaryServices()
    } catch {
      // ninguno de los servicios conocidos
    }
    const escribibles: BluetoothRemoteGATTCharacteristic[] = []
    for (const servicio of servicios) {
      for (const c of await servicio.getCharacteristics()) {
        if (c.properties.write || c.properties.writeWithoutResponse) escribibles.push(c)
      }
    }
    const elegida = escribibles.find((c) => ESCRITURA_BLE.includes(c.uuid)) ?? escribibles[0]
    if (!elegida) {
      gatt.disconnect()
      throw new ErrorImpresora('no-compatible', MENSAJES['no-compatible'])
    }
    this.escritura = elegida
    return elegida
  }

  async enviar(datos: Uint8Array): Promise<void> {
    const escritura = await this.conectar()
    const sinRespuesta = escritura.properties.writeWithoutResponse
    const envio = (async () => {
      for (let i = 0; i < datos.length; i += TROZO_BLE) {
        const trozo = datos.slice(i, i + TROZO_BLE)
        if (sinRespuesta) await escritura.writeValueWithoutResponse(trozo)
        else await escritura.writeValueWithResponse(trozo)
      }
    })()
    await conTiempo(envio, ESPERA_ENVIAR)
  }

  async cerrar(): Promise<void> {
    this.escritura = null
    this.dispositivo.gatt?.disconnect()
  }

  async olvidar(): Promise<void> {
    await this.cerrar()
    await this.dispositivo.forget?.()
  }
}

// ---------------------------------------------------------------------------
// Estado compartido
// ---------------------------------------------------------------------------

function soporte(): EstadoImpresora['soporte'] {
  if (typeof navigator === 'undefined' || !window.isSecureContext) return { serial: false, ble: false }
  return { serial: !!navigator.serial, ble: !!navigator.bluetooth }
}

let conexion: Conexion | null = null
let estado: EstadoImpresora = {
  soporte: soporte(),
  revisada: false,
  elegida: null,
  ocupada: false,
  ajustes: leerAjustes(),
}
const oyentes = new Set<() => void>()

function cambiar(parcial: Partial<EstadoImpresora>): void {
  estado = { ...estado, ...parcial }
  for (const oyente of oyentes) oyente()
}

function usar(nueva: Conexion | null): void {
  conexion = nueva
  cambiar({ elegida: nueva ? { tipo: nueva.tipo, nombre: nueva.nombre } : null })
}

export function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function leerEstado(): EstadoImpresora {
  return estado
}

let revision: Promise<void> | null = null

/** Busca la impresora que la tablet ya tenía permitida. Una vez por sesión. */
export function revisarRecordada(): Promise<void> {
  revision ??= (async () => {
    try {
      const { ajustes } = estado
      if (!conexion && estado.soporte.serial && ajustes.tipo !== 'ble') {
        const [puerto] = await navigator.serial!.getPorts()
        if (puerto) usar(new ConexionSerial(puerto))
      }
      if (!conexion && ajustes.tipo === 'ble' && ajustes.bleId && navigator.bluetooth?.getDevices) {
        const dispositivo = (await navigator.bluetooth.getDevices()).find((d) => d.id === ajustes.bleId)
        if (dispositivo) usar(new ConexionBle(dispositivo))
      }
    } catch {
      // sin permiso o sin Bluetooth: se elige a mano
    } finally {
      cambiar({ revisada: true })
    }
  })()
  return revision
}

async function ocupar<T>(trabajo: () => Promise<T>): Promise<T> {
  if (estado.ocupada) throw new ErrorImpresora('no-responde', 'La impresora está ocupada. Espera un momento.')
  cambiar({ ocupada: true })
  try {
    return await trabajo()
  } finally {
    cambiar({ ocupada: false })
  }
}

/**
 * Abre la lista de Chrome para elegir la impresora. Debe llamarse desde un
 * toque (Chrome lo exige). Reemplaza a la anterior.
 */
export function elegirImpresora(tipo: TipoConexion): Promise<void> {
  return ocupar(async () => {
    const { serial, ble } = estado.soporte
    let nueva: Conexion
    if (tipo === 'serial') {
      if (!serial) throw new ErrorImpresora('sin-soporte', MENSAJES['sin-soporte'])
      const puerto = await navigator.serial!.requestPort({
        filters: [{ bluetoothServiceClassId: SPP }],
        allowedBluetoothServiceClassIds: [SPP],
      })
      // Solo una impresora recordada: las demás se olvidan.
      for (const otro of await navigator.serial!.getPorts()) {
        if (otro !== puerto) await otro.forget?.()
      }
      nueva = conexion instanceof ConexionSerial && conexion.puerto === puerto ? conexion : new ConexionSerial(puerto)
    } else {
      if (!ble) throw new ErrorImpresora('sin-soporte', MENSAJES['sin-soporte'])
      const dispositivo = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICIOS_BLE,
      })
      nueva = new ConexionBle(dispositivo)
    }
    if (conexion && conexion !== nueva) await conexion.cerrar()
    usar(nueva)
    const ajustes: Ajustes = {
      ...estado.ajustes,
      tipo: nueva.tipo,
      nombre: nueva.nombre,
      bleId: nueva instanceof ConexionBle ? nueva.dispositivo.id : undefined,
    }
    guardarAjustes(ajustes)
    cambiar({ ajustes })
  })
}

/** Manda los bytes a la impresora elegida. */
export function imprimir(datos: Uint8Array): Promise<void> {
  return ocupar(async () => {
    if (!conexion) throw new ErrorImpresora('sin-impresora', MENSAJES['sin-impresora'])
    await conexion.enviar(datos)
  })
}

export function olvidarImpresora(): Promise<void> {
  return ocupar(async () => {
    const anterior = conexion
    usar(null)
    const { tipo: _t, nombre: _n, bleId: _b, ...resto } = estado.ajustes
    guardarAjustes(resto)
    cambiar({ ajustes: resto })
    try {
      await anterior?.olvidar()
    } catch {
      // se olvida de todos modos en la app
    }
  })
}

export function cambiarAjustes(cambio: Pick<Partial<Ajustes>, 'columnas' | 'acentos'>): void {
  const ajustes = { ...estado.ajustes, ...cambio }
  guardarAjustes(ajustes)
  cambiar({ ajustes })
}
