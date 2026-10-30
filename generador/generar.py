"""Genera todo lo de Enlace VR · Python a partir de bancos.py.

1. Comprueba los bancos EJECUTANDO el código en Python:
   - Intérprete humano: cada print(fN(args)) se corre; las respuestas falsas salen de correr las
     versiones con error (ninguna puede ser igual a la correcta);
   - El cadenero: cada llamada se corre y cada comparación de la condición se evalúa por separado
     (así el visor explica por qué da True o False);
   - Calculadora humana: cada expresión y cada paso se evalúa con Python (módulo ast);
   - El archivero: cada llamada se corre con las listas del reto y se busca la caja que regresa.
2. Escribe los datos del visor: js/datos_interprete.js, datos_logica.js, datos_calculadora.js, datos_listas.js.
3. Hace los PDF (carta) en material/: manual del equipo e instructivo de una hoja por juego.

Uso:  python generador/generar.py            (Edge convierte a PDF; si falla, vuelve a correrlo)
      python generador/generar.py --sin-pdf  (solo los datos)
"""
import ast
import contextlib
import html
import io
import json
import pathlib
import random
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from bancos import (DEL_TEST, DEL_TEST_LLAMADAS, EJEMPLO_MANUAL, FUNCIONES, LISTAS_FUNCIONES, LOGICA,  # noqa: E402
                    NOMBRES, OTRAS_LISTAS, PLANTILLAS)

RAIZ = pathlib.Path(__file__).resolve().parent.parent
MATERIAL = RAIZ / "material"
HTML_DIR = MATERIAL / "html"
EDGE = pathlib.Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
MINUTOS = 5
ACIERTOS_POR_TURNO = 2  # Calculadora: después de 2 correctas, el visor pasa al siguiente


def valor_py(v):
    """Un valor como se escribe en el código (los textos con comillas dobles)."""
    return f'"{v}"' if isinstance(v, str) else repr(v)


def reemplazar(texto, base, cambios):
    """Cambia trozos de una línea de código. cambios = [(col_inicio, col_fin, nuevo)] en columnas del
    archivo; base = columna donde empieza texto."""
    for ini, fin, nuevo in sorted(cambios, reverse=True):
        texto = texto[:ini - base] + nuevo + texto[fin - base:]
    return texto


def sin_repetir(lista):
    return [x for i, x in enumerate(lista) if x not in lista[:i]]


# ---------- Intérprete humano ----------

def correr(codigo, expresion):
    """Lo que aparece en la pantalla con print(expresion), o None si truena."""
    salida = io.StringIO()
    espacio = {}
    try:
        with contextlib.redirect_stdout(salida):
            exec(codigo, espacio)
            exec(f"print({expresion})", espacio)
    except Exception:  # noqa: BLE001 - una versión con error puede tronar; esa no se usa
        return None
    return salida.getvalue().rstrip("\n")


def falsas_genericas(correcta):
    """Respuestas falsas de respaldo, con errores típicos de lectura."""
    try:
        n = int(correcta)
        return [str(n + 1), f"{n}.0", str(n - 1), str(n * 2)]
    except ValueError:
        pass
    try:
        x = float(correcta)
        return [str(int(x)), str(round(x + 1, 2)), str(round(x - 1, 2)), "None"]
    except ValueError:
        pass
    return [f"'{correcta}'", "None", "True", "Error"]


