"""Genera todo lo de Enlace VR · Python a partir de bancos.py.

1. Comprueba los bancos EJECUTANDO el código:
   - cada programa de Arma el programa se corre y su salida debe ser la del banco;
   - cada pregunta del Intérprete se corre (print(fN(args))) y sus respuestas falsas salen de
     correr las versiones con error; ninguna puede ser igual a la correcta;
   - las respuestas que calcula el visor en El archivero (js/archivero_logica.js, con Node) se
     comparan con este código en Python con 300 listas al azar.
2. Escribe los datos del visor: js/datos_programa.js, js/datos_interprete.js, js/datos_archivero.js.
3. Hace los PDF (carta) en material/: manual del equipo e instructivo de una hoja por juego.

Uso:  python generador/generar.py          (Edge convierte a PDF; si falla, vuelve a correrlo)
"""
import ast
import contextlib
import html
import io
import json
import math
import random
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from bancos import ARCHIVERO, DEL_TEST, DEL_TEST_LLAMADAS, EJEMPLO_MANUAL, EXPRESIONES_FIJAS, FUNCIONES, PLANTILLAS, PROGRAMAS  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent
MATERIAL = RAIZ / "material"
HTML_DIR = MATERIAL / "html"
EDGE = pathlib.Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
CURSOS = {"TC1037": "Pensamiento Algorítmico", "TC1038": "Fundamentos de Programación"}
MINUTOS = 5


# ---------- 1. comprobar ----------

def correr_programa(lineas, entradas, eco=False):
    """Corre un programa con input() falso. Con eco=True, la salida se ve como en la consola."""
    alimento = iter(entradas)
    salida = io.StringIO()

    def entrada_falsa(prompt=""):
        valor = next(alimento)
        print(prompt + (valor + "\n" if eco else ""), end="")
        return valor

    with contextlib.redirect_stdout(salida):
        exec("\n".join(lineas), {"input": entrada_falsa, "__name__": "__main__"})
    return salida.getvalue()


def comprobar_programas():
    datos = {}
    for curso, lista in PROGRAMAS.items():
        datos[curso] = []
        for n, p in enumerate(lista, 1):
            nombre = f"{curso} programa {n}"
            assert 4 <= len(p["lineas"]) <= 8, f"{nombre}: de 4 a 8 líneas"
            textos = p["lineas"] + p["trampas"]
            assert len(set(textos)) == len(textos), f"{nombre}: hay líneas repetidas"
            salida = correr_programa(p["lineas"], p["entradas"])
            assert " ".join(salida.split()) == " ".join(p["salida"].split()), f"{nombre}: imprime {salida!r}"
            # cada trampa, puesta en lugar de una línea parecida, debe cambiar o romper el programa
            ejemplo = correr_programa(p["lineas"], p["entradas"], eco=True).rstrip("\n")
            datos[curso].append({
                "id": n, "titulo": p["titulo"], "descripcion": p["descripcion"], "pasos": p["pasos"],
                "lineas": p["lineas"], "trampas": p["trampas"], "ejemplo": ejemplo,
            })
    return datos


def imprimir_llamada(codigo, llamada):
    """Lo que aparece en la pantalla con print(llamada), o 'Error' si truena."""
    salida = io.StringIO()
    espacio = {"math": math}
    try:
        with contextlib.redirect_stdout(salida):
            exec(codigo, espacio)
            exec(f"print({llamada})", espacio)
    except Exception:  # noqa: BLE001 - una versión con error puede tronar; esa no se usa
        return None
    return salida.getvalue().rstrip("\n")


