# Gobernanza de IA — docs/ia.md

> **Nota para el candidato:** este archivo se completó con ejemplos reales ocurridos
> durante la co-creación de este proyecto con Claude (Anthropic). Revisalo, ajustá
> el tono a tu propia voz y agregá cualquier otro prompt/skill/agente que hayas
> usado vos mismo antes de entregarlo — vos sos quien lo defiende frente a la mesa.

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
- Toda ejecución real (`npm install`, `npm test`, `npm run dev`) se corrió en
  la máquina del candidato, no en el entorno de la IA (que no tiene acceso a
  internet) — esto fue clave para detectar los dos errores documentados abajo.

**Ejemplo concreto #1 — test mal aislado, corregido tras ejecutarlo:**

La IA generó un test para validar que el "Descuento por Volumen" no aplica por
debajo de $100, usando un producto (`mouse`, $18) que **también** pertenecía a
la categoría "Tecnologia". Al correr `npm test` en la máquina local, el test
falló: `Expected: 18, Received: 16.2`, porque el motor **sí** aplicaba
correctamente el 10% de descuento de categoría sobre ese producto, y el test
no lo contemplaba. Se corrigió reemplazando el producto de prueba por uno de
otra categoría (`cafetera`, $55, "Hogar") para aislar de verdad la regla de
volumen. **Este fue un error del test, no del motor de descuentos** — se
verificó manualmente el cálculo antes de dar la corrección por válida.

**Ejemplo concreto #2 — dependencia innecesaria rechazada en la configuración de Karma:**

La IA generó inicialmente un `karma.conf.js` que resolvía `CHROME_BIN` a
partir del paquete `puppeteer` (`require('puppeteer').executablePath()`).
Se rechazó esa línea porque `puppeteer` **no está declarado como dependencia**
en `package.json`: de haberse dejado, `ng test` habría fallado con
`Cannot find module 'puppeteer'` en cualquier máquina limpia. Se corrigió
eliminando esa resolución automática y dejando que Karma use
`ChromeHeadless` directamente vía `karma-chrome-launcher`, que sí está
declarado como dependencia.

---

_Agregá acá cualquier otro prompt, skill o corrección que hayas hecho vos
sobre este código antes de la sustentación — mientras más específico y
verificable (con números, nombres de archivo y comandos reales), más sólida
es tu defensa frente a la mesa evaluadora._
