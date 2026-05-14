import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-qr-code.css', import.meta.url);
const errorLevels = new Set(['L', 'M', 'Q', 'H']);
const errorLevelBits = { M: 0, L: 1, H: 2, Q: 3 };
const alignmentPatternPositions = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};
const rsBlockTable = {
  L: {
    1: [[1, 26, 19]],
    2: [[1, 44, 34]],
    3: [[1, 70, 55]],
    4: [[1, 100, 80]],
    5: [[1, 134, 108]],
    6: [[2, 86, 68]],
  },
  M: {
    1: [[1, 26, 16]],
    2: [[1, 44, 28]],
    3: [[1, 70, 44]],
    4: [[2, 50, 32]],
    5: [[2, 67, 43]],
    6: [[4, 43, 27]],
  },
  Q: {
    1: [[1, 26, 13]],
    2: [[1, 44, 22]],
    3: [[2, 35, 17]],
    4: [[2, 50, 24]],
    5: [[2, 33, 15], [2, 34, 16]],
    6: [[4, 43, 19]],
  },
  H: {
    1: [[1, 26, 9]],
    2: [[1, 44, 16]],
    3: [[2, 35, 13]],
    4: [[4, 25, 9]],
    5: [[2, 33, 11], [2, 34, 12]],
    6: [[4, 43, 15]],
  },
};
const maskFunctions = [
  (row, col) => (row + col) % 2 === 0,
  row => row % 2 === 0,
  (row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0,
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function readNumber(host, name, fallback) {
  const value = Number.parseFloat(host.getAttribute(name) ?? '');

  return Number.isFinite(value) ? value : fallback;
}

function readErrorCorrection(value) {
  const normalized = String(value ?? 'H').toUpperCase();

  return errorLevels.has(normalized) ? normalized : 'H';
}

function createMatrix(size) {
  return {
    modules: Array.from({ length: size }, () => Array(size).fill(false)),
    reserved: Array.from({ length: size }, () => Array(size).fill(false)),
  };
}

function setModule(matrix, row, col, value, reserved = true) {
  if (row < 0 || col < 0 || row >= matrix.modules.length || col >= matrix.modules.length) return;

  matrix.modules[row][col] = value;
  if (reserved) matrix.reserved[row][col] = true;
}

function drawFinder(matrix, row, col) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const y = row + r;
      const x = col + c;
      const inFinder = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark = inFinder && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));

      setModule(matrix, y, x, dark);
    }
  }
}

function drawAlignment(matrix, row, col) {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;

      setModule(matrix, row + r, col + c, dark);
    }
  }
}

function drawFunctionPatterns(matrix, version) {
  const size = matrix.modules.length;

  drawFinder(matrix, 0, 0);
  drawFinder(matrix, 0, size - 7);
  drawFinder(matrix, size - 7, 0);

  for (let index = 8; index < size - 8; index += 1) {
    const dark = index % 2 === 0;

    setModule(matrix, 6, index, dark);
    setModule(matrix, index, 6, dark);
  }

  for (const row of alignmentPatternPositions[version]) {
    for (const col of alignmentPatternPositions[version]) {
      const overlapsFinder = (row === 6 && col === 6) || (row === 6 && col === size - 7) || (row === size - 7 && col === 6);

      if (!overlapsFinder) drawAlignment(matrix, row, col);
    }
  }

  setModule(matrix, 4 * version + 9, 8, true);

  for (let index = 0; index < 9; index += 1) {
    if (index !== 6) {
      setModule(matrix, 8, index, false);
      setModule(matrix, index, 8, false);
    }
  }

  for (let index = 0; index < 8; index += 1) {
    setModule(matrix, 8, size - 1 - index, false);
    setModule(matrix, size - 1 - index, 8, false);
  }
}