def falsas_genericas(correcta):
    """Respuestas falsas de respaldo, con errores típicos de lectura."""
    lineas = correcta.split("\n")
    if len(lineas) > 1:
        return ["\n".join(reversed(lineas)), lineas[0], lineas[-1], "None"]
    s = correcta
    try:
        n = int(s)
        return [str(n + 1), str(n - 1), f"{n}.0", str(n * 2)]
    except ValueError:
        pass
    try:
        x = float(s)
        return [str(int(x)), str(round(x + 1, 2)), str(round(x - 1, 2)), "None"]
    except ValueError:
        pass
    if s.startswith("["):
        return ["[]", s.replace("[", "(").replace("]", ")"), "None", s[:-1] + ", 0]"]
    return ["None", f"'{s}'", "True", "Error"]


def comprobar_funciones():
    datos = {}
    for curso, lista in FUNCIONES.items():
        datos[curso] = {"funciones": [], "retos": []}
        for n, f in enumerate(lista, 1):
            nombre = f"f{n}"
            assert f"def {nombre}(" in f["codigo"], f"{curso}: la función {n} debe llamarse {nombre}"
            datos[curso]["funciones"].append({"id": n, "codigo": f["codigo"], "tema": f["tema"]})
            for args in f["args"]:
                llamada = f"{nombre}({args})"
                assert llamada not in DEL_TEST_LLAMADAS.get(curso, []), f"{curso} {llamada} es una pregunta del test de antes y después"
                correcta = imprimir_llamada(f["codigo"], llamada)
                assert correcta is not None, f"{curso} {llamada} truena"
                falsas = []
                for variante in f["errores"]:
                    r = imprimir_llamada(variante, llamada)
                    if r is not None and r != correcta and r not in falsas:
                        falsas.append(r)
                for r in falsas_genericas(correcta):
                    if len(falsas) >= 3:
                        break
                    if r != correcta and r not in falsas:
                        falsas.append(r)
                assert len(falsas) >= 3, f"{curso} {llamada}: faltan respuestas falsas"
                datos[curso]["retos"].append({"f": n, "llamada": f"print({llamada})", "correcta": correcta, "falsas": falsas[:3]})
    return datos


def comprobar_archivero():
    """Node calcula las respuestas del visor; Python las calcula con el código del manual."""
    codigo = "\n\n".join(c for _, c in ARCHIVERO)
    prueba = RAIZ / "generador" / "probar_archivero.js"
    salida = subprocess.run(["node", str(prueba), "300"], capture_output=True, text=True, encoding="utf-8", check=True, cwd=RAIZ).stdout
    casos = json.loads(salida)
    malos = 0
    for caso in casos:
        espacio = {}
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(codigo, espacio)
            exec(f"nombres = {json.dumps(caso['nombres'], ensure_ascii=False)}\nprom = {caso['promPy']}", espacio)
            exec(caso["codigo"], espacio)
        if buf.getvalue().rstrip("\n") != caso["correcta"]:
            malos += 1
            if malos <= 5:
                print("  NO COINCIDE:", caso["codigo"].replace("\n", " ; "), "| python:", buf.getvalue().strip(), "| visor:", caso["correcta"])
        assert caso["correcta"] not in caso["falsas"], f"respuesta falsa igual a la correcta: {caso}"
        assert len(set(caso["falsas"])) == 3, f"respuestas falsas repetidas: {caso}"
    assert malos == 0, f"{malos} de {len(casos)} respuestas del archivero no coinciden con Python"
    return {"funciones": [{"nombre": n, "codigo": c} for n, c in ARCHIVERO]}


# ---------- Calculadora humana ----------

OPERADORES = {ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.FloorDiv: "//", ast.Mod: "%", ast.Pow: "**",
              ast.Gt: ">", ast.Lt: "<", ast.GtE: ">=", ast.LtE: "<=", ast.Eq: "==", ast.NotEq: "!="}


def valor_ok(v):
    """Valores que se pueden calcular a mano: enteros chicos o decimales cortos."""
    if isinstance(v, bool):
        return True
    if isinstance(v, int):
        return -999 <= v <= 9999
    texto = str(v)
    return "e" not in texto and len(texto.split(".")[1]) <= 2 and abs(v) < 10000


