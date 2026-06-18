# SPEC 12 — Performance + timing fixes para FroggerGame

> **Estado:** Implementado
> **Depende de:** specs/game-jam/frogger/01-frogger-core.md
> **Fecha:** 2026-05-25 (perf) · 2026-06-18 (timing/velocidad)
> **Objetivo:** Eliminar el jank de frames y el crecimiento de memoria en FroggerGame
> corrigiendo allocaciones dentro del loop RAF, evitando redraws innecesarios en pausa,
> y bloqueando re-renders React del componente canvas cuando el estado del padre cambia
> pero las props de FroggerGame no lo hacen. **Ampliado** para cubrir además la
> **velocidad de juego (timing)**: dejar el movimiento frame-rate-independent y
> calibrado a un ritmo jugable. El **Anexo** final generaliza el patrón de timing
> como referencia reutilizable para mejorar cualquier juego canvas del catálogo.

---

## Scope

**In:**

- `components/games/FroggerGame.tsx`
  - Mover `[8, 8]` y `[]` de `setLineDash` a constantes de módulo para eliminar
    allocaciones por frame.
  - Saltar `draw()` cuando `pausedRef.current === true`; dibujar un único frame
    al entrar en pausa para dejar el canvas congelado bajo el overlay React.
  - Limitar `submergeTimer` a `% (TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS)` para
    evitar crecimiento numérico ilimitado.
  - Precomputar el índice de cada lane en un `Map<Lane, number>` al construir las
    lanes, eliminando `lanes.indexOf(lane)` del hot loop de dibujo.
  - Exportar el componente con `React.memo` para que re-renders del padre no
    re-renderizen el componente canvas cuando sus props no han cambiado.

- `app/games/frogger/play/page.tsx`
  - Convertir `score`, `lives` y `level` de `useState` a `useRef<number>` + refs
    de DOM, actualizando el texto directamente (`scoreEl.current.textContent = ...`)
    desde los callbacks para eliminar re-renders React durante el juego.
  - Mantener como `useState`: `paused`, `over`, `name`, `saved`, `gameKey`,
    `skinKey` — solo cambian por acción del usuario, no a 60 fps.
  - Los callbacks `onScoreChange`, `onLivesChange`, `onLevelChange` pasan a escribir
    en refs en lugar de llamar a setters de estado.
  - El modal de game-over toma la puntuación final de `scoreRef.current` en lugar
    de estado React.
  - El HUD visible (puntuación, vidas, nivel, skin-selector) se mantiene en el DOM
    React; solo cambia el mecanismo de actualización (DOM directo vs. setState).

**Out:**

- Los demás juegos (Asteroids, Tetris, Arkanoid, Snake) — quedan para un spec separado.
- Offscreen canvas / dirty-rect rendering — complejidad no justificada hasta verificar
  que las fixes simples resuelven el problema.
- Cambios en el diseño visual del HUD React o del HUD interno del canvas.
- Profiling formal con DevTools — este spec parte de observación subjetiva.

---

## Modelo de datos

No se introducen estructuras nuevas. Los cambios son internos:

- `DASH_ROAD: number[]` — constante de módulo que reemplaza el literal `[8, 8]`.
- `DASH_CLEAR: number[]` — constante de módulo que reemplaza el literal `[]`.
- `laneIndexMap: Map<Lane, number>` — creado en `buildLanes`, devuelto junto con
  las lanes para que el loop de dibujo lo consulte en O(1).
- En la play-page: `scoreRef`, `livesRef`, `levelRef` son `useRef<number>` que
  almacenan los valores actuales del juego sin disparar re-renders.
- `scoreEl`, `livesEl`, `levelEl` son `useRef<HTMLElement>` que apuntan a los
  nodos DOM del HUD para actualización directa.

---

## Plan de implementación

Cada paso deja el sistema funcional.

1. **Constantes de módulo para `setLineDash`** (`FroggerGame.tsx`)
   Añadir en el nivel de módulo (fuera de todo componente):

   ```ts
   const DASH_ROAD: number[] = [8, 8];
   const DASH_CLEAR: number[] = [];
   ```

   Reemplazar las dos llamadas `ctx.setLineDash([8, 8])` y `ctx.setLineDash([])`
   dentro de `draw()` por `DASH_ROAD` y `DASH_CLEAR`.

