const HEADER_ALIASES = {
  code: ["codigo", "código", "cod", "sku", "item", "clave"],
  description: ["descripcion", "descripción", "producto", "nombre", "detalle"],
  presentation: ["presentacion", "presentación", "tamano", "tamaño", "peso", "unidad"],
  category: ["categoria", "categoría", "familia", "linea", "línea", "tipo"],
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectDelimiter(line) {
  const candidates = ["\t", ";", ",", "|"];
  return candidates.reduce((best, current) =>
    line.split(current).length > line.split(best).length ? current : best
  );
}

function splitRow(row, delimiter) {
  if (delimiter !== ",") return row.split(delimiter).map((cell) => cell.trim());
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"' && quoted) {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function findHeaderIndexes(cells) {
  const indexes = {};
  cells.forEach((cell, index) => {
    const key = Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.map(normalize).includes(normalize(cell)))?.[0];
    if (key) indexes[key] = index;
  });
  return indexes;
}

export function parseCatalog(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => splitRow(line, delimiter));
  const detected = findHeaderIndexes(rows[0]);
  const hasHeader = detected.code !== undefined || detected.description !== undefined;
  const indexes = hasHeader
    ? { code: detected.code ?? 0, description: detected.description ?? 1, presentation: detected.presentation ?? 2, category: detected.category ?? 3 }
    : { code: 0, description: 1, presentation: 2, category: 3 };

  return rows.slice(hasHeader ? 1 : 0)
    .map((cells) => ({
      code: cells[indexes.code]?.trim() || "",
      description: cells[indexes.description]?.trim() || "",
      presentation: cells[indexes.presentation]?.trim() || "",
      category: cells[indexes.category]?.trim() || "Sin categoría",
    }))
    .filter((product) => product.code && product.description)
    .filter((product, index, products) => products.findIndex((item) => normalize(item.code) === normalize(product.code)) === index);
}

export function catalogToText(products) {
  return [
    ["Código", "Descripción", "Presentación", "Categoría"],
    ...products.map((product) => [product.code, product.description, product.presentation, product.category]),
  ].map((row) => row.join("\t")).join("\n");
}

export function orderToTsv(products, order) {
  const selected = products.filter((product) => (order[product.code] || 0) > 0);
  return [
    ["Código", "Descripción", "Presentación", "Cantidad"],
    ...selected.map((product) => [product.code, product.description, product.presentation, order[product.code]]),
  ].map((row) => row.join("\t")).join("\n");
}

export function orderToCsv(products, order) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return orderToTsv(products, order)
    .split("\n")
    .map((line) => line.split("\t").map(escape).join(","))
    .join("\r\n");
}

export function matchesProduct(product, search, category) {
  const needle = normalize(search);
  const categoryMatches = category === "all" || product.category === category;
  const textMatches = !needle || normalize(`${product.code} ${product.description} ${product.presentation}`).includes(needle);
  return categoryMatches && textMatches;
}
