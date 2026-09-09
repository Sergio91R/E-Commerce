import fs from 'fs';
import path from 'path';
import { Product } from '@shared/index';

/**
 * Datos semilla del catálogo. NO están embebidos en el código: viven en un
 * archivo de datos versionado (`apps/backend/seed/products.json`) y solo se
 * usan para poblar la tabla `products` de SQLite la primera vez que arranca
 * el backend (si la tabla está vacía). En runtime la aplicación siempre lee
 * el catálogo desde la base, nunca desde esta constante.
 *
 * La ruta se resuelve relativa a este módulo y funciona igual ejecutando
 * desde `src/` (ts-node/Jest) o desde `dist/` (build compilado).
 */
const SEED_FILE = path.join(__dirname, '..', '..', 'seed', 'products.json');

export const SEED_PRODUCTS: Product[] = JSON.parse(
  fs.readFileSync(SEED_FILE, 'utf-8')
) as Product[];
