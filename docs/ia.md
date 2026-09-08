# Gobernanza de IA — docs/ia.md

Este documento registra cómo usé herramientas de Inteligencia Artificial
Generativa (Claude, de Anthropic) durante el desarrollo de este proyecto, mi
rol como auditor del código producido, y ejemplos concretos de correcciones
que hice sobre sugerencias de la IA.

## 1. Skills / Prompts Automatizados

**Prompt estructurado usado para generar los casos de prueba del motor de descuentos:**

```
Actuá como un ingeniero de QA senior. Te paso la especificación de negocio de un
motor de descuentos acumulativos (regla de categoría, volumen, cupón y tope
absoluto del 35%, aplicadas en cascada multiplicativa). Generá una batería de
tests unitarios con Jest que cubra:
1. El camino feliz de cada regla por separado (aislada de las otras).
2. La cascada completa combinando las 3 reglas.
3. Los edge cases explícitos del enunciado: límite exacto del 35%, carritos
   vacíos/corruptos, cupones no registrados o expirados, compras sin stock
   suficiente.
Para cada test, indicá qué está aislando y por qué. No uses `any` en ningún
punto; si una regla necesita datos de producto, construí un Product completo
tipado.
```

Este prompt se usó como base para `tests/unit/DiscountEngine.test.ts` y
`tests/unit/CheckoutService.test.ts`. El resultado generado por la IA se
ejecutó, se revisó línea por línea y se corrigió (ver bitácora, punto 3).

## 2. Agents / Sub-agentes

Durante el desarrollo se usó el propio Claude en rol de **"auditor de arquitectura
y cobertura"**: en el chat de trabajo se le pidió explícitamente que, antes de dar
por cerrado cada módulo, (a) verificara con el compilador de TypeScript en modo
estricto que la capa de dominio compilara sin errores de tipos, y (b) señalara
cualquier caso donde el descuento acumulado pudiera superar el 35% para
confirmar que la Regla #4 realmente se ejercitaba en las pruebas.

Reglas específicas dadas a este "agente auditor":
- No dar código por correcto sin antes intentar compilarlo o ejecutarlo.
- Señalar explícitamente si una prueba no está aislando lo que dice aislar.
- Preferir simplicidad y legibilidad sobre abstracciones prematuras.

## 3. Bitácora de Co-creación

**Porcentaje aproximado del código sugerido por IA vs. implementado/corregido
manualmente:**

- ~70% del "esqueleto" (estructura de carpetas, boilerplate de Express/Angular,
  DTOs, configuración de Jest/Karma) fue generado por la IA a partir de la
  especificación del enunciado.
- La lógica crítica de negocio (el orden exacto de precedencia de las reglas,
  la fórmula de truncado al 35%, y la decisión de aislar el motor de
  descuentos del resto de la app mediante interfaces) fue **revisada y
  validada manualmente** contra el enunciado, verificando los cálculos a mano
  antes de aceptar el código.
- Toda ejecución real (`npm install`, `npm test`, `npm run dev`, y las pruebas
  manuales en el navegador) la corrí yo en mi máquina, no en el entorno de la
  IA (que no tiene acceso a internet ni puede renderizar Angular) — esto fue
  clave para detectar los tres errores documentados abajo.

**Ejemplo concreto #1 — test mal aislado, corregido tras ejecutarlo:**

La IA generó un test para validar que el "Descuento por Volumen" no aplica por
debajo de $100, usando un producto (`mouse`, $18) que **también** pertenecía a
la categoría "Tecnologia". Al correr `npm test` en mi máquina, el test
falló: `Expected: 18, Received: 16.2`, porque el motor **sí** aplicaba
correctamente el 10% de descuento de categoría sobre ese producto, y el test
no lo contemplaba. Lo corregí reemplazando el producto de prueba por uno de
otra categoría (`cafetera`, $55, "Hogar") para aislar de verdad la regla de
volumen. **Este fue un error del test, no del motor de descuentos** — verifiqué
manualmente el cálculo antes de dar la corrección por válida.

**Ejemplo concreto #2 — dependencia innecesaria rechazada en la configuración de Karma:**

La IA generó inicialmente un `karma.conf.js` que resolvía `CHROME_BIN` a
partir del paquete `puppeteer` (`require('puppeteer').executablePath()`).
Rechacé esa línea porque `puppeteer` **no está declarado como dependencia**
en `package.json`: de haberla dejado, `ng test` habría fallado con
`Cannot find module 'puppeteer'` en cualquier máquina limpia. La corregí
eliminando esa resolución automática y dejando que Karma use
`ChromeHeadless` directamente vía `karma-chrome-launcher`, que sí está
declarado como dependencia.

**Ejemplo concreto #3 — cupón "fantasma" tras vaciar el input, encontrado probando el flujo manualmente:**

Al implementar la aplicación explícita de cupones (botón "Aplicar cupón" en
vez de recalcular en cada tecla), la IA separó el estado en dos señales:
`couponInput` (lo que el usuario está escribiendo) y `appliedCouponCode` (el
último cupón confirmado con el botón). El problema: al vaciar completamente
el input después de haber aplicado un cupón inválido, el código solo
limpiaba el mensaje de error visible, pero **no sincronizaba
`appliedCouponCode` de vuelta a vacío**. El cupón inválido quedaba "aplicado"
por detrás de escena aunque el campo se viera vacío en pantalla, y al tocar
"Confirmar compra" el backend seguía recibiendo ese cupón inválido y
rechazando la compra, sin ninguna explicación visible para el usuario.

Este bug **no lo encontró ningún test automático ni la IA**: lo encontré yo
probando manualmente el flujo completo end-to-end en el navegador (agregar
producto → aplicar cupón inválido → borrar el input → confirmar compra) al
notar el comportamiento inesperado. Lo corregí sincronizando
`appliedCouponCode` a vacío en el mismo momento en que el input queda vacío,
sin esperar a que se vuelva a tocar el botón "Aplicar cupón". Agregué un
test de regresión específico en `cart.component.spec.ts` ("regresión: al
vaciar el input después de un cupón inválido, confirmar compra no reenvía
ese cupón") que reproduce exactamente esta secuencia para que no vuelva a
romperse en el futuro.
