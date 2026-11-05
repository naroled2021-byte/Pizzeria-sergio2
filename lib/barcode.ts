// Códigos de barras EAN-13 para ítems que no traen uno de fábrica.

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function ean13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

/** Código nuevo con prefijo 2: el rango de EAN-13 reservado para uso interno de cada comercio,
 *  así no choca con los códigos de fábrica. Que no se repita lo controla el servidor al guardar. */
export function generateInternalEan13(): string {
  let first12 = "2";
  while (first12.length < 12) first12 += Math.floor(Math.random() * 10);
  return `${first12}${ean13CheckDigit(first12)}`;
}

/** Las 95 franjas del código: "1" es barra negra, "0" es espacio. */
export function ean13Modules(code: string): string {
  const parity = PARITY[Number(code[0])];
  const left = [...code.slice(1, 7)].map((d, i) => (parity[i] === "L" ? L : G)[Number(d)]).join("");
  const right = [...code.slice(7)].map((d) => R[Number(d)]).join("");
  return `101${left}01010${right}101`;
}
