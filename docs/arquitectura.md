# Arquitectura — Core E-Commerce Checkout con Descuentos Acumulativos

## 1. Stack tecnológico y diseño de carpetas

**Backend:** Node.js + Express + TypeScript (modo `strict`).
**Frontend:** Angular 17 (standalone components + Signals).
**Compartido:** paquete `packages/shared-types` con los DTOs y tipos que usan ambos lados.

### ¿Por qué este stack?

- **Express** se eligió sobre NestJS porque el problema es acotado (un módulo de checkout, no un sistema con múltiples dominios): NestJS aporta inyección de dependencias y decoradores que aquí se pueden lograr igual con clases simples e inyección manual por constructor, sin el costo de la curva de aprendizaje ni el boilerplate de módulos/decoradores. Se prioriza **simplicidad sobre "enterprise-ready" prematuro**.
- **Angular** se eligió (en vez de React) porque el problema tiene bastante **estado y lógica de UI reactiva** (carrito, cupón, alerta condicional) y Angular trae de fábrica inyección de dependencias, un sistema de formularios y HttpClient tipado, lo que reduce decisiones de "qué librería agrego" y mantiene el foco en la lógica de negocio. Los **Signals** de Angular 17 se usan para el estado del carrito porque dan reactividad de grano fino sin necesidad de RxJS para algo que no es asíncrono (el carrito es estado local, síncrono).
- **TypeScript estricto de punta a punta**, compartiendo contratos (`packages/shared-types`) para que un cambio en el shape del `CheckoutResponseDTO` rompa la compilación del frontend en vez de fallar en producción.
- **Persistencia en JSON** (`orders.json`) en vez de una base de datos real: para un MVP de checkout el requisito es demostrar que la orden se persiste con sus totales exactos, no evaluar un motor de persistencia. Se implementó detrás de una interfaz (`OrderRepository`) para poder reemplazarlo por Postgres/SQLite sin tocar la capa de aplicación.

## 2. Trade-offs de arquitectura asumidos

| Decisión | A favor | En contra / lo que se sacrificó |
|---|---|---|
| Monorepo simple con `npm` (sin workspaces) | Instalación independiente de cada app, cero configuración extra | Hay que hacer `npm install` en cada `apps/*` por separado (documentado en el README) |
| Persistencia en JSON en disco | Cero infraestructura, fácil de inspeccionar/demostrar en la sustentación | No apto para producción real ni para escrituras concurrentes; aceptable para un MVP |
| Angular Signals en vez de NgRx | Menos boilerplate para un carrito de un solo componente de estado | Si el carrito creciera a un dominio con más entidades relacionadas, NgRx (o un patrón similar) daría más trazabilidad |
| Reglas de descuento como clases Strategy en vez de funciones puras sueltas | Permite inyectar dependencias (ej. `CouponRepository`) y testear cada regla en aislamiento | Un poco más de código que simplemente encadenar funciones `(subtotal) => subtotal * 0.9` |
| Cálculo síncrono en memoria (no colas/eventos) | Simplicidad y velocidad de entrega — prioridad para un MVP de 20 minutos de sustentación | No escala a picos de tráfico masivo sin trabajo adicional (fuera de alcance del ejercicio) |

En general se priorizó **velocidad de entrega y claridad de la lógica de negocio** por sobre la extensibilidad a futuro, porque el enunciado pide un MVP evaluado en una sustentación corta, no un sistema productivo.

## 3. Aislamiento del motor de descuentos

El motor de descuentos (`apps/backend/src/domain/discounts/`) **no importa nada de Express, ni de la capa HTTP, ni del mecanismo de persistencia**. Su única dependencia es el contrato `CouponRepository` (una interfaz), inyectado por constructor. Esto se logra con una arquitectura por capas:

```
domain/            <- Reglas de negocio puras (sin frameworks)
  discounts/
    types.ts               (contratos internos)
    DiscountEngine.ts       (orquestador / contexto Strategy)
    DiscountRuleFactory.ts  (Factory)
    CouponRepository.ts     (contrato + implementación en memoria)
    rules/                  (3 reglas concretas = Strategies)
  errors.ts          (errores de dominio tipados)
  Order.ts           (modelo + contrato de repositorio)
  ProductRepository.ts

application/        <- Casos de uso: orquesta domain + repos
  CheckoutService.ts

infrastructure/      <- Detalles: Express, JSON en disco
  http/routes.ts
  persistence/JsonOrderRepository.ts
```

**Regla de dependencia:** las flechas de importación siempre apuntan hacia adentro (`infrastructure` → `application` → `domain`), nunca al revés. `DiscountEngine` recibe un arreglo de `CartLineSnapshot` (POJOs) y devuelve un `DiscountCalculationResult` (POJO); no sabe qué es Express ni cómo se guarda una orden. Esto permite:

- Testear el motor con **cero mocks de HTTP** (ver `tests/unit/DiscountEngine.test.ts`).
- Cambiar la persistencia (JSON → SQLite) sin tocar una sola línea de `domain/discounts`.
- Reemplazar Express por Fastify sin tocar la lógica de negocio, solo `infrastructure/http`.

## 4. Patrones de diseño implementados

### 4.1. Strategy — cálculo de cada tipo de descuento

Cada regla de negocio (`CategoryDiscountRule`, `VolumeDiscountRule`, `CouponDiscountRule`) implementa la interfaz `DiscountRule`:

```ts
export interface DiscountRule {
  readonly name: string;
  calculate(input: DiscountRuleInput): DiscountRuleOutput;
}
```

`DiscountEngine` (el **contexto** del patrón) itera sobre un arreglo de `DiscountRule` sin conocer su lógica interna — solo sabe que cada una recibe un `subtotal` y devuelve un `newSubtotal`. Esto permite agregar una cuarta regla de descuento (ej. "descuento por cliente VIP") sin modificar `DiscountEngine`, cumpliendo el principio Open/Closed.

### 4.2. Factory Method — instanciación y orden de las reglas

`DiscountRuleFactory.createSequentialRules(couponRepository)` centraliza **la construcción y el orden de precedencia** de las reglas (categoría → volumen → cupón), que es exactamente el orden que exige el enunciado. Si el orden de negocio cambiara, el único archivo que se toca es la Factory; `DiscountEngine` sigue iterando la lista sin cambios.

### 4.3. (Bonus) Repository — persistencia de órdenes y cupones

`OrderRepository` y `CouponRepository` son interfaces con una implementación en memoria/JSON. No es uno de los patrones sugeridos en el enunciado, pero refuerza el mismo objetivo del punto 3: la capa de dominio nunca sabe si los datos viven en un archivo JSON, en memoria o en una base de datos real.

## 5. Nota sobre el límite del 35% y las pruebas

Con las 3 reglas de negocio reales, el descuento máximo matemáticamente posible es:

```
1 - (0.90 × 0.95 × 0.85) = 27.325%
```

Es decir, **con las reglas actuales el tope del 35% nunca se alcanza en la práctica** (el máximo real es ~27.3%). Para no dejar la Regla #4 (límite absoluto) como código sin cobertura real, se escribieron pruebas unitarias que inyectan reglas `Strategy` de prueba con tasas agresivas (ver `DiscountEngine.test.ts`, describe `"límite absoluto del 35%"`), validando que el motor trunca correctamente en el límite exacto y por encima de él. Esto se documenta explícitamente para la sustentación: demuestra que el mecanismo de límite es robusto independientemente de qué reglas de negocio se agreguen en el futuro.
