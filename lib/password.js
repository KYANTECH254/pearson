const crypto = require("crypto");

const keyLength = 64;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = String(storedHash || "").split(":");

    if (!salt || !hash) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(crypto.timingSafeEqual(Buffer.from(hash, "hex"), derivedKey));
    });
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
};
