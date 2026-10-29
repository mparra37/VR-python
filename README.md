# Enlace VR · Python

Team VR games for two intro Python courses (TC1037 and TC1038). One player (the Operator) wears a
Meta Quest headset and sees the code; the rest of the team holds a printed manual. They only win by
talking. Built on the same engine as [Enlace VR](https://github.com/mparra37/ITC-VR-Games)
(A-Frame 1.7, no build step).

| Game | Course | Operator sees | Team has |
| --- | --- | --- | --- |
| Arma el programa (Parsons puzzle) | TC1037, TC1038 | Shuffled code lines with distractors, numbered editor rows | Pseudocode and sample run |
| Intérprete humano (code tracing) | TC1037, TC1038 | `print(f3(600))` and 4 answer doors | Source of 10 numbered functions |
| El archivero (parallel lists) | TC1038 | `nombres` and `prom` as boxes that shift on delete/append | Grade-book functions |

All content lives in `generador/bancos.py`. `python generador/generar.py` executes every program and
function in Python to produce the correct answers and distractors (from buggy variants), cross-checks the
JavaScript logic of El archivero against Python on 300 random cases, and writes `js/datos_*.js` plus the
printable PDFs in `material/`.

Rounds are 5 minutes; each round ends with a checksummed 8-character code that the teacher verifies in
`marcador.html` (optionally logged to Google Sheets via `apps_script/`). Tested in a desktop browser only.
