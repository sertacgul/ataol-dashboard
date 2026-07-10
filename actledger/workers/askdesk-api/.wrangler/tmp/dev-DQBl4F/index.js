var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// node_modules/jose/dist/webapi/lib/buffer_utils.js
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
function writeUInt32BE(buf, value, offset) {
  if (value < 0 || value >= MAX_INT32) {
    throw new RangeError(`value must be >= 0 and <= ${MAX_INT32 - 1}. Received ${value}`);
  }
  buf.set([value >>> 24, value >>> 16, value >>> 8, value & 255], offset);
}
function uint64be(value) {
  const high = Math.floor(value / MAX_INT32);
  const low = value % MAX_INT32;
  const buf = new Uint8Array(8);
  writeUInt32BE(buf, high, 0);
  writeUInt32BE(buf, low, 4);
  return buf;
}
function uint32be(value) {
  const buf = new Uint8Array(4);
  writeUInt32BE(buf, value);
  return buf;
}
function encode(string) {
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127) {
      throw new TypeError("non-ASCII string encountered in encode()");
    }
    bytes[i] = code;
  }
  return bytes;
}
var encoder, decoder, MAX_INT32;
var init_buffer_utils = __esm({
  "node_modules/jose/dist/webapi/lib/buffer_utils.js"() {
    init_modules_watch_stub();
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    MAX_INT32 = 2 ** 32;
    __name(concat, "concat");
    __name(writeUInt32BE, "writeUInt32BE");
    __name(uint64be, "uint64be");
    __name(uint32be, "uint32be");
    __name(encode, "encode");
  }
});

// node_modules/jose/dist/webapi/lib/base64.js
function encodeBase64(input) {
  if (Uint8Array.prototype.toBase64) {
    return input.toBase64();
  }
  const CHUNK_SIZE = 32768;
  const arr = [];
  for (let i = 0; i < input.length; i += CHUNK_SIZE) {
    arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(arr.join(""));
}
function decodeBase64(encoded) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(encoded);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
var init_base64 = __esm({
  "node_modules/jose/dist/webapi/lib/base64.js"() {
    init_modules_watch_stub();
    __name(encodeBase64, "encodeBase64");
    __name(decodeBase64, "decodeBase64");
  }
});

// node_modules/jose/dist/webapi/util/base64url.js
var base64url_exports = {};
__export(base64url_exports, {
  decode: () => decode,
  encode: () => encode2
});
function decode(input) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(typeof input === "string" ? input : decoder.decode(input), {
      alphabet: "base64url"
    });
  }
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}
function encode2(input) {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  if (Uint8Array.prototype.toBase64) {
    return unencoded.toBase64({ alphabet: "base64url", omitPadding: true });
  }
  return encodeBase64(unencoded).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
var init_base64url = __esm({
  "node_modules/jose/dist/webapi/util/base64url.js"() {
    init_modules_watch_stub();
    init_buffer_utils();
    init_base64();
    __name(decode, "decode");
    __name(encode2, "encode");
  }
});

// node_modules/jose/dist/webapi/lib/crypto_key.js
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
function checkHashLength(algorithm, expected) {
  const actual = getHashLength(algorithm.hash);
  if (actual !== expected)
    throw unusable(`SHA-${expected}`, "algorithm.hash");
}
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage)) {
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
  }
}
function checkSigCryptoKey(key, alg, usage) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!isAlgorithm(key.algorithm, alg))
        throw unusable(alg);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
function checkEncCryptoKey(key, alg, usage) {
  switch (alg) {
    case "A128GCM":
    case "A192GCM":
    case "A256GCM": {
      if (!isAlgorithm(key.algorithm, "AES-GCM"))
        throw unusable("AES-GCM");
      const expected = parseInt(alg.slice(1, 4), 10);
      const actual = key.algorithm.length;
      if (actual !== expected)
        throw unusable(expected, "algorithm.length");
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (!isAlgorithm(key.algorithm, "AES-KW"))
        throw unusable("AES-KW");
      const expected = parseInt(alg.slice(1, 4), 10);
      const actual = key.algorithm.length;
      if (actual !== expected)
        throw unusable(expected, "algorithm.length");
      break;
    }
    case "ECDH": {
      switch (key.algorithm.name) {
        case "ECDH":
        case "X25519":
          break;
        default:
          throw unusable("ECDH or X25519");
      }
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW":
      if (!isAlgorithm(key.algorithm, "PBKDF2"))
        throw unusable("PBKDF2");
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (!isAlgorithm(key.algorithm, "RSA-OAEP"))
        throw unusable("RSA-OAEP");
      checkHashLength(key.algorithm, parseInt(alg.slice(9), 10) || 1);
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
var unusable, isAlgorithm;
var init_crypto_key = __esm({
  "node_modules/jose/dist/webapi/lib/crypto_key.js"() {
    init_modules_watch_stub();
    unusable = /* @__PURE__ */ __name((name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`), "unusable");
    isAlgorithm = /* @__PURE__ */ __name((algorithm, name) => algorithm.name === name, "isAlgorithm");
    __name(getHashLength, "getHashLength");
    __name(checkHashLength, "checkHashLength");
    __name(getNamedCurve, "getNamedCurve");
    __name(checkUsage, "checkUsage");
    __name(checkSigCryptoKey, "checkSigCryptoKey");
    __name(checkEncCryptoKey, "checkEncCryptoKey");
  }
});

// node_modules/jose/dist/webapi/lib/invalid_key_input.js
function message(msg, actual, ...types) {
  types = types.filter(Boolean);
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) {
    msg += `one of type ${types[0]} or ${types[1]}.`;
  } else {
    msg += `of type ${types[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
var invalidKeyInput, withAlg;
var init_invalid_key_input = __esm({
  "node_modules/jose/dist/webapi/lib/invalid_key_input.js"() {
    init_modules_watch_stub();
    __name(message, "message");
    invalidKeyInput = /* @__PURE__ */ __name((actual, ...types) => message("Key must be ", actual, ...types), "invalidKeyInput");
    withAlg = /* @__PURE__ */ __name((alg, actual, ...types) => message(`Key for the ${alg} algorithm must be `, actual, ...types), "withAlg");
  }
});

// node_modules/jose/dist/webapi/util/errors.js
var errors_exports = {};
__export(errors_exports, {
  JOSEAlgNotAllowed: () => JOSEAlgNotAllowed,
  JOSEError: () => JOSEError,
  JOSENotSupported: () => JOSENotSupported,
  JWEDecryptionFailed: () => JWEDecryptionFailed,
  JWEInvalid: () => JWEInvalid,
  JWKInvalid: () => JWKInvalid,
  JWKSInvalid: () => JWKSInvalid,
  JWKSMultipleMatchingKeys: () => JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey: () => JWKSNoMatchingKey,
  JWKSTimeout: () => JWKSTimeout,
  JWSInvalid: () => JWSInvalid,
  JWSSignatureVerificationFailed: () => JWSSignatureVerificationFailed,
  JWTClaimValidationFailed: () => JWTClaimValidationFailed,
  JWTExpired: () => JWTExpired,
  JWTInvalid: () => JWTInvalid
});
var JOSEError, JWTClaimValidationFailed, JWTExpired, JOSEAlgNotAllowed, JOSENotSupported, JWEDecryptionFailed, JWEInvalid, JWSInvalid, JWTInvalid, JWKInvalid, JWKSInvalid, JWKSNoMatchingKey, JWKSMultipleMatchingKeys, JWKSTimeout, JWSSignatureVerificationFailed;
var init_errors = __esm({
  "node_modules/jose/dist/webapi/util/errors.js"() {
    init_modules_watch_stub();
    JOSEError = class extends Error {
      static {
        __name(this, "JOSEError");
      }
      static code = "ERR_JOSE_GENERIC";
      code = "ERR_JOSE_GENERIC";
      constructor(message2, options) {
        super(message2, options);
        this.name = this.constructor.name;
        Error.captureStackTrace?.(this, this.constructor);
      }
    };
    JWTClaimValidationFailed = class extends JOSEError {
      static {
        __name(this, "JWTClaimValidationFailed");
      }
      static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
      code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
      claim;
      reason;
      payload;
      constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
        super(message2, { cause: { claim, reason, payload } });
        this.claim = claim;
        this.reason = reason;
        this.payload = payload;
      }
    };
    JWTExpired = class extends JOSEError {
      static {
        __name(this, "JWTExpired");
      }
      static code = "ERR_JWT_EXPIRED";
      code = "ERR_JWT_EXPIRED";
      claim;
      reason;
      payload;
      constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
        super(message2, { cause: { claim, reason, payload } });
        this.claim = claim;
        this.reason = reason;
        this.payload = payload;
      }
    };
    JOSEAlgNotAllowed = class extends JOSEError {
      static {
        __name(this, "JOSEAlgNotAllowed");
      }
      static code = "ERR_JOSE_ALG_NOT_ALLOWED";
      code = "ERR_JOSE_ALG_NOT_ALLOWED";
    };
    JOSENotSupported = class extends JOSEError {
      static {
        __name(this, "JOSENotSupported");
      }
      static code = "ERR_JOSE_NOT_SUPPORTED";
      code = "ERR_JOSE_NOT_SUPPORTED";
    };
    JWEDecryptionFailed = class extends JOSEError {
      static {
        __name(this, "JWEDecryptionFailed");
      }
      static code = "ERR_JWE_DECRYPTION_FAILED";
      code = "ERR_JWE_DECRYPTION_FAILED";
      constructor(message2 = "decryption operation failed", options) {
        super(message2, options);
      }
    };
    JWEInvalid = class extends JOSEError {
      static {
        __name(this, "JWEInvalid");
      }
      static code = "ERR_JWE_INVALID";
      code = "ERR_JWE_INVALID";
    };
    JWSInvalid = class extends JOSEError {
      static {
        __name(this, "JWSInvalid");
      }
      static code = "ERR_JWS_INVALID";
      code = "ERR_JWS_INVALID";
    };
    JWTInvalid = class extends JOSEError {
      static {
        __name(this, "JWTInvalid");
      }
      static code = "ERR_JWT_INVALID";
      code = "ERR_JWT_INVALID";
    };
    JWKInvalid = class extends JOSEError {
      static {
        __name(this, "JWKInvalid");
      }
      static code = "ERR_JWK_INVALID";
      code = "ERR_JWK_INVALID";
    };
    JWKSInvalid = class extends JOSEError {
      static {
        __name(this, "JWKSInvalid");
      }
      static code = "ERR_JWKS_INVALID";
      code = "ERR_JWKS_INVALID";
    };
    JWKSNoMatchingKey = class extends JOSEError {
      static {
        __name(this, "JWKSNoMatchingKey");
      }
      static code = "ERR_JWKS_NO_MATCHING_KEY";
      code = "ERR_JWKS_NO_MATCHING_KEY";
      constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
        super(message2, options);
      }
    };
    JWKSMultipleMatchingKeys = class extends JOSEError {
      static {
        __name(this, "JWKSMultipleMatchingKeys");
      }
      [Symbol.asyncIterator];
      static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
      code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
      constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
        super(message2, options);
      }
    };
    JWKSTimeout = class extends JOSEError {
      static {
        __name(this, "JWKSTimeout");
      }
      static code = "ERR_JWKS_TIMEOUT";
      code = "ERR_JWKS_TIMEOUT";
      constructor(message2 = "request timed out", options) {
        super(message2, options);
      }
    };
    JWSSignatureVerificationFailed = class extends JOSEError {
      static {
        __name(this, "JWSSignatureVerificationFailed");
      }
      static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
      code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
      constructor(message2 = "signature verification failed", options) {
        super(message2, options);
      }
    };
  }
});

// node_modules/jose/dist/webapi/lib/is_key_like.js
function assertCryptoKey(key) {
  if (!isCryptoKey(key)) {
    throw new Error("CryptoKey instance expected");
  }
}
var isCryptoKey, isKeyObject, isKeyLike;
var init_is_key_like = __esm({
  "node_modules/jose/dist/webapi/lib/is_key_like.js"() {
    init_modules_watch_stub();
    __name(assertCryptoKey, "assertCryptoKey");
    isCryptoKey = /* @__PURE__ */ __name((key) => {
      if (key?.[Symbol.toStringTag] === "CryptoKey")
        return true;
      try {
        return key instanceof CryptoKey;
      } catch {
        return false;
      }
    }, "isCryptoKey");
    isKeyObject = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag] === "KeyObject", "isKeyObject");
    isKeyLike = /* @__PURE__ */ __name((key) => isCryptoKey(key) || isKeyObject(key), "isKeyLike");
  }
});

// node_modules/jose/dist/webapi/lib/content_encryption.js
function cekLength(alg) {
  switch (alg) {
    case "A128GCM":
      return 128;
    case "A192GCM":
      return 192;
    case "A256GCM":
    case "A128CBC-HS256":
      return 256;
    case "A192CBC-HS384":
      return 384;
    case "A256CBC-HS512":
      return 512;
    default:
      throw new JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
  }
}
function checkCekLength(cek, expected) {
  const actual = cek.byteLength << 3;
  if (actual !== expected) {
    throw new JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
  }
}
function ivBitLength(alg) {
  switch (alg) {
    case "A128GCM":
    case "A128GCMKW":
    case "A192GCM":
    case "A192GCMKW":
    case "A256GCM":
    case "A256GCMKW":
      return 96;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      return 128;
    default:
      throw new JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
  }
}
function checkIvLength(enc, iv) {
  if (iv.length << 3 !== ivBitLength(enc)) {
    throw new JWEInvalid("Invalid Initialization Vector length");
  }
}
async function cbcKeySetup(enc, cek, usage) {
  if (!(cek instanceof Uint8Array)) {
    throw new TypeError(invalidKeyInput(cek, "Uint8Array"));
  }
  const keySize = parseInt(enc.slice(1, 4), 10);
  const encKey = await crypto.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, [usage]);
  const macKey = await crypto.subtle.importKey("raw", cek.subarray(0, keySize >> 3), {
    hash: `SHA-${keySize << 1}`,
    name: "HMAC"
  }, false, ["sign"]);
  return { encKey, macKey, keySize };
}
async function cbcHmacTag(macKey, macData, keySize) {
  return new Uint8Array((await crypto.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
}
async function cbcEncrypt(enc, plaintext, cek, iv, aad) {
  const { encKey, macKey, keySize } = await cbcKeySetup(enc, cek, "encrypt");
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({
    iv,
    name: "AES-CBC"
  }, encKey, plaintext));
  const macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
  const tag2 = await cbcHmacTag(macKey, macData, keySize);
  return { ciphertext, tag: tag2, iv };
}
async function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array)) {
    throw new TypeError("First argument must be a buffer");
  }
  if (!(b instanceof Uint8Array)) {
    throw new TypeError("Second argument must be a buffer");
  }
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.generateKey(algorithm, false, ["sign"]);
  const aHmac = new Uint8Array(await crypto.subtle.sign(algorithm, key, a));
  const bHmac = new Uint8Array(await crypto.subtle.sign(algorithm, key, b));
  let out = 0;
  let i = -1;
  while (++i < 32) {
    out |= aHmac[i] ^ bHmac[i];
  }
  return out === 0;
}
async function cbcDecrypt(enc, cek, ciphertext, iv, tag2, aad) {
  const { encKey, macKey, keySize } = await cbcKeySetup(enc, cek, "decrypt");
  const macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
  const expectedTag = await cbcHmacTag(macKey, macData, keySize);
  let macCheckPassed;
  try {
    macCheckPassed = await timingSafeEqual(tag2, expectedTag);
  } catch {
  }
  if (!macCheckPassed) {
    throw new JWEDecryptionFailed();
  }
  let plaintext;
  try {
    plaintext = new Uint8Array(await crypto.subtle.decrypt({ iv, name: "AES-CBC" }, encKey, ciphertext));
  } catch {
  }
  if (!plaintext) {
    throw new JWEDecryptionFailed();
  }
  return plaintext;
}
async function gcmEncrypt(enc, plaintext, cek, iv, aad) {
  let encKey;
  if (cek instanceof Uint8Array) {
    encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  } else {
    checkEncCryptoKey(cek, enc, "encrypt");
    encKey = cek;
  }
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({
    additionalData: aad,
    iv,
    name: "AES-GCM",
    tagLength: 128
  }, encKey, plaintext));
  const tag2 = encrypted.slice(-16);
  const ciphertext = encrypted.slice(0, -16);
  return { ciphertext, tag: tag2, iv };
}
async function gcmDecrypt(enc, cek, ciphertext, iv, tag2, aad) {
  let encKey;
  if (cek instanceof Uint8Array) {
    encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  } else {
    checkEncCryptoKey(cek, enc, "decrypt");
    encKey = cek;
  }
  try {
    return new Uint8Array(await crypto.subtle.decrypt({
      additionalData: aad,
      iv,
      name: "AES-GCM",
      tagLength: 128
    }, encKey, concat(ciphertext, tag2)));
  } catch {
    throw new JWEDecryptionFailed();
  }
}
async function encrypt(enc, plaintext, cek, iv, aad) {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array)) {
    throw new TypeError(invalidKeyInput(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  }
  if (iv) {
    checkIvLength(enc, iv);
  } else {
    iv = generateIv(enc);
  }
  switch (enc) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) {
        checkCekLength(cek, parseInt(enc.slice(-3), 10));
      }
      return cbcEncrypt(enc, plaintext, cek, iv, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) {
        checkCekLength(cek, parseInt(enc.slice(1, 4), 10));
      }
      return gcmEncrypt(enc, plaintext, cek, iv, aad);
    default:
      throw new JOSENotSupported(unsupportedEnc);
  }
}
async function decrypt(enc, cek, ciphertext, iv, tag2, aad) {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array)) {
    throw new TypeError(invalidKeyInput(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  }
  if (!iv) {
    throw new JWEInvalid("JWE Initialization Vector missing");
  }
  if (!tag2) {
    throw new JWEInvalid("JWE Authentication Tag missing");
  }
  checkIvLength(enc, iv);
  switch (enc) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array)
        checkCekLength(cek, parseInt(enc.slice(-3), 10));
      return cbcDecrypt(enc, cek, ciphertext, iv, tag2, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array)
        checkCekLength(cek, parseInt(enc.slice(1, 4), 10));
      return gcmDecrypt(enc, cek, ciphertext, iv, tag2, aad);
    default:
      throw new JOSENotSupported(unsupportedEnc);
  }
}
var generateCek, generateIv, unsupportedEnc;
var init_content_encryption = __esm({
  "node_modules/jose/dist/webapi/lib/content_encryption.js"() {
    init_modules_watch_stub();
    init_buffer_utils();
    init_crypto_key();
    init_invalid_key_input();
    init_errors();
    init_is_key_like();
    __name(cekLength, "cekLength");
    generateCek = /* @__PURE__ */ __name((alg) => crypto.getRandomValues(new Uint8Array(cekLength(alg) >> 3)), "generateCek");
    __name(checkCekLength, "checkCekLength");
    __name(ivBitLength, "ivBitLength");
    generateIv = /* @__PURE__ */ __name((alg) => crypto.getRandomValues(new Uint8Array(ivBitLength(alg) >> 3)), "generateIv");
    __name(checkIvLength, "checkIvLength");
    __name(cbcKeySetup, "cbcKeySetup");
    __name(cbcHmacTag, "cbcHmacTag");
    __name(cbcEncrypt, "cbcEncrypt");
    __name(timingSafeEqual, "timingSafeEqual");
    __name(cbcDecrypt, "cbcDecrypt");
    __name(gcmEncrypt, "gcmEncrypt");
    __name(gcmDecrypt, "gcmDecrypt");
    unsupportedEnc = "Unsupported JWE Content Encryption Algorithm";
    __name(encrypt, "encrypt");
    __name(decrypt, "decrypt");
  }
});

