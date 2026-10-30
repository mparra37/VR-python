"""Bancos de ejercicios de Enlace VR · Python.

Todo lo que el juego muestra como respuesta se calcula EJECUTANDO este código en generar.py:
- Intérprete humano: cada pregunta es print(fN(args)); la respuesta correcta es lo que Python imprime
  y las respuestas falsas salen de correr versiones "con el error típico" de la misma función.
- El cadenero: cada llamada se corre en Python; también se evalúa cada comparación de la condición
  para explicar por qué da True o False.
- Calculadora humana: cada expresión (y cada paso) se evalúa con Python.
- El archivero: cada llamada se corre en Python con las listas del reto; la respuesta es la caja que
  tiene el valor que regresa.
"""

# ---------------------------------------------------------------------------
# Intérprete humano: funciones numeradas del manual. "args" = cada llamada que puede salir.
# Números chicos para hacer las cuentas en la cabeza; cada función practica un operador.
# "errores" = la misma función con un error típico (de ahí salen las respuestas falsas).
# ---------------------------------------------------------------------------

FUNCIONES = [
    {
        "codigo": "def f1(a, b):\n    return a // b",
        "args": ["9, 2", "17, 5", "20, 6", "8, 3", "3, 4"],
        "errores": ["def f1(a, b):\n    return a / b", "def f1(a, b):\n    return a % b"],
        "tema": "// (división entera)",
    },
    {
        "codigo": "def f2(a, b):\n    return a % b",
        "args": ["9, 2", "17, 5", "20, 6", "8, 4", "3, 4"],
        "errores": ["def f2(a, b):\n    return a // b", "def f2(a, b):\n    return a / b"],
        "tema": "% (residuo)",
    },
    {
        "codigo": "def f3(a, b):\n    return a / b",
        "args": ["8, 2", "9, 2", "10, 4", "6, 3", "5, 2"],
        "errores": ["def f3(a, b):\n    return a // b", "def f3(a, b):\n    return a % b"],
        "tema": "/ (siempre da decimal)",
    },
    {
        "codigo": "def f4(a, b):\n    return a ** b",
        "args": ["2, 3", "3, 2", "10, 2", "5, 0", "1, 4"],
        "errores": ["def f4(a, b):\n    return a * b", "def f4(a, b):\n    return b ** a"],
        "tema": "** (potencia)",
    },
    {
        "codigo": "def f5(x):\n    return 2 + x * 3",
        "args": ["1", "2", "4", "10", "0"],
        "errores": ["def f5(x):\n    return (2 + x) * 3", "def f5(x):\n    return 2 * x + 3"],
        "tema": "primero * y luego +",
    },
    {
        "codigo": "def f6(n):\n    return n // 10 + n % 10",
        "args": ["25", "47", "90", "13", "8"],
        "errores": ["def f6(n):\n    return n / 10 + n % 10", "def f6(n):\n    return n % 10", "def f6(n):\n    return n // 10"],
        "tema": "// y % juntos",
    },
    {
        "codigo": "def f7(a, b):\n    return a // b * b",
        "args": ["17, 5", "10, 3", "9, 2", "12, 4", "7, 10"],
        "errores": ["def f7(a, b):\n    return a // (b * b)", "def f7(a, b):\n    return a / b * b", "def f7(a, b):\n    return a % b * b"],
        "tema": "de izquierda a derecha",
    },
    {
        "codigo": "def f8(x):\n    return 10 - x % 3",
        "args": ["7", "9", "5", "4", "2"],
        "errores": ["def f8(x):\n    return (10 - x) % 3", "def f8(x):\n    return 10 - x // 3"],
        "tema": "% antes que -",
    },
    {
        "codigo": 'def f9(n):\n    if n % 2 == 0:\n        return "par"\n    else:\n        return "impar"',
        "args": ["8", "7", "10", "15", "0"],
        "errores": ['def f9(n):\n    if n % 2 == 1:\n        return "par"\n    else:\n        return "impar"', 'def f9(n):\n    if n // 2 == 0:\n        return "par"\n    else:\n        return "impar"'],
        "tema": "% 2 para saber si es par",
    },
    {
        "codigo": "def f10(precio):\n    if precio >= 100:\n        return precio - 20\n    return precio",
        "args": ["150", "100", "80", "99", "120"],
        "errores": ["def f10(precio):\n    if precio > 100:\n        return precio - 20\n    return precio", "def f10(precio):\n    return precio - 20"],
        "tema": "if y una resta",
    },
]

# Llamadas que están en el test de antes y después (no deben salir en el juego).
DEL_TEST_LLAMADAS = ["f1(7, 2)", "f3(500)", "f5(15)", "f6(17, True)", "f8(3)"]

# ---------------------------------------------------------------------------
# El cadenero (and, or, not): el visor muestra los valores de los parámetros y la llamada;
# el equipo tiene la función completa. "nivel": 1 = un and u or; 2 = not y parámetros True/False;
# 3 = if/elif con varias condiciones.
# ---------------------------------------------------------------------------

