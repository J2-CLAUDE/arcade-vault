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
| [TREPADOR](#-trepador)              | ARCADE    | 🟣 magenta | canvas real | ⏳ sugerido |
| [EXCAVADOR](#-excavador)            | ARCADE    | 🔵 cyan    | canvas real | ⏳ sugerido |
| [CAÍDA NEÓN](#-caída-neón)          | ARCADE    | 🟡 yellow  | canvas real | ⏳ sugerido |
| [ASCENSOR FATAL](#-ascensor-fatal)  | ARCADE    | 🔵 cyan    | canvas real | ⏳ sugerido |
| [AVE BUSTER](#-ave-buster)          | ARCADE    | 🟡 yellow  | canvas real | ⏳ sugerido |
| [BURBUJA PIXEL](#-burbuja-pixel)    | ARCADE    | 🟢 green   | canvas real | ⏳ sugerido |
| [TUBERÍAS](#-tuberías)              | PUZZLE    | 🟡 yellow  | canvas real | ⏳ sugerido |
| [ZAPADOR](#-zapador)                | PUZZLE    | 🔵 cyan    | canvas real | ⏳ sugerido |
| [INVERSIÓN](#-inversión)            | PUZZLE    | 🟢 green   | canvas real | ⏳ sugerido |
| [COLUMNAS](#-columnas)              | PUZZLE    | 🟢 green   | canvas real | ⏳ sugerido |
| [CENTÍPEDO](#-centípedo)            | SHOOTER   | 🟣 magenta | canvas real | ⏳ sugerido |
| [GALAXIA HOSTIL](#-galaxia-hostil)  | SHOOTER   | 🟢 green   | canvas real | ⏳ sugerido |
| [DEFENSOR ORBITAL](#-defensor-orbital) | SHOOTER | 🔵 cyan   | canvas real | ⏳ sugerido |
| [CAÑÓN MISIL](#-cañón-misil)        | SHOOTER   | 🔵 cyan    | canvas real | ⏳ sugerido |
| [GOLPE FATAL](#-golpe-fatal)        | VERSUS    | 🟣 magenta | canvas real | ⏳ sugerido |
| [SUMO BIT](#-sumo-bit)              | VERSUS    | 🟡 yellow  | canvas real | ⏳ sugerido |
| [CABEZAZO ARCADE](#-cabezazo-arcade) | VERSUS   | 🔵 cyan    | canvas real | ⏳ sugerido |
| [ESPADAS DE PLASMA](#-espadas-de-plasma) | VERSUS | 🟣 magenta | canvas real | ⏳ sugerido |
| [VÉRTICE RACER](#-vértice-racer)    | VERSUS    | 🟡 yellow  | canvas real | ⏳ sugerido |
| [PUÑO NEÓN](#-puño-neón)            | VERSUS    | 🔵 cyan    | canvas real | ⏳ sugerido |

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

---

> **Tanda 80s (20 clásicos)** — propuesta consolidada el 2026-06-16 por 5 agentes
> `game-planner` en paralelo (ARCADE, PUZZLE, SHOOTER, VERSUS, laberinto/plataformas)
> + una ronda de relleno. Colores repartidos en la consolidación para no apilar
> magenta (varios agentes lo pedían a la vez). Balance resultante de la tanda:
> cyan 7 · yellow 5 · magenta 4 · green 4. Nota: ARCADE quedaría sobre-representada
> si se aprueban todos — priorizar los VERSUS/PUZZLE para equilibrar categoría.

### 🕹️ TREPADOR

`trepador` · ARCADE · 🟣 magenta · ⏳ sugerido

> Escala andamios y esquiva barriles hasta lo más alto.

- 🎯 **Por qué encaja**: ref. *Donkey Kong* (1981). Introduce **plataformas con salto y gravedad**, mecánica inexistente en todo el catálogo. Refuerza magenta (el color más escaso del catálogo real).
- ⚙️ **Motor**: canvas real (complejidad: alta) — gravedad, salto, escaleras, colisión por nivel y barriles rodando.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: máxima prioridad de la tanda ARCADE — abre el género plataformas.

### 🕹️ EXCAVADOR

`excavador` · ARCADE · 🔵 cyan · ⏳ sugerido

> Excava túneles e infla a los bichos hasta reventarlos.

- 🎯 **Por qué encaja**: ref. *Dig Dug* (1982). Aporta **terreno destructible y caza en túnel**, distinto del laberinto fijo de Glotón. Cyan equilibra frente al exceso de green.
- ⚙️ **Motor**: canvas real (complejidad: media) — túneles excavables en grilla, IA de persecución, rocas que caen.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: —

### 🕹️ CAÍDA NEÓN

`caida-neon` · ARCADE · 🟡 yellow · ⏳ sugerido

> Salta de cubo en cubo y enciéndelos todos antes de que te atrapen.

- 🎯 **Por qué encaja**: ref. *Q*bert* (1982). Introduce **perspectiva isométrica y salto diagonal por casillas**, geometría inédita (todo lo demás es ortogonal/plano). Muy fotogénico en neón.
- ⚙️ **Motor**: canvas real (complejidad: media) — pirámide isométrica, saltos por casillas, estado de color por cubo, enemigos que rebotan.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: color reasignado a yellow en consolidación (un agente lo pidió magenta) para repartir paleta.

### 🕹️ ASCENSOR FATAL

`ascensor-fatal` · ARCADE · 🔵 cyan · ⏳ sugerido

> Baja por el rascacielos espía recogiendo documentos secretos.

- 🎯 **Por qué encaja**: ref. *Elevator Action* (1983). Acción-plataformas de descenso que mezcla **movimiento vertical + disparo táctico**, distinto de los shooters de oleadas.
- ⚙️ **Motor**: canvas real (complejidad: alta) — pisos, ascensores móviles, enemigos, plataformas y disparo.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: —

### 🕹️ AVE BUSTER

`ave-buster` · ARCADE · 🟡 yellow · ⏳ sugerido

> Cabalga tu ave de luz y embiste por encima del enemigo.

- 🎯 **Por qué encaja**: ref. *Joust* (1982). Mecánica de **vuelo con inercia/aleteo y duelos de altura**, física flotante distinta de todo el catálogo. Yellow equilibra mejor que más green/magenta.
- ⚙️ **Motor**: canvas real (complejidad: media) — física de aleteo/gravedad y colisión por altura relativa; comparte patrón con Asteroids.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: recomendado como mejor relación diversificación/coste de la ronda de relleno.

### 🕹️ BURBUJA PIXEL

`burbuja-pixel` · ARCADE · 🟢 green · ⏳ sugerido

> Atrapa enemigos en burbujas y revienta el nivel entero.

- 🎯 **Por qué encaja**: ref. *Bubble Bobble* (1986). **Plataformas de pantalla fija con captura de enemigos**, mecánica única e ideal para 1P/2P cooperativo.
- ⚙️ **Motor**: canvas real (complejidad: media) — plataformas, gravedad, burbujas que flotan; mock aceptable de arranque.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: color reasignado a green en consolidación (un agente lo pidió cyan) para no saturar cyan.

### 🕹️ TUBERÍAS

`tuberias` · PUZZLE · 🟡 yellow · ⏳ sugerido

> Conecta las tuberías antes de que el plasma se derrame.

- 🎯 **Por qué encaja**: ref. *Pipe Mania* (1989). Mecánica de **construcción/ruta bajo presión**, ausente; diversifica PUZZLE más allá de caída de piezas y match.
- ⚙️ **Motor**: canvas real (complejidad: media) — grilla de piezas, flujo con temporizador y pathfinding.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: top de la tanda PUZZLE por mecánica más distinta.

### 🕹️ ZAPADOR

`zapador` · PUZZLE · 🔵 cyan · ⏳ sugerido

> Despeja la rejilla sin detonar un solo núcleo.

- 🎯 **Por qué encaja**: ref. *Minesweeper* (concepto ~1989–90). **Puzzle de deducción lógica pura** (sin tiempo real), género de razonamiento inexistente en el catálogo.
- ⚙️ **Motor**: canvas real (complejidad: baja) — revelado de celdas, conteo de vecinos y banderas; sin loop de animación.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: máximo retorno por mínimo coste de motor.

### 🕹️ INVERSIÓN

`inversion` · PUZZLE · 🟢 green · ⏳ sugerido

> Empuja cada bloque de datos a su zócalo de luz.

- 🎯 **Por qué encaja**: ref. *Sokoban* (1982). **Puzzle de empuje/lógica espacial por niveles** diseñados (no infinito), mecánica única.
- ⚙️ **Motor**: canvas real (complejidad: baja-media) — empuje de cajas en grilla, detección de bloqueos, niveles predefinidos.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: color reasignado a green en consolidación (un agente lo pidió magenta) para frenar la sobrecarga de magenta.

### 🕹️ COLUMNAS

`columnas` · PUZZLE · 🟢 green · ⏳ sugerido

> Alinea tres gemas de neón y desata la cascada.

- 🎯 **Por qué encaja**: ref. *Columns* (1989). **Falling-block por color** (vs. por forma en Tetris), con eliminación en 8 direcciones y cascadas.
- ⚙️ **Motor**: canvas real (complejidad: media) — columnas de 3 gemas, rotación del orden interno, alineaciones y cascadas.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: el más cercano a Tetris; última prioridad PUZZLE.

### 🕹️ CENTÍPEDO

`centipedo` · SHOOTER · 🟣 magenta · ⏳ sugerido

> Fragmenta al ciempiés antes de que llegue abajo.

- 🎯 **Por qué encaja**: ref. *Centipede* (1981). Shooter de **objetivo segmentado que se divide al disparar** + campo de hongos; mecánica distinta a Invasores/Asteroids. Refuerza magenta.
- ⚙️ **Motor**: canvas real (complejidad: media) — ciempiés segmentado, división dinámica, campo de hongos, cañón restringido a la franja inferior.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: mejor relación impacto/coste de la tanda SHOOTER.

### 🕹️ GALAXIA HOSTIL

`galaxia-hostil` · SHOOTER · 🟢 green · ⏳ sugerido

> Sobrevive a los enjambres que caen en picado.

- 🎯 **Por qué encaja**: ref. *Galaga / Galaxian* (1979/1981). Shooter de **patrones de vuelo y oleadas dinámicas** (picados, rapto de nave), frente al Invasores estático.
- ⚙️ **Motor**: canvas real (complejidad: media-alta) — spawns, trayectorias curvas (bezier), estados de oleada.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: color reasignado a green en consolidación (un agente lo pidió magenta) para repartir paleta.

### 🕹️ DEFENSOR ORBITAL

`defensor-orbital` · SHOOTER · 🔵 cyan · ⏳ sugerido

> Defiende la superficie y rescata a los humanoides.

- 🎯 **Por qué encaja**: ref. *Defender* (1981). Único shooter de **scroll horizontal con vuelo libre, radar y rescate**; rompe el molde de "disparar hacia arriba".
- ⚙️ **Motor**: canvas real (complejidad: alta) — scroll lateral, minimapa/radar, vuelo bidireccional, rescate. El más ambicioso.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: dejar para una 2.ª ola por coste de motor.

### 🕹️ CAÑÓN MISIL

`canon-misil` · SHOOTER · 🔵 cyan · ⏳ sugerido

> Intercepta la lluvia de misiles antes de que arrasen las ciudades.

- 🎯 **Por qué encaja**: ref. *Missile Command* (1980). Único shooter **defensivo de puntería/interceptación**; diversifica el input (apuntado con mira).
- ⚙️ **Motor**: canvas real (complejidad: media) — mira/cursor, interceptores que explotan en radio, defensa de objetivos.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: muy synthwave ("guerra fría retro").

### 🕹️ GOLPE FATAL

`golpe-fatal` · VERSUS · 🟣 magenta · ⏳ sugerido

> Dos karatecas, un dojo de neón: golpea primero o cae.

- 🎯 **Por qué encaja**: ref. *Karate Champ* (1984). Introduce el género **lucha/fighting 1v1**, ausente; diversifica VERSUS más allá del Pong de reflejos. Refuerza magenta.
- ⚙️ **Motor**: canvas real (complejidad: alta) — máquina de estados de combate, hitboxes, barras de vida, IA por dificultad.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: prioridad nº1 VERSUS — abre el género lucha.

### 🕹️ SUMO BIT

`sumo-bit` · VERSUS · 🟡 yellow · ⏳ sugerido

> Empuja al rival fuera del dohyō a base de pulsos.

- 🎯 **Por qué encaja**: VERSUS de **deporte/empuje físico**, mecánica de fuerza/timing distinta del Pong y del fighting. Yellow equilibra sin tocar green.
- ⚙️ **Motor**: canvas real (complejidad: media) — física de empuje simple, barra de momentum, mash de botones.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: opción VERSUS de bajo coste relativo.

### 🕹️ CABEZAZO ARCADE

`cabezazo-arcade` · VERSUS · 🔵 cyan · ⏳ sugerido

> Un balón, dos porterías, reflejos de campeonato.

- 🎯 **Por qué encaja**: ref. fútbol arcade de los 80 (*Tehkan World Cup*). VERSUS **deportivo de marcador** con goles, formato inexistente en el catálogo.
- ⚙️ **Motor**: canvas real (complejidad: media) — física de pelota con rebote, 2 jugadores/CPU, detección de gol.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: esfuerzo similar a Duelo Pixel con bola libre 2D.

### 🕹️ ESPADAS DE PLASMA

`espadas-de-plasma` · VERSUS · 🟣 magenta · ⏳ sugerido

> Estocada o muerte: gana el primer toque de plasma.

- 🎯 **Por qué encaja**: ref. *Yie Ar Kung-Fu* / esgrima arcade. VERSUS de **duelo de armas con alcance y parada**, mecánica de distancia/timing inexistente.
- ⚙️ **Motor**: canvas real (complejidad: alta) — alcance de arma, timing de estocada/parada, rondas al mejor de N; comparte arquitectura con Golpe Fatal.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: dejar para 2.ª ola; reaprovecha el motor de fighter de Golpe Fatal.

### 🕹️ VÉRTICE RACER

`vertice-racer` · VERSUS · 🟡 yellow · ⏳ sugerido

> Domina la pista pseudo-3D y bate al fantasma de la CPU.

- 🎯 **Por qué encaja**: ref. *Pole Position / Out Run*. Introduce **carreras**, género ausente; "ganar contra rival/tiempo" encaja en VERSUS. Estética la más sinérgica con synthwave (horizonte neón).
- ⚙️ **Motor**: canvas real (complejidad: alta) — render de carretera pseudo-3D con curvas y escalado de sprites a 60fps.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: color reasignado a yellow (atardecer Out Run) en consolidación para repartir magenta.

### 🕹️ PUÑO NEÓN

`puno-neon` · VERSUS · 🔵 cyan · ⏳ sugerido

> Avanza a puñetazos por callejones de neón hasta el jefe final.

- 🎯 **Por qué encaja**: ref. *Double Dragon*. Primer **beat 'em up** (combate cuerpo a cuerpo con scroll lateral), mecánica nueva; refuerza VERSUS.
- ⚙️ **Motor**: canvas real (complejidad: alta) — hitboxes, IA de enemigos, combos; mock viable de lanzamiento.
- 📅 **Fecha**: 2026-06-16
- 📝 **Notas**: el más exigente en IA/combate; lanzable como mock primero.
