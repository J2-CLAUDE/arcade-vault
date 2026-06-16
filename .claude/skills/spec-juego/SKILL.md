---
name: spec-juego
description: Diseña el spec para añadir un juego jugable con leaderboard a Arcade Vault, portando uno de references/started-games/ o creando uno nuevo. Hace preguntas antes de proponer estructura y construye el spec sección por sección. Genera el spec; NO implementa.
disable-model-invocation: true
argument-hint: "carpeta de references/started-games/ o descripción del juego nuevo"
---

# /spec-juego — Diseñador de specs de juego

Este skill produce el spec para **añadir un juego jugable con su leaderboard a Arcade Vault**, siguiendo el método dirigido por specs. **Aquí no escribes código.** Tu trabajo es clarificar qué juego se va a construir, hacer preguntas cuando algo no esté bien definido, y desarrollar el spec sección por sección hasta dejarlo listo para guardar en `specs/`.

Es una variante de `/spec` especializada en juegos. Toda la infraestructura pesada ya existe en el proyecto: el patrón de **motor de juego** (Spec 05) y la **persistencia Supabase + las 4 pantallas** (Spec 06). Añadir un juego es por tanto un patrón repetible. Tu spec describe ese patrón aplicado a un juego concreto.

## Filosofía

Un spec no es documentación decorativa. Es el contrato que dirige la ejecución posterior con `/spec-impl`. Si el spec es vago, el código improvisa. Por eso este flujo es **deliberadamente lento en la fase de definición** y **rápido en la fase de escritura**.

Lee estos archivos en cada paso y apóyate en ellos:

- `recipe.md` (mismo directorio que este skill): la **receta canónica** de integración de un juego — qué archivos aparecen/cambian, qué APIs reales se reusan, qué pasos de Supabase. Es la fuente de las secciones "Modelo de datos" y "Plan de implementación".
- `../spec/template.md`: la estructura general que sigue todo spec del repo.
- `specs/05-motor-asteroids.md` y `specs/06-juegos-y-leaderboard-supabase.md`: los patrones **canónicos** de los que depende todo juego nuevo. Tu spec depende de ambos.

## Flujo del comando

- Sigue las cuatro fases en orden. **No te saltes fases.** Si el usuario quiere ir más rápido, recuérdale que el coste de un spec malo se paga después en código.
- Tus respuestas deben ir en el mismo idioma que el prompt inicial.

### Fase 1 — Entender el contexto y detectar la entrada

Antes de preguntar por el juego, asegura contexto de proyecto:

1. Lee `CLAUDE.md` y `AGENTS.md` (regla crítica de la versión de Next.js).
2. Lista `specs/` para ver la numeración existente y cuál será el siguiente número.
3. Lee `specs/05-motor-asteroids.md` y `specs/06-juegos-y-leaderboard-supabase.md` para fijar los patrones.
4. Lee `recipe.md` de este skill.

Luego **detecta el modo de entrada** a partir de `$ARGUMENTS`:

- **Modo PORTAR** — si el argumento apunta a (o coincide con) una carpeta de `references/started-games/` (p. ej. `03-tetris`, `04-arkanoid`, `02-asteroids`). Lista la carpeta y lee su `game.js` y `README.md` para extraer: entidades/clases, forma del loop (`update`/`draw`), controles, scoring, vidas, niveles, power-ups, resolución. Eso alimenta tus preguntas.
- **Modo NUEVO** — si el argumento es una descripción libre de un juego que no existe en `references/`. El motor se diseña desde cero.
- **Vacío** — si `$ARGUMENTS` viene vacío, pregunta en una frase: "¿Portamos un started-game (¿cuál?) o creas uno nuevo (descríbelo en una frase)?". Si la descripción no cabe en una frase, es la primera señal de que el juego es demasiado grande — sugiere acotarlo.

### Fase 2 — Clarificar con preguntas

Es la fase más importante. Tu trabajo es **detectar ambigüedades y preguntar**, no asumir. Pregunta en bloques de 3 a 5 a la vez (no una pregunta suelta tras otra). Tras cada bloque, espera respuesta.

**Categorías que siempre debes considerar (específicas de juego):**

- **Identidad de catálogo:** `id`/slug (define las rutas `/juego/<id>` y `/jugar/<id>`), `title`, categoría `cat` (∈ ARCADE/PUZZLE/SHOOTER/VERSUS), `color` (∈ cyan/magenta/yellow/green), aspecto de la portada `.cover-<id>`, textos `short` (1 línea) y `long`.
- **Motor:** resolución lógica fija (p. ej. 800×600 escalada por CSS), controles de teclado (con `preventDefault` en flechas/espacio para no scrollear), scoring, vidas, niveles, power-ups, partículas, qué se dibuja en el HUD del canvas. En **modo PORTAR**, confirma explícitamente qué del `game.js` se conserva y qué se descarta (globales de módulo y `document.getElementById` **siempre** se eliminan: se encapsula en la factoría).
- **Leaderboard / Supabase:** ¿se siembran scores mock al insertar el juego (estilo Spec 06, leaderboard poblado desde el inicio) o empieza vacío? Confirma que `saveScore`/`incrementPlay` y la capa `lib/games-data.ts`/`lib/games-client.ts` **ya existen** y no se reimplementan.
- **Fuera de alcance:** por defecto fuera (como Spec 05) — controles táctiles, sonido, canvas responsive con física dinámica, tests automáticos. Confirma.
- **Decisiones cerradas:** ¿hay algo que el usuario ya decidió y no quiere reabrir?

**Cómo formular las preguntas:**