def comprobar_interprete():
    datos = {"funciones": [], "retos": []}
    for n, f in enumerate(FUNCIONES, 1):
        nombre = f"f{n}"
        assert f"def {nombre}(" in f["codigo"], f"la función {n} debe llamarse {nombre}"
        datos["funciones"].append({"id": n, "codigo": f["codigo"], "tema": f["tema"]})
        for args in f["args"]:
            llamada = f"{nombre}({args})"
            assert llamada not in DEL_TEST_LLAMADAS, f"{llamada} es una pregunta del test de antes y después"
            correcta = correr(f["codigo"], llamada)
            assert correcta is not None, f"{llamada} truena"
            falsas = []
            for variante in f["errores"]:
                r = correr(variante, llamada)
                corta = r is not None and ("." not in r or len(r.split(".")[1]) <= 2)  # nada de 2.6666666666666665
                if corta and r != correcta and r not in falsas:
                    falsas.append(r)
            for r in falsas_genericas(correcta):
                if len(falsas) < 3 and r != correcta and r not in falsas:
                    falsas.append(r)
            assert len(falsas) == 3, f"{llamada}: faltan respuestas falsas"
            datos["retos"].append({"f": n, "llamada": f"print({llamada})", "correcta": correcta, "falsas": falsas})
    return datos


# ---------- El cadenero (and, or, not) ----------

def hojas(nodo):
    """Las partes de una condición que dan True o False por sí solas (lo que une and, or, not)."""
    if isinstance(nodo, ast.BoolOp):
        return [h for v in nodo.values for h in hojas(v)]
    if isinstance(nodo, ast.UnaryOp) and isinstance(nodo.op, ast.Not):
        return hojas(nodo.operand)
    return [nodo]


def explicar_condicion(codigo, nodo, entorno, fuente_args):
    """Tres renglones: la condición, con los valores puestos, y cada comparación ya resuelta."""
    assert nodo.lineno == nodo.end_lineno, "las condiciones van en un solo renglón"
    texto = ast.get_source_segment(codigo, nodo)
    nombres = [(n.col_offset, n.end_col_offset, fuente_args[n.id]) for n in ast.walk(nodo)
               if isinstance(n, ast.Name) and n.id in fuente_args]
    con_valores = reemplazar(texto, nodo.col_offset, nombres)
    partes = [(h.col_offset, h.end_col_offset, repr(eval(ast.get_source_segment(codigo, h), {}, entorno)))  # noqa: S307
              for h in hojas(nodo)]
    resueltas = reemplazar(texto, nodo.col_offset, partes)
    valor = eval(texto, {}, entorno)  # noqa: S307 - código nuestro
    return {"lineas": sin_repetir([texto, con_valores, resueltas]), "valor": repr(valor)}, valor


def seguir_funcion(codigo, args):
    """Sigue la función paso a paso (if / elif / else / return) como lo haría el equipo."""
    definicion = ast.parse(codigo).body[0]
    params = [a.arg for a in definicion.args.args]
    llamada = f"f({args})"
    nodos_args = ast.parse(llamada, mode="eval").body.args
    assert len(nodos_args) == len(params), f"{definicion.name}({args}): no coinciden los parámetros"
    valores = [ast.literal_eval(a) for a in nodos_args]
    entorno = dict(zip(params, valores))
    fuente_args = {p: ast.get_source_segment(llamada, a) for p, a in zip(params, nodos_args)}
    pasos = []

    def bloque(instrucciones):
        for st in instrucciones:
            if isinstance(st, ast.Return):
                if isinstance(st.value, ast.Constant):
                    return st.value.value
                paso, valor = explicar_condicion(codigo, st.value, entorno, fuente_args)
                pasos.append(dict(paso, clave="return"))
                return valor
            if isinstance(st, ast.If):
                clave = "if"
                while True:
                    paso, valor = explicar_condicion(codigo, st.test, entorno, fuente_args)
                    pasos.append(dict(paso, clave=clave))
                    if valor:
                        r = bloque(st.body)
                        if r is not None:
                            return r
                        break
                    if len(st.orelse) == 1 and isinstance(st.orelse[0], ast.If):
                        st, clave = st.orelse[0], "elif"
                        continue
                    r = bloque(st.orelse)
                    if r is not None:
                        return r
                    break
                continue
            raise ValueError(f"instrucción no soportada en {definicion.name}: {ast.dump(st)}")
        return None

    regresa = bloque(definicion.body)
    # lo mismo, pero corriendo la función de verdad
    espacio = {}
    exec(codigo, espacio)
    real = espacio[definicion.name](*valores)
    assert real == regresa and type(real) is type(regresa), f"{definicion.name}({args}): el seguimiento no coincide con Python"
    assert isinstance(real, (bool, str)), f"{definicion.name}({args}) debe regresar True/False o un texto"
    return definicion.name, params, valores, fuente_args, pasos, real


