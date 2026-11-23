import type { Renglon } from '../dominio/ticket'
import { bytesPC850 } from './caracteres'

/**
 * Renglones del ticket → bytes ESC/POS, el lenguaje de casi todas las
 * impresoras térmicas de tickets (Epson y compatibles).
 *
 * Solo se usan comandos básicos que todas entienden: reiniciar, página de
 * códigos, negrita, tamaño doble, avanzar y cortar. Los centrados y las
 * columnas ya vienen hechos con espacios (ver dominio/ticket.ts).
 */

const ESC = 0x1b
const GS = 0x1d
const FS = 0x1c
const LF = 0x0a

export const COMANDOS = {
  /** ESC @: reinicia la impresora (letra normal, sin negrita). */
  iniciar: [ESC, 0x40],
  /** FS .: apaga el modo chino de algunos modelos, que se come los acentos. */
  sinModoChino: [FS, 0x2e],
  /** ESC t 2: página de códigos PC850. */
  paginaPC850: [ESC, 0x74, 2],
  negrita: [ESC, 0x45, 1],
  sinNegrita: [ESC, 0x45, 0],
  /** GS ! 0x11: doble de alto y de ancho. */
  grande: [GS, 0x21, 0x11],
  normal: [GS, 0x21, 0x00],
  /** ESC d 3: avanza 3 renglones para que lo último pase la cuchilla. */
  avanzar: [ESC, 0x64, 3],
  /** GS V 66 0: avanza hasta la cuchilla y corta (si la impresora tiene). */
  cortar: [GS, 0x56, 0x42, 0x00],
} as const

export function bytesTicket(renglones: Renglon[], { acentos }: { acentos: boolean }): Uint8Array {
  const b: number[] = [...COMANDOS.iniciar]
  if (acentos) b.push(...COMANDOS.sinModoChino, ...COMANDOS.paginaPC850)

  for (const renglon of renglones) {
    if (renglon.grande) b.push(...COMANDOS.grande)
    for (const parte of renglon.partes) {
      if (parte.negrita) b.push(...COMANDOS.negrita)
      b.push(...bytesPC850(parte.texto))
      if (parte.negrita) b.push(...COMANDOS.sinNegrita)
    }
    if (renglon.grande) b.push(...COMANDOS.normal)
    b.push(LF)
  }

  b.push(...COMANDOS.avanzar, ...COMANDOS.cortar)
  return Uint8Array.from(b)
}