def arbol(nodo, fuente, variables):
    """El árbol de la expresión. Cada operación guarda lo que Python imprime al evaluarla sola."""
    if isinstance(nodo, ast.Constant):
        return {"hoja": repr(nodo.value)}
    if isinstance(nodo, ast.Name):
        return {"hoja": nodo.id}
    if isinstance(nodo, ast.BinOp):
        izq, op, der = nodo.left, OPERADORES[type(nodo.op)], nodo.right
    elif isinstance(nodo, ast.Compare) and len(nodo.ops) == 1:
        izq, op, der = nodo.left, OPERADORES[type(nodo.ops[0])], nodo.comparators[0]
    else:
        raise ValueError(f"operación no soportada: {ast.dump(nodo)}")
    trozo = fuente[nodo.col_offset:nodo.end_col_offset]
    valor = eval(trozo, {"__builtins__": {}}, dict(variables))  # noqa: S307 - expresiones nuestras
    if not valor_ok(valor):
        raise ValueError(f"{trozo} = {valor}")
    parentesis = (nodo.col_offset > 0 and fuente[nodo.col_offset - 1] == "("
                  and fuente[nodo.end_col_offset:nodo.end_col_offset + 1] == ")")
    return {"op": op, "izq": arbol(izq, fuente, variables), "der": arbol(der, fuente, variables),
            "valor": str(valor), "parentesis": parentesis}


PRIORIDAD = {"**": 3, "*": 2, "/": 2, "//": 2, "%": 2, "+": 1, "-": 1}


def pasos_canonicos(a):
    """Pasos en el orden de clase: primero lo de mayor prioridad y, si empatan, el de más a la izquierda."""
    hechos = set()

    def listos(x):
        return "hoja" in x or id(x) in hechos

    def en_orden(x):
        return [] if "hoja" in x else en_orden(x["izq"]) + [x] + en_orden(x["der"])

    pasos = []
    while not listos(a):
        candidatos = [x for x in en_orden(a) if id(x) not in hechos and listos(x["izq"]) and listos(x["der"])]
        mejor = max(candidatos, key=lambda x: PRIORIDAD.get(x["op"], 0))
        pasos.append({"op": mejor["op"], "valor": mejor["valor"],
                      "izq": mejor["izq"] if "hoja" in mejor["izq"] else {"hoja": mejor["izq"]["valor"]},
                      "der": mejor["der"] if "hoja" in mejor["der"] else {"hoja": mejor["der"]["valor"]}})
        hechos.add(id(mejor))
    return pasos


def texto_operacion(a):
    def lado(x):
        v = x["hoja"] if "hoja" in x else x["valor"]
        return f"({v})" if v.startswith("-") else v
    return f"{lado(a['izq'])} {a['op']} {lado(a['der'])}"


def expresion(fuente, variables, nivel):
    a = arbol(ast.parse(fuente, mode="eval").body, fuente, variables)
    final = str(eval(fuente, {"__builtins__": {}}, dict(variables)))  # noqa: S307
    assert final == a["valor"], f"{fuente}: el árbol no coincide con Python"
    # lo que imprime el programa completo, corrido de verdad
    programa = "".join(f"{k} = {v}\n" for k, v in variables.items()) + f"print({fuente})"
    assert correr_programa([programa], []).strip() == final, f"{fuente}: print no coincide"
    return {"nivel": nivel, "variables": variables, "expresion": fuente, "arbol": a, "final": final}


