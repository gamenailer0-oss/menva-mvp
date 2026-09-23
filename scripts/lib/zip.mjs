// Minimal zip reader/writer for USDZ. USDZ requires every entry to be stored
// (method 0, no compression) with its data starting on a 64-byte boundary.

import zlib from 'node:zlib';

// Returns [{ name, method, size, dataOffset, aligned, data }] from the central directory.
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip (no end-of-central-directory record)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    // The local header's extra field can differ from the central one, so read the offset from there.
    const dataOffset = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
    entries.push({ name, method, size, dataOffset, aligned: dataOffset % 64 === 0, data: buf.subarray(dataOffset, dataOffset + size) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// files: [[name, Uint8Array]] in order (USDZ: the root layer must come first).
export function writeAlignedZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data) >>> 0;
    // Pad with an extra-field block (id 0x1986, as USD's own zip writer does) so the data is 64-byte aligned.
    let pad = (64 - ((offset + 30 + nameBuf.length) % 64)) % 64;
    if (pad > 0 && pad < 4) pad += 64;
    const extra = Buffer.alloc(pad);
    if (pad) { extra.writeUInt16LE(0x1986, 0); extra.writeUInt16LE(pad - 4, 2); }

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(10, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(0, 8);           // method: stored
    local.writeUInt32LE(0x00210000, 10); // time/date: 1980-01-01 (deterministic output)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(pad, 28);
    locals.push(local, nameBuf, extra, Buffer.from(data));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(10, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0x00210000, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += 30 + nameBuf.length + pad + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