// node_modules/jose/dist/webapi/lib/helpers.js
function assertNotSet(value, name) {
  if (value) {
    throw new TypeError(`${name} can only be called once`);
  }
}
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
async function digest(algorithm, data) {
  const subtleDigest = `SHA-${algorithm.slice(-3)}`;
  return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
}
var unprotected;
var init_helpers = __esm({
  "node_modules/jose/dist/webapi/lib/helpers.js"() {
    init_modules_watch_stub();
    init_base64url();
    unprotected = /* @__PURE__ */ Symbol();
    __name(assertNotSet, "assertNotSet");
    __name(decodeBase64url, "decodeBase64url");
    __name(digest, "digest");
  }
});

// node_modules/jose/dist/webapi/lib/type_checks.js
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
function isDisjoint(...headers) {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}
var isObjectLike, isJWK, isPrivateJWK, isPublicJWK, isSecretJWK;
var init_type_checks = __esm({
  "node_modules/jose/dist/webapi/lib/type_checks.js"() {
    init_modules_watch_stub();
    isObjectLike = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null, "isObjectLike");
    __name(isObject, "isObject");
    __name(isDisjoint, "isDisjoint");
    isJWK = /* @__PURE__ */ __name((key) => isObject(key) && typeof key.kty === "string", "isJWK");
    isPrivateJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && (key.kty === "AKP" && typeof key.priv === "string" || typeof key.d === "string"), "isPrivateJWK");
    isPublicJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && key.d === void 0 && key.priv === void 0, "isPublicJWK");
    isSecretJWK = /* @__PURE__ */ __name((key) => key.kty === "oct" && typeof key.k === "string", "isSecretJWK");
  }
});

// node_modules/jose/dist/webapi/lib/aeskw.js
function checkKeySize(key, alg) {
  if (key.algorithm.length !== parseInt(alg.slice(1, 4), 10)) {
    throw new TypeError(`Invalid key size for alg: ${alg}`);
  }
}
function getCryptoKey(key, alg, usage) {
  if (key instanceof Uint8Array) {
    return crypto.subtle.importKey("raw", key, "AES-KW", true, [usage]);
  }
  checkEncCryptoKey(key, alg, usage);
  return key;
}
async function wrap(alg, key, cek) {
  const cryptoKey = await getCryptoKey(key, alg, "wrapKey");
  checkKeySize(cryptoKey, alg);
  const cryptoKeyCek = await crypto.subtle.importKey("raw", cek, { hash: "SHA-256", name: "HMAC" }, true, ["sign"]);
  return new Uint8Array(await crypto.subtle.wrapKey("raw", cryptoKeyCek, cryptoKey, "AES-KW"));
}
async function unwrap(alg, key, encryptedKey) {
  const cryptoKey = await getCryptoKey(key, alg, "unwrapKey");
  checkKeySize(cryptoKey, alg);
  const cryptoKeyCek = await crypto.subtle.unwrapKey("raw", encryptedKey, cryptoKey, "AES-KW", { hash: "SHA-256", name: "HMAC" }, true, ["sign"]);
  return new Uint8Array(await crypto.subtle.exportKey("raw", cryptoKeyCek));
}
var init_aeskw = __esm({
  "node_modules/jose/dist/webapi/lib/aeskw.js"() {
    init_modules_watch_stub();
    init_crypto_key();
    __name(checkKeySize, "checkKeySize");
    __name(getCryptoKey, "getCryptoKey");
    __name(wrap, "wrap");
    __name(unwrap, "unwrap");
  }
});

// node_modules/jose/dist/webapi/lib/ecdhes.js
function lengthAndInput(input) {
  return concat(uint32be(input.length), input);
}
async function concatKdf(Z, L, OtherInfo) {
  const dkLen = L >> 3;
  const hashLen = 32;
  const reps = Math.ceil(dkLen / hashLen);
  const dk = new Uint8Array(reps * hashLen);
  for (let i = 1; i <= reps; i++) {
    const hashInput = new Uint8Array(4 + Z.length + OtherInfo.length);
    hashInput.set(uint32be(i), 0);
    hashInput.set(Z, 4);
    hashInput.set(OtherInfo, 4 + Z.length);
    const hashResult = await digest("sha256", hashInput);
    dk.set(hashResult, (i - 1) * hashLen);
  }
  return dk.slice(0, dkLen);
}
async function deriveKey(publicKey, privateKey, algorithm, keyLength, apu = new Uint8Array(), apv = new Uint8Array()) {
  checkEncCryptoKey(publicKey, "ECDH");
  checkEncCryptoKey(privateKey, "ECDH", "deriveBits");
  const algorithmID = lengthAndInput(encode(algorithm));
  const partyUInfo = lengthAndInput(apu);
  const partyVInfo = lengthAndInput(apv);
  const suppPubInfo = uint32be(keyLength);
  const suppPrivInfo = new Uint8Array();
  const otherInfo = concat(algorithmID, partyUInfo, partyVInfo, suppPubInfo, suppPrivInfo);
  const Z = new Uint8Array(await crypto.subtle.deriveBits({
    name: publicKey.algorithm.name,
    public: publicKey
  }, privateKey, getEcdhBitLength(publicKey)));
  return concatKdf(Z, keyLength, otherInfo);
}
function getEcdhBitLength(publicKey) {
  if (publicKey.algorithm.name === "X25519") {
    return 256;
  }
  return Math.ceil(parseInt(publicKey.algorithm.namedCurve.slice(-3), 10) / 8) << 3;
}
function allowed(key) {
  switch (key.algorithm.namedCurve) {
    case "P-256":
    case "P-384":
    case "P-521":
      return true;
    default:
      return key.algorithm.name === "X25519";
  }
}
var init_ecdhes = __esm({
  "node_modules/jose/dist/webapi/lib/ecdhes.js"() {
    init_modules_watch_stub();
    init_buffer_utils();
    init_crypto_key();
    init_helpers();
    __name(lengthAndInput, "lengthAndInput");
    __name(concatKdf, "concatKdf");
    __name(deriveKey, "deriveKey");
    __name(getEcdhBitLength, "getEcdhBitLength");
    __name(allowed, "allowed");
  }
});

// node_modules/jose/dist/webapi/lib/pbes2kw.js
function getCryptoKey2(key, alg) {
  if (key instanceof Uint8Array) {
    return crypto.subtle.importKey("raw", key, "PBKDF2", false, [
      "deriveBits"
    ]);
  }
  checkEncCryptoKey(key, alg, "deriveBits");
  return key;
}
async function deriveKey2(p2s, alg, p2c, key) {
  if (!(p2s instanceof Uint8Array) || p2s.length < 8) {
    throw new JWEInvalid("PBES2 Salt Input must be 8 or more octets");
  }
  if (!Number.isSafeInteger(p2c) || Math.sign(p2c) !== 1) {
    throw new JWEInvalid("PBES2 Count Input must be a positive integer");
  }
  const salt = concatSalt(alg, p2s);
  const keylen = parseInt(alg.slice(13, 16), 10);
  const subtleAlg = {
    hash: `SHA-${alg.slice(8, 11)}`,
    iterations: p2c,
    name: "PBKDF2",
    salt
  };
  const cryptoKey = await getCryptoKey2(key, alg);
  return new Uint8Array(await crypto.subtle.deriveBits(subtleAlg, cryptoKey, keylen));
}
async function wrap2(alg, key, cek, p2c = 2048, p2s = crypto.getRandomValues(new Uint8Array(16))) {
  const derived = await deriveKey2(p2s, alg, p2c, key);
  const encryptedKey = await wrap(alg.slice(-6), derived, cek);
  return { encryptedKey, p2c, p2s: encode2(p2s) };
}
async function unwrap2(alg, key, encryptedKey, p2c, p2s) {
  const derived = await deriveKey2(p2s, alg, p2c, key);
  return unwrap(alg.slice(-6), derived, encryptedKey);
}
var concatSalt;
var init_pbes2kw = __esm({
  "node_modules/jose/dist/webapi/lib/pbes2kw.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_aeskw();
    init_crypto_key();
    init_buffer_utils();
    init_errors();
    __name(getCryptoKey2, "getCryptoKey");
    concatSalt = /* @__PURE__ */ __name((alg, p2sInput) => concat(encode(alg), Uint8Array.of(0), p2sInput), "concatSalt");
    __name(deriveKey2, "deriveKey");
    __name(wrap2, "wrap");
    __name(unwrap2, "unwrap");
  }
});

// node_modules/jose/dist/webapi/lib/signing.js
function checkKeyLength(alg, key) {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}
function subtleAlgorithm(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: parseInt(alg.slice(-3), 10) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
    case "EdDSA":
      return { name: "Ed25519" };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return { name: alg };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
async function getSigKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject", "JSON Web Key"));
    }
    return crypto.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  checkSigCryptoKey(key, alg, usage);
  return key;
}
async function sign(alg, key, data) {
  const cryptoKey = await getSigKey(alg, key, "sign");
  checkKeyLength(alg, cryptoKey);
  const signature = await crypto.subtle.sign(subtleAlgorithm(alg, cryptoKey.algorithm), cryptoKey, data);
  return new Uint8Array(signature);
}
async function verify(alg, key, signature, data) {
  const cryptoKey = await getSigKey(alg, key, "verify");
  checkKeyLength(alg, cryptoKey);
  const algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
  try {
    return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}
var init_signing = __esm({
  "node_modules/jose/dist/webapi/lib/signing.js"() {
    init_modules_watch_stub();
    init_errors();
    init_crypto_key();
    init_invalid_key_input();
    __name(checkKeyLength, "checkKeyLength");
    __name(subtleAlgorithm, "subtleAlgorithm");
    __name(getSigKey, "getSigKey");
    __name(sign, "sign");
    __name(verify, "verify");
  }
});

// node_modules/jose/dist/webapi/lib/rsaes.js
async function encrypt2(alg, key, cek) {
  checkEncCryptoKey(key, alg, "encrypt");
  checkKeyLength(alg, key);
  return new Uint8Array(await crypto.subtle.encrypt(subtleAlgorithm2(alg), key, cek));
}
async function decrypt2(alg, key, encryptedKey) {
  checkEncCryptoKey(key, alg, "decrypt");
  checkKeyLength(alg, key);
  return new Uint8Array(await crypto.subtle.decrypt(subtleAlgorithm2(alg), key, encryptedKey));
}
var subtleAlgorithm2;
var init_rsaes = __esm({
  "node_modules/jose/dist/webapi/lib/rsaes.js"() {
    init_modules_watch_stub();
    init_crypto_key();
    init_signing();
    init_errors();
    subtleAlgorithm2 = /* @__PURE__ */ __name((alg) => {
      switch (alg) {
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          return "RSA-OAEP";
        default:
          throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
      }
    }, "subtleAlgorithm");
    __name(encrypt2, "encrypt");
    __name(decrypt2, "decrypt");
  }
});

// node_modules/jose/dist/webapi/lib/jwk_to_key.js
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "AKP": {
      switch (jwk.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = { name: jwk.alg };
          keyUsages = jwk.priv ? ["sign"] : ["verify"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
        case "ES384":
        case "ES512":
          algorithm = {
            name: "ECDSA",
            namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[jwk.alg]
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
        case "EdDSA":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
async function jwkToKey(jwk) {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const keyData = { ...jwk };
  if (keyData.kty !== "AKP") {
    delete keyData.alg;
  }
  delete keyData.use;
  return crypto.subtle.importKey("jwk", keyData, algorithm, jwk.ext ?? (jwk.d || jwk.priv ? false : true), jwk.key_ops ?? keyUsages);
}
var unsupportedAlg;
var init_jwk_to_key = __esm({
  "node_modules/jose/dist/webapi/lib/jwk_to_key.js"() {
    init_modules_watch_stub();
    init_errors();
    unsupportedAlg = 'Invalid or unsupported JWK "alg" (Algorithm) Parameter value';
    __name(subtleMapping, "subtleMapping");
    __name(jwkToKey, "jwkToKey");
  }
});

// node_modules/jose/dist/webapi/lib/normalize_key.js
async function normalizeKey(key, alg) {
  if (key instanceof Uint8Array) {
    return key;
  }
  if (isCryptoKey(key)) {
    return key;
  }
  if (isKeyObject(key)) {
    if (key.type === "secret") {
      return key.export();
    }
    if ("toCryptoKey" in key && typeof key.toCryptoKey === "function") {
      try {
        return handleKeyObject(key, alg);
      } catch (err) {
        if (err instanceof TypeError) {
          throw err;
        }
      }
    }
    let jwk = key.export({ format: "jwk" });
    return handleJWK(key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k) {
      return decode(key.k);
    }
    return handleJWK(key, key, alg, true);
  }
  throw new Error("unreachable");
}
var unusableForAlg, cache, handleJWK, handleKeyObject;
var init_normalize_key = __esm({
  "node_modules/jose/dist/webapi/lib/normalize_key.js"() {
    init_modules_watch_stub();
    init_type_checks();
    init_base64url();
    init_jwk_to_key();
    init_is_key_like();
    unusableForAlg = "given KeyObject instance cannot be used for this algorithm";
    handleJWK = /* @__PURE__ */ __name(async (key, jwk, alg, freeze = false) => {
      cache ||= /* @__PURE__ */ new WeakMap();
      let cached = cache.get(key);
      if (cached?.[alg]) {
        return cached[alg];
      }
      const cryptoKey = await jwkToKey({ ...jwk, alg });
      if (freeze)
        Object.freeze(key);
      if (!cached) {
        cache.set(key, { [alg]: cryptoKey });
      } else {
        cached[alg] = cryptoKey;
      }
      return cryptoKey;
    }, "handleJWK");
    handleKeyObject = /* @__PURE__ */ __name((keyObject, alg) => {
      cache ||= /* @__PURE__ */ new WeakMap();
      let cached = cache.get(keyObject);
      if (cached?.[alg]) {
        return cached[alg];
      }
      const isPublic = keyObject.type === "public";
      const extractable = isPublic ? true : false;
      let cryptoKey;
      if (keyObject.asymmetricKeyType === "x25519") {
        switch (alg) {
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW":
            break;
          default:
            throw new TypeError(unusableForAlg);
        }
        cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, isPublic ? [] : ["deriveBits"]);
      }
      if (keyObject.asymmetricKeyType === "ed25519") {
        if (alg !== "EdDSA" && alg !== "Ed25519") {
          throw new TypeError(unusableForAlg);
        }
        cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
          isPublic ? "verify" : "sign"
        ]);
      }
      switch (keyObject.asymmetricKeyType) {
        case "ml-dsa-44":
        case "ml-dsa-65":
        case "ml-dsa-87": {
          if (alg !== keyObject.asymmetricKeyType.toUpperCase()) {
            throw new TypeError(unusableForAlg);
          }
          cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
            isPublic ? "verify" : "sign"
          ]);
        }
      }
      if (keyObject.asymmetricKeyType === "rsa") {
        let hash;
        switch (alg) {
          case "RSA-OAEP":
            hash = "SHA-1";
            break;
          case "RS256":
          case "PS256":
          case "RSA-OAEP-256":
            hash = "SHA-256";
            break;
          case "RS384":
          case "PS384":
          case "RSA-OAEP-384":
            hash = "SHA-384";
            break;
          case "RS512":
          case "PS512":
          case "RSA-OAEP-512":
            hash = "SHA-512";
            break;
          default:
            throw new TypeError(unusableForAlg);
        }
        if (alg.startsWith("RSA-OAEP")) {
          return keyObject.toCryptoKey({
            name: "RSA-OAEP",
            hash
          }, extractable, isPublic ? ["encrypt"] : ["decrypt"]);
        }
        cryptoKey = keyObject.toCryptoKey({
          name: alg.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
          hash
        }, extractable, [isPublic ? "verify" : "sign"]);
      }
      if (keyObject.asymmetricKeyType === "ec") {
        const nist = /* @__PURE__ */ new Map([
          ["prime256v1", "P-256"],
          ["secp384r1", "P-384"],
          ["secp521r1", "P-521"]
        ]);
        const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
        if (!namedCurve) {
          throw new TypeError(unusableForAlg);
        }
        const expectedCurve = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };
        if (expectedCurve[alg] && namedCurve === expectedCurve[alg]) {
          cryptoKey = keyObject.toCryptoKey({
            name: "ECDSA",
            namedCurve
          }, extractable, [isPublic ? "verify" : "sign"]);
        }
        if (alg.startsWith("ECDH-ES")) {
          cryptoKey = keyObject.toCryptoKey({
            name: "ECDH",
            namedCurve
          }, extractable, isPublic ? [] : ["deriveBits"]);
        }
      }
      if (!cryptoKey) {
        throw new TypeError(unusableForAlg);
      }
      if (!cached) {
        cache.set(keyObject, { [alg]: cryptoKey });
      } else {
        cached[alg] = cryptoKey;
      }
      return cryptoKey;
    }, "handleKeyObject");
    __name(normalizeKey, "normalizeKey");
  }
});

