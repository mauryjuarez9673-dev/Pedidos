import test from "node:test";
import assert from "node:assert/strict";
import { matchesProduct, orderToCsv, orderToTsv, parseCatalog } from "./catalog.js";
import { DEFAULT_PRODUCTS } from "./catalog-data.js";

test("includes the complete photographed catalog without duplicate codes", () => {
  assert.equal(DEFAULT_PRODUCTS.length, 119);
  assert.equal(new Set(DEFAULT_PRODUCTS.map((product) => product.code)).size, 119);
  assert.deepEqual(DEFAULT_PRODUCTS.at(0), {
    code: "CP10",
    description: "FRUITY SNACKS APPLES & OATMEAL",
    presentation: "",
    category: "Premios",
  });
  assert.equal(DEFAULT_PRODUCTS.at(-1).code, "CGA1");
});

test("reads tab-separated products with Spanish headers", () => {
  const products = parseCatalog("Código\tDescripción\tPresentación\tCategoría\nNS-01\tPollo adulto\t15 lb\tPerros");
  assert.deepEqual(products, [{ code: "NS-01", description: "Pollo adulto", presentation: "15 lb", category: "Perros" }]);
});

test("reads quoted CSV and removes duplicate codes", () => {
  const products = parseCatalog('sku,producto,peso,tipo\nA1,"Salmón, adulto",5 lb,Gatos\nA1,Duplicado,1 lb,Gatos');
  assert.equal(products.length, 1);
  assert.equal(products[0].description, "Salmón, adulto");
});

test("search ignores case and accents", () => {
  const product = { code: "AB-1", description: "Fórmula salmón", presentation: "5 lb", category: "Gatos" };
  assert.equal(matchesProduct(product, "formula salmon", "all"), true);
  assert.equal(matchesProduct(product, "AB-1", "Perros"), false);
});

test("exports only selected products for Excel and CSV", () => {
  const products = [
    { code: "A1", description: "Uno", presentation: "5 lb", category: "Perros" },
    { code: "B2", description: "Dos", presentation: "10 lb", category: "Gatos" },
  ];
  const order = { A1: 3 };
  assert.match(orderToTsv(products, order), /A1\tUno\t5 lb\t3/);
  assert.doesNotMatch(orderToTsv(products, order), /B2/);
  assert.match(orderToCsv(products, order), /"A1","Uno","5 lb","3"/);
});