def posibles_resultados(codigo):
    """Lo que puede regresar la función: True/False o los textos de sus return."""
    vistos = []
    for nodo in ast.walk(ast.parse(codigo)):
        if isinstance(nodo, ast.Return):
            if isinstance(nodo.value, ast.Constant):
                vistos.append(valor_py(nodo.value.value))
            else:
                vistos += ["True", "False"]
    return sin_repetir(vistos)


def generar_logica():
    datos = {"funciones": [], "retos": []}
    for n, f in enumerate(LOGICA, 1):
        opciones = posibles_resultados(f["codigo"])
        if set(opciones) == {"True", "False"}:
            opciones = ["True", "False"]
        resultados = set()
        nombre = None
        for args in f["args"]:
            nombre, params, valores, fuente_args, pasos, real = seguir_funcion(f["codigo"], args)
            assert valor_py(real) in opciones, f"{nombre}({args}): {real!r} no está en las opciones"
            resultados.add(valor_py(real))
            datos["retos"].append({
                "f": n, "nivel": f["nivel"], "llamada": f"{nombre}({args})",
                "parametros": [fuente_args[p] for p in params],
                "correcta": valor_py(real), "opciones": opciones, "pasos": pasos,
            })
        assert resultados == set(opciones), f"{nombre}: las llamadas no cubren todas las respuestas ({resultados})"
        datos["funciones"].append({"id": n, "nombre": nombre, "codigo": f["codigo"], "nivel": f["nivel"]})
    return datos


# ---------- Calculadora humana ----------

OPERADORES = {ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.FloorDiv: "//", ast.Mod: "%", ast.Pow: "**"}
PRIORIDAD = {"**": 3, "*": 2, "/": 2, "//": 2, "%": 2, "+": 1, "-": 1}


def valor_ok(v):
    """Valores fáciles de calcular en la cabeza: enteros de 0 a 150 o decimales con un solo decimal."""
    if isinstance(v, int):
        return 0 <= v <= 150
    texto = str(v)
    return "e" not in texto and 0 <= v <= 150 and len(texto.split(".")[1]) <= 1


def arbol(nodo, fuente, variables):
    """El árbol de la expresión. Cada operación guarda lo que da en Python."""
    if isinstance(nodo, ast.Constant):
        return {"hoja": repr(nodo.value)}
    if isinstance(nodo, ast.Name):
        return {"hoja": nodo.id}
    assert isinstance(nodo, ast.BinOp), f"operación no soportada: {ast.dump(nodo)}"
    trozo = fuente[nodo.col_offset:nodo.end_col_offset]
    valor = eval(trozo, {"__builtins__": {}}, dict(variables))  # noqa: S307 - expresiones nuestras
    if not valor_ok(valor):
        raise ValueError(f"{trozo} = {valor}")
    return {"op": OPERADORES[type(nodo.op)], "izq": arbol(nodo.left, fuente, variables),
            "der": arbol(nodo.right, fuente, variables), "valor": str(valor)}


def pasos_canonicos(a, variables):
    """Los pasos en el orden de clase: primero lo de mayor prioridad y, si empatan, el de la izquierda."""
    hechos = set()

    def listos(x):
        return "hoja" in x or id(x) in hechos

    def en_orden(x):
        return [] if "hoja" in x else en_orden(x["izq"]) + [x] + en_orden(x["der"])

    def lado(x):
        if "hoja" in x:
            return str(variables.get(x["hoja"], x["hoja"]))
        return x["valor"]

    pasos = []
    while not listos(a):
        candidatos = [x for x in en_orden(a) if id(x) not in hechos and listos(x["izq"]) and listos(x["der"])]
        mejor = max(candidatos, key=lambda x: PRIORIDAD[x["op"]])
        pasos.append(f"{lado(mejor['izq'])} {mejor['op']} {lado(mejor['der'])} = {mejor['valor']}")
        hechos.add(id(mejor))
    return pasos