// node_modules/jose/dist/webapi/lib/asn1.js
function parsePKCS8Header(state) {
  expectTag(state, 48, "Invalid PKCS#8 structure");
  parseLength(state);
  expectTag(state, 2, "Expected version field");
  const verLen = parseLength(state);
  state.pos += verLen;
  expectTag(state, 48, "Expected algorithm identifier");
  const algIdLen = parseLength(state);
  const algIdStart = state.pos;
  return { algIdStart, algIdLength: algIdLen };
}
function parseSPKIHeader(state) {
  expectTag(state, 48, "Invalid SPKI structure");
  parseLength(state);
  expectTag(state, 48, "Expected algorithm identifier");
  const algIdLen = parseLength(state);
  const algIdStart = state.pos;
  return { algIdStart, algIdLength: algIdLen };
}
function spkiFromX509(buf) {
  const state = createASN1State(buf);
  expectTag(state, 48, "Invalid certificate structure");
  parseLength(state);
  expectTag(state, 48, "Invalid tbsCertificate structure");
  parseLength(state);
  if (buf[state.pos] === 160) {
    skipElement(state, 6);
  } else {
    skipElement(state, 5);
  }
  const spkiStart = state.pos;
  expectTag(state, 48, "Invalid SPKI structure");
  const spkiContentLen = parseLength(state);
  return buf.subarray(spkiStart, spkiStart + spkiContentLen + (state.pos - spkiStart));
}
function extractX509SPKI(x509) {
  const derBytes = processPEMData(x509, /(?:-----(?:BEGIN|END) CERTIFICATE-----|\s)/g);
  return spkiFromX509(derBytes);
}
var formatPEM, genericExport, toSPKI, toPKCS8, bytesEqual, createASN1State, parseLength, skipElement, expectTag, getSubarray, parseAlgorithmOID, parseECAlgorithmIdentifier, genericImport, processPEMData, fromPKCS8, fromSPKI, fromX509;
var init_asn1 = __esm({
  "node_modules/jose/dist/webapi/lib/asn1.js"() {
    init_modules_watch_stub();
    init_invalid_key_input();
    init_base64();
    init_errors();
    init_is_key_like();
    formatPEM = /* @__PURE__ */ __name((b64, descriptor) => {
      const newlined = (b64.match(/.{1,64}/g) || []).join("\n");
      return `-----BEGIN ${descriptor}-----
${newlined}
-----END ${descriptor}-----`;
    }, "formatPEM");
    genericExport = /* @__PURE__ */ __name(async (keyType, keyFormat, key) => {
      if (isKeyObject(key)) {
        if (key.type !== keyType) {
          throw new TypeError(`key is not a ${keyType} key`);
        }
        return key.export({ format: "pem", type: keyFormat });
      }
      if (!isCryptoKey(key)) {
        throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject"));
      }
      if (!key.extractable) {
        throw new TypeError("CryptoKey is not extractable");
      }
      if (key.type !== keyType) {
        throw new TypeError(`key is not a ${keyType} key`);
      }
      return formatPEM(encodeBase64(new Uint8Array(await crypto.subtle.exportKey(keyFormat, key))), `${keyType.toUpperCase()} KEY`);
    }, "genericExport");
    toSPKI = /* @__PURE__ */ __name((key) => genericExport("public", "spki", key), "toSPKI");
    toPKCS8 = /* @__PURE__ */ __name((key) => genericExport("private", "pkcs8", key), "toPKCS8");
    bytesEqual = /* @__PURE__ */ __name((a, b) => {
      if (a.byteLength !== b.length)
        return false;
      for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i])
          return false;
      }
      return true;
    }, "bytesEqual");
    createASN1State = /* @__PURE__ */ __name((data) => ({ data, pos: 0 }), "createASN1State");
    parseLength = /* @__PURE__ */ __name((state) => {
      const first = state.data[state.pos++];
      if (first & 128) {
        const lengthOfLen = first & 127;
        let length = 0;
        for (let i = 0; i < lengthOfLen; i++) {
          length = length << 8 | state.data[state.pos++];
        }
        return length;
      }
      return first;
    }, "parseLength");
    skipElement = /* @__PURE__ */ __name((state, count = 1) => {
      if (count <= 0)
        return;
      state.pos++;
      const length = parseLength(state);
      state.pos += length;
      if (count > 1) {
        skipElement(state, count - 1);
      }
    }, "skipElement");
    expectTag = /* @__PURE__ */ __name((state, expectedTag, errorMessage) => {
      if (state.data[state.pos++] !== expectedTag) {
        throw new Error(errorMessage);
      }
    }, "expectTag");
    getSubarray = /* @__PURE__ */ __name((state, length) => {
      const result = state.data.subarray(state.pos, state.pos + length);
      state.pos += length;
      return result;
    }, "getSubarray");
    parseAlgorithmOID = /* @__PURE__ */ __name((state) => {
      expectTag(state, 6, "Expected algorithm OID");
      const oidLen = parseLength(state);
      return getSubarray(state, oidLen);
    }, "parseAlgorithmOID");
    __name(parsePKCS8Header, "parsePKCS8Header");
    __name(parseSPKIHeader, "parseSPKIHeader");
    parseECAlgorithmIdentifier = /* @__PURE__ */ __name((state) => {
      const algOid = parseAlgorithmOID(state);
      if (bytesEqual(algOid, [43, 101, 110])) {
        return "X25519";
      }
      if (!bytesEqual(algOid, [42, 134, 72, 206, 61, 2, 1])) {
        throw new Error("Unsupported key algorithm");
      }
      expectTag(state, 6, "Expected curve OID");
      const curveOidLen = parseLength(state);
      const curveOid = getSubarray(state, curveOidLen);
      for (const { name, oid } of [
        { name: "P-256", oid: [42, 134, 72, 206, 61, 3, 1, 7] },
        { name: "P-384", oid: [43, 129, 4, 0, 34] },
        { name: "P-521", oid: [43, 129, 4, 0, 35] }
      ]) {
        if (bytesEqual(curveOid, oid)) {
          return name;
        }
      }
      throw new Error("Unsupported named curve");
    }, "parseECAlgorithmIdentifier");
    genericImport = /* @__PURE__ */ __name(async (keyFormat, keyData, alg, options) => {
      let algorithm;
      let keyUsages;
      const isPublic = keyFormat === "spki";
      const getSigUsages = /* @__PURE__ */ __name(() => isPublic ? ["verify"] : ["sign"], "getSigUsages");
      const getEncUsages = /* @__PURE__ */ __name(() => isPublic ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"], "getEncUsages");
      switch (alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${alg.slice(-3)}` };
          keyUsages = getSigUsages();
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${alg.slice(-3)}` };
          keyUsages = getSigUsages();
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(alg.slice(-3), 10) || 1}`
          };
          keyUsages = getEncUsages();
          break;
        case "ES256":
        case "ES384":
        case "ES512": {
          const curveMap = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };
          algorithm = { name: "ECDSA", namedCurve: curveMap[alg] };
          keyUsages = getSigUsages();
          break;
        }
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW": {
          try {
            const namedCurve = options.getNamedCurve(keyData);
            algorithm = namedCurve === "X25519" ? { name: "X25519" } : { name: "ECDH", namedCurve };
          } catch (cause) {
            throw new JOSENotSupported("Invalid or unsupported key format");
          }
          keyUsages = isPublic ? [] : ["deriveBits"];
          break;
        }
        case "Ed25519":
        case "EdDSA":
          algorithm = { name: "Ed25519" };
          keyUsages = getSigUsages();
          break;
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = { name: alg };
          keyUsages = getSigUsages();
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported "alg" (Algorithm) value');
      }
      return crypto.subtle.importKey(keyFormat, keyData, algorithm, options?.extractable ?? (isPublic ? true : false), keyUsages);
    }, "genericImport");
    processPEMData = /* @__PURE__ */ __name((pem, pattern) => {
      return decodeBase64(pem.replace(pattern, ""));
    }, "processPEMData");
    fromPKCS8 = /* @__PURE__ */ __name((pem, alg, options) => {
      const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g);
      let opts = options;
      if (alg?.startsWith?.("ECDH-ES")) {
        opts ||= {};
        opts.getNamedCurve = (keyData2) => {
          const state = createASN1State(keyData2);
          parsePKCS8Header(state);
          return parseECAlgorithmIdentifier(state);
        };
      }
      return genericImport("pkcs8", keyData, alg, opts);
    }, "fromPKCS8");
    fromSPKI = /* @__PURE__ */ __name((pem, alg, options) => {
      const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PUBLIC KEY-----|\s)/g);
      let opts = options;
      if (alg?.startsWith?.("ECDH-ES")) {
        opts ||= {};
        opts.getNamedCurve = (keyData2) => {
          const state = createASN1State(keyData2);
          parseSPKIHeader(state);
          return parseECAlgorithmIdentifier(state);
        };
      }
      return genericImport("spki", keyData, alg, opts);
    }, "fromSPKI");
    __name(spkiFromX509, "spkiFromX509");
    __name(extractX509SPKI, "extractX509SPKI");
    fromX509 = /* @__PURE__ */ __name((pem, alg, options) => {
      let spki;
      try {
        spki = extractX509SPKI(pem);
      } catch (cause) {
        throw new TypeError("Failed to parse the X.509 certificate", { cause });
      }
      return fromSPKI(formatPEM(encodeBase64(spki), "PUBLIC KEY"), alg, options);
    }, "fromX509");
  }
});

// node_modules/jose/dist/webapi/key/import.js
async function importSPKI(spki, alg, options) {
  if (typeof spki !== "string" || spki.indexOf("-----BEGIN PUBLIC KEY-----") !== 0) {
    throw new TypeError('"spki" must be SPKI formatted string');
  }
  return fromSPKI(spki, alg, options);
}
async function importX509(x509, alg, options) {
  if (typeof x509 !== "string" || x509.indexOf("-----BEGIN CERTIFICATE-----") !== 0) {
    throw new TypeError('"x509" must be X.509 formatted string');
  }
  return fromX509(x509, alg, options);
}
async function importPKCS8(pkcs8, alg, options) {
  if (typeof pkcs8 !== "string" || pkcs8.indexOf("-----BEGIN PRIVATE KEY-----") !== 0) {
    throw new TypeError('"pkcs8" must be PKCS#8 formatted string');
  }
  return fromPKCS8(pkcs8, alg, options);
}
async function importJWK(jwk, alg, options) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  let ext;
  alg ??= jwk.alg;
  ext ??= options?.extractable ?? jwk.ext;
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
      return jwkToKey({ ...jwk, alg, ext });
    case "AKP": {
      if (typeof jwk.alg !== "string" || !jwk.alg) {
        throw new TypeError('missing "alg" (Algorithm) Parameter value');
      }
      if (alg !== void 0 && alg !== jwk.alg) {
        throw new TypeError("JWK alg and alg option value mismatch");
      }
      return jwkToKey({ ...jwk, ext });
    }
    case "EC":
    case "OKP":
      return jwkToKey({ ...jwk, alg, ext });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
var init_import = __esm({
  "node_modules/jose/dist/webapi/key/import.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_asn1();
    init_jwk_to_key();
    init_errors();
    init_type_checks();
    __name(importSPKI, "importSPKI");
    __name(importX509, "importX509");
    __name(importPKCS8, "importPKCS8");
    __name(importJWK, "importJWK");
  }
});

// node_modules/jose/dist/webapi/lib/key_to_jwk.js
async function keyToJWK(key) {
  if (isKeyObject(key)) {
    if (key.type === "secret") {
      key = key.export();
    } else {
      return key.export({ format: "jwk" });
    }
  }
  if (key instanceof Uint8Array) {
    return {
      kty: "oct",
      k: encode2(key)
    };
  }
  if (!isCryptoKey(key)) {
    throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject", "Uint8Array"));
  }
  if (!key.extractable) {
    throw new TypeError("non-extractable CryptoKey cannot be exported as a JWK");
  }
  const { ext, key_ops, alg, use, ...jwk } = await crypto.subtle.exportKey("jwk", key);
  if (jwk.kty === "AKP") {
    ;
    jwk.alg = alg;
  }
  return jwk;
}
var init_key_to_jwk = __esm({
  "node_modules/jose/dist/webapi/lib/key_to_jwk.js"() {
    init_modules_watch_stub();
    init_invalid_key_input();
    init_base64url();
    init_is_key_like();
    __name(keyToJWK, "keyToJWK");
  }
});

// node_modules/jose/dist/webapi/key/export.js
async function exportSPKI(key) {
  return toSPKI(key);
}
async function exportPKCS8(key) {
  return toPKCS8(key);
}
async function exportJWK(key) {
  return keyToJWK(key);
}
var init_export = __esm({
  "node_modules/jose/dist/webapi/key/export.js"() {
    init_modules_watch_stub();
    init_asn1();
    init_key_to_jwk();
    __name(exportSPKI, "exportSPKI");
    __name(exportPKCS8, "exportPKCS8");
    __name(exportJWK, "exportJWK");
  }
});

// node_modules/jose/dist/webapi/lib/aesgcmkw.js
async function wrap3(alg, key, cek, iv) {
  const jweAlgorithm = alg.slice(0, 7);
  const wrapped = await encrypt(jweAlgorithm, cek, key, iv, new Uint8Array());
  return {
    encryptedKey: wrapped.ciphertext,
    iv: encode2(wrapped.iv),
    tag: encode2(wrapped.tag)
  };
}
async function unwrap3(alg, key, encryptedKey, iv, tag2) {
  const jweAlgorithm = alg.slice(0, 7);
  return decrypt(jweAlgorithm, key, encryptedKey, iv, tag2, new Uint8Array());
}
var init_aesgcmkw = __esm({
  "node_modules/jose/dist/webapi/lib/aesgcmkw.js"() {
    init_modules_watch_stub();
    init_content_encryption();
    init_base64url();
    __name(wrap3, "wrap");
    __name(unwrap3, "unwrap");
  }
});

// node_modules/jose/dist/webapi/lib/key_management.js
function assertEncryptedKey(encryptedKey) {
  if (encryptedKey === void 0)
    throw new JWEInvalid("JWE Encrypted Key missing");
}
async function decryptKeyManagement(alg, key, encryptedKey, joseHeader, options) {
  switch (alg) {
    case "dir": {
      if (encryptedKey !== void 0)
        throw new JWEInvalid("Encountered unexpected JWE Encrypted Key");
      return key;
    }
    case "ECDH-ES":
      if (encryptedKey !== void 0)
        throw new JWEInvalid("Encountered unexpected JWE Encrypted Key");
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!isObject(joseHeader.epk))
        throw new JWEInvalid(`JOSE Header "epk" (Ephemeral Public Key) missing or invalid`);
      assertCryptoKey(key);
      if (!allowed(key))
        throw new JOSENotSupported("ECDH with the provided key is not allowed or not supported by your javascript runtime");
      const epk = await importJWK(joseHeader.epk, alg);
      assertCryptoKey(epk);
      let partyUInfo;
      let partyVInfo;
      if (joseHeader.apu !== void 0) {
        if (typeof joseHeader.apu !== "string")
          throw new JWEInvalid(`JOSE Header "apu" (Agreement PartyUInfo) invalid`);
        partyUInfo = decodeBase64url(joseHeader.apu, "apu", JWEInvalid);
      }
      if (joseHeader.apv !== void 0) {
        if (typeof joseHeader.apv !== "string")
          throw new JWEInvalid(`JOSE Header "apv" (Agreement PartyVInfo) invalid`);
        partyVInfo = decodeBase64url(joseHeader.apv, "apv", JWEInvalid);
      }
      const sharedSecret = await deriveKey(epk, key, alg === "ECDH-ES" ? joseHeader.enc : alg, alg === "ECDH-ES" ? cekLength(joseHeader.enc) : parseInt(alg.slice(-5, -2), 10), partyUInfo, partyVInfo);
      if (alg === "ECDH-ES")
        return sharedSecret;
      assertEncryptedKey(encryptedKey);
      return unwrap(alg.slice(-6), sharedSecret, encryptedKey);
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      assertEncryptedKey(encryptedKey);
      assertCryptoKey(key);
      return decrypt2(alg, key, encryptedKey);
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      assertEncryptedKey(encryptedKey);
      if (typeof joseHeader.p2c !== "number")
        throw new JWEInvalid(`JOSE Header "p2c" (PBES2 Count) missing or invalid`);
      const p2cLimit = options?.maxPBES2Count || 1e4;
      if (joseHeader.p2c > p2cLimit)
        throw new JWEInvalid(`JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds`);
      if (typeof joseHeader.p2s !== "string")
        throw new JWEInvalid(`JOSE Header "p2s" (PBES2 Salt) missing or invalid`);
      let p2s;
      p2s = decodeBase64url(joseHeader.p2s, "p2s", JWEInvalid);
      return unwrap2(alg, key, encryptedKey, joseHeader.p2c, p2s);
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      assertEncryptedKey(encryptedKey);
      return unwrap(alg, key, encryptedKey);
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      assertEncryptedKey(encryptedKey);
      if (typeof joseHeader.iv !== "string")
        throw new JWEInvalid(`JOSE Header "iv" (Initialization Vector) missing or invalid`);
      if (typeof joseHeader.tag !== "string")
        throw new JWEInvalid(`JOSE Header "tag" (Authentication Tag) missing or invalid`);
      let iv;
      iv = decodeBase64url(joseHeader.iv, "iv", JWEInvalid);
      let tag2;
      tag2 = decodeBase64url(joseHeader.tag, "tag", JWEInvalid);
      return unwrap3(alg, key, encryptedKey, iv, tag2);
    }
    default: {
      throw new JOSENotSupported(unsupportedAlgHeader);
    }
  }
}
async function encryptKeyManagement(alg, enc, key, providedCek, providedParameters = {}) {
  let encryptedKey;
  let parameters;
  let cek;
  switch (alg) {
    case "dir": {
      cek = key;
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      assertCryptoKey(key);
      if (!allowed(key)) {
        throw new JOSENotSupported("ECDH with the provided key is not allowed or not supported by your javascript runtime");
      }
      const { apu, apv } = providedParameters;
      let ephemeralKey;
      if (providedParameters.epk) {
        ephemeralKey = await normalizeKey(providedParameters.epk, alg);
      } else {
        ephemeralKey = (await crypto.subtle.generateKey(key.algorithm, true, ["deriveBits"])).privateKey;
      }
      const { x, y, crv, kty } = await exportJWK(ephemeralKey);
      const sharedSecret = await deriveKey(key, ephemeralKey, alg === "ECDH-ES" ? enc : alg, alg === "ECDH-ES" ? cekLength(enc) : parseInt(alg.slice(-5, -2), 10), apu, apv);
      parameters = { epk: { x, crv, kty } };
      if (kty === "EC")
        parameters.epk.y = y;
      if (apu)
        parameters.apu = encode2(apu);
      if (apv)
        parameters.apv = encode2(apv);
      if (alg === "ECDH-ES") {
        cek = sharedSecret;
        break;
      }
      cek = providedCek || generateCek(enc);
      const kwAlg = alg.slice(-6);
      encryptedKey = await wrap(kwAlg, sharedSecret, cek);
      break;
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      cek = providedCek || generateCek(enc);
      assertCryptoKey(key);
      encryptedKey = await encrypt2(alg, key, cek);
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      cek = providedCek || generateCek(enc);
      const { p2c, p2s } = providedParameters;
      ({ encryptedKey, ...parameters } = await wrap2(alg, key, cek, p2c, p2s));
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      cek = providedCek || generateCek(enc);
      encryptedKey = await wrap(alg, key, cek);
      break;
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      cek = providedCek || generateCek(enc);
      const { iv } = providedParameters;
      ({ encryptedKey, ...parameters } = await wrap3(alg, key, cek, iv));
      break;
    }
    default: {
      throw new JOSENotSupported(unsupportedAlgHeader);
    }
  }
  return { cek, encryptedKey, parameters };
}
var unsupportedAlgHeader;
var init_key_management = __esm({
  "node_modules/jose/dist/webapi/lib/key_management.js"() {
    init_modules_watch_stub();
    init_aeskw();
    init_ecdhes();
    init_pbes2kw();
    init_rsaes();
    init_base64url();
    init_normalize_key();
    init_errors();
    init_helpers();
    init_content_encryption();
    init_import();
    init_export();
    init_type_checks();
    init_aesgcmkw();
    init_is_key_like();
    unsupportedAlgHeader = 'Invalid or unsupported "alg" (JWE Algorithm) header value';
    __name(assertEncryptedKey, "assertEncryptedKey");
    __name(decryptKeyManagement, "decryptKeyManagement");
    __name(encryptKeyManagement, "encryptKeyManagement");
  }
});

// node_modules/jose/dist/webapi/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
var init_validate_crit = __esm({
  "node_modules/jose/dist/webapi/lib/validate_crit.js"() {
    init_modules_watch_stub();
    init_errors();
    __name(validateCrit, "validateCrit");
  }
});

// node_modules/jose/dist/webapi/lib/validate_algorithms.js
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}
var init_validate_algorithms = __esm({
  "node_modules/jose/dist/webapi/lib/validate_algorithms.js"() {
    init_modules_watch_stub();
    __name(validateAlgorithms, "validateAlgorithms");
  }
});

// node_modules/jose/dist/webapi/lib/check_key_type.js
function checkKeyType(alg, key, usage) {
  switch (alg.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      symmetricTypeCheck(alg, key, usage);
      break;
    default:
      asymmetricTypeCheck(alg, key, usage);
  }
}
var tag, jwkMatchesOp, symmetricTypeCheck, asymmetricTypeCheck;
var init_check_key_type = __esm({
  "node_modules/jose/dist/webapi/lib/check_key_type.js"() {
    init_modules_watch_stub();
    init_invalid_key_input();
    init_is_key_like();
    init_type_checks();
    tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
    jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
      if (key.use !== void 0) {
        let expected;
        switch (usage) {
          case "sign":
          case "verify":
            expected = "sig";
            break;
          case "encrypt":
          case "decrypt":
            expected = "enc";
            break;
        }
        if (key.use !== expected) {
          throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
        }
      }
      if (key.alg !== void 0 && key.alg !== alg) {
        throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
      }
      if (Array.isArray(key.key_ops)) {
        let expectedKeyOp;
        switch (true) {
          case (usage === "sign" || usage === "verify"):
          case alg === "dir":
          case alg.includes("CBC-HS"):
            expectedKeyOp = usage;
            break;
          case alg.startsWith("PBES2"):
            expectedKeyOp = "deriveBits";
            break;
          case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
            if (!alg.includes("GCM") && alg.endsWith("KW")) {
              expectedKeyOp = usage === "encrypt" ? "wrapKey" : "unwrapKey";
            } else {
              expectedKeyOp = usage;
            }
            break;
          case (usage === "encrypt" && alg.startsWith("RSA")):
            expectedKeyOp = "wrapKey";
            break;
          case usage === "decrypt":
            expectedKeyOp = alg.startsWith("RSA") ? "unwrapKey" : "deriveBits";
            break;
        }
        if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
          throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
        }
      }
      return true;
    }, "jwkMatchesOp");
    symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
      if (key instanceof Uint8Array)
        return;
      if (isJWK(key)) {
        if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
      }
      if (!isKeyLike(key)) {
        throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
      }
      if (key.type !== "secret") {
        throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
      }
    }, "symmetricTypeCheck");
    asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
      if (isJWK(key)) {
        switch (usage) {
          case "decrypt":
          case "sign":
            if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
              return;
            throw new TypeError(`JSON Web Key for this operation must be a private JWK`);
          case "encrypt":
          case "verify":
            if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
              return;
            throw new TypeError(`JSON Web Key for this operation must be a public JWK`);
        }
      }
      if (!isKeyLike(key)) {
        throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key"));
      }
      if (key.type === "secret") {
        throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
      }
      if (key.type === "public") {
        switch (usage) {
          case "sign":
            throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
          case "decrypt":
            throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
        }
      }
      if (key.type === "private") {
        switch (usage) {
          case "verify":
            throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
          case "encrypt":
            throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
        }
      }
    }, "asymmetricTypeCheck");
    __name(checkKeyType, "checkKeyType");
  }
});

// node_modules/jose/dist/webapi/lib/deflate.js
function supported(name) {
  if (typeof globalThis[name] === "undefined") {
    throw new JOSENotSupported(`JWE "zip" (Compression Algorithm) Header Parameter requires the ${name} API.`);
  }
}
async function compress(input) {
  supported("CompressionStream");
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(input).catch(() => {
  });
  writer.close().catch(() => {
  });
  const chunks = [];
  const reader = cs.readable.getReader();
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done)
      break;
    chunks.push(value);
  }
  return concat(...chunks);
}
async function decompress(input, maxLength) {
  supported("DecompressionStream");
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(input).catch(() => {
  });
  writer.close().catch(() => {
  });
  const chunks = [];
  let length = 0;
  const reader = ds.readable.getReader();
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done)
      break;
    chunks.push(value);
    length += value.byteLength;
    if (maxLength !== Infinity && length > maxLength) {
      throw new JWEInvalid("Decompressed plaintext exceeded the configured limit");
    }
  }
  return concat(...chunks);
}
var init_deflate = __esm({
  "node_modules/jose/dist/webapi/lib/deflate.js"() {
    init_modules_watch_stub();
    init_errors();
    init_buffer_utils();
    __name(supported, "supported");
    __name(compress, "compress");
    __name(decompress, "decompress");
  }
});

// node_modules/jose/dist/webapi/jwe/flattened/decrypt.js
async function flattenedDecrypt(jwe, key, options) {
  if (!isObject(jwe)) {
    throw new JWEInvalid("Flattened JWE must be an object");
  }
  if (jwe.protected === void 0 && jwe.header === void 0 && jwe.unprotected === void 0) {
    throw new JWEInvalid("JOSE Header missing");
  }
  if (jwe.iv !== void 0 && typeof jwe.iv !== "string") {
    throw new JWEInvalid("JWE Initialization Vector incorrect type");
  }
  if (typeof jwe.ciphertext !== "string") {
    throw new JWEInvalid("JWE Ciphertext missing or incorrect type");
  }
  if (jwe.tag !== void 0 && typeof jwe.tag !== "string") {
    throw new JWEInvalid("JWE Authentication Tag incorrect type");
  }
  if (jwe.protected !== void 0 && typeof jwe.protected !== "string") {
    throw new JWEInvalid("JWE Protected Header incorrect type");
  }
  if (jwe.encrypted_key !== void 0 && typeof jwe.encrypted_key !== "string") {
    throw new JWEInvalid("JWE Encrypted Key incorrect type");
  }
  if (jwe.aad !== void 0 && typeof jwe.aad !== "string") {
    throw new JWEInvalid("JWE AAD incorrect type");
  }
  if (jwe.header !== void 0 && !isObject(jwe.header)) {
    throw new JWEInvalid("JWE Shared Unprotected Header incorrect type");
  }
  if (jwe.unprotected !== void 0 && !isObject(jwe.unprotected)) {
    throw new JWEInvalid("JWE Per-Recipient Unprotected Header incorrect type");
  }
  let parsedProt;
  if (jwe.protected) {
    try {
      const protectedHeader2 = decode(jwe.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader2));
    } catch {
      throw new JWEInvalid("JWE Protected Header is invalid");
    }
  }
  if (!isDisjoint(parsedProt, jwe.header, jwe.unprotected)) {
    throw new JWEInvalid("JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jwe.header,
    ...jwe.unprotected
  };
  validateCrit(JWEInvalid, /* @__PURE__ */ new Map(), options?.crit, parsedProt, joseHeader);
  if (joseHeader.zip !== void 0 && joseHeader.zip !== "DEF") {
    throw new JOSENotSupported('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
  }
  if (joseHeader.zip !== void 0 && !parsedProt?.zip) {
    throw new JWEInvalid('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
  }
  const { alg, enc } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWEInvalid("missing JWE Algorithm (alg) in JWE Header");
  }
  if (typeof enc !== "string" || !enc) {
    throw new JWEInvalid("missing JWE Encryption Algorithm (enc) in JWE Header");
  }
  const keyManagementAlgorithms = options && validateAlgorithms("keyManagementAlgorithms", options.keyManagementAlgorithms);
  const contentEncryptionAlgorithms = options && validateAlgorithms("contentEncryptionAlgorithms", options.contentEncryptionAlgorithms);
  if (keyManagementAlgorithms && !keyManagementAlgorithms.has(alg) || !keyManagementAlgorithms && alg.startsWith("PBES2")) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (contentEncryptionAlgorithms && !contentEncryptionAlgorithms.has(enc)) {
    throw new JOSEAlgNotAllowed('"enc" (Encryption Algorithm) Header Parameter value not allowed');
  }
  let encryptedKey;
  if (jwe.encrypted_key !== void 0) {
    encryptedKey = decodeBase64url(jwe.encrypted_key, "encrypted_key", JWEInvalid);
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jwe);
    resolvedKey = true;
  }
  checkKeyType(alg === "dir" ? enc : alg, key, "decrypt");
  const k = await normalizeKey(key, alg);
  let cek;
  try {
    cek = await decryptKeyManagement(alg, k, encryptedKey, joseHeader, options);
  } catch (err) {
    if (err instanceof TypeError || err instanceof JWEInvalid || err instanceof JOSENotSupported) {
      throw err;
    }
    cek = generateCek(enc);
  }
  let iv;
  let tag2;
  if (jwe.iv !== void 0) {
    iv = decodeBase64url(jwe.iv, "iv", JWEInvalid);
  }
  if (jwe.tag !== void 0) {
    tag2 = decodeBase64url(jwe.tag, "tag", JWEInvalid);
  }
  const protectedHeader = jwe.protected !== void 0 ? encode(jwe.protected) : new Uint8Array();
  let additionalData;
  if (jwe.aad !== void 0) {
    additionalData = concat(protectedHeader, encode("."), encode(jwe.aad));
  } else {
    additionalData = protectedHeader;
  }
  const ciphertext = decodeBase64url(jwe.ciphertext, "ciphertext", JWEInvalid);
  const plaintext = await decrypt(enc, cek, ciphertext, iv, tag2, additionalData);
  const result = { plaintext };
  if (joseHeader.zip === "DEF") {
    const maxDecompressedLength = options?.maxDecompressedLength ?? 25e4;
    if (maxDecompressedLength === 0) {
      throw new JOSENotSupported('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
    }
    if (maxDecompressedLength !== Infinity && (!Number.isSafeInteger(maxDecompressedLength) || maxDecompressedLength < 1)) {
      throw new TypeError("maxDecompressedLength must be 0, a positive safe integer, or Infinity");
    }
    result.plaintext = await decompress(plaintext, maxDecompressedLength).catch((cause) => {
      if (cause instanceof JWEInvalid)
        throw cause;
      throw new JWEInvalid("Failed to decompress plaintext", { cause });
    });
  }
  if (jwe.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jwe.aad !== void 0) {
    result.additionalAuthenticatedData = decodeBase64url(jwe.aad, "aad", JWEInvalid);
  }
  if (jwe.unprotected !== void 0) {
    result.sharedUnprotectedHeader = jwe.unprotected;
  }
  if (jwe.header !== void 0) {
    result.unprotectedHeader = jwe.header;
  }
  if (resolvedKey) {
    return { ...result, key: k };
  }
  return result;
}
var init_decrypt = __esm({
  "node_modules/jose/dist/webapi/jwe/flattened/decrypt.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_content_encryption();
    init_helpers();
    init_errors();
    init_type_checks();
    init_type_checks();
    init_key_management();
    init_buffer_utils();
    init_content_encryption();
    init_validate_crit();
    init_validate_algorithms();
    init_normalize_key();
    init_check_key_type();
    init_deflate();
    __name(flattenedDecrypt, "flattenedDecrypt");
  }
});

// node_modules/jose/dist/webapi/jwe/compact/decrypt.js
async function compactDecrypt(jwe, key, options) {
  if (jwe instanceof Uint8Array) {
    jwe = decoder.decode(jwe);
  }
  if (typeof jwe !== "string") {
    throw new JWEInvalid("Compact JWE must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag2, length } = jwe.split(".");
  if (length !== 5) {
    throw new JWEInvalid("Invalid Compact JWE");
  }
  const decrypted = await flattenedDecrypt({
    ciphertext,
    iv: iv || void 0,
    protected: protectedHeader,
    tag: tag2 || void 0,
    encrypted_key: encryptedKey || void 0
  }, key, options);
  const result = { plaintext: decrypted.plaintext, protectedHeader: decrypted.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: decrypted.key };
  }
  return result;
}
var init_decrypt2 = __esm({
  "node_modules/jose/dist/webapi/jwe/compact/decrypt.js"() {
    init_modules_watch_stub();
    init_decrypt();
    init_errors();
    init_buffer_utils();
    __name(compactDecrypt, "compactDecrypt");
  }
});

// node_modules/jose/dist/webapi/jwe/general/decrypt.js
async function generalDecrypt(jwe, key, options) {
  if (!isObject(jwe)) {
    throw new JWEInvalid("General JWE must be an object");
  }
  if (!Array.isArray(jwe.recipients) || !jwe.recipients.every(isObject)) {
    throw new JWEInvalid("JWE Recipients missing or incorrect type");
  }
  if (!jwe.recipients.length) {
    throw new JWEInvalid("JWE Recipients has no members");
  }
  for (const recipient of jwe.recipients) {
    try {
      return await flattenedDecrypt({
        aad: jwe.aad,
        ciphertext: jwe.ciphertext,
        encrypted_key: recipient.encrypted_key,
        header: recipient.header,
        iv: jwe.iv,
        protected: jwe.protected,
        tag: jwe.tag,
        unprotected: jwe.unprotected
      }, key, options);
    } catch {
    }
  }
  throw new JWEDecryptionFailed();
}
var init_decrypt3 = __esm({
  "node_modules/jose/dist/webapi/jwe/general/decrypt.js"() {
    init_modules_watch_stub();
    init_decrypt();
    init_errors();
    init_type_checks();
    __name(generalDecrypt, "generalDecrypt");
  }
});

// node_modules/jose/dist/webapi/jwe/flattened/encrypt.js
var FlattenedEncrypt;
var init_encrypt = __esm({
  "node_modules/jose/dist/webapi/jwe/flattened/encrypt.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_helpers();
    init_content_encryption();
    init_key_management();
    init_errors();
    init_type_checks();
    init_buffer_utils();
    init_validate_crit();
    init_normalize_key();
    init_check_key_type();
    init_deflate();
    FlattenedEncrypt = class {
      static {
        __name(this, "FlattenedEncrypt");
      }
      #plaintext;
      #protectedHeader;
      #sharedUnprotectedHeader;
      #unprotectedHeader;
      #aad;
      #cek;
      #iv;
      #keyManagementParameters;
      constructor(plaintext) {
        if (!(plaintext instanceof Uint8Array)) {
          throw new TypeError("plaintext must be an instance of Uint8Array");
        }
        this.#plaintext = plaintext;
      }
      setKeyManagementParameters(parameters) {
        assertNotSet(this.#keyManagementParameters, "setKeyManagementParameters");
        this.#keyManagementParameters = parameters;
        return this;
      }
      setProtectedHeader(protectedHeader) {
        assertNotSet(this.#protectedHeader, "setProtectedHeader");
        this.#protectedHeader = protectedHeader;
        return this;
      }
      setSharedUnprotectedHeader(sharedUnprotectedHeader) {
        assertNotSet(this.#sharedUnprotectedHeader, "setSharedUnprotectedHeader");
        this.#sharedUnprotectedHeader = sharedUnprotectedHeader;
        return this;
      }
      setUnprotectedHeader(unprotectedHeader) {
        assertNotSet(this.#unprotectedHeader, "setUnprotectedHeader");
        this.#unprotectedHeader = unprotectedHeader;
        return this;
      }
      setAdditionalAuthenticatedData(aad) {
        this.#aad = aad;
        return this;
      }
      setContentEncryptionKey(cek) {
        assertNotSet(this.#cek, "setContentEncryptionKey");
        this.#cek = cek;
        return this;
      }
      setInitializationVector(iv) {
        assertNotSet(this.#iv, "setInitializationVector");
        this.#iv = iv;
        return this;
      }
      async encrypt(key, options) {
        if (!this.#protectedHeader && !this.#unprotectedHeader && !this.#sharedUnprotectedHeader) {
          throw new JWEInvalid("either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()");
        }
        if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader, this.#sharedUnprotectedHeader)) {
          throw new JWEInvalid("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
        }
        const joseHeader = {
          ...this.#protectedHeader,
          ...this.#unprotectedHeader,
          ...this.#sharedUnprotectedHeader
        };
        validateCrit(JWEInvalid, /* @__PURE__ */ new Map(), options?.crit, this.#protectedHeader, joseHeader);
        if (joseHeader.zip !== void 0 && joseHeader.zip !== "DEF") {
          throw new JOSENotSupported('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
        }
        if (joseHeader.zip !== void 0 && !this.#protectedHeader?.zip) {
          throw new JWEInvalid('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
        }
        const { alg, enc } = joseHeader;
        if (typeof alg !== "string" || !alg) {
          throw new JWEInvalid('JWE "alg" (Algorithm) Header Parameter missing or invalid');
        }
        if (typeof enc !== "string" || !enc) {
          throw new JWEInvalid('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
        }
        let encryptedKey;
        if (this.#cek && (alg === "dir" || alg === "ECDH-ES")) {
          throw new TypeError(`setContentEncryptionKey cannot be called with JWE "alg" (Algorithm) Header ${alg}`);
        }
        checkKeyType(alg === "dir" ? enc : alg, key, "encrypt");
        let cek;
        {
          let parameters;
          const k = await normalizeKey(key, alg);
          ({ cek, encryptedKey, parameters } = await encryptKeyManagement(alg, enc, k, this.#cek, this.#keyManagementParameters));
          if (parameters) {
            if (options && unprotected in options) {
              if (!this.#unprotectedHeader) {
                this.setUnprotectedHeader(parameters);
              } else {
                this.#unprotectedHeader = { ...this.#unprotectedHeader, ...parameters };
              }
            } else if (!this.#protectedHeader) {
              this.setProtectedHeader(parameters);
            } else {
              this.#protectedHeader = { ...this.#protectedHeader, ...parameters };
            }
          }
        }
        let additionalData;
        let protectedHeaderS;
        let protectedHeaderB;
        let aadMember;
        if (this.#protectedHeader) {
          protectedHeaderS = encode2(JSON.stringify(this.#protectedHeader));
          protectedHeaderB = encode(protectedHeaderS);
        } else {
          protectedHeaderS = "";
          protectedHeaderB = new Uint8Array();
        }
        if (this.#aad) {
          aadMember = encode2(this.#aad);
          const aadMemberBytes = encode(aadMember);
          additionalData = concat(protectedHeaderB, encode("."), aadMemberBytes);
        } else {
          additionalData = protectedHeaderB;
        }
        let plaintext = this.#plaintext;
        if (joseHeader.zip === "DEF") {
          plaintext = await compress(plaintext).catch((cause) => {
            throw new JWEInvalid("Failed to compress plaintext", { cause });
          });
        }
        const { ciphertext, tag: tag2, iv } = await encrypt(enc, plaintext, cek, this.#iv, additionalData);
        const jwe = {
          ciphertext: encode2(ciphertext)
        };
        if (iv) {
          jwe.iv = encode2(iv);
        }
        if (tag2) {
          jwe.tag = encode2(tag2);
        }
        if (encryptedKey) {
          jwe.encrypted_key = encode2(encryptedKey);
        }
        if (aadMember) {
          jwe.aad = aadMember;
        }
        if (this.#protectedHeader) {
          jwe.protected = protectedHeaderS;
        }
        if (this.#sharedUnprotectedHeader) {
          jwe.unprotected = this.#sharedUnprotectedHeader;
        }
        if (this.#unprotectedHeader) {
          jwe.header = this.#unprotectedHeader;
        }
        return jwe;
      }
    };
  }
});

// node_modules/jose/dist/webapi/jwe/general/encrypt.js
var IndividualRecipient, GeneralEncrypt;
var init_encrypt2 = __esm({
  "node_modules/jose/dist/webapi/jwe/general/encrypt.js"() {
    init_modules_watch_stub();
    init_encrypt();
    init_helpers();
    init_errors();
    init_content_encryption();
    init_type_checks();
    init_key_management();
    init_base64url();
    init_validate_crit();
    init_normalize_key();
    init_check_key_type();
    IndividualRecipient = class {
      static {
        __name(this, "IndividualRecipient");
      }
      #parent;
      unprotectedHeader;
      keyManagementParameters;
      key;
      options;
      constructor(enc, key, options) {
        this.#parent = enc;
        this.key = key;
        this.options = options;
      }
      setUnprotectedHeader(unprotectedHeader) {
        assertNotSet(this.unprotectedHeader, "setUnprotectedHeader");
        this.unprotectedHeader = unprotectedHeader;
        return this;
      }
      setKeyManagementParameters(parameters) {
        assertNotSet(this.keyManagementParameters, "setKeyManagementParameters");
        this.keyManagementParameters = parameters;
        return this;
      }
      addRecipient(...args) {
        return this.#parent.addRecipient(...args);
      }
      encrypt(...args) {
        return this.#parent.encrypt(...args);
      }
      done() {
        return this.#parent;
      }
    };
    GeneralEncrypt = class {
      static {
        __name(this, "GeneralEncrypt");
      }
      #plaintext;
      #recipients = [];
      #protectedHeader;
      #unprotectedHeader;
      #aad;
      constructor(plaintext) {
        this.#plaintext = plaintext;
      }
      addRecipient(key, options) {
        const recipient = new IndividualRecipient(this, key, { crit: options?.crit });
        this.#recipients.push(recipient);
        return recipient;
      }
      setProtectedHeader(protectedHeader) {
        assertNotSet(this.#protectedHeader, "setProtectedHeader");
        this.#protectedHeader = protectedHeader;
        return this;
      }
      setSharedUnprotectedHeader(sharedUnprotectedHeader) {
        assertNotSet(this.#unprotectedHeader, "setSharedUnprotectedHeader");
        this.#unprotectedHeader = sharedUnprotectedHeader;
        return this;
      }
      setAdditionalAuthenticatedData(aad) {
        this.#aad = aad;
        return this;
      }
      async encrypt() {
        if (!this.#recipients.length) {
          throw new JWEInvalid("at least one recipient must be added");
        }
        if (this.#recipients.length === 1) {
          const [recipient] = this.#recipients;
          const flattened = await new FlattenedEncrypt(this.#plaintext).setAdditionalAuthenticatedData(this.#aad).setProtectedHeader(this.#protectedHeader).setSharedUnprotectedHeader(this.#unprotectedHeader).setUnprotectedHeader(recipient.unprotectedHeader).encrypt(recipient.key, { ...recipient.options });
          const jwe2 = {
            ciphertext: flattened.ciphertext,
            iv: flattened.iv,
            recipients: [{}],
            tag: flattened.tag
          };
          if (flattened.aad)
            jwe2.aad = flattened.aad;
          if (flattened.protected)
            jwe2.protected = flattened.protected;
          if (flattened.unprotected)
            jwe2.unprotected = flattened.unprotected;
          if (flattened.encrypted_key)
            jwe2.recipients[0].encrypted_key = flattened.encrypted_key;
          if (flattened.header)
            jwe2.recipients[0].header = flattened.header;
          return jwe2;
        }
        let enc;
        for (let i = 0; i < this.#recipients.length; i++) {
          const recipient = this.#recipients[i];
          if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader, recipient.unprotectedHeader)) {
            throw new JWEInvalid("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
          }
          const joseHeader = {
            ...this.#protectedHeader,
            ...this.#unprotectedHeader,
            ...recipient.unprotectedHeader
          };
          const { alg } = joseHeader;
          if (typeof alg !== "string" || !alg) {
            throw new JWEInvalid('JWE "alg" (Algorithm) Header Parameter missing or invalid');
          }
          if (alg === "dir" || alg === "ECDH-ES") {
            throw new JWEInvalid('"dir" and "ECDH-ES" alg may only be used with a single recipient');
          }
          if (typeof joseHeader.enc !== "string" || !joseHeader.enc) {
            throw new JWEInvalid('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
          }
          if (!enc) {
            enc = joseHeader.enc;
          } else if (enc !== joseHeader.enc) {
            throw new JWEInvalid('JWE "enc" (Encryption Algorithm) Header Parameter must be the same for all recipients');
          }
          validateCrit(JWEInvalid, /* @__PURE__ */ new Map(), recipient.options.crit, this.#protectedHeader, joseHeader);
          if (joseHeader.zip !== void 0 && joseHeader.zip !== "DEF") {
            throw new JOSENotSupported('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
          }
          if (joseHeader.zip !== void 0 && !this.#protectedHeader?.zip) {
            throw new JWEInvalid('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
          }
        }
        const cek = generateCek(enc);
        const jwe = {
          ciphertext: "",
          recipients: []
        };
        for (let i = 0; i < this.#recipients.length; i++) {
          const recipient = this.#recipients[i];
          const target = {};
          jwe.recipients.push(target);
          if (i === 0) {
            const flattened = await new FlattenedEncrypt(this.#plaintext).setAdditionalAuthenticatedData(this.#aad).setContentEncryptionKey(cek).setProtectedHeader(this.#protectedHeader).setSharedUnprotectedHeader(this.#unprotectedHeader).setUnprotectedHeader(recipient.unprotectedHeader).setKeyManagementParameters(recipient.keyManagementParameters).encrypt(recipient.key, {
              ...recipient.options,
              [unprotected]: true
            });
            jwe.ciphertext = flattened.ciphertext;
            jwe.iv = flattened.iv;
            jwe.tag = flattened.tag;
            if (flattened.aad)
              jwe.aad = flattened.aad;
            if (flattened.protected)
              jwe.protected = flattened.protected;
            if (flattened.unprotected)
              jwe.unprotected = flattened.unprotected;
            target.encrypted_key = flattened.encrypted_key;
            if (flattened.header)
              target.header = flattened.header;
            continue;
          }
          const alg = recipient.unprotectedHeader?.alg || this.#protectedHeader?.alg || this.#unprotectedHeader?.alg;
          checkKeyType(alg === "dir" ? enc : alg, recipient.key, "encrypt");
          const k = await normalizeKey(recipient.key, alg);
          const { encryptedKey, parameters } = await encryptKeyManagement(alg, enc, k, cek, recipient.keyManagementParameters);
          target.encrypted_key = encode2(encryptedKey);
          if (recipient.unprotectedHeader || parameters)
            target.header = { ...recipient.unprotectedHeader, ...parameters };
        }
        return jwe;
      }
    };
  }
});

// node_modules/jose/dist/webapi/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!isDisjoint(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validateCrit(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validateAlgorithms("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyType(alg, key, "verify");
  const data = concat(jws.protected !== void 0 ? encode(jws.protected) : new Uint8Array(), encode("."), typeof jws.payload === "string" ? b64 ? encode(jws.payload) : encoder.encode(jws.payload) : jws.payload);
  const signature = decodeBase64url(jws.signature, "signature", JWSInvalid);
  const k = await normalizeKey(key, alg);
  const verified = await verify(alg, k, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    payload = decodeBase64url(jws.payload, "payload", JWSInvalid);
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key: k };
  }
  return result;
}
var init_verify = __esm({
  "node_modules/jose/dist/webapi/jws/flattened/verify.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_signing();
    init_errors();
    init_buffer_utils();
    init_helpers();
    init_type_checks();
    init_type_checks();
    init_check_key_type();
    init_validate_crit();
    init_validate_algorithms();
    init_normalize_key();
    __name(flattenedVerify, "flattenedVerify");
  }
});

// node_modules/jose/dist/webapi/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
var init_verify2 = __esm({
  "node_modules/jose/dist/webapi/jws/compact/verify.js"() {
    init_modules_watch_stub();
    init_verify();
    init_errors();
    init_buffer_utils();
    __name(compactVerify, "compactVerify");
  }
});

// node_modules/jose/dist/webapi/jws/general/verify.js
async function generalVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("General JWS must be an object");
  }
  if (!Array.isArray(jws.signatures) || !jws.signatures.every(isObject)) {
    throw new JWSInvalid("JWS Signatures missing or incorrect type");
  }
  for (const signature of jws.signatures) {
    try {
      return await flattenedVerify({
        header: signature.header,
        payload: jws.payload,
        protected: signature.protected,
        signature: signature.signature
      }, key, options);
    } catch {
    }
  }
  throw new JWSSignatureVerificationFailed();
}
var init_verify3 = __esm({
  "node_modules/jose/dist/webapi/jws/general/verify.js"() {
    init_modules_watch_stub();
    init_verify();
    init_errors();
    init_type_checks();
    __name(generalVerify, "generalVerify");
  }
});

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
function secs(str) {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}
var epoch, minute, hour, day, week, year, REGEX, normalizeTyp, checkAudiencePresence, JWTClaimsBuilder;
var init_jwt_claims_set = __esm({
  "node_modules/jose/dist/webapi/lib/jwt_claims_set.js"() {
    init_modules_watch_stub();
    init_errors();
    init_buffer_utils();
    init_type_checks();
    epoch = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "epoch");
    minute = 60;
    hour = minute * 60;
    day = hour * 24;
    week = day * 7;
    year = day * 365.25;
    REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
    __name(secs, "secs");
    __name(validateInput, "validateInput");
    normalizeTyp = /* @__PURE__ */ __name((value) => {
      if (value.includes("/")) {
        return value.toLowerCase();
      }
      return `application/${value.toLowerCase()}`;
    }, "normalizeTyp");
    checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
      if (typeof audPayload === "string") {
        return audOption.includes(audPayload);
      }
      if (Array.isArray(audPayload)) {
        return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
      }
      return false;
    }, "checkAudiencePresence");
    __name(validateClaimsSet, "validateClaimsSet");
    JWTClaimsBuilder = class {
      static {
        __name(this, "JWTClaimsBuilder");
      }
      #payload;
      constructor(payload) {
        if (!isObject(payload)) {
          throw new TypeError("JWT Claims Set MUST be an object");
        }
        this.#payload = structuredClone(payload);
      }
      data() {
        return encoder.encode(JSON.stringify(this.#payload));
      }
      get iss() {
        return this.#payload.iss;
      }
      set iss(value) {
        this.#payload.iss = value;
      }
      get sub() {
        return this.#payload.sub;
      }
      set sub(value) {
        this.#payload.sub = value;
      }
      get aud() {
        return this.#payload.aud;
      }
      set aud(value) {
        this.#payload.aud = value;
      }
      set jti(value) {
        this.#payload.jti = value;
      }
      set nbf(value) {
        if (typeof value === "number") {
          this.#payload.nbf = validateInput("setNotBefore", value);
        } else if (value instanceof Date) {
          this.#payload.nbf = validateInput("setNotBefore", epoch(value));
        } else {
          this.#payload.nbf = epoch(/* @__PURE__ */ new Date()) + secs(value);
        }
      }
      set exp(value) {
        if (typeof value === "number") {
          this.#payload.exp = validateInput("setExpirationTime", value);
        } else if (value instanceof Date) {
          this.#payload.exp = validateInput("setExpirationTime", epoch(value));
        } else {
          this.#payload.exp = epoch(/* @__PURE__ */ new Date()) + secs(value);
        }
      }
      set iat(value) {
        if (value === void 0) {
          this.#payload.iat = epoch(/* @__PURE__ */ new Date());
        } else if (value instanceof Date) {
          this.#payload.iat = validateInput("setIssuedAt", epoch(value));
        } else if (typeof value === "string") {
          this.#payload.iat = validateInput("setIssuedAt", epoch(/* @__PURE__ */ new Date()) + secs(value));
        } else {
          this.#payload.iat = validateInput("setIssuedAt", value);
        }
      }
    };
  }
});

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
var init_verify4 = __esm({
  "node_modules/jose/dist/webapi/jwt/verify.js"() {
    init_modules_watch_stub();
    init_verify2();
    init_jwt_claims_set();
    init_errors();
    __name(jwtVerify, "jwtVerify");
  }
});

// node_modules/jose/dist/webapi/jwt/decrypt.js
async function jwtDecrypt(jwt, key, options) {
  const decrypted = await compactDecrypt(jwt, key, options);
  const payload = validateClaimsSet(decrypted.protectedHeader, decrypted.plaintext, options);
  const { protectedHeader } = decrypted;
  if (protectedHeader.iss !== void 0 && protectedHeader.iss !== payload.iss) {
    throw new JWTClaimValidationFailed('replicated "iss" claim header parameter mismatch', payload, "iss", "mismatch");
  }
  if (protectedHeader.sub !== void 0 && protectedHeader.sub !== payload.sub) {
    throw new JWTClaimValidationFailed('replicated "sub" claim header parameter mismatch', payload, "sub", "mismatch");
  }
  if (protectedHeader.aud !== void 0 && JSON.stringify(protectedHeader.aud) !== JSON.stringify(payload.aud)) {
    throw new JWTClaimValidationFailed('replicated "aud" claim header parameter mismatch', payload, "aud", "mismatch");
  }
  const result = { payload, protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: decrypted.key };
  }
  return result;
}
var init_decrypt4 = __esm({
  "node_modules/jose/dist/webapi/jwt/decrypt.js"() {
    init_modules_watch_stub();
    init_decrypt2();
    init_jwt_claims_set();
    init_errors();
    __name(jwtDecrypt, "jwtDecrypt");
  }
});

// node_modules/jose/dist/webapi/jwe/compact/encrypt.js
var CompactEncrypt;
var init_encrypt3 = __esm({
  "node_modules/jose/dist/webapi/jwe/compact/encrypt.js"() {
    init_modules_watch_stub();
    init_encrypt();
    CompactEncrypt = class {
      static {
        __name(this, "CompactEncrypt");
      }
      #flattened;
      constructor(plaintext) {
        this.#flattened = new FlattenedEncrypt(plaintext);
      }
      setContentEncryptionKey(cek) {
        this.#flattened.setContentEncryptionKey(cek);
        return this;
      }
      setInitializationVector(iv) {
        this.#flattened.setInitializationVector(iv);
        return this;
      }
      setProtectedHeader(protectedHeader) {
        this.#flattened.setProtectedHeader(protectedHeader);
        return this;
      }
      setKeyManagementParameters(parameters) {
        this.#flattened.setKeyManagementParameters(parameters);
        return this;
      }
      async encrypt(key, options) {
        const jwe = await this.#flattened.encrypt(key, options);
        return [jwe.protected, jwe.encrypted_key, jwe.iv, jwe.ciphertext, jwe.tag].join(".");
      }
    };
  }
});

// node_modules/jose/dist/webapi/jws/flattened/sign.js
var FlattenedSign;
var init_sign = __esm({
  "node_modules/jose/dist/webapi/jws/flattened/sign.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_signing();
    init_type_checks();
    init_errors();
    init_buffer_utils();
    init_check_key_type();
    init_validate_crit();
    init_normalize_key();
    init_helpers();
    FlattenedSign = class {
      static {
        __name(this, "FlattenedSign");
      }
      #payload;
      #protectedHeader;
      #unprotectedHeader;
      constructor(payload) {
        if (!(payload instanceof Uint8Array)) {
          throw new TypeError("payload must be an instance of Uint8Array");
        }
        this.#payload = payload;
      }
      setProtectedHeader(protectedHeader) {
        assertNotSet(this.#protectedHeader, "setProtectedHeader");
        this.#protectedHeader = protectedHeader;
        return this;
      }
      setUnprotectedHeader(unprotectedHeader) {
        assertNotSet(this.#unprotectedHeader, "setUnprotectedHeader");
        this.#unprotectedHeader = unprotectedHeader;
        return this;
      }
      async sign(key, options) {
        if (!this.#protectedHeader && !this.#unprotectedHeader) {
          throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
        }
        if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader)) {
          throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
        }
        const joseHeader = {
          ...this.#protectedHeader,
          ...this.#unprotectedHeader
        };
        const extensions = validateCrit(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, this.#protectedHeader, joseHeader);
        let b64 = true;
        if (extensions.has("b64")) {
          b64 = this.#protectedHeader.b64;
          if (typeof b64 !== "boolean") {
            throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
          }
        }
        const { alg } = joseHeader;
        if (typeof alg !== "string" || !alg) {
          throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
        }
        checkKeyType(alg, key, "sign");
        let payloadS;
        let payloadB;
        if (b64) {
          payloadS = encode2(this.#payload);
          payloadB = encode(payloadS);
        } else {
          payloadB = this.#payload;
          payloadS = "";
        }
        let protectedHeaderString;
        let protectedHeaderBytes;
        if (this.#protectedHeader) {
          protectedHeaderString = encode2(JSON.stringify(this.#protectedHeader));
          protectedHeaderBytes = encode(protectedHeaderString);
        } else {
          protectedHeaderString = "";
          protectedHeaderBytes = new Uint8Array();
        }
        const data = concat(protectedHeaderBytes, encode("."), payloadB);
        const k = await normalizeKey(key, alg);
        const signature = await sign(alg, k, data);
        const jws = {
          signature: encode2(signature),
          payload: payloadS
        };
        if (this.#unprotectedHeader) {
          jws.header = this.#unprotectedHeader;
        }
        if (this.#protectedHeader) {
          jws.protected = protectedHeaderString;
        }
        return jws;
      }
    };
  }
});

// node_modules/jose/dist/webapi/jws/compact/sign.js
var CompactSign;
var init_sign2 = __esm({
  "node_modules/jose/dist/webapi/jws/compact/sign.js"() {
    init_modules_watch_stub();
    init_sign();
    CompactSign = class {
      static {
        __name(this, "CompactSign");
      }
      #flattened;
      constructor(payload) {
        this.#flattened = new FlattenedSign(payload);
      }
      setProtectedHeader(protectedHeader) {
        this.#flattened.setProtectedHeader(protectedHeader);
        return this;
      }
      async sign(key, options) {
        const jws = await this.#flattened.sign(key, options);
        if (jws.payload === void 0) {
          throw new TypeError("use the flattened module for creating JWS with b64: false");
        }
        return `${jws.protected}.${jws.payload}.${jws.signature}`;
      }
    };
  }
});

// node_modules/jose/dist/webapi/jws/general/sign.js
var IndividualSignature, GeneralSign;
var init_sign3 = __esm({
  "node_modules/jose/dist/webapi/jws/general/sign.js"() {
    init_modules_watch_stub();
    init_sign();
    init_errors();
    init_helpers();
    IndividualSignature = class {
      static {
        __name(this, "IndividualSignature");
      }
      #parent;
      protectedHeader;
      unprotectedHeader;
      options;
      key;
      constructor(sig, key, options) {
        this.#parent = sig;
        this.key = key;
        this.options = options;
      }
      setProtectedHeader(protectedHeader) {
        assertNotSet(this.protectedHeader, "setProtectedHeader");
        this.protectedHeader = protectedHeader;
        return this;
      }
      setUnprotectedHeader(unprotectedHeader) {
        assertNotSet(this.unprotectedHeader, "setUnprotectedHeader");
        this.unprotectedHeader = unprotectedHeader;
        return this;
      }
      addSignature(...args) {
        return this.#parent.addSignature(...args);
      }
      sign(...args) {
        return this.#parent.sign(...args);
      }
      done() {
        return this.#parent;
      }
    };
    GeneralSign = class {
      static {
        __name(this, "GeneralSign");
      }
      #payload;
      #signatures = [];
      constructor(payload) {
        this.#payload = payload;
      }
      addSignature(key, options) {
        const signature = new IndividualSignature(this, key, options);
        this.#signatures.push(signature);
        return signature;
      }
      async sign() {
        if (!this.#signatures.length) {
          throw new JWSInvalid("at least one signature must be added");
        }
        const jws = {
          signatures: [],
          payload: ""
        };
        for (let i = 0; i < this.#signatures.length; i++) {
          const signature = this.#signatures[i];
          const flattened = new FlattenedSign(this.#payload);
          flattened.setProtectedHeader(signature.protectedHeader);
          flattened.setUnprotectedHeader(signature.unprotectedHeader);
          const { payload, ...rest } = await flattened.sign(signature.key, signature.options);
          if (i === 0) {
            jws.payload = payload;
          } else if (jws.payload !== payload) {
            throw new JWSInvalid("inconsistent use of JWS Unencoded Payload (RFC7797)");
          }
          jws.signatures.push(rest);
        }
        return jws;
      }
    };
  }
});

// node_modules/jose/dist/webapi/jwt/sign.js
var SignJWT;
var init_sign4 = __esm({
  "node_modules/jose/dist/webapi/jwt/sign.js"() {
    init_modules_watch_stub();
    init_sign2();
    init_errors();
    init_jwt_claims_set();
    SignJWT = class {
      static {
        __name(this, "SignJWT");
      }
      #protectedHeader;
      #jwt;
      constructor(payload = {}) {
        this.#jwt = new JWTClaimsBuilder(payload);
      }
      setIssuer(issuer) {
        this.#jwt.iss = issuer;
        return this;
      }
      setSubject(subject) {
        this.#jwt.sub = subject;
        return this;
      }
      setAudience(audience) {
        this.#jwt.aud = audience;
        return this;
      }
      setJti(jwtId) {
        this.#jwt.jti = jwtId;
        return this;
      }
      setNotBefore(input) {
        this.#jwt.nbf = input;
        return this;
      }
      setExpirationTime(input) {
        this.#jwt.exp = input;
        return this;
      }
      setIssuedAt(input) {
        this.#jwt.iat = input;
        return this;
      }
      setProtectedHeader(protectedHeader) {
        this.#protectedHeader = protectedHeader;
        return this;
      }
      async sign(key, options) {
        const sig = new CompactSign(this.#jwt.data());
        sig.setProtectedHeader(this.#protectedHeader);
        if (Array.isArray(this.#protectedHeader?.crit) && this.#protectedHeader.crit.includes("b64") && this.#protectedHeader.b64 === false) {
          throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
        }
        return sig.sign(key, options);
      }
    };
  }
});

// node_modules/jose/dist/webapi/jwt/encrypt.js
var EncryptJWT;
var init_encrypt4 = __esm({
  "node_modules/jose/dist/webapi/jwt/encrypt.js"() {
    init_modules_watch_stub();
    init_encrypt3();
    init_jwt_claims_set();
    init_helpers();
    EncryptJWT = class {
      static {
        __name(this, "EncryptJWT");
      }
      #cek;
      #iv;
      #keyManagementParameters;
      #protectedHeader;
      #replicateIssuerAsHeader;
      #replicateSubjectAsHeader;
      #replicateAudienceAsHeader;
      #jwt;
      constructor(payload = {}) {
        this.#jwt = new JWTClaimsBuilder(payload);
      }
      setIssuer(issuer) {
        this.#jwt.iss = issuer;
        return this;
      }
      setSubject(subject) {
        this.#jwt.sub = subject;
        return this;
      }
      setAudience(audience) {
        this.#jwt.aud = audience;
        return this;
      }
      setJti(jwtId) {
        this.#jwt.jti = jwtId;
        return this;
      }
      setNotBefore(input) {
        this.#jwt.nbf = input;
        return this;
      }
      setExpirationTime(input) {
        this.#jwt.exp = input;
        return this;
      }
      setIssuedAt(input) {
        this.#jwt.iat = input;
        return this;
      }
      setProtectedHeader(protectedHeader) {
        assertNotSet(this.#protectedHeader, "setProtectedHeader");
        this.#protectedHeader = protectedHeader;
        return this;
      }
      setKeyManagementParameters(parameters) {
        assertNotSet(this.#keyManagementParameters, "setKeyManagementParameters");
        this.#keyManagementParameters = parameters;
        return this;
      }
      setContentEncryptionKey(cek) {
        assertNotSet(this.#cek, "setContentEncryptionKey");
        this.#cek = cek;
        return this;
      }
      setInitializationVector(iv) {
        assertNotSet(this.#iv, "setInitializationVector");
        this.#iv = iv;
        return this;
      }
      replicateIssuerAsHeader() {
        this.#replicateIssuerAsHeader = true;
        return this;
      }
      replicateSubjectAsHeader() {
        this.#replicateSubjectAsHeader = true;
        return this;
      }
      replicateAudienceAsHeader() {
        this.#replicateAudienceAsHeader = true;
        return this;
      }
      async encrypt(key, options) {
        const enc = new CompactEncrypt(this.#jwt.data());
        if (this.#protectedHeader && (this.#replicateIssuerAsHeader || this.#replicateSubjectAsHeader || this.#replicateAudienceAsHeader)) {
          this.#protectedHeader = {
            ...this.#protectedHeader,
            iss: this.#replicateIssuerAsHeader ? this.#jwt.iss : void 0,
            sub: this.#replicateSubjectAsHeader ? this.#jwt.sub : void 0,
            aud: this.#replicateAudienceAsHeader ? this.#jwt.aud : void 0
          };
        }
        enc.setProtectedHeader(this.#protectedHeader);
        if (this.#iv) {
          enc.setInitializationVector(this.#iv);
        }
        if (this.#cek) {
          enc.setContentEncryptionKey(this.#cek);
        }
        if (this.#keyManagementParameters) {
          enc.setKeyManagementParameters(this.#keyManagementParameters);
        }
        return enc.encrypt(key, options);
      }
    };
  }
});

// node_modules/jose/dist/webapi/jwk/thumbprint.js
async function calculateJwkThumbprint(key, digestAlgorithm) {
  let jwk;
  if (isJWK(key)) {
    jwk = key;
  } else if (isKeyLike(key)) {
    jwk = await exportJWK(key);
  } else {
    throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject", "JSON Web Key"));
  }
  digestAlgorithm ??= "sha256";
  if (digestAlgorithm !== "sha256" && digestAlgorithm !== "sha384" && digestAlgorithm !== "sha512") {
    throw new TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
  }
  let components;
  switch (jwk.kty) {
    case "AKP":
      check(jwk.alg, '"alg" (Algorithm) Parameter');
      check(jwk.pub, '"pub" (Public key) Parameter');
      components = { alg: jwk.alg, kty: jwk.kty, pub: jwk.pub };
      break;
    case "EC":
      check(jwk.crv, '"crv" (Curve) Parameter');
      check(jwk.x, '"x" (X Coordinate) Parameter');
      check(jwk.y, '"y" (Y Coordinate) Parameter');
      components = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
      break;
    case "OKP":
      check(jwk.crv, '"crv" (Subtype of Key Pair) Parameter');
      check(jwk.x, '"x" (Public Key) Parameter');
      components = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
      break;
    case "RSA":
      check(jwk.e, '"e" (Exponent) Parameter');
      check(jwk.n, '"n" (Modulus) Parameter');
      components = { e: jwk.e, kty: jwk.kty, n: jwk.n };
      break;
    case "oct":
      check(jwk.k, '"k" (Key Value) Parameter');
      components = { k: jwk.k, kty: jwk.kty };
      break;
    default:
      throw new JOSENotSupported('"kty" (Key Type) Parameter missing or unsupported');
  }
  const data = encode(JSON.stringify(components));
  return encode2(await digest(digestAlgorithm, data));
}
async function calculateJwkThumbprintUri(key, digestAlgorithm) {
  digestAlgorithm ??= "sha256";
  const thumbprint = await calculateJwkThumbprint(key, digestAlgorithm);
  return `urn:ietf:params:oauth:jwk-thumbprint:sha-${digestAlgorithm.slice(-3)}:${thumbprint}`;
}
var check;
var init_thumbprint = __esm({
  "node_modules/jose/dist/webapi/jwk/thumbprint.js"() {
    init_modules_watch_stub();
    init_helpers();
    init_base64url();
    init_errors();
    init_buffer_utils();
    init_is_key_like();
    init_type_checks();
    init_export();
    init_invalid_key_input();
    check = /* @__PURE__ */ __name((value, description) => {
      if (typeof value !== "string" || !value) {
        throw new JWKInvalid(`${description} missing or invalid`);
      }
    }, "check");
    __name(calculateJwkThumbprint, "calculateJwkThumbprint");
    __name(calculateJwkThumbprintUri, "calculateJwkThumbprintUri");
  }
});

// node_modules/jose/dist/webapi/jwk/embedded.js
async function EmbeddedJWK(protectedHeader, token) {
  const joseHeader = {
    ...protectedHeader,
    ...token?.header
  };
  if (!isObject(joseHeader.jwk)) {
    throw new JWSInvalid('"jwk" (JSON Web Key) Header Parameter must be a JSON object');
  }
  const key = await importJWK({ ...joseHeader.jwk, ext: true }, joseHeader.alg);
  if (key instanceof Uint8Array || key.type !== "public") {
    throw new JWSInvalid('"jwk" (JSON Web Key) Header Parameter must be a public key');
  }
  return key;
}
var init_embedded = __esm({
  "node_modules/jose/dist/webapi/jwk/embedded.js"() {
    init_modules_watch_stub();
    init_import();
    init_type_checks();
    init_errors();
    __name(EmbeddedJWK, "EmbeddedJWK");
  }
});

// node_modules/jose/dist/webapi/jwks/local.js
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    case "ML":
      return "AKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
function isJWKLike(key) {
  return isObject(key);
}
async function importWithAlgCache(cache2, jwk, alg) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk);
  if (cached[alg] === void 0) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "localJWKSet");
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: /* @__PURE__ */ __name(() => structuredClone(set.jwks()), "value"),
      enumerable: false,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
var LocalJWKSet;
var init_local = __esm({
  "node_modules/jose/dist/webapi/jwks/local.js"() {
    init_modules_watch_stub();
    init_import();
    init_errors();
    init_type_checks();
    __name(getKtyFromAlg, "getKtyFromAlg");
    __name(isJWKSLike, "isJWKSLike");
    __name(isJWKLike, "isJWKLike");
    LocalJWKSet = class {
      static {
        __name(this, "LocalJWKSet");
      }
      #jwks;
      #cached = /* @__PURE__ */ new WeakMap();
      constructor(jwks) {
        if (!isJWKSLike(jwks)) {
          throw new JWKSInvalid("JSON Web Key Set malformed");
        }
        this.#jwks = structuredClone(jwks);
      }
      jwks() {
        return this.#jwks;
      }
      async getKey(protectedHeader, token) {
        const { alg, kid } = { ...protectedHeader, ...token?.header };
        const kty = getKtyFromAlg(alg);
        const candidates = this.#jwks.keys.filter((jwk2) => {
          let candidate = kty === jwk2.kty;
          if (candidate && typeof kid === "string") {
            candidate = kid === jwk2.kid;
          }
          if (candidate && (typeof jwk2.alg === "string" || kty === "AKP")) {
            candidate = alg === jwk2.alg;
          }
          if (candidate && typeof jwk2.use === "string") {
            candidate = jwk2.use === "sig";
          }
          if (candidate && Array.isArray(jwk2.key_ops)) {
            candidate = jwk2.key_ops.includes("verify");
          }
          if (candidate) {
            switch (alg) {
              case "ES256":
                candidate = jwk2.crv === "P-256";
                break;
              case "ES384":
                candidate = jwk2.crv === "P-384";
                break;
              case "ES512":
                candidate = jwk2.crv === "P-521";
                break;
              case "Ed25519":
              case "EdDSA":
                candidate = jwk2.crv === "Ed25519";
                break;
            }
          }
          return candidate;
        });
        const { 0: jwk, length } = candidates;
        if (length === 0) {
          throw new JWKSNoMatchingKey();
        }
        if (length !== 1) {
          const error = new JWKSMultipleMatchingKeys();
          const _cached = this.#cached;
          error[Symbol.asyncIterator] = async function* () {
            for (const jwk2 of candidates) {
              try {
                yield await importWithAlgCache(_cached, jwk2, alg);
              } catch {
              }
            }
          };
          throw error;
        }
        return importWithAlgCache(this.#cached, jwk, alg);
      }
    };
    __name(importWithAlgCache, "importWithAlgCache");
    __name(createLocalJWKSet, "createLocalJWKSet");
  }
});

// node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && true || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    if (err.name === "TimeoutError") {
      throw new JWKSTimeout();
    }
    throw err;
  });
  if (response.status !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "remoteJWKSet");
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => set.coolingDown(), "get"),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => set.fresh(), "get"),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: /* @__PURE__ */ __name(() => set.reload(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => set.pendingFetch(), "get"),
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => set.jwks(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
var USER_AGENT, customFetch, jwksCache, RemoteJWKSet;
var init_remote = __esm({
  "node_modules/jose/dist/webapi/jwks/remote.js"() {
    init_modules_watch_stub();
    init_errors();
    init_local();
    init_type_checks();
    __name(isCloudflareWorkers, "isCloudflareWorkers");
    if (typeof navigator === "undefined" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) {
      const NAME = "jose";
      const VERSION = "v6.2.3";
      USER_AGENT = `${NAME}/${VERSION}`;
    }
    customFetch = /* @__PURE__ */ Symbol();
    __name(fetchJwks, "fetchJwks");
    jwksCache = /* @__PURE__ */ Symbol();
    __name(isFreshJwksCache, "isFreshJwksCache");
    RemoteJWKSet = class {
      static {
        __name(this, "RemoteJWKSet");
      }
      #url;
      #timeoutDuration;
      #cooldownDuration;
      #cacheMaxAge;
      #jwksTimestamp;
      #pendingFetch;
      #headers;
      #customFetch;
      #local;
      #cache;
      constructor(url, options) {
        if (!(url instanceof URL)) {
          throw new TypeError("url must be an instance of URL");
        }
        this.#url = new URL(url.href);
        this.#timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5e3;
        this.#cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 3e4;
        this.#cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 6e5;
        this.#headers = new Headers(options?.headers);
        if (USER_AGENT && !this.#headers.has("User-Agent")) {
          this.#headers.set("User-Agent", USER_AGENT);
        }
        if (!this.#headers.has("accept")) {
          this.#headers.set("accept", "application/json");
          this.#headers.append("accept", "application/jwk-set+json");
        }
        this.#customFetch = options?.[customFetch];
        if (options?.[jwksCache] !== void 0) {
          this.#cache = options?.[jwksCache];
          if (isFreshJwksCache(options?.[jwksCache], this.#cacheMaxAge)) {
            this.#jwksTimestamp = this.#cache.uat;
            this.#local = createLocalJWKSet(this.#cache.jwks);
          }
        }
      }
      pendingFetch() {
        return !!this.#pendingFetch;
      }
      coolingDown() {
        return typeof this.#jwksTimestamp === "number" ? Date.now() < this.#jwksTimestamp + this.#cooldownDuration : false;
      }
      fresh() {
        return typeof this.#jwksTimestamp === "number" ? Date.now() < this.#jwksTimestamp + this.#cacheMaxAge : false;
      }
      jwks() {
        return this.#local?.jwks();
      }
      async getKey(protectedHeader, token) {
        if (!this.#local || !this.fresh()) {
          await this.reload();
        }
        try {
          return await this.#local(protectedHeader, token);
        } catch (err) {
          if (err instanceof JWKSNoMatchingKey) {
            if (this.coolingDown() === false) {
              await this.reload();
              return this.#local(protectedHeader, token);
            }
          }
          throw err;
        }
      }
      async reload() {
        if (this.#pendingFetch && isCloudflareWorkers()) {
          this.#pendingFetch = void 0;
        }
        this.#pendingFetch ||= fetchJwks(this.#url.href, this.#headers, AbortSignal.timeout(this.#timeoutDuration), this.#customFetch).then((json) => {
          this.#local = createLocalJWKSet(json);
          if (this.#cache) {
            this.#cache.uat = Date.now();
            this.#cache.jwks = json;
          }
          this.#jwksTimestamp = Date.now();
          this.#pendingFetch = void 0;
        }).catch((err) => {
          this.#pendingFetch = void 0;
          throw err;
        });
        await this.#pendingFetch;
      }
    };
    __name(createRemoteJWKSet, "createRemoteJWKSet");
  }
});

// node_modules/jose/dist/webapi/jwt/unsecured.js
var UnsecuredJWT;
var init_unsecured = __esm({
  "node_modules/jose/dist/webapi/jwt/unsecured.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_buffer_utils();
    init_errors();
    init_jwt_claims_set();
    UnsecuredJWT = class {
      static {
        __name(this, "UnsecuredJWT");
      }
      #jwt;
      constructor(payload = {}) {
        this.#jwt = new JWTClaimsBuilder(payload);
      }
      encode() {
        const header = encode2(JSON.stringify({ alg: "none" }));
        const payload = encode2(this.#jwt.data());
        return `${header}.${payload}.`;
      }
      setIssuer(issuer) {
        this.#jwt.iss = issuer;
        return this;
      }
      setSubject(subject) {
        this.#jwt.sub = subject;
        return this;
      }
      setAudience(audience) {
        this.#jwt.aud = audience;
        return this;
      }
      setJti(jwtId) {
        this.#jwt.jti = jwtId;
        return this;
      }
      setNotBefore(input) {
        this.#jwt.nbf = input;
        return this;
      }
      setExpirationTime(input) {
        this.#jwt.exp = input;
        return this;
      }
      setIssuedAt(input) {
        this.#jwt.iat = input;
        return this;
      }
      static decode(jwt, options) {
        if (typeof jwt !== "string") {
          throw new JWTInvalid("Unsecured JWT must be a string");
        }
        const { 0: encodedHeader, 1: encodedPayload, 2: signature, length } = jwt.split(".");
        if (length !== 3 || signature !== "") {
          throw new JWTInvalid("Invalid Unsecured JWT");
        }
        let header;
        try {
          header = JSON.parse(decoder.decode(decode(encodedHeader)));
          if (header.alg !== "none")
            throw new Error();
        } catch {
          throw new JWTInvalid("Invalid Unsecured JWT");
        }
        const payload = validateClaimsSet(header, decode(encodedPayload), options);
        return { payload, header };
      }
    };
  }
});

// node_modules/jose/dist/webapi/util/decode_protected_header.js
function decodeProtectedHeader(token) {
  let protectedB64u;
  if (typeof token === "string") {
    const parts = token.split(".");
    if (parts.length === 3 || parts.length === 5) {
      ;
      [protectedB64u] = parts;
    }
  } else if (typeof token === "object" && token) {
    if ("protected" in token) {
      protectedB64u = token.protected;
    } else {
      throw new TypeError("Token does not contain a Protected Header");
    }
  }
  try {
    if (typeof protectedB64u !== "string" || !protectedB64u) {
      throw new Error();
    }
    const result = JSON.parse(decoder.decode(decode(protectedB64u)));
    if (!isObject(result)) {
      throw new Error();
    }
    return result;
  } catch {
    throw new TypeError("Invalid Token or Protected Header formatting");
  }
}
var init_decode_protected_header = __esm({
  "node_modules/jose/dist/webapi/util/decode_protected_header.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_buffer_utils();
    init_type_checks();
    __name(decodeProtectedHeader, "decodeProtectedHeader");
  }
});

// node_modules/jose/dist/webapi/util/decode_jwt.js
function decodeJwt(jwt) {
  if (typeof jwt !== "string")
    throw new JWTInvalid("JWTs must use Compact JWS serialization, JWT must be a string");
  const { 1: payload, length } = jwt.split(".");
  if (length === 5)
    throw new JWTInvalid("Only JWTs using Compact JWS serialization can be decoded");
  if (length !== 3)
    throw new JWTInvalid("Invalid JWT");
  if (!payload)
    throw new JWTInvalid("JWTs must contain a payload");
  let decoded;
  try {
    decoded = decode(payload);
  } catch {
    throw new JWTInvalid("Failed to base64url decode the payload");
  }
  let result;
  try {
    result = JSON.parse(decoder.decode(decoded));
  } catch {
    throw new JWTInvalid("Failed to parse the decoded payload as JSON");
  }
  if (!isObject(result))
    throw new JWTInvalid("Invalid JWT Claims Set");
  return result;
}
var init_decode_jwt = __esm({
  "node_modules/jose/dist/webapi/util/decode_jwt.js"() {
    init_modules_watch_stub();
    init_base64url();
    init_buffer_utils();
    init_type_checks();
    init_errors();
    __name(decodeJwt, "decodeJwt");
  }
});

// node_modules/jose/dist/webapi/key/generate_key_pair.js
function getModulusLengthOption(options) {
  const modulusLength = options?.modulusLength ?? 2048;
  if (typeof modulusLength !== "number" || modulusLength < 2048) {
    throw new JOSENotSupported("Invalid or unsupported modulusLength option provided, 2048 bits or larger keys must be used");
  }
  return modulusLength;
}
async function generateKeyPair(alg, options) {
  let algorithm;
  let keyUsages;
  switch (alg) {
    case "PS256":
    case "PS384":
    case "PS512":
      algorithm = {
        name: "RSA-PSS",
        hash: `SHA-${alg.slice(-3)}`,
        publicExponent: Uint8Array.of(1, 0, 1),
        modulusLength: getModulusLengthOption(options)
      };
      keyUsages = ["sign", "verify"];
      break;
    case "RS256":
    case "RS384":
    case "RS512":
      algorithm = {
        name: "RSASSA-PKCS1-v1_5",
        hash: `SHA-${alg.slice(-3)}`,
        publicExponent: Uint8Array.of(1, 0, 1),
        modulusLength: getModulusLengthOption(options)
      };
      keyUsages = ["sign", "verify"];
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      algorithm = {
        name: "RSA-OAEP",
        hash: `SHA-${parseInt(alg.slice(-3), 10) || 1}`,
        publicExponent: Uint8Array.of(1, 0, 1),
        modulusLength: getModulusLengthOption(options)
      };
      keyUsages = ["decrypt", "unwrapKey", "encrypt", "wrapKey"];
      break;
    case "ES256":
      algorithm = { name: "ECDSA", namedCurve: "P-256" };
      keyUsages = ["sign", "verify"];
      break;
    case "ES384":
      algorithm = { name: "ECDSA", namedCurve: "P-384" };
      keyUsages = ["sign", "verify"];
      break;
    case "ES512":
      algorithm = { name: "ECDSA", namedCurve: "P-521" };
      keyUsages = ["sign", "verify"];
      break;
    case "Ed25519":
    case "EdDSA": {
      keyUsages = ["sign", "verify"];
      algorithm = { name: "Ed25519" };
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      keyUsages = ["sign", "verify"];
      algorithm = { name: alg };
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      keyUsages = ["deriveBits"];
      const crv = options?.crv ?? "P-256";
      switch (crv) {
        case "P-256":
        case "P-384":
        case "P-521": {
          algorithm = { name: "ECDH", namedCurve: crv };
          break;
        }
        case "X25519":
          algorithm = { name: "X25519" };
          break;
        default:
          throw new JOSENotSupported("Invalid or unsupported crv option provided, supported values are P-256, P-384, P-521, and X25519");
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  }
  return crypto.subtle.generateKey(algorithm, options?.extractable ?? false, keyUsages);
}
var init_generate_key_pair = __esm({
  "node_modules/jose/dist/webapi/key/generate_key_pair.js"() {
    init_modules_watch_stub();
    init_errors();
    __name(getModulusLengthOption, "getModulusLengthOption");
    __name(generateKeyPair, "generateKeyPair");
  }
});

// node_modules/jose/dist/webapi/key/generate_secret.js
async function generateSecret(alg, options) {
  let length;
  let algorithm;
  let keyUsages;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      length = parseInt(alg.slice(-3), 10);
      algorithm = { name: "HMAC", hash: `SHA-${length}`, length };
      keyUsages = ["sign", "verify"];
      break;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      length = parseInt(alg.slice(-3), 10);
      return crypto.getRandomValues(new Uint8Array(length >> 3));
    case "A128KW":
    case "A192KW":
    case "A256KW":
      length = parseInt(alg.slice(1, 4), 10);
      algorithm = { name: "AES-KW", length };
      keyUsages = ["wrapKey", "unwrapKey"];
      break;
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW":
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      length = parseInt(alg.slice(1, 4), 10);
      algorithm = { name: "AES-GCM", length };
      keyUsages = ["encrypt", "decrypt"];
      break;
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  }
  return crypto.subtle.generateKey(algorithm, options?.extractable ?? false, keyUsages);
}
var init_generate_secret = __esm({
  "node_modules/jose/dist/webapi/key/generate_secret.js"() {
    init_modules_watch_stub();
    init_errors();
    __name(generateSecret, "generateSecret");
  }
});

// node_modules/jose/dist/webapi/index.js
var webapi_exports = {};
__export(webapi_exports, {
  CompactEncrypt: () => CompactEncrypt,
  CompactSign: () => CompactSign,
  EmbeddedJWK: () => EmbeddedJWK,
  EncryptJWT: () => EncryptJWT,
  FlattenedEncrypt: () => FlattenedEncrypt,
  FlattenedSign: () => FlattenedSign,
  GeneralEncrypt: () => GeneralEncrypt,
  GeneralSign: () => GeneralSign,
  SignJWT: () => SignJWT,
  UnsecuredJWT: () => UnsecuredJWT,
  base64url: () => base64url_exports,
  calculateJwkThumbprint: () => calculateJwkThumbprint,
  calculateJwkThumbprintUri: () => calculateJwkThumbprintUri,
  compactDecrypt: () => compactDecrypt,
  compactVerify: () => compactVerify,
  createLocalJWKSet: () => createLocalJWKSet,
  createRemoteJWKSet: () => createRemoteJWKSet,
  cryptoRuntime: () => cryptoRuntime,
  customFetch: () => customFetch,
  decodeJwt: () => decodeJwt,
  decodeProtectedHeader: () => decodeProtectedHeader,
  errors: () => errors_exports,
  exportJWK: () => exportJWK,
  exportPKCS8: () => exportPKCS8,
  exportSPKI: () => exportSPKI,
  flattenedDecrypt: () => flattenedDecrypt,
  flattenedVerify: () => flattenedVerify,
  generalDecrypt: () => generalDecrypt,
  generalVerify: () => generalVerify,
  generateKeyPair: () => generateKeyPair,
  generateSecret: () => generateSecret,
  importJWK: () => importJWK,
  importPKCS8: () => importPKCS8,
  importSPKI: () => importSPKI,
  importX509: () => importX509,
  jwksCache: () => jwksCache,
  jwtDecrypt: () => jwtDecrypt,
  jwtVerify: () => jwtVerify
});
var cryptoRuntime;
var init_webapi = __esm({
  "node_modules/jose/dist/webapi/index.js"() {
    init_modules_watch_stub();
    init_decrypt2();
    init_decrypt();
    init_decrypt3();
    init_encrypt2();
    init_verify2();
    init_verify();
    init_verify3();
    init_verify4();
    init_decrypt4();
    init_encrypt3();
    init_encrypt();
    init_sign2();
    init_sign();
    init_sign3();
    init_sign4();
    init_encrypt4();
    init_thumbprint();
    init_embedded();
    init_local();
    init_remote();
    init_unsecured();
    init_export();
    init_import();
    init_decode_protected_header();
    init_decode_jwt();
    init_errors();
    init_generate_key_pair();
    init_generate_secret();
    init_base64url();
    cryptoRuntime = "WebCryptoAPI";
  }
});

// .wrangler/tmp/bundle-a28mGz/middleware-loader.entry.ts
init_modules_watch_stub();

// .wrangler/tmp/bundle-a28mGz/middleware-insertion-facade.js
init_modules_watch_stub();

// src/index.js
init_modules_watch_stub();

// node_modules/hono/dist/index.js
init_modules_watch_stub();

// node_modules/hono/dist/hono.js
init_modules_watch_stub();

// node_modules/hono/dist/hono-base.js
init_modules_watch_stub();

// node_modules/hono/dist/compose.js
init_modules_watch_stub();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
init_modules_watch_stub();

// node_modules/hono/dist/request.js
init_modules_watch_stub();

// node_modules/hono/dist/http-exception.js
init_modules_watch_stub();

// node_modules/hono/dist/request/constants.js
init_modules_watch_stub();
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
init_modules_watch_stub();

// node_modules/hono/dist/utils/buffer.js
init_modules_watch_stub();

// node_modules/hono/dist/utils/crypto.js
init_modules_watch_stub();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
init_modules_watch_stub();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
init_modules_watch_stub();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
init_modules_watch_stub();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
init_modules_watch_stub();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/index.js
init_modules_watch_stub();

// node_modules/hono/dist/router/reg-exp-router/router.js
init_modules_watch_stub();

// node_modules/hono/dist/router/reg-exp-router/matcher.js
init_modules_watch_stub();
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
init_modules_watch_stub();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
init_modules_watch_stub();
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/reg-exp-router/prepared-router.js
init_modules_watch_stub();

// node_modules/hono/dist/router/smart-router/index.js
init_modules_watch_stub();

// node_modules/hono/dist/router/smart-router/router.js
init_modules_watch_stub();
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/index.js
init_modules_watch_stub();

// node_modules/hono/dist/router/trie-router/router.js
init_modules_watch_stub();

// node_modules/hono/dist/router/trie-router/node.js
init_modules_watch_stub();
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
init_modules_watch_stub();
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/routes/auth.js
init_modules_watch_stub();

// src/middleware/auth.js
init_modules_watch_stub();
init_webapi();
async function createToken(userId, role, secret) {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ sub: userId, role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key);
}
__name(createToken, "createToken");
async function authMiddleware(c, next) {
  const cookie = c.req.header("Cookie") || "";
  const match2 = cookie.match(/askdesk_token=([^;]+)/);
  if (!match2) return c.json({ error: "Yetkisiz eri\u015Fim" }, 401);
  try {
    const key = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(match2[1], key);
    c.set("userId", payload.sub);
    c.set("userRole", payload.role);
    await next();
  } catch {
    return c.json({ error: "Ge\xE7ersiz token" }, 401);
  }
}
__name(authMiddleware, "authMiddleware");

// src/routes/auth.js
var auth = new Hono2();
function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
async function hashPassword(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const data = new TextEncoder().encode(salt + password);
  const hash = toHex(await crypto.subtle.digest("SHA-256", data));
  return salt + ":" + hash;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const data = new TextEncoder().encode(salt + password);
  const computed = toHex(await crypto.subtle.digest("SHA-256", data));
  return hash === computed;
}
__name(verifyPassword, "verifyPassword");
auth.post("/register", async (c) => {
  const { email, password, name, company_name } = await c.req.json();
  if (!email || !password || !name) {
    return c.json({ error: "Email, \u015Fifre ve isim gerekli" }, 400);
  }
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return c.json({ error: "Bu email zaten kay\u0131tl\u0131" }, 409);
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, name, company_name, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, email, password_hash, name, company_name || null, "member").run();
  const token = await createToken(id, "member", c.env.JWT_SECRET);
  c.header("Set-Cookie", `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
  return c.json({ id, email, name, company_name, role: "member" }, 201);
});
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: "Email ve \u015Fifre gerekli" }, 400);
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user || !await verifyPassword(password, user.password_hash)) {
    return c.json({ error: "Ge\xE7ersiz email veya \u015Fifre" }, 401);
  }
  const token = await createToken(user.id, user.role, c.env.JWT_SECRET);
  c.header("Set-Cookie", `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
  return c.json({ id: user.id, email: user.email, name: user.name, company_name: user.company_name, role: user.role });
});
auth.post("/logout", (c) => {
  c.header("Set-Cookie", "askdesk_token=; HttpOnly; Path=/; Max-Age=0");
  return c.json({ ok: true });
});
auth.get("/me", async (c) => {
  const cookie = c.req.header("Cookie") || "";
  const match2 = cookie.match(/askdesk_token=([^;]+)/);
  if (!match2) return c.json({ user: null });
  try {
    const { jwtVerify: jwtVerify2 } = await Promise.resolve().then(() => (init_webapi(), webapi_exports));
    const key = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify2(match2[1], key);
    const user = await c.env.DB.prepare(
      "SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?"
    ).bind(payload.sub).first();
    return c.json({ user: user || null });
  } catch {
    return c.json({ user: null });
  }
});
auth.post("/seed-admin", async (c) => {
  const { email, password, name } = await c.req.json();
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE role = ?").bind("superadmin").first();
  if (existing) return c.json({ error: "Super Admin zaten var" }, 409);
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, email, password_hash, name, "superadmin").run();
  return c.json({ id, email, name, role: "superadmin" }, 201);
});
var auth_default = auth;

// src/routes/dashboard.js
init_modules_watch_stub();
var dashboard = new Hono2();
dashboard.use("*", authMiddleware);
dashboard.get("/stats", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const isSuper = role === "superadmin";
  const where = isSuper ? "" : "WHERE user_id = ?";
  const bind = isSuper ? [] : [userId];
  const [companies, emails, sent, opened] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM companies ${where}`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where}`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where ? where + " AND" : "WHERE"} status = 'sent'`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where ? where + " AND" : "WHERE"} opened = 1`).bind(...bind).first()
  ]);
  const recentEmails = await c.env.DB.prepare(
    `SELECT e.id, e.subject, e.status, e.created_at, c.name as company_name
     FROM emails e LEFT JOIN companies c ON e.company_id = c.id
     ${where ? "WHERE e.user_id = ?" : ""}
     ORDER BY e.created_at DESC LIMIT 5`
  ).bind(...bind).all();
  return c.json({
    total_leads: companies.count,
    total_emails: emails.count,
    total_sent: sent.count,
    total_opened: opened.count,
    open_rate: sent.count > 0 ? (opened.count / sent.count * 100).toFixed(1) : "0",
    recent_emails: recentEmails.results
  });
});
var dashboard_default = dashboard;

// src/routes/leads.js
init_modules_watch_stub();
var leads = new Hono2();
leads.use("*", authMiddleware);
leads.get("/", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { sector, country, source, q } = c.req.query();
  let sql = "SELECT * FROM companies";
  const conditions = [];
  const params = [];
  if (role !== "superadmin") {
    conditions.push("user_id = ?");
    params.push(userId);
  }
  if (sector) {
    conditions.push("sector = ?");
    params.push(sector);
  }
  if (country) {
    conditions.push("country = ?");
    params.push(country);
  }
  if (source) {
    conditions.push("source = ?");
    params.push(source);
  }
  if (q) {
    conditions.push("name LIKE ?");
    params.push(`%${q}%`);
  }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ companies: result.results });
});
leads.get("/:id", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const id = c.req.param("id");
  const company = await c.env.DB.prepare("SELECT * FROM companies WHERE id = ?").bind(id).first();
  if (!company) return c.json({ error: "Firma bulunamad\u0131" }, 404);
  if (role !== "superadmin" && company.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  const contacts = await c.env.DB.prepare("SELECT * FROM contacts WHERE company_id = ?").bind(id).all();
  return c.json({ company, contacts: contacts.results });
});
leads.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const companyId = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO companies (id, user_id, name, website, sector, country, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(companyId, userId, body.name, body.website || null, body.sector || null, body.country || null, body.source || "manual", body.notes || null).run();
  if (body.contact_name || body.contact_email) {
    const contactId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO contacts (id, company_id, user_id, name, email, title, seniority) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(contactId, companyId, userId, body.contact_name || "", body.contact_email || null, body.contact_title || null, body.contact_seniority || null).run();
  }
  return c.json({ id: companyId }, 201);
});
leads.put("/:id", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const id = c.req.param("id");
  const body = await c.req.json();
  const company = await c.env.DB.prepare("SELECT user_id FROM companies WHERE id = ?").bind(id).first();
  if (!company) return c.json({ error: "Firma bulunamad\u0131" }, 404);
  if (role !== "superadmin" && company.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  await c.env.DB.prepare(
    "UPDATE companies SET name = ?, website = ?, sector = ?, country = ?, notes = ? WHERE id = ?"
  ).bind(body.name, body.website || null, body.sector || null, body.country || null, body.notes || null, id).run();
  return c.json({ ok: true });
});
leads.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const id = c.req.param("id");
  const company = await c.env.DB.prepare("SELECT user_id FROM companies WHERE id = ?").bind(id).first();
  if (!company) return c.json({ error: "Firma bulunamad\u0131" }, 404);
  if (role !== "superadmin" && company.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM contacts WHERE company_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM pipeline_items WHERE company_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM emails WHERE company_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM companies WHERE id = ?").bind(id)
  ]);
  return c.json({ ok: true });
});
var leads_default = leads;

// src/routes/outreach.js
init_modules_watch_stub();
var outreach = new Hono2();
outreach.use("*", authMiddleware);
outreach.get("/", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { status } = c.req.query();
  let sql = `
    SELECT e.*, co.name AS company_name, ct.name AS contact_name
    FROM emails e
    LEFT JOIN companies co ON e.company_id = co.id
    LEFT JOIN contacts ct ON e.contact_id = ct.id
  `;
  const conditions = [];
  const params = [];
  if (role !== "superadmin") {
    conditions.push("e.user_id = ?");
    params.push(userId);
  }
  if (status) {
    conditions.push("e.status = ?");
    params.push(status);
  }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY e.created_at DESC";
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ emails: result.results });
});
outreach.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const emailId = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO emails (id, user_id, company_id, contact_id, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    emailId,
    userId,
    body.company_id || null,
    body.contact_id || null,
    body.subject || "",
    body.body || "",
    body.status || "draft"
  ).run();
  return c.json({ id: emailId }, 201);
});
outreach.get("/:id", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const id = c.req.param("id");
  const email = await c.env.DB.prepare(`
    SELECT e.*, co.name AS company_name, ct.name AS contact_name
    FROM emails e
    LEFT JOIN companies co ON e.company_id = co.id
    LEFT JOIN contacts ct ON e.contact_id = ct.id
    WHERE e.id = ?
  `).bind(id).first();
  if (!email) return c.json({ error: "Email bulunamad\u0131" }, 404);
  if (role !== "superadmin" && email.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  return c.json({ email });
});
outreach.put("/:id", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const id = c.req.param("id");
  const body = await c.req.json();
  const email = await c.env.DB.prepare("SELECT user_id FROM emails WHERE id = ?").bind(id).first();
  if (!email) return c.json({ error: "Email bulunamad\u0131" }, 404);
  if (role !== "superadmin" && email.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  await c.env.DB.prepare(`
    UPDATE emails SET
      subject = COALESCE(?, subject),
      body = COALESCE(?, body),
      status = COALESCE(?, status),
      quality_score = COALESCE(?, quality_score)
    WHERE id = ?
  `).bind(
    body.subject ?? null,
    body.body ?? null,
    body.status ?? null,
    body.quality_score ?? null,
    id
  ).run();
  return c.json({ ok: true });
});
outreach.post("/:id/send", async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const id = c.req.param("id");
  const email = await c.env.DB.prepare("SELECT user_id FROM emails WHERE id = ?").bind(id).first();
  if (!email) return c.json({ error: "Email bulunamad\u0131" }, 404);
  if (role !== "superadmin" && email.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  await c.env.DB.prepare(
    "UPDATE emails SET status = 'sent', sent_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
  return c.json({ ok: true });
});
outreach.get("/:id/track", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare(
    "UPDATE emails SET opened = 1 WHERE id = ?"
  ).bind(id).run();
  const gif = new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 0, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]);
  return new Response(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
});
var outreach_default = outreach;

// src/routes/ai.js
init_modules_watch_stub();
var ai = new Hono2();
ai.use("*", authMiddleware);
var GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
async function callGemini(prompt, apiKey) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API hatas\u0131");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
__name(callGemini, "callGemini");
ai.post("/generate", async (c) => {
  const body = await c.req.json();
  const { prompt, context } = body;
  if (!prompt) return c.json({ error: "prompt gerekli" }, 400);
  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: "GEMINI_API_KEY yap\u0131land\u0131r\u0131lmam\u0131\u015F" }, 500);
  const fullPrompt = context ? `${context}