def generar_expresiones(por_nivel=30, semilla=2026):
    azar = random.Random(semilla)
    lista = [expresion(e["expresion"], e["variables"], e["nivel"]) for e in EXPRESIONES_FIJAS]
    vistas = {e["expresion"] + str(e["variables"]) for e in lista}
    prohibidas = {" ".join(t.split()) for t in DEL_TEST}
    for nivel, plantillas in PLANTILLAS.items():
        hechas = 0
        intentos = 0
        while hechas < por_nivel:
            intentos += 1
            assert intentos < 50000, f"nivel {nivel}: no salen suficientes expresiones"
            plantilla = azar.choice(plantillas)
            texto = plantilla
            for letra in "abcde":
                if letra in plantilla:
                    # después de ** el exponente es 2 o 3; antes, la base hasta 6
                    i = texto.index(letra)
                    if texto[max(0, i - 3):i] == "** ":
                        numero = azar.choice([2, 3])
                    elif texto[i + 1:i + 4] == " **":
                        numero = azar.randint(2, 6)
                    else:
                        numero = azar.randint(2, 9 if nivel == 1 else 12)
                    texto = texto.replace(letra, str(numero))  # la misma letra, el mismo número
            variables = {letra: azar.randint(2, 20) for letra in "xyz" if letra in plantilla}
            try:
                e = expresion(texto, variables, nivel)
            except (ValueError, ZeroDivisionError, AssertionError):
                continue
            clave = texto + str(variables)
            if " ".join(texto.split()) in prohibidas:
                continue
            if clave in vistas or (e["final"] in ("0", "0.0") and azar.random() < 0.7):
                continue
            vistas.add(clave)
            lista.append(e)
            hechas += 1
    return lista


# ---------- 2. datos para el visor ----------

def exportar(nombre, variable, datos):
    ruta = RAIZ / "js" / nombre
    ruta.write_text(f"// Generado por generador/generar.py a partir de bancos.py. No editar a mano.\nwindow.{variable} = "
                    + json.dumps(datos, ensure_ascii=False) + ";\n", encoding="utf-8")


# ---------- 3. PDF ----------

CSS = """
@page { size: letter; margin: 13mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #15171a; font-size: 10.5pt; line-height: 1.4; margin: 0; }
h1 { font-size: 21pt; margin: 0 0 1mm; color: #0B1F3A; }
h2 { font-size: 13pt; margin: 5mm 0 2mm; color: #2F6FBF; }
h3 { font-size: 11.5pt; margin: 0 0 1.5mm; color: #0B1F3A; }
p { margin: 0 0 2mm; }
ol, ul { margin: 0 0 2mm; padding-left: 6mm; }
li { margin-bottom: 1mm; }
.marca { display: inline-block; border: 1.5px solid #2F6FBF; color: #2F6FBF; border-radius: 4px; padding: 0 2mm; font-size: 8.5pt; font-weight: 600; letter-spacing: .5px; margin-bottom: 2mm; }
.sub { color: #5b6270; margin-bottom: 4mm; }
.aviso { border-left: 4px solid #2F6FBF; background: #EEF3FA; padding: 2.5mm 4mm; margin: 2mm 0 4mm; }
.mono, pre, code { font-family: Consolas, "Courier New", monospace; }
pre { margin: 0; white-space: pre; font-size: 9.6pt; line-height: 1.35; }
.rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.tarjeta { border: 1.2px solid #c9ced6; border-radius: 6px; padding: 3mm 3.5mm; break-inside: avoid; }
.tarjeta .num { color: #2F6FBF; font-weight: 700; }
.pasos { counter-reset: paso; list-style: none; padding: 0; margin: 1mm 0 2mm; }
.pasos li { counter-increment: paso; font-family: Consolas, monospace; font-size: 9.6pt; white-space: pre; margin: 0 0 .6mm; }
.pasos li::before { content: counter(paso) "  "; color: #8B95A7; }
.consola { background: #0B1F3A; color: #E6EDF7; border-radius: 4px; padding: 2mm 3mm; }
.etq { font-size: 8.5pt; font-weight: 600; color: #5b6270; letter-spacing: .4px; margin-top: 1.5mm; }
.tema { color: #8B95A7; font-size: 8.5pt; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0 3mm; }
th, td { border: 1px solid #c9ced6; padding: 1.4mm 2.2mm; text-align: left; vertical-align: top; }
th { background: #eef1f5; }
.tres { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; }
.paso-grande { border: 1.2px solid #c9ced6; border-radius: 6px; padding: 3mm; }
.paso-grande b { display: block; color: #2F6FBF; font-size: 15pt; }
.pie { color: #5b6270; font-size: 8.5pt; margin-top: 3mm; }
"""