def expresion(fuente, variables, nivel):
    a = arbol(ast.parse(fuente, mode="eval").body, fuente, variables)
    final = str(eval(fuente, {"__builtins__": {}}, dict(variables)))  # noqa: S307
    assert final == a["valor"], f"{fuente}: el árbol no coincide con Python"
    programa = "".join(f"{k} = {v}\n" for k, v in variables.items()) + f"print({fuente})"
    salida = io.StringIO()
    with contextlib.redirect_stdout(salida):
        exec(programa, {})
    assert salida.getvalue().strip() == final, f"{fuente}: print no coincide"
    return {"nivel": nivel, "variables": variables, "expresion": fuente, "final": final,
            "pasos": pasos_canonicos(a, variables)}


def generar_expresiones(por_nivel=40, semilla=2026):
    azar = random.Random(semilla)
    lista = []
    vistas = set()
    prohibidas = {" ".join(t.split()) for t in DEL_TEST}
    for nivel, plantillas in PLANTILLAS.items():
        hechas = 0
        intentos = 0
        while hechas < por_nivel:
            intentos += 1
            assert intentos < 50000, f"nivel {nivel}: no salen suficientes expresiones"
            plantilla = azar.choice(plantillas)
            texto = plantilla
            for letra in "abcd":
                if letra in texto:
                    i = texto.index(letra)
                    if texto[i + 1:i + 4] == " **":
                        numero = azar.randint(2, 5)  # la base de una potencia, chica
                    elif letra == "a":
                        numero = azar.randint(5, 20)
                    else:
                        numero = azar.randint(2, 6)
                    texto = texto.replace(letra, str(numero))
            variables = {}
            if "x" in plantilla:
                variables["x"] = azar.randint(5, 20)
            if "y" in plantilla:
                variables["y"] = azar.randint(2, 6)
            try:
                e = expresion(texto, variables, nivel)
            except (ValueError, ZeroDivisionError):
                continue
            clave = texto + str(variables)
            if " ".join(texto.split()) in prohibidas or clave in vistas:
                continue
            if e["final"] in ("0", "0.0") and azar.random() < 0.7:
                continue
            vistas.add(clave)
            lista.append(e)
            hechas += 1
    return lista


# ---------- El archivero (listas) ----------