${prompt}` : prompt;
  const text = await callGemini(fullPrompt, apiKey);
  return c.json({ text });
});
ai.post("/research", async (c) => {
  const body = await c.req.json();
  const { company_name, website } = body;
  if (!company_name) return c.json({ error: "company_name gerekli" }, 400);
  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: "GEMINI_API_KEY yap\u0131land\u0131r\u0131lmam\u0131\u015F" }, 500);
  const prompt = `"${company_name}"${website ? ` (${website})` : ""} \u015Firketi hakk\u0131nda ara\u015Ft\u0131rma yap ve a\u015Fa\u011F\u0131daki JSON format\u0131nda yan\u0131t ver:

{
  "summary": "\u015Eirket hakk\u0131nda 2-3 c\xFCmlelik \xF6zet",
  "sector": "Sekt\xF6r ad\u0131",
  "size": "Tahmini \xE7al\u0131\u015Fan say\u0131s\u0131 veya b\xFCy\xFCkl\xFCk (k\xFC\xE7\xFCk/orta/b\xFCy\xFCk)",
  "needs": ["Olas\u0131 ihtiya\xE7 1", "Olas\u0131 ihtiya\xE7 2", "Olas\u0131 ihtiya\xE7 3"]
}

Sadece JSON format\u0131nda yan\u0131t ver, ba\u015Fka a\xE7\u0131klama ekleme.`;
  const text = await callGemini(prompt, apiKey);
  let research = null;
  try {
    const match2 = text.match(/\{[\s\S]*\}/);
    if (match2) research = JSON.parse(match2[0]);
  } catch {
  }
  return c.json({ research, raw: text });
});
var ai_default = ai;

// src/routes/pipeline.js
init_modules_watch_stub();
var pipeline = new Hono2();
pipeline.use("*", authMiddleware);
var DEFAULT_STAGES = ["\u0130leti\u015Fim Kuruldu", "Yan\u0131t Geldi", "Toplant\u0131", "Anla\u015Fma"];
pipeline.get("/", async (c) => {
  const userId = c.get("userId");
  let stages = await c.env.DB.prepare(
    "SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY position ASC"
  ).bind(userId).all();
  if (!stages.results.length) {
    for (let i = 0; i < DEFAULT_STAGES.length; i++) {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        "INSERT INTO pipeline_stages (id, user_id, name, position) VALUES (?, ?, ?, ?)"
      ).bind(id, userId, DEFAULT_STAGES[i], i).run();
    }
    stages = await c.env.DB.prepare(
      "SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY position ASC"
    ).bind(userId).all();
  }
  const items = await c.env.DB.prepare(
    `SELECT pi.*, c.name AS company_name, c.sector, c.country
     FROM pipeline_items pi
     JOIN companies c ON c.id = pi.company_id
     WHERE pi.user_id = ?
     ORDER BY pi.updated_at DESC`
  ).bind(userId).all();
  return c.json({ stages: stages.results, items: items.results });
});
pipeline.post("/items", async (c) => {
  const userId = c.get("userId");
  const { company_id, stage_id, notes } = await c.req.json();
  if (!company_id || !stage_id) return c.json({ error: "company_id ve stage_id gerekli" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO pipeline_items (id, user_id, company_id, stage_id, notes) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, userId, company_id, stage_id, notes || null).run();
  return c.json({ id }, 201);
});
pipeline.put("/items/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { stage_id, notes } = await c.req.json();
  const item = await c.env.DB.prepare("SELECT user_id FROM pipeline_items WHERE id = ?").bind(id).first();
  if (!item) return c.json({ error: "\xD6\u011Fe bulunamad\u0131" }, 404);
  if (item.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  await c.env.DB.prepare(
    "UPDATE pipeline_items SET stage_id = ?, notes = ? WHERE id = ?"
  ).bind(stage_id, notes !== void 0 ? notes : null, id).run();
  return c.json({ ok: true });
});
pipeline.delete("/items/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const item = await c.env.DB.prepare("SELECT user_id FROM pipeline_items WHERE id = ?").bind(id).first();
  if (!item) return c.json({ error: "\xD6\u011Fe bulunamad\u0131" }, 404);
  if (item.user_id !== userId) return c.json({ error: "Yetkisiz" }, 403);
  await c.env.DB.prepare("DELETE FROM pipeline_items WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
var pipeline_default = pipeline;

// src/routes/maps.js
init_modules_watch_stub();
var maps = new Hono2();
maps.use("*", authMiddleware);
var GEMINI_URL2 = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
async function callGemini2(prompt, apiKey) {
  const res = await fetch(`${GEMINI_URL2}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API hatas\u0131");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
