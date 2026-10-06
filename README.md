# Pedidos Hills y NutriSource

Aplicaciones web para buscar productos, seleccionar cantidades y copiar el pedido a Excel o descargarlo como CSV.

- Hills: `http://localhost:4173/`, con 119 productos.
- NutriSource: `http://localhost:4173/nutrisource/`, con 134 productos transcritos de las siete fotografías del catálogo.

Los pedidos de ambas marcas se guardan por separado en el navegador.

## Ejecutar

```bash
npm start
```

Abre `http://localhost:4173`. El pedido y cualquier edición del catálogo se conservan en el navegador mediante `localStorage`; no se envían a ningún servidor.

## Pruebas

```bash
npm test
```