- Concretas, no abiertas. ❌ "¿Cómo imaginas los controles?" → ✅ "¿Controles solo teclado (flechas + espacio) o también ratón?".
- Cuando ofrezcas opciones, da 2–4, marca tu recomendación y por qué.
- Si una respuesta abre la caja de Pandora (p. ej. "y multijugador"), señala que merece su propio spec y pregunta si lo dejamos fuera de alcance.

**Cuándo parar de preguntar:** cuando puedas responder sin asumir nada:

1. ¿Qué archivos aparecen o cambian?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo verifico que el juego está terminado?

Si aún no puedes con alguna, sigue preguntando.

### Fase 3 — Desarrollar el spec sección por sección

Con claridad, **no generes el spec entero de una**. Desarrolla las secciones del `template.md` **una por una**, mostrando cada una y esperando confirmación antes de la siguiente. Pre-rellena desde `recipe.md` — no inventes nombres de archivo ni APIs.

Orden estricto:

1. **Header.** Estado `Borrador`, **Depende de: Spec 05 + Spec 06**, fecha, y objetivo en una frase. Si el objetivo no cabe en una frase, vuelve a la Fase 2.
2. **Alcance.** Dentro y fuera, ambos explícitos. El "fuera" captura lo diferido (táctil, sonido, otros juegos).
3. **Modelo de datos.** La fila de `games` a insertar (con `position` siguiente y `plays` como entero) + scores semilla si aplica; y el estado interno del motor tipado (`EngineHandle`, `EngineCallbacks`, entidades). **Di explícitamente que NO se crean tablas nuevas** — se reusa el esquema del Spec 06.
4. **Plan de implementación.** Pasos numerados de `recipe.md`, cada uno dejando la app ejecutable (`npm run dev`/`build`). Incluye la nota de `AGENTS.md` sobre consultar los docs de Next 16 antes de tocar rutas/`"use client"`.
5. **Criterios de aceptación.** Checklist booleana, derivada de Spec 05/06: canvas jugable (no ticker mock), HUD dentro del canvas, flechas/espacio no scrollean, modal de fin con score real, fila insertada en `scores`, `increment_play` incrementa `plays`, sin listeners/`rAF` colgando al desmontar, otros juegos intactos, `npm run build`/`lint` limpios, `get_advisors` sin hallazgos críticos.
6. **Decisiones tomadas y descartadas.** Con justificación breve.
7. **Riesgos** (si aplican): globales del original al portar, loops/listeners duplicados (React 19 StrictMode), escalado borroso del canvas, `INSERT` anónimo en `scores`.

**Tras cada sección:** muéstrala en markdown, pregunta "¿Esta sección queda así o la ajustamos?", aplica cambios si los pide, y solo avanza cuando confirme.

**Errores comunes a evitar:**

- Criterios de aceptación no verificables ("que funcione bien").
- Meter en el plan cosas que no están en el alcance.
- Asumir nombres de archivo o estructuras no confirmados.
- Saltarse la sección de decisiones — es la de más valor a largo plazo.

### Fase 4 — Guardar el spec

Cuando todas las secciones estén confirmadas:

1. Determina el siguiente número secuencial mirando `specs/`.
2. Genera un slug corto desde el objetivo (p. ej. `motor-tetris`).
3. Pregunta al usuario si el nombre de archivo propuesto le sirve antes de escribirlo.
4. Crea `specs/NN-slug.md` con todas las secciones aprobadas.
5. Marca el estado como `Borrador` por defecto. **No lo marques como `Aprobado` automáticamente** — eso lo hace el usuario tras releerlo.
6. Confirma al usuario:
   - Ruta del archivo creado.
   - Recordatorio: el spec está en `Borrador`; cámbialo a `Aprobado` cuando lo releas.
   - Siguiente paso: `/spec-impl NN-slug` para implementarlo.
   - **Para aquí.** No propongas implementar, ni escribir código, ni nada más allá de esta confirmación.

## Reglas duras

- **Nunca escribas código durante este comando.** Solo el `.md` del spec al final.
- **Nunca propongas implementar el spec tras guardarlo.** Tu trabajo termina al escribir el archivo. El usuario corre `/spec-impl` cuando esté listo.
- **Nunca asumas decisiones que el usuario no confirmó.** Si falta información, pregunta.
- **Nunca generes el spec entero de una.** Sección por sección, con confirmación.
- **Todo juego nuevo depende de Spec 05 + Spec 06** y **no crea tablas nuevas.** Si el juego pidiera algo que requiere esquema nuevo (otra tabla, otra columna), señálalo como spec aparte.
- **Si el usuario quiere saltarse la Fase 2**, recuérdale: "Las preguntas ahora ahorran horas después. ¿Seguro?". Si insiste, respétalo pero anótalo en la sección de decisiones.
- **Si el juego es demasiado grande** (no cabe en una frase, toca más de tres áreas, necesita decisiones en cuatro o más dominios), propón dividirlo antes de seguir.

## Tono al preguntar

Directo y específico. No te disculpes por preguntar. Nada de "si no te importa..." ni "¿podrías quizá...?". El usuario invocó este skill precisamente para que preguntes. Preguntas concretas, una por línea cuando hay varias, numeradas para que sean fáciles de responder.

## Argumentos

Si el usuario invocó `/spec-juego 03-tetris`, trátalo como **modo PORTAR** sobre `references/started-games/03-tetris/` y usa `tetris` como sugerencia inicial de slug (confírmalo antes de escribir).

Si invocó `/spec-juego un juego de snake`, trátalo como **modo NUEVO**.

Si invocó `/spec-juego` sin argumentos, empieza preguntando si portamos un started-game o creamos uno nuevo.