function makeGaloisField() {
  const exp = Array(512).fill(0);
  const log = Array(256).fill(0);
  let value = 1;

  for (let index = 0; index < 255; index += 1) {
    exp[index] = value;
    log[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }

  for (let index = 255; index < 512; index += 1) {
    exp[index] = exp[index - 255];
  }

  return { exp, log };
}

const gf = makeGaloisField();

function multiply(a, b) {
  if (a === 0 || b === 0) return 0;

  return gf.exp[gf.log[a] + gf.log[b]];
}

function generatorPolynomial(degree) {
  let polynomial = [1];

  for (let index = 0; index < degree; index += 1) {
    const next = Array(polynomial.length + 1).fill(0);

    for (let term = 0; term < polynomial.length; term += 1) {
      next[term] ^= polynomial[term];
      next[term + 1] ^= multiply(polynomial[term], gf.exp[index]);
    }

    polynomial = next;
  }

  return polynomial;
}

function reedSolomon(data, degree) {
  const generator = generatorPolynomial(degree);
  const result = Array(degree).fill(0);

  for (const byte of data) {
    const factor = byte ^ result.shift();

    result.push(0);

    for (let index = 0; index < degree; index += 1) {
      result[index] ^= multiply(generator[index + 1], factor);
    }
  }

  return result;
}

function bitBuffer() {
  const bits = [];

  return {
    bits,
    put(value, length) {
      for (let index = length - 1; index >= 0; index -= 1) {
        bits.push(((value >>> index) & 1) === 1);
      }
    },
  };
}

function utf8Bytes(value) {
  return [...new TextEncoder().encode(value)];
}

function blockDefinitions(version, errorCorrection) {
  return rsBlockTable[errorCorrection][version].flatMap(([count, totalCount, dataCount]) => (
    Array.from({ length: count }, () => ({ totalCount, dataCount }))
  ));
}

function dataCapacity(version, errorCorrection) {
  return blockDefinitions(version, errorCorrection).reduce((total, block) => total + block.dataCount, 0);
}

function chooseVersion(bytes, errorCorrection) {
  for (let version = 1; version <= 6; version += 1) {
    const capacityBits = dataCapacity(version, errorCorrection) * 8;
    const requiredBits = 4 + 8 + (bytes.length * 8);

    if (requiredBits <= capacityBits) return version;
  }

  throw new Error('QR value is too long for this component. Use fewer than 60 bytes with H correction or lower error correction.');
}

function createDataCodewords(bytes, version, errorCorrection) {
  const capacity = dataCapacity(version, errorCorrection);
  const buffer = bitBuffer();

  buffer.put(0b0100, 4);
  buffer.put(bytes.length, 8);
  bytes.forEach(byte => buffer.put(byte, 8));

  const terminator = Math.min(4, (capacity * 8) - buffer.bits.length);
  buffer.put(0, terminator);

  while (buffer.bits.length % 8 !== 0) {
    buffer.bits.push(false);
  }

  const data = [];

  for (let index = 0; index < buffer.bits.length; index += 8) {
    let value = 0;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value << 1) | (buffer.bits[index + bit] ? 1 : 0);
    }

    data.push(value);
  }

  for (let pad = 0; data.length < capacity; pad += 1) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
  }

  return data;
}

function createCodewords(bytes, version, errorCorrection) {
  const blocks = blockDefinitions(version, errorCorrection);
  const dataCodewords = createDataCodewords(bytes, version, errorCorrection);
  const dataBlocks = [];
  const errorBlocks = [];
  let offset = 0;

  for (const block of blocks) {
    const data = dataCodewords.slice(offset, offset + block.dataCount);
    const errorCount = block.totalCount - block.dataCount;

    dataBlocks.push(data);
    errorBlocks.push(reedSolomon(data, errorCount));
    offset += block.dataCount;
  }

  const codewords = [];
  const maxDataLength = Math.max(...dataBlocks.map(block => block.length));
  const maxErrorLength = Math.max(...errorBlocks.map(block => block.length));

  for (let index = 0; index < maxDataLength; index += 1) {
    dataBlocks.forEach(block => {
      if (index < block.length) codewords.push(block[index]);
    });
  }

  for (let index = 0; index < maxErrorLength; index += 1) {
    errorBlocks.forEach(block => {
      if (index < block.length) codewords.push(block[index]);
    });
  }

  return codewords;
}

function placeData(matrix, codewords, mask) {
  const size = matrix.modules.length;
  const bits = codewords.flatMap(byte => (
    Array.from({ length: 8 }, (_, index) => ((byte >>> (7 - index)) & 1) === 1)
  ));
  let bitIndex = 0;
  let direction = -1;
  let row = size - 1;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;

    while (row >= 0 && row < size) {
      for (let offset = 0; offset < 2; offset += 1) {
        const x = col - offset;

        if (matrix.reserved[row][x]) continue;

        const bit = bits[bitIndex] ?? false;
        const masked = maskFunctions[mask](row, x);

        matrix.modules[row][x] = masked ? !bit : bit;
        bitIndex += 1;
      }

      row += direction;
    }

    direction *= -1;
    row += direction;
  }
}

function bchFormatBits(value) {
  let data = value << 10;

  for (let index = 14; index >= 10; index -= 1) {
    if (((data >>> index) & 1) === 1) {
      data ^= 0x537 << (index - 10);
    }
  }

  return ((value << 10) | data) ^ 0x5412;
}

