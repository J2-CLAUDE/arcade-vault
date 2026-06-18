---
name: spec-impl-game
description: Implementa un spec de juego aprobado (mismo flujo que /spec-impl) y, al terminar y verificar los criterios, ejecuta en secuencia los agentes skin-designer y luego mobile-porter acotados a ese juego.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*), Task
---

# /spec-impl-game — Implementador de specs de juego (con acabado de skins + móvil)

Este skill es la variante de `/spec-impl` para **juegos**. Hace **exactamente lo mismo** que `/spec-impl` (valida que el estado signifique "Aprobado", crea la rama `spec-NN-slug`, e implementa paso a paso con pausas) y, **solo al terminar y verificar los criterios de aceptación**, ejecuta de forma **secuencial** dos agentes acotados al juego recién implementado: primero `skin-designer` y luego `mobile-porter`.

Por qué importa la secuencia: ambos agentes editan los mismos archivos (`app/globals.css`, `components/game-player.tsx`). Lanzarlos en paralelo provocaría conflictos de escritura. **Nunca los lances a la vez.**

## Session context

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

---

## Instrucciones

El argumento recibido es: `$ARGUMENTS`

Sigue las fases en orden estricto. **No avances a la siguiente fase si la anterior no se completó correctamente.**

---

### Fases 1–4 — Reutilizar el flujo de /spec-impl (fuente de verdad única)

**Lee `.claude/skills/spec-impl/SKILL.md` y ejecuta sus Fases 1, 2, 3 y 4 exactamente como están escritas**, con `$ARGUMENTS` como argumento. No reescribas ni reinterpretes esas reglas aquí — ese archivo es el contrato. En resumen, eso significa:

- **Fase 1 — Identificar el spec:** localizar el archivo en `specs/` a partir de `$ARGUMENTS` (nombre completo, solo número, o solo slug). Si está vacío o no se encuentra, mostrar los specs disponibles y pedir el nombre correcto. Parar y esperar.
- **Fase 2 — Validar el estado:** continuar **solo** si el estado del spec **significa "Aprobado"** en cualquier idioma (`Approved`/`Aprobado`/`Aprovado`/…). Cualquier otro estado (`Borrador`, `En revisión`, `Implementado`, `Obsoleto`, o no reconocido) → **parar** y mostrar el mismo mensaje de error estándar de `/spec-impl`. El bloqueo es intencional; no ofrecer alternativas.
- **Fase 3 — Crear la rama y cambiarse a ella:** derivar `spec-NN-slug` del nombre del archivo, crearla (`git checkout -b`) si no existe o avisar si ya existía, cambiarse a ella y confirmar. Luego mostrar el resumen del spec (objetivo, alcance, plan, criterios) sin empezar a implementar.
- **Fase 4 — Implementar paso a paso:** pedir confirmación, implementar un paso del plan a la vez, mostrar el diff y esperar confirmación antes de seguir. Regla por encima de todo: implementar lo que dice el spec; parar ante ambigüedades y presentar opciones; no implementar nada fuera del alcance.

**Diferencia respecto a `/spec-impl`:** donde `/spec-impl` termina recordándote verificar los criterios de aceptación y hacer el commit, este skill **continúa con la Fase 5** antes del commit/merge final.

---

### Fase 5 — Acabado del juego (skins + móvil)

Se ejecuta **después** de implementar todos los pasos del plan **y** de verificar los criterios de aceptación uno a uno, y **antes** del commit/merge final.

#### 5.1 — Determinar el `id`/slug del juego

Lee la sección **"Modelo de datos"** del spec: la fila de `games` a insertar contiene el campo `id` (el slug, p. ej. `tetris`, `serpentina`). Ese `id` define las rutas `/juego/<id>` y `/jugar/<id>`.

- Si **no** puedes extraer un `id` inequívoco, o el spec **no es un spec de juego** (no inserta fila en `games`, no añade motor/wrapper de juego), **para y pregunta** al usuario el slug del juego. Un spec que no añade un juego no tiene acabado de skins/móvil aplicable: en ese caso, advierte que esta fase no aplica y termina como lo haría `/spec-impl` (recordatorio de verificar criterios y commit).