esc = html.escape


def pagina(titulo, cuerpo):
    return (f"<!doctype html><html lang='es'><head><meta charset='utf-8'><title>{esc(titulo)}</title>"
            f"<style>{CSS}</style></head><body>{cuerpo}</body></html>")


def manual_programa(curso, programas):
    tarjetas = "".join(f"""<div class="tarjeta">
<h3><span class="num">Programa {p['id']}</span> · {esc(p['titulo'])}</h3>
<p>{esc(p['descripcion'])}</p>
<div class="etq">PSEUDOCÓDIGO (en este orden)</div>
<ol class="pasos">{''.join(f'<li>{esc(s)}</li>' for s in p['pasos'])}</ol>
<div class="etq">EJEMPLO DE EJECUCIÓN</div>
<pre class="consola">{esc(p['ejemplo'])}</pre>
</div>""" for p in programas)
    return pagina(f"Manual · Arma el programa · {curso}", f"""
<div class="marca">ENLACE VR · PYTHON · {curso} · MANUAL DEL EQUIPO</div>
<h1>Arma el programa</h1>
<div class="aviso">El Operador les dice el <b>número de programa</b> y les lee las líneas de código que ve
(con sangría o sin sangría). Ustedes deciden en qué <b>número de línea</b> va cada una, siguiendo el
pseudocódigo. Cuidado: hay <b>líneas trampa</b> que se parecen pero no van. Sangría = 4 espacios.</div>
<div class="rejilla">{tarjetas}</div>""")


def manual_interprete(curso, datos):
    ayuda = ("""<table><tr><th>Orden de las operaciones (primero → último)</th><th>Recuerden</th></tr>
<tr><td class="mono">( )   →   **   →   *  /  //  %   →   +  -</td><td><span class="mono">/</span> siempre da decimal (10 / 5 = 2.0) ·
<span class="mono">//</span> divide sin decimales · <span class="mono">%</span> es el residuo · una función sin
<span class="mono">return</span> regresa <span class="mono">None</span></td></tr></table>""" if curso == "TC1037" else
             """<table><tr><th>Recuerden</th></tr><tr><td><span class="mono">range(1, n)</span> llega hasta n − 1 ·
<span class="mono">lista[-1]</span> es el último · <span class="mono">return</span> dentro de un ciclo termina la función ·
<span class="mono">pop(i)</span> quita la posición i y recorre las demás</td></tr></table>""")
    tarjetas = "".join(f"""<div class="tarjeta"><h3><span class="num">Función {f['id']}</span> <span class="tema">· {esc(f['tema'])}</span></h3>
<pre>{esc(f['codigo'])}</pre></div>""" for f in datos["funciones"])
    nota_math = "<p class='pie'>Todas las funciones tienen <span class='mono'>import math</span> al inicio del programa.</p>" if curso == "TC1037" else ""
    return pagina(f"Manual · Intérprete humano · {curso}", f"""
<div class="marca">ENLACE VR · PYTHON · {curso} · MANUAL DEL EQUIPO</div>
<h1>Intérprete humano</h1>
<div class="aviso">El Operador les lee una instrucción como <span class="mono">print(f3(600))</span>. Busquen la
función, síganla a mano con esos valores y díganle <b>exactamente</b> qué imprime Python
(<span class="mono">540.0</span> no es lo mismo que <span class="mono">540</span>). El Operador dispara a esa respuesta.</div>
{ayuda}
<div class="rejilla">{tarjetas}</div>{nota_math}""")