LOGICA = [
    {"nivel": 1, "codigo": "def entra(edad, estatura):\n    if edad >= 18 and estatura > 1.50:\n        return True\n    else:\n        return False",
     "args": ["18, 1.60", "17, 1.80", "25, 1.45", "16, 1.40", "30, 1.51"]},
    {"nivel": 1, "codigo": "def descuento(edad):\n    return edad < 12 or edad >= 60",
     "args": ["8", "35", "60", "12", "70"]},
    {"nivel": 1, "codigo": "def en_rango(x):\n    return x >= 1 and x <= 10",
     "args": ["5", "0", "10", "11", "1"]},
    {"nivel": 1, "codigo": 'def es_finde(dia):\n    return dia == "sábado" or dia == "domingo"',
     "args": ['"lunes"', '"domingo"', '"sábado"', '"viernes"']},
    {"nivel": 2, "codigo": "def puede_jugar(tarea, castigado):\n    return tarea and not castigado",
     "args": ["True, False", "True, True", "False, False", "False, True"]},
    {"nivel": 2, "codigo": "def abierto(hora, festivo):\n    return hora >= 9 and hora < 18 and not festivo",
     "args": ["10, False", "20, False", "12, True", "9, False", "18, False"]},
    {"nivel": 2, "codigo": "def aprueba(cal, faltas):\n    return cal >= 70 and not faltas > 3",
     "args": ["85, 2", "85, 5", "60, 0", "70, 3"]},
    {"nivel": 2, "codigo": "def par_positivo(n):\n    return n % 2 == 0 and n > 0",
     "args": ["4", "7", "-2", "0", "10"]},
    {"nivel": 3, "codigo": 'def boleto(edad, estudiante):\n    if edad < 12 or estudiante:\n        return "Medio"\n    elif edad >= 60:\n        return "Gratis"\n    else:\n        return "Completo"',
     "args": ["10, False", "20, True", "65, False", "65, True", "30, False"]},
    {"nivel": 3, "codigo": 'def clima(temp, lluvia):\n    if lluvia and temp < 15:\n        return "Quédate"\n    elif lluvia or temp < 15:\n        return "Chamarra"\n    else:\n        return "Sal"',
     "args": ["10, True", "10, False", "25, True", "25, False", "15, True"]},
    {"nivel": 3, "codigo": "def acceso(edad, invitado, vip):\n    return (edad >= 18 and invitado) or vip",
     "args": ["20, True, False", "16, True, False", "16, False, True", "20, False, False"]},
    {"nivel": 3, "codigo": "def beca(prom, ingreso):\n    return prom >= 90 or (prom >= 80 and ingreso < 5000)",
     "args": ["95, 9000", "85, 3000", "85, 7000", "75, 2000"]},
]

# ---------------------------------------------------------------------------
# Calculadora humana: el del visor calcula TODO y escribe solo el resultado final (el equipo puede
# ayudar en voz alta). Cuentas sencillas: generar.py arma las expresiones al azar con estas plantillas
# (a = un número de 5 a 20; b, c, d = números de 2 a 6; x, y = variables). Python las evalúa y descarta
# las que dan números grandes o decimales largos.
# ---------------------------------------------------------------------------

# Ejemplo resuelto del manual.
EJEMPLO_MANUAL = "3 + 17 % 5 * 2"
# Las preguntas del test de antes y después NO deben salir en el juego (si no, el test ya no mide).
DEL_TEST = ["7 // 2 + 7 % 2", "2 + 3 * 4 ** 2 // 8"]

PLANTILLAS = {
    1: ["a // b", "a % b", "a / b", "b ** 2", "b ** 3", "a + b * c", "a - b * c"],
    2: ["a // b + c", "a % b + c", "a % b * c", "a // b * c", "(a + b) // c", "a - b ** 2", "c + a / b", "(a - b) % c"],
    3: ["a + b * c // d", "a % b + c ** 2", "(a + b) % c * d", "x // y + x % y", "x % y * 2", "a // b - c % d", "a / b + c * d"],
}

# ---------------------------------------------------------------------------
# El archivero (listas): el visor muestra dos listas como cajas; el equipo tiene estas funciones.
# El Operador lee la llamada (por ejemplo f3(nombres)) y toca la caja que regresa la función.
# ---------------------------------------------------------------------------

LISTAS_FUNCIONES = [
    "def f1(lista1):\n    return lista1[0]",
    "def f2(lista1):\n    return lista1[2]",
    "def f3(lista1):\n    return lista1[-1]",
    "def f4(lista1):\n    return lista1[-2]",
    "def f5(lista1):\n    return lista1[len(lista1) - 1]",
    "def f6(lista1):\n    return lista1[len(lista1) // 2]",
    "def f7(lista1, i):\n    return lista1[i]",
    "def f8(lista1, i):\n    return lista1[i - 1]",
    "def f9(lista1, i):\n    return lista1[-i]",
    "def f10(lista1, lista2):\n    return lista2[0]",
    "def f11(lista1, lista2, x):\n    return lista2[lista1.index(x)]",
]

# Datos para armar las listas (palabras cortas para que se lean bien en el visor).
NOMBRES = ["Ana", "Luis", "Eva", "Omar", "Sofía", "Iván", "Zoe", "Leo", "Paty", "Raúl", "Nora", "Beto", "Mar", "Toño"]
OTRAS_LISTAS = {
    "edades": list(range(16, 26)),
    "ciudades": ["León", "Colima", "Tepic", "Puebla", "Mérida", "Toluca", "Celaya", "Oaxaca"],
    "colores": ["rojo", "azul", "verde", "gris", "negro", "rosa", "café", "blanco"],
    "califs": [60, 65, 70, 75, 80, 85, 90, 95, 100],
}
