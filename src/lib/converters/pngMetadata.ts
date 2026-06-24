/**
 * Utility to read and write SillyTavern character card metadata ('chara' tEXt chunk) in PNG files.
 */

// Helper to calculate CRC32 for PNG chunks
const makeCRCTable = () => {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
  return crcTable;
};

const crcTable = makeCRCTable();

const crc32 = (buf: Uint8Array): number => {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
};

/**
 * Extracts character JSON string from PNG ArrayBuffer.
 */
export function extractCharaFromPng(arrayBuffer: ArrayBuffer): string | null {
  const view = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  // Check PNG signature
  if (
    uint8[0] !== 0x89 ||
    uint8[1] !== 0x50 ||
    uint8[2] !== 0x4E ||
    uint8[3] !== 0x47 ||
    uint8[4] !== 0x0D ||
    uint8[5] !== 0x0A ||
    uint8[6] !== 0x1A ||
    uint8[7] !== 0x0A
  ) {
    throw new Error('File không phải định dạng ảnh PNG hợp lệ.');
  }

  let offset = 8;
  const textDecoder = new TextDecoder('utf-8');

  while (offset < uint8.length) {
    if (offset + 8 > uint8.length) break;

    const length = view.getUint32(offset);
    const type = textDecoder.decode(uint8.subarray(offset + 4, offset + 8));

    if (type === 'tEXt') {
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      const chunkData = uint8.subarray(dataStart, dataEnd);

      // Find null separator
      let nullIndex = -1;
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullIndex = i;
          break;
        }
      }

      if (nullIndex !== -1) {
        const keyword = textDecoder.decode(chunkData.subarray(0, nullIndex));
        if (keyword === 'chara') {
          const base64Text = textDecoder.decode(chunkData.subarray(nullIndex + 1));
          try {
            // base64 decode
            const jsonStr = decodeBase64(base64Text);
            return jsonStr;
          } catch (e) {
            throw new Error('Không thể giải mã dữ liệu chara base64 từ tEXt chunk.', { cause: e });
          }
        }
      }
    }

    // Skip content + CRC (4 bytes)
    offset += 12 + length;
  }

  return null;
}

/**
 * Embeds character JSON string into PNG ArrayBuffer.
 */
export function writeCharaToPng(pngArrayBuffer: ArrayBuffer, charDataJson: string): ArrayBuffer {
  const uint8 = new Uint8Array(pngArrayBuffer);
  const view = new DataView(pngArrayBuffer);

  // Check signature
  if (
    uint8[0] !== 0x89 ||
    uint8[1] !== 0x50 ||
    uint8[2] !== 0x4E ||
    uint8[3] !== 0x47 ||
    uint8[4] !== 0x0D ||
    uint8[5] !== 0x0A ||
    uint8[6] !== 0x1A ||
    uint8[7] !== 0x0A
  ) {
    throw new Error('File nguồn không phải định dạng ảnh PNG hợp lệ.');
  }

  const base64Data = encodeBase64(charDataJson);
  const textEncoder = new TextEncoder();
  const keywordBytes = textEncoder.encode('chara');
  const textBytes = textEncoder.encode(base64Data);

  // tEXt chunk data: keyword (5 bytes) + null separator (1 byte) + textBytes
  const chunkDataLength = keywordBytes.length + 1 + textBytes.length;
  const newChunk = new Uint8Array(12 + chunkDataLength);

  // Write Length (4 bytes)
  const chunkView = new DataView(newChunk.buffer);
  chunkView.setUint32(0, chunkDataLength);

  // Write Type 'tEXt' (4 bytes)
  newChunk[4] = 116; // 't'
  newChunk[5] = 69;  // 'E'
  newChunk[6] = 120; // 'x'
  newChunk[7] = 116; // 't'

  // Write Data (keyword + null + text)
  newChunk.set(keywordBytes, 8);
  newChunk[8 + keywordBytes.length] = 0; // null separator
  newChunk.set(textBytes, 8 + keywordBytes.length + 1);

  // Calculate CRC (type + data bytes)
  const crcInput = newChunk.subarray(4, 8 + chunkDataLength);
  const crcVal = crc32(crcInput);
  chunkView.setUint32(8 + chunkDataLength, crcVal);

  // We insert this new 'tEXt' chunk right after 'IHDR' chunk (first chunk)
  // Let's locate the first chunk length
  const firstChunkLength = view.getUint32(8);
  const insertOffset = 8 + 12 + firstChunkLength; // after signature (8) + length(4) + type(4) + data(firstChunkLength) + crc(4)

  // Allocate new array buffer
  const outBuffer = new Uint8Array(uint8.length + newChunk.length);
  outBuffer.set(uint8.subarray(0, insertOffset), 0);
  outBuffer.set(newChunk, insertOffset);
  outBuffer.set(uint8.subarray(insertOffset), insertOffset + newChunk.length);

  return outBuffer.buffer;
}

// Unicode-safe Base64 decode
function decodeBase64(str: string): string {
  const binary = atob(str.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

// Unicode-safe Base64 encode
function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a data URL (base64) to ArrayBuffer.
 */
export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return res.arrayBuffer();
}

/**
 * Creates a default blank PNG canvas and returns its ArrayBuffer.
 */
export async function getDefaultCardPng(name: string): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Fill background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#2d1b4e');
    gradient.addColorStop(1, '#1c122c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 600);

    // Draw card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 380, 580);

    // Draw some stylized graphic
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, Math.PI * 2);
    ctx.fill();

    // Draw character name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name || 'Unnamed Card', 200, 400);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '14px sans-serif';
    ctx.fillText('Character Card', 200, 430);
  }

  // Convert to blob and then ArrayBuffer
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas to Blob conversion failed'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read blob as array buffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Converts any image data URL (PNG, JPEG, etc.) into a PNG ArrayBuffer.
 */
export async function convertToPngBuffer(imgDataUrl: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to PNG blob'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read PNG blob as ArrayBuffer'));
          }
        };
        reader.readAsArrayBuffer(blob);
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load image for PNG conversion'));
    img.src = imgDataUrl;
  });
}