function drawFormatBits(matrix, errorCorrection, mask) {
  const size = matrix.modules.length;
  const bits = bchFormatBits((errorLevelBits[errorCorrection] << 3) | mask);

  for (let index = 0; index < 15; index += 1) {
    const bit = ((bits >>> index) & 1) === 1;
    const first = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ][index];
    const second = index < 8
      ? [size - 1 - index, 8]
      : [8, size - 15 + index];

    setModule(matrix, first[0], first[1], bit);
    setModule(matrix, second[0], second[1], bit);
  }
}

function penalty(matrix) {
  const size = matrix.modules.length;
  let score = 0;

  for (let row = 0; row < size; row += 1) {
    let runColor = matrix.modules[row][0];
    let runLength = 1;

    for (let col = 1; col < size; col += 1) {
      if (matrix.modules[row][col] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + runLength - 5;
        runColor = matrix.modules[row][col];
        runLength = 1;
      }
    }

    if (runLength >= 5) score += 3 + runLength - 5;
  }

  for (let col = 0; col < size; col += 1) {
    let runColor = matrix.modules[0][col];
    let runLength = 1;

    for (let row = 1; row < size; row += 1) {
      if (matrix.modules[row][col] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + runLength - 5;
        runColor = matrix.modules[row][col];
        runLength = 1;
      }
    }

    if (runLength >= 5) score += 3 + runLength - 5;
  }

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const color = matrix.modules[row][col];

      if (matrix.modules[row + 1][col] === color && matrix.modules[row][col + 1] === color && matrix.modules[row + 1][col + 1] === color) {
        score += 3;
      }
    }
  }

  let dark = 0;

  matrix.modules.forEach(row => {
    row.forEach(module => {
      if (module) dark += 1;
    });
  });

  score += Math.floor(Math.abs(((dark * 100) / (size * size)) - 50) / 5) * 10;

  return score;
}

function createQrMatrix(value, errorCorrection) {
  const bytes = utf8Bytes(value);
  const version = chooseVersion(bytes, errorCorrection);
  const codewords = createCodewords(bytes, version, errorCorrection);
  let bestMatrix = null;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const matrix = createMatrix((version * 4) + 17);

    drawFunctionPatterns(matrix, version);
    placeData(matrix, codewords, mask);
    drawFormatBits(matrix, errorCorrection, mask);

    const score = penalty(matrix);

    if (score < bestPenalty) {
      bestPenalty = score;
      bestMatrix = matrix.modules;
    }
  }

  return bestMatrix;
}

class TblrQrCode extends HTMLElement {
  static observedAttributes = [
    'value',
    'label',
    'size',
    'fill',
    'background',
    'radius',
    'error-correction',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get value() {
    return this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
  }

  get canvas() {
    return this.root.querySelector('canvas');
  }

  render() {
    const value = this.value;
    const size = Math.max(16, Math.round(readNumber(this, 'size', 128)));
    const label = this.getAttribute('label') || value || 'QR code';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <canvas part="base" class="base" width="${size}" height="${size}" role="img" aria-label="${label}"></canvas>
    `;

    this.draw();
  }

  draw() {
    const canvas = this.canvas;
    const context = canvas?.getContext('2d');
    const size = canvas?.width ?? 128;
    const value = this.value;
    const fill = this.getAttribute('fill') ?? '#000';
    const background = this.getAttribute('background') ?? '#fff';
    const radius = clamp(readNumber(this, 'radius', 0), 0, 0.5);
    const errorCorrection = readErrorCorrection(this.getAttribute('error-correction'));

    if (!context) return;

    context.clearRect(0, 0, size, size);
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);

    if (!value) return;

    try {
      const matrix = createQrMatrix(value, errorCorrection);
      const quietZone = 4;
      const modules = matrix.length + (quietZone * 2);
      const moduleSize = size / modules;

      context.fillStyle = fill;

      for (let row = 0; row < matrix.length; row += 1) {
        for (let col = 0; col < matrix.length; col += 1) {
          if (!matrix[row][col]) continue;

          this.drawModule(context, (col + quietZone) * moduleSize, (row + quietZone) * moduleSize, moduleSize, radius);
        }
      }
    } catch (error) {
      context.clearRect(0, 0, size, size);
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
      context.fillStyle = fill;
      context.font = `${Math.max(10, Math.floor(size / 12))}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('QR error', size / 2, size / 2);
    }
  }

  drawModule(context, x, y, size, radius) {
    const moduleRadius = size * radius;

    if (moduleRadius <= 0) {
      context.fillRect(x, y, Math.ceil(size), Math.ceil(size));
      return;
    }

    const width = Math.ceil(size);
    const height = Math.ceil(size);
    const r = Math.min(moduleRadius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.fill();
  }
}

Component({
  tag: 'tblr-qr-code',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrQrCode);

export { TblrQrCode };
