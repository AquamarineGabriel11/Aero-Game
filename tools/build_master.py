"""Genera TRIP-COMPLETO.md: todo el álbum en un solo archivo.
Uso: python3 tools/build_master.py  (desde la raíz del repo)"""
import re, os

def demote(text, levels=1):
    out, code = [], False
    for line in text.splitlines():
        if line.startswith("```"):
            code = not code
        if not code and re.match(r"^#{1,5} ", line):
            line = "#" * levels + line
        out.append(line)
    return "\n".join(out)

def section(path, levels=1):
    return demote(open(path, encoding="utf-8").read().strip(), levels)

TRACKS = [
    ("01", "Seen", "seen-demo/seen-lyrics.md", "seen", "🇯🇵🇬🇧", "HND · LHR", "tristeza, desvelo (single)", "8.5"),
    ("02", "pRoPiNa", "caipirinha-lyrics.md", "caipirinha", "🇧🇷🇵🇷", "GIG · MAO · SJU", "fiesta en un yate por el Amazonas que se vuelve antro (Explicit)", "9.3"),
    ("03", "TEA", "tea-lyrics.md", None, "🇩🇪", "BER", "seducción", "8.9"),
    ("04", "Chef's Kiss", "chefs-kiss-lyrics.md", None, "🇫🇷🇨🇭🇳🇴🇮🇹", "CDG · ZRH", "amor, el pan (single)", "8.6"),
    ("05", "Nobody's Catching Me", "nobodys-catching-me-lyrics.md", None, "🇨🇳🇺🇸", "JFK", "adrenalina con amigos", "8.0"),
    ("06", "Syzygy", "syzygy-notes.md", "syzygy", "🇳🇿", "CHC", "los astros se alinean, desconectarte", "8.9"),
    ("07", "Deshielo (Interlude)", "deshielo-notes.md", "deshielo", "🇦🇷🇨🇦🇳🇵", "FTE", "refrescar tu mente", "8.9"),
    ("08", "Mångata", "mangata-notes.md", "mangata", "🇸🇪🇵🇹", "ARN · LIS", "hora azul, la luna: cerrar ciclos", "9.0"),
]

DUR = {"01":"2:54","02":"6:23","03":"2:28","04":"2:12","05":"4:09","06":"1:57","07":"0:41","08":"4:50"}
VIBES = {"01":"Fogcore","02":"Brat summer tropical","03":"Dark coquette","04":"Cottagecore","05":"Grunge Y2K nocturno","06":"Spacecore","07":"Frutiger Aero / Watercore","08":"Blue hour core"}

parts = ["""# TRIP — GABRIEL · todo el álbum

> **"Cada viaje es una canción, cada país tiene su cultura."**

Este archivo junta **todo lo trabajado**: concepto, tracklist, letras finales con traducción, producción, referencias, moodboards, video, plan de era y pendientes.
Se genera solo con `python3 tools/build_master.py`. Para editar algo, cambia el archivo de cada canción y vuelve a generarlo.

## Índice
1. [Tracklist](#tracklist)
""" + "".join(f"{i+2}. [{t[0]} · {t[1]}](#{t[0]}--{re.sub(r'[^a-z0-9]+','-',t[1].lower()).strip('-')})\n" for i,t in enumerate(TRACKS)) +
"""10. [Bonus · Seen (Extended Scene)](#bonus--seen-extended-scene)
11. [Referencias de sonido y notas](#referencias-de-sonido-y-notas)
12. [Plan de era](#plan-de-era)
13. [Pendientes](#pendientes)
14. [Historial del proceso](#historial-del-proceso)

## Tracklist
| # | Canción | País | Ruta | Tema | Vibe | Duración | Calificación |
|---|---|---|---|---|---|---|---|
""" + "".join(f"| {n} | **{t}** | {fl} | {code} | {theme} | {VIBES[n]} | {DUR[n]} | {r} |\n" for n,t,_,_,fl,code,theme,r in TRACKS) +
"""| Bonus | Seen (Extended Scene) | 🇯🇵🇬🇧 | HND · LHR | todas las escenas extra | Fogcore | — | — |

![Las vibes de TRIP](moodboards/vibes.jpg)

**Duración total: 25:34** · **Álbum completo: 8.6** (calificación honesta de letra y concepto, todavía sin audio).
"""]

for n, title, path, mood, *_ in TRACKS:
    parts.append(f"\n---\n\n## {n} · {title}\n")
    if mood and os.path.exists(f"moodboards/{mood}/00-moodboard-completo.jpg"):
        parts.append(f"![Moodboard de {title}](moodboards/{mood}/00-moodboard-completo.jpg)\n\nCarpeta de imágenes: `moodboards/{mood}/`\n")
    parts.append(section(path, 2))

parts.append("\n---\n\n## Bonus · Seen (Extended Scene)\n")
parts.append(section("seen-demo/seen-extended-lyrics.md", 2))
notes = open("TRIP-notes.md", encoding="utf-8").read()
parts.append("\n---\n\n## Referencias de sonido y notas\n")
for head in ["## Reglas", "## La idea central", "## Referencias de sonido (de Gabriel)"]:
    if head in notes:
        chunk = notes[notes.index(head):]
        nxt = re.search(r"\n(## |---)", chunk[len(head):])
        chunk = chunk[: len(head) + nxt.start()] if nxt else chunk
        parts.append(demote(chunk.strip(), 1))
parts.append("\n---\n\n## Plan de era\n")
parts.append(section("TRIP-era.md", 2))
parts.append("""
---

## Pendientes
- [ ] **Caipirinha:** un coro más pegajoso (es la calificación más baja: 7.8).
- [ ] **Chef's Kiss:** simplificar el bridge (demasiados lugares juntos).
- [ ] **TEA:** decidir si se queda el gesto de los lentes oscuros en el outro.
- [ ] **Nombre de fans** (propuesta: "Passengers") y aprobar el pase de abordar como identidad de la era.
- [ ] **Moodboards** que faltan: TEA, Chef's Kiss y Nobody's Catching Me.
- [ ] **Grabar las voces de Seen** → lanzamiento el **15 de enero de 2027**.
- [ ] Actualizar la portada del álbum y el video de la ruta con el tracklist nuevo.
""")
parts.append("\n---\n\n## Historial del proceso\n(Versiones viejas e ideas descartadas, para no perder nada. Si algo choca con lo de arriba, manda lo de arriba.)\n")
parts.append(section("TRIP-notes.md", 2))
parts.append(section("TRIP-lyrics.md", 2))
open("TRIP-COMPLETO.md", "w", encoding="utf-8").write("\n".join(parts) + "\n")
print("TRIP-COMPLETO.md listo")
