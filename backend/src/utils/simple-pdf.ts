import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

interface PrescriptionPdfItem {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
}

interface PrescriptionPdfPayload {
  patientName: string;
  createdAt: string;
  conduct: string;
  items: PrescriptionPdfItem[];
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_TOP = 804;
const PAGE_BOTTOM = 52;
const PAGE_LEFT = 42;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_LEFT * 2;
const BRAND = "#10b3c9";
const BRAND_DARK = "#0891b2";
const BRAND_GREEN = "#84cc16";
const TEXT = "#1f2937";
const TEXT_SOFT = "#475569";
const SURFACE = "#f8fafc";
const WHITE = "#ffffff";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

interface EmbeddedPngImage {
  width: number;
  height: number;
  rgbData: Buffer;
  alphaData: Buffer;
}

let cachedLogo: EmbeddedPngImage | null = null;

const resolveLogoPath = () => {
  const currentFilePath = fileURLToPath(import.meta.url);
  const candidates = [
    path.resolve(process.cwd(), "public/logo-bjm.png"),
    path.resolve(process.cwd(), "../frontend-next/public/logo-bjm.png"),
    path.resolve(process.cwd(), "frontend-next/public/logo-bjm.png"),
    path.resolve(path.dirname(currentFilePath), "../../../frontend-next/public/logo-bjm.png"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const sanitizePdfText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .trim();

const wrapText = (value: string, maxLength: number) => {
  const words = sanitizePdfText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
};

const formatPdfDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitizePdfText(value);
  return sanitizePdfText(
    date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
};

const rgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
};

const rect = (x: number, y: number, width: number, height: number, fill: string) =>
  `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;

const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 1) =>
  `q ${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`;

const image = (x: number, y: number, width: number, height: number, name: string) =>
  `q ${width} 0 0 ${height} ${x} ${y} cm /${name} Do Q`;

const text = (x: number, y: number, value: string, options?: { font?: "F1" | "F2"; size?: number; color?: string }) => {
  const font = options?.font ?? "F1";
  const size = options?.size ?? 12;
  const color = options?.color ?? rgb("#1f2937");
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${sanitizePdfText(value)}) Tj ET`;
};

const paethPredictor = (left: number, up: number, upLeft: number) => {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
};

const readEmbeddedLogo = (): EmbeddedPngImage => {
  if (cachedLogo) return cachedLogo;

  const logoPath = resolveLogoPath();
  if (!logoPath) {
    throw new Error("Logo PNG nao encontrada para geracao do PDF.");
  }

  const buffer = fs.readFileSync(logoPath);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Logo PNG invalida.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatParts: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height || bitDepth !== 8 || colorType !== 6) {
    throw new Error("Logo PNG precisa ser RGBA 8-bit.");
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatParts));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const decoded = Buffer.alloc(height * stride);
  let inOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inOffset];
    inOffset += 1;
    const rowStart = row * stride;

    for (let column = 0; column < stride; column += 1) {
      const raw = inflated[inOffset];
      inOffset += 1;
      const left = column >= bytesPerPixel ? decoded[rowStart + column - bytesPerPixel] : 0;
      const up = row > 0 ? decoded[rowStart + column - stride] : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? decoded[rowStart + column - stride - bytesPerPixel] : 0;

      let value = raw;
      if (filterType === 1) value = (raw + left) & 0xff;
      else if (filterType === 2) value = (raw + up) & 0xff;
      else if (filterType === 3) value = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filterType === 4) value = (raw + paethPredictor(left, up, upLeft)) & 0xff;

      decoded[rowStart + column] = value;
    }
  }

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);

  for (let index = 0, rgbOffset = 0, alphaOffset = 0; index < decoded.length; index += 4) {
    rgb[rgbOffset] = decoded[index];
    rgb[rgbOffset + 1] = decoded[index + 1];
    rgb[rgbOffset + 2] = decoded[index + 2];
    alpha[alphaOffset] = decoded[index + 3];
    rgbOffset += 3;
    alphaOffset += 1;
  }

  cachedLogo = {
    width,
    height,
    rgbData: zlib.deflateSync(rgb),
    alphaData: zlib.deflateSync(alpha),
  };
  return cachedLogo;
};

