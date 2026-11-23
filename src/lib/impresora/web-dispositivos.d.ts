/**
 * Lo mínimo de Web Serial y Web Bluetooth que usa la impresora. TypeScript
 * todavía no los trae en su lib DOM (solo existen en Chrome y derivados).
 * https://wicg.github.io/serial/ · https://webbluetoothcg.github.io/web-bluetooth/
 */

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
  bluetoothServiceClassId?: string | number
}

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  getInfo(): SerialPortInfo
  open(opciones: { baudRate: number }): Promise<void>
  close(): Promise<void>
  forget?(): Promise<void>
}

interface Serial extends EventTarget {
  requestPort(opciones?: {
    filters?: { bluetoothServiceClassId?: string | number; usbVendorId?: number }[]
    allowedBluetoothServiceClassIds?: (string | number)[]
  }): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

interface BluetoothCharacteristicProperties {
  readonly write: boolean
  readonly writeWithoutResponse: boolean
}

interface BluetoothRemoteGATTCharacteristic {
  readonly uuid: string
  readonly properties: BluetoothCharacteristicProperties
  writeValueWithResponse(valor: BufferSource): Promise<void>
  writeValueWithoutResponse(valor: BufferSource): Promise<void>
}

interface BluetoothRemoteGATTService {
  readonly uuid: string
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
  forget?(): Promise<void>
}

interface Bluetooth extends EventTarget {
  requestDevice(opciones: { acceptAllDevices?: boolean; optionalServices?: string[] }): Promise<BluetoothDevice>
  /** Solo con permisos persistentes (en Android aún no viene activado). */
  getDevices?(): Promise<BluetoothDevice[]>
}

interface Navigator {
  readonly serial?: Serial
  readonly bluetooth?: Bluetooth
}