2. **Saltar `draw()` cuando pausado** (`FroggerGame.tsx`)
   Añadir `let pauseDrawn = false` junto al resto del estado local del efecto.
   En el loop RAF:

   ```ts
   if (pausedRef.current) {
     if (!pauseDrawn) {
       draw();
       pauseDrawn = true;
     }
     rafId = requestAnimationFrame(loop);
     return;
   }
   pauseDrawn = false;
   update(dt);
   draw();
   ```

3. **Limitar `submergeTimer`** (`FroggerGame.tsx`)
   En la sección donde se actualiza `submergeTimer` dentro de `update()`:

   ```ts
   const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
   e.submergeTimer = ((e.submergeTimer ?? 0) + dt) % cycle;
   e.submerged = e.submergeTimer >= TURTLE_VISIBLE_MS;
   ```

   Eliminar la duplicación de `cycle` que ya existe en el mismo bloque.

4. **Precomputar índice de lane** (`FroggerGame.tsx`)
   Cambiar la firma de `buildLanes` para que devuelva también el mapa:

   ```ts
   function buildLanes(level: number): {
     lanes: Lane[];
     laneIndexMap: Map<Lane, number>;
   };
   ```

   Construir el `Map` al final de `buildLanes` antes del `return`.
   En el estado local del efecto, sustituir `let lanes = buildLanes(1)` por
   `let { lanes, laneIndexMap } = buildLanes(1)`.
   Actualizar `completeRound()` para desestructurar igual al llamar `buildLanes(level)`.
   En `draw()`, reemplazar `lanes.indexOf(lane)` por `laneIndexMap.get(lane) ?? 0`.

5. **`React.memo` en FroggerGame** (`FroggerGame.tsx`)
   Cambiar la exportación final:

   ```ts
   // antes
   export default function FroggerGame(...) { ... }
   // después
   function FroggerGame(...) { ... }
   export default React.memo(FroggerGame);
   ```

   Añadir `import React from 'react'` si no está ya importado explícitamente.

6. **Convertir score/lives/level a refs en la play-page** (`play/page.tsx`)
   - Eliminar `const [score, setScore] = useState(0)`,
     `const [level, setLevel] = useState(1)`,
     `const [lives, setLives] = useState(3)`.
   - Añadir:
     ```ts
     const scoreRef = useRef(0);
     const livesRef = useRef(3);
     const levelRef = useRef(1);
     const scoreEl = useRef<HTMLSpanElement>(null);
     const livesEl = useRef<HTMLSpanElement>(null);
     const levelEl = useRef<HTMLSpanElement>(null);
     ```
   - Actualizar `handleScoreChange`, `handleLivesChange`, `handleLevelChange`
     para escribir en el ref y en el DOM directamente:

     ```ts
     const handleScoreChange = useCallback((s: number) => {
       scoreRef.current = s;
       if (scoreEl.current)
         scoreEl.current.textContent = s.toLocaleString("es-ES");
     }, []);

     const handleLivesChange = useCallback((l: number) => {
       livesRef.current = l;
       if (livesEl.current) {
         livesEl.current.innerHTML = Array.from({ length: 3 })
           .map(
             (_, i) =>
               `<span style="color:${i < l ? "var(--green)" : "var(--ink-dim)"}">♥</span>`,
           )
           .join("");
       }
     }, []);

     const handleLevelChange = useCallback((l: number) => {
       levelRef.current = l;
       if (levelEl.current)
         levelEl.current.textContent = String(l).padStart(2, "0");
     }, []);
     ```

   - En `handleGameOver`, leer `scoreRef.current` para actualizar el modal:
     ```ts
     const handleGameOver = useCallback((finalScore: number) => {
       scoreRef.current = finalScore;
       if (scoreEl.current)
         scoreEl.current.textContent = finalScore.toLocaleString("es-ES");
       setOver(true);
     }, []);
     ```
   - Añadir `ref={scoreEl}`, `ref={livesEl}`, `ref={levelEl}` a los spans del HUD.
   - En el modal de game-over, reemplazar `{score.toLocaleString('es-ES')}` por
     `{scoreRef.current.toLocaleString('es-ES')}` (valor estático en el render
     del modal, correcto porque `over` se activa después de actualizar el ref).
   - En `restart()`, resetear los refs y el DOM:
     ```ts
     scoreRef.current = 0; livesRef.current = 3; levelRef.current = 1;
     if (scoreEl.current) scoreEl.current.textContent = '0';
     if (livesEl.current) livesEl.current.innerHTML = /* corazones iniciales */;
     if (levelEl.current) levelEl.current.textContent = '01';
     ```