def generar_listas(conjuntos=40, por_conjunto=4, semilla=2026):
    azar = random.Random(semilla)
    funciones = []
    espacio = {}
    for n, codigo in enumerate(LISTAS_FUNCIONES, 1):
        assert codigo.startswith(f"def f{n}("), f"la función {n} debe llamarse f{n}"
        exec(codigo, espacio)
        funciones.append({"id": n, "codigo": codigo})
    salida = []
    for _ in range(conjuntos):
        largo = azar.choice([5, 6])
        otra = azar.choice(list(OTRAS_LISTAS))
        listas = {"nombres": azar.sample(NOMBRES, largo), otra: azar.sample(OTRAS_LISTAS[otra], largo)}
        todos = [v for vs in listas.values() for v in vs]
        assert len(set(map(repr, todos))) == len(todos), "cada caja debe tener un valor distinto"
        retos = []
        for n in azar.sample(range(1, len(LISTAS_FUNCIONES) + 1), por_conjunto):
            codigo = LISTAS_FUNCIONES[n - 1]
            definicion = ast.parse(codigo).body[0]
            params = [a.arg for a in definicion.args.args]
            una, otra_lista = azar.sample(list(listas), 2)
            args = {"lista1": una}
            if "lista2" in params:
                args["lista2"] = otra_lista
            if "i" in params:
                minimo = 0 if n == 7 else 1
                maximo = largo - 1 if n == 7 else largo
                args["i"] = str(azar.randint(minimo, maximo))
            if "x" in params:
                args["x"] = valor_py(azar.choice(listas[una]))
            llamada = f"f{n}({', '.join(args[p] for p in params)})"
            regresa = eval(llamada, dict(espacio), {k: list(v) for k, v in listas.items()})  # noqa: S307
            cajas = [(k, i) for k, vs in listas.items() for i, v in enumerate(vs) if v == regresa and type(v) is type(regresa)]
            assert len(cajas) == 1, f"{llamada}: la respuesta debe estar en una sola caja ({cajas})"
            lista, indice = cajas[0]
            # el renglón del return, con los valores puestos, hasta llegar a la posición
            ret = definicion.body[-1].value
            assert isinstance(ret, ast.Subscript) and isinstance(ret.value, ast.Name), f"f{n}: debe regresar lista[algo]"
            idx_texto = ast.get_source_segment(codigo, ret.slice)
            idx_con_valores = reemplazar(idx_texto, ret.slice.col_offset,
                                         [(x.col_offset, x.end_col_offset, args[x.id]) for x in ast.walk(ret.slice)
                                          if isinstance(x, ast.Name) and x.id in args])
            posicion = eval(idx_con_valores, {}, {k: list(v) for k, v in listas.items()})  # noqa: S307
            assert posicion % largo == indice, f"{llamada}: la posición no coincide"
            pasos = sin_repetir([f"{ret.value.id}[{idx_texto}]", f"{lista}[{idx_con_valores}]", f"{lista}[{posicion}]", f"{lista}[{indice}]"])
            retos.append({"f": n, "llamada": llamada, "lista": list(listas).index(lista), "indice": indice,
                          "valor": valor_py(regresa), "parametros": [f"{p} = {args[p]}" for p in params], "pasos": pasos})
        salida.append({"listas": [{"nombre": k, "valores": [valor_py(v) for v in vs]} for k, vs in listas.items()], "retos": retos})
    return {"funciones": funciones, "conjuntos": salida}


# ---------- datos para el visor ----------

def exportar(nombre, variable, datos):
    ruta = RAIZ / "js" / nombre
    ruta.write_text(f"// Generado por generador/generar.py a partir de bancos.py. No editar a mano.\nwindow.{variable} = "
                    + json.dumps(datos, ensure_ascii=False) + ";\n", encoding="utf-8")


