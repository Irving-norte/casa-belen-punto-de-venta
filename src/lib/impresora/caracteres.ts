/**
 * Letras que entiende una impresora térmica.
 *
 * Las impresoras de tickets (ESC/POS) no reciben texto Unicode: cada letra es
 * un byte de una «página de códigos». Usamos PC850 (Europa occidental), que
 * trae todo lo del español: á é í ó ú ñ ü ¡ ¿, mayúsculas acentuadas, × y ½.
 *
 * Si un modelo imprime símbolos raros en lugar de acentos (no tiene PC850),
 * el ajuste «Sin acentos» manda solo letras básicas: á → a, ñ → n, ½ → 1/2.
 */

/** PC850, bytes 0x80–0xFF, en orden. */
const PC850_ALTA =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ '

const BYTE_PC850 = new Map<string, number>([...PC850_ALTA].map((letra, i) => [letra, 0x80 + i]))

/** Sustitutos de una sola letra: así el ancho del renglón no cambia. */
const PARECIDAS: Record<string, string> = {
  '—': '-', // —
  '–': '-', // –
  '‐': '-',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  '•': '·', // •
  '…': '.', // …
}

/** Para el ajuste «Sin acentos». */
const BASICAS: Record<string, string> = {
  '×': 'x',
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '¡': '', // «¡Gracias!» → «Gracias!»
  '¿': '',
  '«': '"',
  '»': '"',
  '·': '-',
  '°': 'o',
  'ª': 'a',
  'º': 'o',
}

function sinDiacriticos(letra: string): string {
  return letra.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * El texto tal como saldrá en papel. Se aplica ANTES de medir los renglones,
 * para que «½» → «1/2» no desborde el ancho del ticket.
 */
export function textoImprimible(texto: string, acentos: boolean): string {
  let salida = ''
  for (const original of texto) {
    let letra = PARECIDAS[original] ?? original
    if (!acentos) letra = BASICAS[letra] ?? sinDiacriticos(letra)
    else if (letra.charCodeAt(0) >= 0x80 && !BYTE_PC850.has(letra)) letra = sinDiacriticos(letra)
    salida += [...letra].every((l) => l.charCodeAt(0) < 0x80 || (acentos && BYTE_PC850.has(l))) ? letra : '?'
  }
  return salida
}

/** Texto ya imprimible → bytes PC850 (ASCII queda igual). */
export function bytesPC850(texto: string): number[] {
  return [...texto].map((letra) => {
    const codigo = letra.charCodeAt(0)
    if (codigo < 0x80) return codigo
    return BYTE_PC850.get(letra) ?? 0x3f // «?»
  })
}