---

## Criterios de aceptación

- [ ] La memoria del tab en Chrome DevTools no crece continuamente durante 2 minutos de juego con skin classic.
- [ ] No se observan frame drops en los primeros 60 segundos de juego.
- [ ] El canvas no se redibuja mientras el juego está en pausa (verificable añadiendo `console.count('draw')` temporalmente).
- [ ] El HUD React muestra la puntuación correcta cuando la rana avanza filas.
- [ ] El HUD React muestra las vidas correctas al morir.
- [ ] El modal de game-over muestra la puntuación final correcta.
- [ ] El skin-selector cambia el skin del canvas en tiempo real.
- [ ] El botón PAUSA / REANUDAR funciona igual que antes.
- [ ] JUGAR DE NUEVO reinicia score, vidas y nivel a 0 / 3 / 1 tanto en el canvas como en el HUD.
- [ ] React DevTools Profiler muestra 0 re-renders de `FroggerPlay` durante gameplay normal (solo rana moviéndose, sin morir ni subir nivel).

---

## Post-implementación: problema residual en skin Neon

### Diagnóstico (2026-05-25)

Tras implementar los 6 pasos del spec, los skins **Classic** y **Retro** fueron fluidos, pero el skin **Neon** seguía con jank. La causa raíz no era ninguno de los problemas del scope original — era el uso masivo de `ctx.shadowBlur` en el loop `draw()`:

| Bloque                      | Llamadas `shadowBlur > 0` por frame |
| --------------------------- | ----------------------------------- |
| Coches (fill + stroke neon) | ~2 × nº coches ≈ 12                 |
| Camiones (fill + stroke)    | ~2 × nº camiones ≈ 10               |
| Logs                        | ~1 × nº logs ≈ 9                    |
| Tortugas (por segmento)     | ~1 × nº segmentos ≈ 18              |
| Goals, rana, timer, vidas   | ~5–10 fijos                         |
| **Total**                   | **~60–70 por frame, sólo en neon**  |

`ctx.shadowBlur` hace que el navegador rasterice cada shape dos veces y aplique un desenfoque gaussiano — notoriamente caro en Canvas 2D. Los otros juegos del repo usan el mismo patrón pero con muchas menos shapes por frame.

### Solución aplicada: caché de sprites neon offscreen

Se pre-renderizó cada tipo de entidad neon **una sola vez** al montar (y al cambiar de skin) en pequeños `HTMLCanvasElement` con `shadowBlur` ya horneado. El loop `draw()` llama `ctx.drawImage(sprite, x, y)` — coste de composición, sin blur runtime.

**Sprites generados (~20 en total):**

- `spriteCarNeon(sk, width, color)` — por color × ancho (1 o 2 celdas)
- `spriteTruckNeon(sk, dir)` — dos variantes: cab derecha / cab izquierda
- `spriteLogNeon(sk, width)` — anchos 2, 3, 4
- `spriteTurtleSegNeon(sk, dir, submerged)` — 4 variantes (dir × submerged)

**Cambios en `FroggerGame.tsx`:**

- Funciones `spriteCarNeon`, `spriteTruckNeon`, `spriteLogNeon`, `spriteTurtleSegNeon`, `buildNeonCache` a nivel de módulo.
- `interface NeonCache` con los mapas de sprites.
- `const SPRITE_PAD = 20` — padding para que el blur no se recorte en los bordes.
- `neonCacheRef = useRef<NeonCache | null>(null)` en el componente.
- `useEffect([skinKey])` unificado: actualiza `skinRef.current` **y** reconstruye `neonCacheRef.current`.
- Loop de entidades en `draw()`: ramificación `if (isNeon && neonCache) { drawImage } else { código original }`.

**Resultado:** de ~65 invocaciones `shadowBlur` por frame a **≤5** (rana, patas durante salto, barra de tiempo, goals, vidas), manteniendo el look visual idéntico al diseño original neon.