# ---------- PDF ----------

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
pre { margin: 0; white-space: pre; font-size: 10pt; line-height: 1.3; }
.rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.tarjeta { border: 1.2px solid #c9ced6; border-radius: 6px; padding: 2mm 3.5mm; break-inside: avoid; }
.tarjeta .num { color: #2F6FBF; font-weight: 700; }
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


def tarjetas_codigo(funciones, titulo):
    return "".join(f"""<div class="tarjeta"><h3><span class="num">{titulo(f)}</span>{f" <span class='tema'>· {esc(f['tema'])}</span>" if f.get('tema') else ''}</h3>
<pre>{esc(f['codigo'])}</pre></div>""" for f in funciones)


def manual_interprete(datos):
    return pagina("Manual · Intérprete humano", f"""
<div class="marca">ENLACE VR · PYTHON · MANUAL DEL EQUIPO</div>
<h1>Intérprete humano</h1>
<div class="aviso">El Operador les lee una instrucción como <span class="mono">print(f3(9, 2))</span>. Busquen la
función 3, pongan los valores en los parámetros (el primero al primero) y díganle <b>exactamente</b> qué imprime Python.
Ojo: <span class="mono">4.0</span> no es lo mismo que <span class="mono">4</span>. El Operador dispara a esa respuesta.</div>
<table>
<tr><th>Operador</th><th>Qué hace</th><th>Ejemplo</th></tr>
<tr><td class="mono">//</td><td>divide y quita los decimales</td><td class="mono">17 // 5 = 3</td></tr>
<tr><td class="mono">%</td><td>el residuo (lo que sobra)</td><td class="mono">17 % 5 = 2</td></tr>
<tr><td class="mono">/</td><td>divide y siempre da decimal</td><td class="mono">8 / 2 = 4.0</td></tr>
<tr><td class="mono">**</td><td>potencia</td><td class="mono">2 ** 3 = 8</td></tr>
<tr><td>Orden</td><td colspan="2"><span class="mono">( )</span> → <span class="mono">**</span> → <span class="mono">*  /  //  %</span> (de izquierda a derecha) → <span class="mono">+  -</span></td></tr>
</table>
<div class="rejilla">{tarjetas_codigo(datos["funciones"], lambda f: f"Función {f['id']}")}</div>""")


def manual_logica(datos):
    return pagina("Manual · El cadenero", f"""
<div class="marca">ENLACE VR · PYTHON · MANUAL DEL EQUIPO</div>
<h1>El cadenero</h1>
<div class="aviso">El Operador les dice el <b>número de función</b> y los valores, por ejemplo
<span class="mono">entra(18, 1.60)</span>: parámetro 1 = 18, parámetro 2 = 1.60. Pongan cada valor en su parámetro
(<span class="mono">edad = 18</span>, <span class="mono">estatura = 1.60</span>), resuelvan cada comparación y
díganle qué <b>regresa</b> la función. El Operador elige esa respuesta.</div>
<table>
<tr><th>Operador</th><th>Da True cuando…</th><th>Ejemplo</th></tr>
<tr><td class="mono">and</td><td>las <b>dos</b> partes son True</td><td class="mono">True and False → False</td></tr>
<tr><td class="mono">or</td><td><b>al menos una</b> parte es True</td><td class="mono">True or False → True</td></tr>
<tr><td class="mono">not</td><td>lo de adelante es False (lo voltea)</td><td class="mono">not True → False</td></tr>
<tr><td>Orden</td><td colspan="2">primero las comparaciones (<span class="mono">&gt;  &lt;  &gt;=  &lt;=  ==  !=</span>), luego
<span class="mono">not</span>, luego <span class="mono">and</span> y al final <span class="mono">or</span>. Lo que está entre ( ) va primero.</td></tr>
<tr><td>Truco</td><td colspan="2">Escriban True o False arriba de cada comparación; luego júntenlas con and / or.</td></tr>
</table>
<div class="rejilla">{tarjetas_codigo(datos["funciones"], lambda f: f"Función {f['id']} · {f['nombre']}")}</div>""")


def manual_calculadora(ejemplo):
    pasos = "".join(f"<tr><td class='mono'>{i}</td><td class='mono'>{esc(p)}</td></tr>" for i, p in enumerate(ejemplo["pasos"], 1))
    hoja = "".join("<tr><td style='height:10mm'></td><td style='width:35mm'></td></tr>" for _ in range(6))
    return pagina("Manual · Calculadora humana", f"""
<div class="marca">ENLACE VR · PYTHON · MANUAL DEL EQUIPO</div>
<h1>Calculadora humana</h1>
<div class="aviso">El del visor ve una expresión, por ejemplo <span class="mono">print(3 + 17 % 5 * 2)</span>, la
resuelve y escribe <b>solo el resultado final</b> en el teclado. El equipo puede ayudar en voz alta (usen esta hoja).
Cuando lleva <b>{ACIERTOS_POR_TURNO} correctas</b>, el visor dice <b>¡Siguiente!</b> y se lo pasan a otro del equipo.
Python es exacto: <span class="mono">4.0</span> no es lo mismo que <span class="mono">4</span>.</div>
<div class="rejilla">
<div>
<h2>¿Qué va primero?</h2>
<table>
<tr><th>Orden</th><th>Operadores</th><th>Nota</th></tr>
<tr><td>1</td><td class="mono">( )</td><td>lo de adentro primero</td></tr>
<tr><td>2</td><td class="mono">**</td><td>potencia</td></tr>
<tr><td>3</td><td class="mono">*  /  //  %</td><td>de izquierda a derecha</td></tr>
<tr><td>4</td><td class="mono">+  -</td><td>de izquierda a derecha</td></tr>
</table>
<h2>¿Entero o decimal?</h2>
<table>
<tr><td class="mono">/</td><td>siempre da decimal: <span class="mono">8 / 2 = 4.0</span></td></tr>
<tr><td class="mono">//</td><td>divide y quita los decimales: <span class="mono">17 // 5 = 3</span></td></tr>
<tr><td class="mono">%</td><td>el residuo: <span class="mono">17 % 5 = 2</span></td></tr>
<tr><td class="mono">**</td><td>potencia: <span class="mono">3 ** 2 = 9</span></td></tr>
<tr><td>mezcla</td><td>entero con decimal da decimal: <span class="mono">1 + 4.0 = 5.0</span></td></tr>
</table>
</div>
<div>
<h2>Ejemplo resuelto</h2>
<p class="mono">print({esc(ejemplo['expresion'])})</p>
<table><tr><th>Paso</th><th>Operación</th></tr>{pasos}</table>
<p>Imprime: <span class="mono"><b>{esc(ejemplo['final'])}</b></span></p>
</div>
</div>
<h2>Hoja de trabajo</h2>
<table><tr><th>Expresión y pasos</th><th>Resultado</th></tr>{hoja}</table>""")


def manual_listas(datos):
    return pagina("Manual · El archivero", f"""
<div class="marca">ENLACE VR · PYTHON · MANUAL DEL EQUIPO</div>
<h1>El archivero</h1>
<div class="aviso">El Operador ve dos listas como cajas (por ejemplo <span class="mono">nombres</span> y
<span class="mono">edades</span>) y les lee una llamada, por ejemplo <span class="mono">f3(nombres)</span>. Busquen la función:
<span class="mono">lista1</span> es la lista que mandaron (aquí, <span class="mono">nombres</span>). Díganle <b>qué caja</b>
regresa la función ("el último de nombres", "la posición 2 de edades") y él la toca.</div>
<table>
<tr><th>Recuerden</th><th>Ejemplo con lista = ["Ana", "Luis", "Eva", "Omar", "Zoe"]</th></tr>
<tr><td>La primera posición es la <b>0</b></td><td class="mono">lista[0] → "Ana" · lista[2] → "Eva"</td></tr>
<tr><td>Los negativos cuentan desde el final</td><td class="mono">lista[-1] → "Zoe" · lista[-2] → "Omar"</td></tr>
<tr><td><span class="mono">len</span> es cuántos elementos hay</td><td class="mono">len(lista) → 5 · lista[len(lista) - 1] → "Zoe"</td></tr>
<tr><td><span class="mono">index</span> dice en qué posición está</td><td class="mono">lista.index("Eva") → 2</td></tr>
<tr><td>Los valores entran <b>en orden</b></td><td>en <span class="mono">f10(edades, nombres)</span>: <span class="mono">lista1</span> es edades y <span class="mono">lista2</span> es nombres</td></tr>
</table>
<div class="rejilla">{tarjetas_codigo(datos["funciones"], lambda f: f"Función {f['id']}")}</div>""")


INSTRUCTIVOS = {
    "calculadora": ("Calculadora humana", "Precedencia de operadores, / contra //, % y **, entero contra decimal.",
                    ["El del visor ve una expresión, por ejemplo <span class='mono'>print(3 + 17 % 5 * 2)</span>, y la resuelve. El equipo puede ayudar en voz alta.",
                     "Escribe en el teclado <b>solo el resultado final</b> y presiona OK. Si se equivoca, la vuelve a intentar.",
                     f"Con {ACIERTOS_POR_TURNO} correctas sale <b>¡Siguiente!</b>: el reloj se detiene y pasan el visor a otro del equipo."]),
    "interprete": ("Intérprete humano", "Operadores //, %, /, ** y su orden; parámetros; if sencillos.",
                   ["El Operador lee la instrucción, por ejemplo <span class='mono'>print(f3(9, 2))</span>.",
                    "El equipo busca la función 3, la sigue a mano con esos valores y dice exactamente qué imprime Python.",
                    "El Operador dispara a la puerta con esa respuesta. Después el visor muestra la función y la respuesta."]),
    "logica": ("El cadenero", "and, or, not, comparaciones y parámetros.",
               ["El Operador ve la llamada, por ejemplo <span class='mono'>entra(18, 1.60)</span>, y el valor de cada parámetro. Se los dice al equipo.",
                "El equipo busca la función en su hoja, resuelve cada comparación (True o False) y las junta con and / or / not.",
                "El Operador elige lo que le digan que regresa. Después el visor muestra cada comparación resuelta."]),
    "listas": ("El archivero", "Listas: posiciones desde 0, negativos, len, index y parámetros.",
               ["El Operador ve dos listas como cajas y lee la llamada, por ejemplo <span class='mono'>f3(nombres)</span>.",
                "El equipo busca la función 3 y le dice qué caja regresa (\"el último de nombres\").",
                "El Operador toca esa caja. Después el visor muestra la función y la posición que regresa."]),
}


def instructivo(clave):
    titulo, temas, pasos = INSTRUCTIVOS[clave]
    cajas = "".join(f"<div class='paso-grande'><b>{i}</b>{p}</div>" for i, p in enumerate(pasos, 1))
    return pagina(f"Instructivo · {titulo}", f"""
<div class="marca">ENLACE VR · PYTHON · INSTRUCTIVO DEL PROFESOR</div>
<h1>{titulo}</h1>
<p class="sub">Temas: {temas}</p>
<h2>Cómo se juega</h2>
<div class="tres">{cajas}</div>
<h2>Antes de empezar (5 min)</h2>
<ol>
<li>En cada visor abre el sitio y en el menú elige el <b>equipo</b> (1 a 8).</li>
<li>Imprime para cada equipo el <b>manual del juego</b> y la hoja de puntajes (página Cómo empezar).</li>
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
<p>Pregunta: <i>"¿Qué les costó más y por qué?"</i> Pídeles que expliquen un error que cometieron:
ahí está el aprendizaje.</p>
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
    interprete = comprobar_interprete()
    logica = generar_logica()
    expresiones = generar_expresiones()
    listas = generar_listas()
    print(f"comprobado en Python: {len(interprete['retos'])} preguntas del intérprete, {len(logica['retos'])} llamadas del cadenero, "
          f"{len(expresiones)} expresiones, {sum(len(c['retos']) for c in listas['conjuntos'])} preguntas de listas")
    exportar("datos_interprete.js", "INTERPRETE", interprete)
    exportar("datos_logica.js", "LOGICA", logica)
    exportar("datos_calculadora.js", "CALCULADORA", expresiones)
    exportar("datos_listas.js", "LISTAS", listas)
    pdf = "--sin-pdf" not in sys.argv
    guardar("Manual_Calculadora_humana", manual_calculadora(expresion(EJEMPLO_MANUAL, {}, 2)), pdf)
    guardar("Manual_Interprete_humano", manual_interprete(interprete), pdf)
    guardar("Manual_El_cadenero", manual_logica(logica), pdf)
    guardar("Manual_El_archivero", manual_listas(listas), pdf)
    for clave, nombre in [("calculadora", "Calculadora_humana"), ("interprete", "Interprete_humano"), ("logica", "El_cadenero"), ("listas", "El_archivero")]:
        guardar(f"Instructivo_{nombre}", instructivo(clave), pdf)


if __name__ == "__main__":
    main()