def manual_archivero(datos):
    tarjetas = "".join(f"""<div class="tarjeta"><h3><span class="num">{esc(f['nombre'])}</span></h3>
<pre>{esc(f['codigo'])}</pre></div>""" for f in datos["funciones"])
    return pagina("Manual · El archivero · TC1038", f"""
<div class="marca">ENLACE VR · PYTHON · TC1038 · MANUAL DEL EQUIPO</div>
<h1>El archivero</h1>
<div class="aviso">El Operador ve dos listas paralelas, <span class="mono">nombres</span> y <span class="mono">prom</span>,
como cajas con su posición (0, 1, 2…). Ustedes tienen el código pero <b>no los datos</b>: pídanselos por posición
("¿qué promedio hay en la posición 2?"). El Operador les lee la pregunta; ustedes siguen el código y le dicen
la respuesta. No se usan <span class="mono">sum()</span>, <span class="mono">max()</span> ni <span class="mono">sort()</span>.</div>
<div class="rejilla">{tarjetas}</div>
<p class="pie">Igual que en el segundo examen (Control Escolar): las listas están alineadas, la posición i de
<span class="mono">nombres</span> es el mismo alumno que la posición i de <span class="mono">prom</span>.</p>""")


def manual_calculadora(ejemplo):
    pasos = "".join(f"<tr><td class='mono'>{i}</td><td class='mono'>{esc(texto_operacion(p))}</td><td class='mono'><b>{esc(p['valor'])}</b></td></tr>"
                    for i, p in enumerate(pasos_canonicos(ejemplo["arbol"]), 1))
    hoja = "".join(f"<tr><td class='mono' style='width:8mm'>{i}</td><td style='height:8.5mm'></td><td style='width:30mm'></td></tr>" for i in range(1, 9))
    return pagina("Manual · Calculadora humana", f"""
<div class="marca">ENLACE VR · PYTHON · TC1037 · TC1038 · MANUAL DEL EQUIPO</div>
<h1>Calculadora humana</h1>
<div class="aviso">El Operador les dicta una expresión, por ejemplo <span class="mono">print(4 + 6 * 3 // 4 - 2 ** 3 / 8)</span>.
Ustedes la escriben en la hoja de trabajo y le dicen <b>qué operación va primero</b> (él apunta a ese operador) y
<b>cuánto da</b> (él lo escribe en el teclado). Paso a paso, hasta que quede un solo valor.
Python es exacto: <span class="mono">7.0</span> no es lo mismo que <span class="mono">7</span>.</div>
<div class="rejilla">
<div>
<h2>¿Qué va primero?</h2>
<table>
<tr><th>Orden</th><th>Operadores</th><th>Nota</th></tr>
<tr><td>1</td><td class="mono">( )</td><td>lo de adentro primero</td></tr>
<tr><td>2</td><td class="mono">**</td><td>potencia</td></tr>
<tr><td>3</td><td class="mono">*  /  //  %</td><td>de izquierda a derecha</td></tr>
<tr><td>4</td><td class="mono">+  -</td><td>de izquierda a derecha</td></tr>
<tr><td>5</td><td class="mono">&gt;  &lt;  &gt;=  &lt;=  ==  !=</td><td>al final; dan True o False</td></tr>
</table>
<p class="pie">Si dos operaciones no dependen una de la otra, pueden ir en cualquier orden: el visor acepta cualquier
operación que ya tenga sus dos números listos.</p>
<h2>¿Entero o decimal?</h2>
<table>
<tr><td class="mono">/</td><td>siempre da decimal: <span class="mono">8 / 8 = 1.0</span></td></tr>
<tr><td class="mono">//</td><td>divide y quita los decimales: <span class="mono">18 // 4 = 4</span></td></tr>
<tr><td class="mono">%</td><td>el residuo: <span class="mono">7 % 2 = 1</span></td></tr>
<tr><td class="mono">**</td><td>potencia: <span class="mono">2 ** 3 = 8</span></td></tr>
<tr><td>mezcla</td><td>entero con decimal da decimal: <span class="mono">8 - 1.0 = 7.0</span></td></tr>
</table>
</div>
<div>
<h2>Ejemplo resuelto</h2>
<p class="mono">print({esc(ejemplo['expresion'])})</p>
<table><tr><th>Paso</th><th>Operación</th><th>Da</th></tr>{pasos}</table>
<p>Imprime: <span class="mono"><b>{esc(ejemplo['final'])}</b></span></p>
</div>
</div>
<h2>Hoja de trabajo</h2>
<p>Expresión: _______________________________________________________________</p>
<table><tr><th>Paso</th><th>Operación</th><th>Da</th></tr>{hoja}</table>""")


