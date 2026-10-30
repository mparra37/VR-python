# Enlace VR · Python

Team VR games for intro Python courses. One player (the Operator) wears a Meta Quest headset and sees
the challenge; the rest of the team holds a printed manual. They only win by talking. Built on the same
engine as [Enlace VR](https://github.com/mparra37/ITC-VR-Games) (A-Frame 1.7, no build step).

| Game | Operator sees | Team has |
| --- | --- | --- |
| Calculadora humana (operators) | A simple expression and a keypad; types only the final result. After 2 correct answers the headset is passed on (clock paused) | Precedence table and a worksheet to help out loud |
| Intérprete humano (code tracing) | `print(f3(9, 2))` and 4 answer doors | Source of 10 small functions (`//`, `%`, `/`, `**`, precedence) |
| El cadenero (and / or / not) | Function number, each parameter's value and the call, e.g. `entra(18, 1.60)` | Source of 12 boolean functions; they say what it returns |
| El archivero (lists) | Two lists as boxes and a call like `f3(nombres)` | Source of 11 list functions (`lista1[-1]`, `len`, `index`…); they say which box to touch |

All content lives in `generador/bancos.py`. `python generador/generar.py` executes everything in Python
(answers, distractors from buggy variants, per-comparison traces, expression steps, list lookups) and writes
`js/datos_*.js` plus the printable PDFs in `material/`.

Rounds are 5 minutes; each round ends with a checksummed 8-character code that the teacher verifies in
`marcador.html` (optionally logged to Google Sheets via `apps_script/`). Tested in a desktop browser only.
