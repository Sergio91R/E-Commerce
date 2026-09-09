# Core E-Commerce — Checkout con Descuentos Acumulativos

MVP de un checkout de e-commerce con motor de descuentos acumulativos en
cascada (categoría → volumen → cupón → tope absoluto del 35%).

- **Backend:** Node.js + Express + TypeScript (`apps/backend`)
- **Frontend:** Angular 17 (`apps/frontend`)
- **Tipos compartidos:** `packages/shared-types`
- **Documentación obligatoria:** `docs/arquitectura.md`, `docs/ia.md`

## Requisitos previos

- **Node.js 22.5 o superior** (el backend persiste en SQLite usando el módulo
  estándar `node:sqlite`; en 20.x no existe). Probado en Node 24.
- npm 9 o superior
- Google Chrome instalado (para correr los tests del frontend con `ChromeHeadless`)

> El backend **no** tiene dependencias nativas: `node:sqlite` viene con Node, así
> que `npm install` no compila nada.

## 1. Backend

```bash
cd apps/backend
npm install
```

### Variables de entorno

Ninguna es obligatoria. Opcionalmente:

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto donde escucha el servidor Express |
| `SQLITE_DB_PATH` | `apps/backend/data.sqlite` | Ruta del archivo SQLite. Usá `:memory:` para una base efímera. Bajo `npm test` se fuerza `:memory:` automáticamente. |

### Comandos

```bash
npm run dev      # Levanta el servidor en modo desarrollo (ts-node-dev) en :3000
npm run build    # Compila packages/shared-types + el backend a dist/
npm start        # Corre la versión compilada (requiere build previo)
npm test         # Corre toda la suite de Jest con reporte de cobertura
npm run lint     # ESLint (eslint:recommended + @typescript-eslint/recommended)
npm run test:watch
```

> `npm run dev` y `npm run build` compilan primero `packages/shared-types`
> (script `build:shared`), porque el backend lo consume como `@shared/*`.
> `npm start` usa `-r tsconfig-paths/register` para resolver ese alias en el
> código ya compilado. `npm test` no necesita build: Jest mapea `@shared/*`
> directo al fuente.

Al levantar el servidor vas a ver:

```
Backend escuchando en http://localhost:3000
```

### Probar rápido con curl

```bash
# Catálogo
curl http://localhost:3000/api/products

# Checkout
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"p1","quantity":1}],"couponCode":"WELCOME2026"}'

# Alta de producto (POST) -> 201 | id repetido -> 409 | datos inválidos -> 400
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"id":"p11","name":"Teclado mecánico","price":40,"category":"Tecnologia","stock":30}'

# Edición parcial (PUT) -> 200 | id inexistente -> 404
curl -X PUT http://localhost:3000/api/products/p1 \
  -H "Content-Type: application/json" \
  -d '{"price":700,"stock":3}'
```


## 2. Frontend

```bash
cd apps/frontend
npm install
npm start        # ng serve, http://localhost:4200
```

> El frontend espera al backend en `http://localhost:3000/api` (configurado en
> `src/environments/environment.ts`). Levantá el backend primero.

### Tests del frontend

```bash
npm test         # ng test --code-coverage --watch=false --browsers=ChromeHeadless
```

El reporte de cobertura HTML queda en `apps/frontend/coverage/frontend/index.html`.

## 3. Persistencia y datos semilla (SQLite)

El backend persiste en un archivo SQLite (`apps/backend/data.sqlite`) con tres
tablas: `products`, `orders`, `coupons`. Usa `node:sqlite` (módulo estándar de
Node), así que no hay dependencias nativas ni servidor de base de datos.

**Creación y siembra automática:** al levantar el servidor por primera vez se
crea el archivo, se aplican las tablas (`CREATE TABLE IF NOT EXISTS`) y —solo si
están vacías— se siembran:

- Los 10 productos del archivo de datos versionado
  `apps/backend/seed/products.json` (ya no están embebidos en código TS),
  incluyendo varios de categoría "Tecnologia" (`p1` Laptop $650, `p2` Mouse $18,
  `p3` Audífonos $45, `p10` Monitor $130) para disparar la Regla de Categoría en
  la demo.
- El cupón `WELCOME2026` (15%).

Una vez creada la base, la API **siempre** lee el catálogo desde SQLite; el
JSON solo se usa como semilla inicial. Para cambiar el catálogo de arranque,
editá `seed/products.json` y borrá `data.sqlite` para que se vuelva a sembrar.

**Resetear los datos de prueba:** borrá el archivo y volvé a arrancar; se
regenera sembrado.

```bash
rm apps/backend/data.sqlite       # (o del /f en Windows cmd)
npm run dev
```

El archivo está en `.gitignore` (es estado de runtime, no código). Los tests
nunca lo tocan: `npm test` corre siempre contra una base `:memory:` aislada.

## 4. Estructura del repositorio

```
examen-ecommerce/
├── apps/
│   ├── backend/    # API Express + motor de descuentos + tests Jest
│   └── frontend/   # Angular: carrito, cupón, alerta del 35%
├── packages/
│   └── shared-types/   # DTOs y contratos compartidos
├── docs/
│   ├── arquitectura.md
│   └── ia.md
└── README.md
```