**Commit:** `35b7672` — `perf(frogger): neon sprite cache eliminates per-frame shadowBlur on entities`

---

## Decisiones tomadas y descartadas

- **Offscreen canvas para el fondo estático**: descartado — complejidad no justificada hasta comprobar que las fixes simples resuelven el problema.
- **Parar el RAF completamente al pausar y reiniciarlo al reanudar**: descartado — añade complejidad de arranque diferido; saltar `draw()` con `pauseDrawn` es suficiente.
- **Mover score/vidas/nivel al canvas exclusivamente (eliminar HUD React)**: descartado — el usuario quiere mantener score, vidas, nivel y skin-selector en el HUD React.
- **React.memo con comparador personalizado**: descartado — el comparador shallow por defecto es suficiente porque los callbacks son estables (`useCallback` con `[]`).
- **Definición rápida sin clarificación detallada**: no aplicado — se realizaron 3 bloques de preguntas antes de escribir el spec.

---

## Riesgos identificados

- **Modal con score 0**: si `handleGameOver` no actualiza `scoreRef.current` antes de llamar `setOver(true)`, el modal renderiza `0`. Mitigación: el paso 6 actualiza el ref antes del setter, y el modal usa `scoreRef.current` (valor por referencia en el momento del render del modal, que ocurre después).
- **`React.memo` oculta bugs futuros**: si se añaden nuevas props a FroggerGame que deberían forzar re-renders pero son objetos creados inline, el memo los ignorará. Mitigación: los props actuales son `boolean`, `string` y funciones estables — bajo riesgo mientras no se añadan props de objeto.
- **innerHTML en livesEl**: usar `innerHTML` en un callback introduce riesgo de XSS si el contenido viniera de input externo. Aquí el contenido es 100% controlado (corazones hardcoded + número). Sin riesgo real.

---

## Anexo — Patrón de velocidad/timing jugable (reutilizable para otros juegos)

> **Añadido 2026-06-18.** Frogger estaba **injugable por ir demasiado rápido**. La
> causa NO era rendimiento de render (lo de arriba) sino un **bug de unidades en el
> movimiento**. Esta sección documenta el fix y lo generaliza como checklist para
> cualquier motor canvas del catálogo (Asteroids, Tetris, Snake, Arkanoid, etc.).

### 1. Síntoma y diagnóstico

- **Síntoma:** entidades que cruzan toda la pantalla en una fracción de segundo
  (parpadeo/blur), o al revés, un juego que se arrastra.
- **Diagnóstico rápido:** revisar las **unidades de `dt`** frente al **divisor** de la
  fórmula de movimiento. El antipatrón clásico es un **divisor mágico `/16`**
  (heredado de "asumir 16 ms por frame a 60 fps") combinado con un `dt` que en
  realidad ya viene en **milisegundos reales**.
- **Regla de bolsillo:** con `pos += speed * dir * dt / 16` y `dt` en ms reales, la
  velocidad efectiva es `speed × (1000/16) = speed × 62.5` unidades/segundo. En un
  tablero de 16 celdas, una `speed = 1.5` da ~94 celdas/s → el motor recorre la
  pantalla ~6 veces por segundo = injugable. Si ves un `/16` (o cualquier divisor
  que no sea el rango de `dt`), sospecha de esto **antes** que del frame rate.
- **Importante:** el bucle RAF de Frogger ya era frame-rate-independent (el
  movimiento total por segundo no dependía de los fps). El bug era de **magnitud**
  del divisor, no de alto refresco. No te dejes desviar por teorías de "monitor de
  120 Hz" sin medir primero.

### 2. Regla de oro: movimiento frame-rate-independent

Expresar las velocidades en **unidades por segundo** y escalar por `dt` real:

```ts
// dt = milisegundos transcurridos, capado para no saltar tras un stall/pausa
const dt = lastTime === 0 ? 16 : Math.min(time - lastTime, 100);
// speed en "celdas/segundo" (o px/seg). NUNCA un divisor mágico tipo /16.
pos += (speed * dir * dt) / 1000;
```

- `components/games/frogger-game.tsx:359` (entidades) y `:421` (deriva de la rana
  sobre tronco/tortuga) son las dos líneas corregidas (`/16` → `/1000`).
