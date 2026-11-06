# AeroGame

Un departamento virtual en 3D con estética **Y2K cyber-futurista / Frutiger Aero**:
techo de cielo con nubes, paredes con molduras cromadas y neón cian, suelo azul brillante con
reflejos reales, camino de césped, escritorio de cristal, silla huevo, monitor translúcido,
pecera con peces, lámparas de globo, paneles de iconos de cristal y pompas de jabón iridiscentes.

Sobre el escritorio está **tu smartphone**. Tócalo y la cámara se acerca para abrir **AeroOS**,
una interfaz de cristal líquido con tres minijuegos ASMR:

| Juego            | Cómo se juega                                                              |
|------------------|----------------------------------------------------------------------------|
| **Aqua Invaders**| Arrastra para mover tu deslizador; mientras tocas, dispara burbujas. Revienta pompas y rompe esferas de cristal. Combos hasta ×8. |
| **Aero Glide**   | Mantén pulsado para subir y suelta para planear entre columnas de cristal. Cruza los anillos por el centro para un "perfecto". |
| **Burbujas Zen** | Plástico de burbujas a contrarreloj (45 s). Toca o arrastra el dedo; las burbujas verdes valen 5 y cada hoja completa suma tiempo. |

Todo el sonido se sintetiza en tiempo real (Web Audio): pops de burbuja, cristal que se rompe,
gotas, tonos del teléfono, viento, el filtro de la pecera y campanillas.

## Ejecutar

```bash
cd Aero-Game
python3 -m http.server 8000
```

Abre <http://localhost:8000>. No hace falta instalar nada: Three.js viene incluido en `vendor/`.
(Alternativa con Node: `npx serve .`)

## Controles

- **Departamento:** arrastra para mirar alrededor. Toca el teléfono (o pulsa `T` / `Enter`) para jugar.
  También puedes tocar la pecera y las lámparas.
- **Teléfono:** toca las apps. La barra inferior vuelve al inicio; `Esc` pausa o vuelve.
- **Juegos con teclado:** Aqua Invaders `← →` + `Espacio`; Aero Glide `Espacio`; Burbujas Zen `Espacio`.

En **Ajustes** puedes desactivar el sonido o la vibración, o bajar los gráficos (sin reflejos ni sombras)
para equipos más modestos. Récords y ajustes se guardan en el navegador.

## Estructura

```
index.html            Capas: departamento 3D, entrada, AeroOS
styles.css            Cristal líquido, AeroOS y transiciones
src/main.js           Arranque y bucle principal
src/room.js           Escena 3D del departamento (Three.js: PBR, transmisión, reflejos, bloom)
src/phone.js          AeroOS: inicio, apps, récords y ajustes
src/audio.js          Motor de audio ASMR sintetizado
src/util.js           Utilidades, preferencias, récords y pintura procedural
src/games/            Minijuegos (aqua.js, glide.js, wrap.js) y sprites compartidos
vendor/three/         Three.js r160 (licencia MIT)
```