INSTRUCTIVOS = {
    "programa": ("Arma el programa", "TC1037 y TC1038", "Orden de un programa, sangría, EPS, if/else, funciones (TC1037); ciclos y listas (TC1038).",
                 ["El Operador dice el <b>número de programa</b>, voltea, toma una línea de código y la <b>lee en voz alta</b> (con o sin sangría).",
                  "El equipo busca el programa en su manual, sigue el pseudocódigo y dice en qué <b>número de línea</b> va.",
                  "El Operador apunta a ese número. Si es la línea correcta, se coloca (+1). Las líneas trampa no van en ningún lado."]),
    "interprete": ("Intérprete humano", "TC1037 y TC1038", "Evaluar expresiones, return contra print, if/elif/else (TC1037); range, while, listas, ciclos anidados (TC1038).",
                   ["El Operador lee la instrucción, por ejemplo <span class='mono'>print(f3(600))</span>.",
                    "El equipo busca la función 3, la sigue a mano y dice exactamente qué imprime Python.",
                    "El Operador dispara a la puerta con esa respuesta. Al acertar, el visor muestra el código de la función."]),
    "calculadora": ("Calculadora humana", "TC1037 y TC1038",
                    "Precedencia de operadores, / contra //, %, **, entero contra decimal y comparaciones (como la evaluación de expresiones del examen).",
                    ["El Operador dicta la expresión, por ejemplo <span class='mono'>print(4 + 6 * 3 // 4 - 2 ** 3 / 8)</span>, y el equipo la escribe en su hoja.",
                     "El equipo dice qué operación va primero; el Operador apunta a ese operador. Luego la calculan a mano y el Operador escribe cuánto da.",
                     "La expresión se reduce hasta un solo valor. +1 por cada paso bien hecho. Ojo: <span class='mono'>7.0</span> no es <span class='mono'>7</span>."]),
    "archivero": ("El archivero", "TC1038", "Listas paralelas, índices, recorrer con for, buscar, contar, el mayor sin max(), eliminar y agregar.",
                  ["El Operador lee la pregunta (por ejemplo <span class='mono'>print(mejor(nombres, prom))</span>) y ve las listas como cajas.",
                   "El equipo, con el código, le pide los datos por posición y sigue la función a mano.",
                   "El Operador elige la respuesta. Al eliminar o agregar, las cajas se recorren: así se ve por qué las listas deben cambiar juntas."]),
}