- **Patrón canónico de referencia:** `lib/games/asteroids/engine.ts` convierte `dt`
  a **segundos** (`(ts - lastTime) / 1000`, capado a `0.05`) y define las
  velocidades en **unidades/segundo** (`vx * dt`). Tetris usa un acumulador con
  `dropInterval` en ms. Cualquiera de los dos enfoques es válido; lo prohibido es
  mover una cantidad fija por frame o dividir por una constante que no sea el rango
  real de `dt`.

### 3. Dial maestro `SPEED_SCALE` para tuning

Un único número de módulo que escala TODO el juego, aplicado en el helper que
construye las velocidades. En Frogger vive en `buildLanes` vía `s()`:

```ts
// components/games/frogger-game.tsx (nivel de módulo)
const SPEED_SCALE = 0.6; // celdas/seg globales. Más bajo = más lento.

// dentro de buildLanes:
const mult = Math.min(Math.pow(1.15, level - 1), 4); // escalado por nivel, cap 4×
const s = (base: number) => base * mult * SPEED_SCALE;
```

- Permite recalibrar el ritmo entero cambiando **un solo valor**, sin tocar cada
  carril. Rango práctico observado: **0.4–0.8** (0.6 = ritmo jugado y validado).
- Recomendado replicar este patrón al añadir/afinar otros motores: una constante
  de escala global + velocidades base legibles en unidades/segundo.

### 4. Caveat de Fast Refresh (clave para validar)

Editar un motor canvas montado en `useEffect` **NO reinicia el bucle RAF** en el
navegador: el cierre (closure) del motor viejo sigue corriendo y Fast Refresh no lo
reemplaza. Esto provocó un falso "sigue muy rápido" aunque el fix ya era correcto.

Para validar cualquier cambio de timing/velocidad:

```bash
# matar dev servers en marcha, limpiar caché y arrancar limpio
rm -rf .next && npm run dev
```

Luego abrir el juego con **hard refresh** (Cmd/Ctrl+Shift+R). Si el cambio "no se
nota", sospecha del bundle obsoleto antes que del código.

### 5. Verificación empírica (medir, no asumir)

No basta con "se ve mejor". Medir la velocidad real leyendo píxeles del canvas con
Playwright: muestrear una **franja horizontal** (1 px de alto) de una fila de
entidades en `t0` y en `t0 + 1000 ms`, y hallar el desplazamiento por **correlación
cruzada** (mínima diferencia absoluta) → px/s → celdas/s.

```ts
// idea: getImageData(0, y, width, 1) en dos instantes; buscar el shift s en
// [-150,150] px que minimiza la suma de |a[x] - b[x+s]|. shift/CELL = celdas/seg.
```

**Baseline de "jugable" medido en Frogger** (nivel 1, `SPEED_SCALE = 0.6`):

| Carril             | Velocidad medida | Cruza el tablero (16 celdas) |
| ------------------ | ---------------- | ---------------------------- |
| Más rápido (row9)  | ~3.15 celdas/s   | ~5.1 s                       |
| Intermedio (row10) | ~2.55 celdas/s   | ~6.3 s                       |
| Más lento (row12)  | ~1.57 celdas/s   | ~10.2 s                      |

Como heurística general de jugabilidad arcade: una entidad rápida debería tardar
**~5 s** en cruzar el área de juego y una lenta **~10 s**, no fracciones de segundo.

### 6. Valores concretos de Frogger (reproducibilidad)

- Geometría: `COLS = 16`, `ROWS = 14`, `CELL = 40` (canvas 640×560).
- Velocidades **base** (ya en celdas/seg, antes de `mult` y `SPEED_SCALE`):
  carretera `2.5 / 3.5 / 4.0 / 5.0 / 3.0`; río `2.0 / 1.5 / 2.5 / 2.0 / 3.0 / 3.5`.
- Escalado por nivel: `mult = Math.min(Math.pow(1.15, level - 1), 4)`.
- Dial global: `SPEED_SCALE = 0.6`.
- Lógica temporal ya correcta y sin tocar: ciclo de tortugas (`% SUBMERGE_CYCLE`),
  animación de salto (`animT >= 120` ms) y `roundTimer` (resta `dt` en ms).
