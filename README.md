# AeroGame

Arcade ASMR con estética **Y2K cyber-futurista / Frutiger Aero**: cristal líquido, cromo, neón y
transiciones fluidas, todo dentro de un celular de concha translúcido flotando sobre un paisaje onírico.

**Juego 01 · Aqua Invaders**: revienta burbujas de jabón iridiscentes y esferas de cristal que descienden
del cielo. Encadena combos para multiplicar los puntos (hasta ×8) y subir la escala musical.

Sin dependencias ni compilación: HTML + CSS + JavaScript puro (Canvas 2D y Web Audio API).
La tipografía Exo 2 se carga desde Google Fonts; sin conexión se usa una fuente del sistema.

## Estructura

```
index.html   Estructura: entrada, celular, pantallas del menú
styles.css   Estética: cristal, cromo, neón, transiciones
main.js      Mundo en canvas, motor del juego, audio sintetizado, menús y récords
```

## Ejecutar

```bash
cd Aero-Game
python3 -m http.server 8000
```

Abre <http://localhost:8000>. (Alternativa con Node: `npx serve .`)

## Controles

| Acción              | Teclado                | Celular (táctil / ratón) |
|---------------------|------------------------|--------------------------|
| Mover / elegir      | ← → (A D)              | ◀ ▶                      |
| Disparar / aceptar  | Espacio o Enter        | Botón verde central      |
| Pausa / volver      | P o Esc                | Botón ❚❚                 |
| Sonido              | —                      | Botón ♪                  |

Los récords (top 5) y los ajustes se guardan en el navegador. En **Ajustes → Gráficos → Ligera**
el fondo se renderiza a menor resolución para equipos más modestos.
