# Core E-Commerce — Checkout con Descuentos Acumulativos

MVP de un checkout de e-commerce con motor de descuentos acumulativos en
cascada (categoría → volumen → cupón → tope absoluto del 35%).

- **Backend:** Node.js + Express + TypeScript (`apps/backend`)
- **Frontend:** Angular 17 (`apps/frontend`)
- **Tipos compartidos:** `packages/shared-types`
- **Documentación obligatoria:** `docs/arquitectura.md`, `docs/ia.md`

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- Google Chrome instalado (para correr los tests del frontend con `ChromeHeadless`)

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

### Comandos

```bash
npm run dev      # Levanta el servidor en modo desarrollo (ts-node-dev) en :3000
npm run build    # Compila TypeScript a dist/
npm start        # Corre la versión compilada (requiere build previo)
npm test         # Corre toda la suite de Jest con reporte de cobertura
npm run test:watch
```

Al levantar el servidor vas a ver:

```
Backend escuchando en http://localhost:3000
```

### Probar rápido con curl

```bash
curl http://localhost:3000/api/products

curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"p1","quantity":1}],"couponCode":"WELCOME2026"}'
```

En PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/products

Invoke-RestMethod -Uri http://localhost:3000/api/checkout -Method Post `
  -ContentType "application/json" `
  -Body '{"items":[{"productId":"p1","quantity":1}],"couponCode":"WELCOME2026"}'
```

El cupón válido pre-cargado es **`WELCOME2026`** (15%). También existe
`EXPIRED2020` para probar el edge case de cupón expirado.

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

## 3. Catalogo de productos (semilla)

El backend arranca con 10 productos en memoria (`apps/backend/src/data/seedProducts.ts`),
incluyendo varios de categoría "Tecnologia" (`p1` Laptop $650, `p2` Mouse $18,
`p3` Audífonos $45, `p10` Monitor $130) para poder disparar la Regla de
Categoría fácilmente durante la demo.

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

## 5. Checklist de la prueba técnica

- [x] Backend valida stock y aplica las reglas de descuento en cascada + tope del 35%
- [x] Frontend interactivo: carrito reactivo, cupón, desglose y alerta visual
- [x] `docs/arquitectura.md` con justificación de stack, trade-offs y patrones
- [x] `docs/ia.md` con prompts, agente auditor y bitácora de correcciones
- [x] Cobertura ≥ 80% en backend y frontend (ver comandos de test arriba)
- [ ] Repositorio subido a GitHub con historial de commits incremental (a cargo del candidato)