def instructivo(clave):
    titulo, cursos, temas, pasos = INSTRUCTIVOS[clave]
    cajas = "".join(f"<div class='paso-grande'><b>{i}</b>{p}</div>" for i, p in enumerate(pasos, 1))
    return pagina(f"Instructivo · {titulo}", f"""
<div class="marca">ENLACE VR · PYTHON · INSTRUCTIVO DEL PROFESOR</div>
<h1>{titulo}</h1>
<p class="sub">{cursos} · Temas: {temas}</p>
<h2>Cómo se juega</h2>
<div class="tres">{cajas}</div>
<h2>Antes de empezar (5 min)</h2>
<ol>
<li>En cada visor abre el sitio y en el menú elige el <b>equipo</b> (1 a 8) y el <b>curso</b> (TC1037 o TC1038).</li>
<li>Imprime para cada equipo el <b>manual de su curso</b> y la hoja de puntajes (página Cómo empezar).</li>
<li>Equipos de 4: uno con el visor (Operador) y tres con el manual. Cambian de Operador en cada ronda.</li>
</ol>
<h2>Reglas</h2>
<table>
<tr><td><b>Ronda</b></td><td>{MINUTOS} minutos (o Práctica, sin tiempo). Primero una práctica.</td></tr>
<tr><td><b>Puntos</b></td><td>+1 por acierto. Al final el visor da el puntaje y un <b>código</b>: el equipo anota los dos en su hoja; tú los verificas en el Marcador del sitio.</td></tr>
<tr><td><b>¡Enlace caído!</b></td><td>Si se equivocan: 5 segundos sin hablar.</td></tr>
<tr><td><b>Seguridad</b></td><td>Se juega sentado; correa del control en la muñeca; el visor se pasa con las dos manos.</td></tr>
</table>
<h2>Al terminar (5 min)</h2>
<p>Pregunta: <i>"¿Qué línea o qué función les costó más y por qué?"</i> Pídeles que expliquen un error que cometieron:
ahí está el aprendizaje. Si vas a medir, aplica el test de antes y después y la encuesta MEEGA+.</p>
<p class="pie">Enlace VR · Python · Uno ve. El equipo sabe.</p>""")


def a_pdf(ruta_html, ruta_pdf):
    if not EDGE.exists():
        print(f"  (sin Edge: solo se creó {ruta_html.name})")
        return
    for intento in range(3):
        try:
            subprocess.run([str(EDGE), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                            f"--print-to-pdf={ruta_pdf}", ruta_html.as_uri()], check=True, capture_output=True, timeout=120)
            return
        except subprocess.TimeoutExpired:
            print(f"  Edge tardó con {ruta_pdf.name}, reintento {intento + 1}")
    raise RuntimeError(f"No se pudo crear {ruta_pdf.name}")


def guardar(nombre, contenido, pdf=True):
    HTML_DIR.mkdir(parents=True, exist_ok=True)
    ruta = HTML_DIR / f"{nombre}.html"
    ruta.write_text(contenido, encoding="utf-8")
    if pdf:
        a_pdf(ruta, MATERIAL / f"{nombre}.pdf")
    print(f"listo: {nombre}")


def main():
    solo_datos = "--sin-pdf" in sys.argv
    programas = comprobar_programas()
    interprete = comprobar_funciones()
    archivero = comprobar_archivero()
    expresiones = generar_expresiones()
    print(f"comprobado: {len(expresiones)} expresiones de la calculadora (cada paso evaluado en Python)")
    exportar("datos_calculadora.js", "CALCULADORA", expresiones)
    total = sum(len(v["retos"]) for v in interprete.values())
    print(f"comprobado: {sum(len(v) for v in programas.values())} programas, {total} preguntas del intérprete, archivero = Python")
    exportar("datos_programa.js", "PROGRAMAS", programas)
    exportar("datos_interprete.js", "INTERPRETE", interprete)
    exportar("datos_archivero.js", "ARCHIVERO", archivero)
    pdf = not solo_datos
    for curso in CURSOS:
        guardar(f"Manual_Arma_el_programa_{curso}", manual_programa(curso, programas[curso]), pdf)
        guardar(f"Manual_Interprete_humano_{curso}", manual_interprete(curso, interprete[curso]), pdf)
    guardar("Manual_El_archivero_TC1038", manual_archivero(archivero), pdf)
    guardar("Manual_Calculadora_humana", manual_calculadora(expresion(EJEMPLO_MANUAL, {}, 3)), pdf)
    for clave, nombre in [("programa", "Arma_el_programa"), ("interprete", "Interprete_humano"), ("archivero", "El_archivero"), ("calculadora", "Calculadora_humana")]:
        guardar(f"Instructivo_{nombre}", instructivo(clave), pdf)


if __name__ == "__main__":
    main()
