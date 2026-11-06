# Aqua Invaders 🫧

Minijuego arcade ASMR con estética **Frutiger Aero / Y2K onírica**: un celular de concha translúcido
flotando sobre un cielo azul con nubes, colinas verdes y burbujas de cristal líquido.

Sin dependencias ni compilación: HTML + CSS + JavaScript puro (Canvas 2D y Web Audio API).

## Ejecutar

```bash
python3 -m http.server 8000
# o bien: npx serve .
```

Abre <http://localhost:8000> en el navegador.

## Controles

| Acción    | Teclado              | Táctil / ratón          |
|-----------|----------------------|-------------------------|
| Mover     | ← → o A D            | Botones ◀ ▶ del celular |
| Disparar  | Espacio, ↑ o W       | Botón verde central     |
| Pausa     | P o Esc              | Botón ❚❚                |
| Sonido    | —                    | Botón 🔊                |

Los sonidos (pop de burbuja, tintineos de cristal, colchón ambiental) se sintetizan en tiempo real
con Web Audio; se activan tras el primer clic o pulsación de tecla.
