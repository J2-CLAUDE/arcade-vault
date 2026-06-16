# Bitácora de sugerencias de juegos 🕹️ — game-planner

Memoria persistente del agente `game-planner`. Registra los juegos propuestos
para el catálogo de Arcade Vault, con su razonamiento y estado.

**Estado:** ⏳ sugerido · ✅ aprobado · ❌ descartado
**Color:** 🔵 cyan · 🟣 magenta · 🟡 yellow · 🟢 green

> **Mantenimiento** — al añadir un candidato, el agente: (1) añade una fila al
> _Resumen_ **y** una ficha al final del archivo. Al cambiar de estado, actualiza
> el badge de la ficha **y** la celda del _Resumen_. Nunca borra entradas previas.

Plantilla de ficha (copiar al final del archivo):

```markdown
### 🕹️ <TÍTULO>

`<slug-kebab-case>` · <categoría> · <emoji> <color> · ⏳ sugerido

> <gancho de una línea>

- 🎯 **Por qué encaja**: <hueco que llena / diversidad>
- ⚙️ **Motor**: mock | canvas real (complejidad: baja/media/alta) — <detalle>
- 📅 **Fecha**: <YYYY-MM-DD>
- 📝 **Notas**: <reconsideraciones posteriores, si las hay>
```

## Resumen

| Juego                               | Categoría | Color      | Motor       | Estado      |
| ----------------------------------- | --------- | ---------- | ----------- | ----------- |
| [REVERSI NEÓN](#-reversi-neón)      | VERSUS    | 🟣 magenta | canvas real | ⏳ sugerido |
| [CONECTA NÚCLEOS](#-conecta-núcleos) | PUZZLE    | 🟣 magenta | mock        | ⏳ sugerido |

---

### 🕹️ REVERSI NEÓN

`reversi-neon` · VERSUS · 🟣 magenta · ⏳ sugerido

> Voltea el tablero a tu color antes de quedarte sin fichas.

- 🎯 **Por qué encaja**: VERSUS solo tiene 1 juego (duelo-pixel) y magenta es el color menos usado (solo tetris) — cubre ambos desequilibrios. Aporta una mecánica ausente: estrategia por turnos (hoy VERSUS es solo reflejos de pong).
- ⚙️ **Motor**: canvas real (complejidad: media) — tablero 8x8 por turnos, IA greedy/minimax superficial + modo local 2P; sin física ni loop a 60fps. Sería el 3.er motor real y el 1.º por turnos.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: recomendado como prioridad nº1 frente a conecta-nucleos.

### 🕹️ CONECTA NÚCLEOS

`conecta-nucleos` · PUZZLE · 🟣 magenta · ⏳ sugerido

> Une núcleos del mismo color y haz estallar cadenas de neón.

- 🎯 **Por qué encaja**: PUZZLE solo tiene tetris. Match/connect con cascadas, distinto de la caída de piezas, diversifica el género sin clonarlo. magenta equilibra la paleta.
- ⚙️ **Motor**: mock viable de lanzamiento; idealmente canvas real (complejidad: media) para las cascadas.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: segunda prioridad — PUZZLE ya está cubierto con motor real por Tetris.
