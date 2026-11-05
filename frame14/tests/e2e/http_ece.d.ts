// http_ece (web-push's encryption) ships no types; notifications.spec reads
// what the add-on sent with it, as a phone would.
declare module "http_ece" {
  import type { ECDH } from "node:crypto";
  export function decrypt(
    buffer: Buffer,
    params: { version: "aes128gcm"; privateKey: ECDH; authSecret: string },
  ): Buffer;
}