__name(callGemini2, "callGemini");
maps.post("/search", async (c) => {
  const { query, location } = await c.req.json();
  if (!query) return c.json({ error: "query gerekli" }, 400);
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return c.json({ error: "GOOGLE_MAPS_API_KEY yap\u0131land\u0131r\u0131lmam\u0131\u015F" }, 500);
  const params = new URLSearchParams({ query, key: apiKey });
  if (location) params.set("location", location);
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return c.json({ error: data.error_message || data.status }, 500);
  }
  const places = (data.results || []).map((p) => ({
    place_id: p.place_id,
    name: p.name,
    address: p.formatted_address,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    types: p.types,
    location: p.geometry?.location
  }));
  return c.json({ places });
});
maps.post("/details", async (c) => {
  const { place_id } = await c.req.json();
  if (!place_id) return c.json({ error: "place_id gerekli" }, 400);
  const apiKey = c.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return c.json({ error: "GOOGLE_MAPS_API_KEY yap\u0131land\u0131r\u0131lmam\u0131\u015F" }, 500);
  const fields = "name,formatted_address,formatted_phone_number,website,reviews,rating,user_ratings_total";
  const params = new URLSearchParams({ place_id, fields, key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") {
    return c.json({ error: data.error_message || data.status }, 500);
  }
  const r = data.result;
  return c.json({
    name: r.name,
    address: r.formatted_address,
    phone: r.formatted_phone_number,
    website: r.website,
    rating: r.rating,
    user_ratings_total: r.user_ratings_total,
    reviews: (r.reviews || []).slice(0, 5).map((rv) => ({
      author: rv.author_name,
      rating: rv.rating,
      text: rv.text,
      time: rv.relative_time_description
    }))
  });
});
maps.post("/sentiment", async (c) => {
  const { reviews, company_name } = await c.req.json();
  if (!reviews || !reviews.length) return c.json({ error: "reviews gerekli" }, 400);
  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: "GEMINI_API_KEY yap\u0131land\u0131r\u0131lmam\u0131\u015F" }, 500);
  const reviewText = reviews.map((r, i) => `${i + 1}. (${r.rating}/5) ${r.text}`).join("\n");
  const prompt = `"${company_name || "Firma"}" i\xE7in Google yorumlar\u0131n\u0131 analiz et ve k\u0131sa bir duygu analizi yap (T\xFCrk\xE7e):

${reviewText}

Genel kan\u0131 pozitif mi, negatif mi, yoksa kar\u0131\u015F\u0131k m\u0131? Sat\u0131\u015F perspektifinden bu firmaya yakla\u015F\u0131rken nelere dikkat edilmeli?`;
  const result = await callGemini2(prompt, apiKey);
  return c.json({ result });
});
var maps_default = maps;

// src/index.js
var app = new Hono2();
app.use("*", cors({
  origin: /* @__PURE__ */ __name((origin) => {
    if (!origin) return "https://askdesk.app";
    if (origin.includes("askdesk") || origin.includes("localhost")) return origin;
    return "https://askdesk.app";
  }, "origin"),
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type"]
}));
app.route("/auth", auth_default);
app.route("/dashboard", dashboard_default);
app.route("/leads", leads_default);
app.route("/outreach", outreach_default);
app.route("/ai", ai_default);
app.route("/pipeline", pipeline_default);
app.route("/maps", maps_default);
app.get("/health", (c) => c.json({ status: "ok" }));
var src_default = app;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-a28mGz/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-a28mGz/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