#### 5.2 — Confirmar antes de lanzar

Muestra al usuario el `id` detectado y avisa de lo que vas a hacer:

```
✅ Implementación del spec completa y criterios verificados.

Juego detectado: <id>
Acabado pendiente: voy a ejecutar DOS agentes EN SECUENCIA (no en paralelo),
acotados al juego <id>:
  1. skin-designer  → 3 skins (clásico/neón/retro) seleccionables y correctos en dark mode
  2. mobile-porter  → responsive + controles táctiles de /jugar/<id>

¿Lanzo el acabado?
```

Espera confirmación explícita. No lances nada sin ella.

#### 5.3 — Lanzar `skin-designer` (y esperar a que termine)

Con la herramienta Agent (`subagent_type: skin-designer`), lanza un único agente con un prompt **acotado al juego**:

> Asegura que el juego `<id>` (recién implementado en este repo) tenga los 3 skins seleccionables por el jugador — clásico/default, neón y retro — definidos con paletas correctas y legibles en **modo oscuro**, integrados en su motor canvas, su wrapper React y el selector de skin del player. Acótate al juego `<id>`: no reaudites el resto del catálogo salvo lo imprescindible para no romper el baseline existente ni el modo de los demás juegos. Deja `npm run lint` y `npm run build` en verde.

**Espera a que `skin-designer` termine por completo** antes de continuar. No emitas la llamada al segundo agente en el mismo mensaje.

#### 5.4 — Lanzar `mobile-porter` (solo cuando el anterior haya terminado)

Una vez `skin-designer` ha devuelto su resultado, lanza con la herramienta Agent (`subagent_type: mobile-porter`) un único agente con un prompt **acotado al juego**:

> Audita e implementa el responsive y los controles táctiles del juego `<id>`: la ruta de juego `/jugar/<id>`, su tarjeta en la Biblioteca y su página de detalle `/juego/<id>`. Toma `specs/08-controles-tactiles-movil.md` como contrato de los controles táctiles. Documenta los hallazgos y arreglos en `references/mobile-audit.md`. No rompas el baseline de desktop ni el control por teclado. Acótate al juego `<id>`. Deja `npm run lint` y `npm run build` en verde.

#### 5.5 — Regla dura de secuencialidad

Los dos agentes corren **estrictamente en secuencia**. **Nunca** emitas las dos llamadas Agent en el mismo mensaje. Primero `skin-designer` completo → luego `mobile-porter`.

#### 5.6 — Cierre

Tras ambos agentes:

1. Ejecuta o confirma `npm run lint` y `npm run build` en verde.
2. Resume brevemente qué cambió cada agente (skins añadidos/ajustados; arreglos responsive/táctiles).
3. Cierra recordando al usuario:

```
✅ Spec implementado + acabado de juego completo (skins y móvil) para <id>.

Siguiente paso: revisa los diffs de ambos agentes, vuelve a confirmar los criterios
de aceptación si algo cambió, actualiza el estado del spec a "Implementado" (o el
equivalente en tu idioma) y haz el commit final antes de mergear esta rama.
```

---

## Resumen del comportamiento esperado

```
/spec-impl-game 09-motor-serpentina   (estado: Aprobado)

  Fases 1–4  →  (heredadas de /spec-impl) localiza el spec, valida "Aprobado",
                crea la rama spec-09-motor-serpentina, implementa paso a paso.
  Fase 5     →  verifica criterios → detecta id "serpentina" en Modelo de datos
                → pide confirmación
                → lanza skin-designer (espera) → luego mobile-porter
                → lint/build en verde → recuerda actualizar estado y commitear.

/spec-impl-game 07-motor-tetris   (estado: Implementado)

  Fases 1–2  →  localiza el spec, lee el estado "Implementado" → ❌ para.
                Muestra el mensaje de error estándar. No crea rama ni toca código.
```