export const createSimplePdfBuffer = (payload: PrescriptionPdfPayload): Buffer => {
  const logo = (() => {
    try {
      return readEmbeddedLogo();
    } catch {
      return null;
    }
  })();
  const logoAsset =
    logo ??
    ({
      width: 1,
      height: 1,
      rgbData: zlib.deflateSync(Buffer.from([255, 255, 255])),
      alphaData: zlib.deflateSync(Buffer.from([255])),
    } satisfies EmbeddedPngImage);
  const pages: string[][] = [];
  let commands: string[] = [];
  let y = PAGE_TOP;
  let pageNumber = 1;

  const startPage = () => {
    commands = [];
    y = PAGE_TOP;

    commands.push(rect(0, PAGE_HEIGHT - 112, PAGE_WIDTH, 112, rgb(WHITE)));
    if (logo) {
      commands.push(image(PAGE_LEFT, PAGE_HEIGHT - 88, 112, 52, "Im1"));
    }
    commands.push(text(PAGE_LEFT + (logo ? 128 : 0), PAGE_HEIGHT - 66, "Prescricao", { font: "F2", size: 20, color: rgb(TEXT) }));
    commands.push(
      text(PAGE_LEFT + (logo ? 128 : 0), PAGE_HEIGHT - 86, "Documento liberado para consulta do paciente", {
        size: 10,
        color: rgb(TEXT_SOFT),
      }),
    );
    commands.push(
      text(PAGE_WIDTH - 92, PAGE_HEIGHT - 68, `${pageNumber}`, {
        size: 10,
        color: rgb(TEXT_SOFT),
      }),
    );
    commands.push(line(PAGE_LEFT, PAGE_HEIGHT - 106, PAGE_LEFT + CONTENT_WIDTH, PAGE_HEIGHT - 106, BRAND, 1.3));
    y = PAGE_HEIGHT - 150;
  };

  const finishPage = () => {
    commands.push(
      text(PAGE_LEFT, 24, "Documento gerado pelo portal do paciente", {
        size: 9,
        color: rgb(TEXT_SOFT),
      }),
    );
    pages.push(commands);
    pageNumber += 1;
  };

  const ensureSpace = (height: number) => {
    if (y - height < PAGE_BOTTOM) {
      finishPage();
      startPage();
    }
  };

  const drawSectionTitle = (label: string) => {
    ensureSpace(28);
    commands.push(text(PAGE_LEFT, y, label, { font: "F2", size: 11, color: rgb(BRAND_DARK) }));
    y -= 22;
  };

  const drawParagraphCard = (title: string, content: string) => {
    const bodyLines = wrapText(content, 78);
    const height = 22 + 18 + bodyLines.length * 16 + 18;
    ensureSpace(height);
    const boxY = y - height + 8;
    commands.push(rect(PAGE_LEFT, boxY, CONTENT_WIDTH, height, rgb(SURFACE)));
    commands.push(rect(PAGE_LEFT, boxY + height - 2, CONTENT_WIDTH, 2, rgb(BRAND)));
    commands.push(text(PAGE_LEFT + 16, y - 8, title, { font: "F2", size: 13, color: rgb(TEXT) }));
    let lineY = y - 30;
    for (const line of bodyLines) {
      commands.push(text(PAGE_LEFT + 16, lineY, line, { size: 11, color: rgb(TEXT_SOFT) }));
      lineY -= 16;
    }
    y = boxY - 18;
  };

  const drawMetaRow = () => {
    const boxHeight = 72;
    ensureSpace(boxHeight + 10);
    const leftWidth = CONTENT_WIDTH * 0.58;
    const rightWidth = CONTENT_WIDTH - leftWidth - 12;
    const boxY = y - boxHeight;
    commands.push(rect(PAGE_LEFT, boxY, leftWidth, boxHeight, rgb(SURFACE)));
    commands.push(rect(PAGE_LEFT + leftWidth + 12, boxY, rightWidth, boxHeight, rgb(SURFACE)));
    commands.push(text(PAGE_LEFT + 16, y - 18, "Paciente", { size: 10, color: rgb(BRAND_DARK) }));
    commands.push(text(PAGE_LEFT + 16, y - 40, payload.patientName, { font: "F2", size: 16, color: rgb(TEXT) }));
    commands.push(text(PAGE_LEFT + leftWidth + 28, y - 18, "Liberada em", { size: 10, color: rgb(BRAND_DARK) }));
    commands.push(text(PAGE_LEFT + leftWidth + 28, y - 40, formatPdfDate(payload.createdAt), { font: "F2", size: 14, color: rgb(TEXT) }));
    y = boxY - 24;
  };

  const drawMedicationCard = (item: PrescriptionPdfItem, index: number) => {
    const medicationLines = wrapText(item.medication, 56);
    const detailLines = [
      `Dose: ${item.dose}`,
      `Frequencia: ${item.frequency}`,
      `Duracao: ${item.duration}`,
      `Via: ${item.route}`,
    ].flatMap((line) => wrapText(line, 74));
    const height = 26 + medicationLines.length * 16 + detailLines.length * 14 + 22;
    ensureSpace(height + 12);
    const boxY = y - height;
    commands.push(rect(PAGE_LEFT, boxY, CONTENT_WIDTH, height, rgb(index % 2 === 0 ? WHITE : SURFACE)));
    commands.push(rect(PAGE_LEFT, boxY, 4, height, rgb(BRAND)));
    let lineY = y - 18;
    for (const line of medicationLines) {
      commands.push(text(PAGE_LEFT + 20, lineY, line, { font: "F2", size: 13, color: rgb(TEXT) }));
      lineY -= 16;
    }
    for (const line of detailLines) {
      commands.push(text(PAGE_LEFT + 20, lineY, line, { size: 11, color: rgb(TEXT_SOFT) }));
      lineY -= 14;
    }
    y = boxY - 12;
  };

  startPage();
  drawMetaRow();
  drawSectionTitle("Conduta");
  drawParagraphCard("Orientacoes liberadas", payload.conduct || "Sem conduta registrada.");
  drawSectionTitle("Medicamentos");

  if (payload.items.length === 0) {
    drawParagraphCard("Sem itens registrados", "Nao ha medicamentos vinculados a esta prescricao.");
  } else {
    payload.items.forEach((item, index) => drawMedicationCard(item, index));
  }

  finishPage();

  const objects: string[] = [];
  const fontRegularId = 3 + pages.length * 2 + 2;
  const fontBoldId = fontRegularId + 1;
  const imageObjectId = 3 + pages.length * 2;
  const imageMaskObjectId = imageObjectId + 1;

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] >>`);

  pages.forEach((pageCommands, index) => {
    const contentObjectId = 4 + index * 2;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Im1 ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    const stream = pageCommands.join("\n");
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  });

  objects.push(
    `<< /Type /XObject /Subtype /Image /Width ${logoAsset.width} /Height ${logoAsset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${imageMaskObjectId} 0 R /Length ${logoAsset.rgbData.length} >>\nstream\n${logoAsset.rgbData.toString("binary")}\nendstream`,
  );
  objects.push(
    `<< /Type /XObject /Subtype /Image /Width ${logoAsset.width} /Height ${logoAsset.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${logoAsset.alphaData.length} >>\nstream\n${logoAsset.alphaData.toString("binary")}\nendstream`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
};
