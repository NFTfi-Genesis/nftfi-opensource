import crypto from 'crypto'

export function generateNonce() {
  const buf = crypto.randomBytes(32)
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return BigInt('0x' + hex)
}
