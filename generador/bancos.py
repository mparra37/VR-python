"""Bancos de ejercicios de Enlace VR · Python (TC1037 y TC1038).

Todo lo que el juego muestra como respuesta se calcula EJECUTANDO este código en generar.py:
- Arma el programa: cada programa se corre con las entradas del ejemplo y su salida debe ser igual
  al ejemplo que trae el manual.
- Intérprete humano: cada pregunta es print(fN(args)); la respuesta correcta es lo que Python imprime
  y las respuestas falsas salen de correr versiones "con el error típico" de la misma función.
"""

# ---------------------------------------------------------------------------
# Arma el programa (rompecabezas de código).
# "pasos" = pseudocódigo del manual del equipo (con sangría de 3 espacios por nivel).
# "lineas" = el programa en orden; "trampas" = líneas que se parecen pero no van.
# "entradas" = lo que se escribe en input() para el ejemplo; "salida" = lo que debe imprimir.
# ---------------------------------------------------------------------------

PROGRAMAS = {
    "TC1037": [
        {
            "titulo": "Área de un rectángulo",
            "descripcion": "Pide la base y la altura de un rectángulo y muestra su área.",
            "pasos": ["Pide la base (decimal).", "Pide la altura (decimal).", "Calcula el área: base por altura.", "Muestra el área."],
            "lineas": ['base = float(input("Base: "))', 'altura = float(input("Altura: "))', "area = base * altura", 'print("Área:", area)'],
            "trampas": ["area = base + altura", 'print("Área:", base)'],
            "entradas": ["4", "2.5"],
            "salida": "Base: Altura: Área: 10.0",
        },
        {
            "titulo": "Minutos a horas",
            "descripcion": "Pide un total de minutos y lo muestra en horas y minutos.",
            "pasos": ["Pide el total de minutos (entero).", "Las horas son el total dividido entre 60, sin decimales.", "Los minutos que sobran son el residuo entre 60.", "Muestra horas y minutos."],
            "lineas": ['total = int(input("Minutos: "))', "horas = total // 60", "minutos = total % 60", 'print(horas, "h", minutos, "min")'],
            "trampas": ["horas = total / 60", "minutos = total // 60"],
            "entradas": ["135"],
            "salida": "Minutos: 2 h 15 min",
        },
        {
            "titulo": "Mesas para el salón",
            "descripcion": "En cada mesa caben 4 alumnos. Pide cuántos alumnos hay y muestra cuántas mesas se necesitan.",
            "pasos": ["Usa la biblioteca de matemáticas.", "Pide el número de alumnos (entero).", "Mesas: alumnos entre 4, redondeado hacia ARRIBA.", "Muestra las mesas."],
            "lineas": ["import math", 'alumnos = int(input("Alumnos: "))', "mesas = math.ceil(alumnos / 4)", 'print("Mesas:", mesas)'],
            "trampas": ["mesas = math.floor(alumnos / 4)", "mesas = alumnos // 4"],
            "entradas": ["25"],
            "salida": "Alumnos: Mesas: 7",
        },
        {
            "titulo": "Descuento en la tienda",
            "descripcion": "Si la compra es de $500 o más, tiene 10% de descuento. Muestra el total a pagar.",
            "pasos": ["Pide el total de la compra (decimal).", "Si el total es 500 o más:", "   el total ahora es el 90% del total.", "Muestra el total a pagar (fuera del si)."],
            "lineas": ['total = float(input("Total de la compra: "))', "if total >= 500:", "    total = total * 0.9", 'print("Total a pagar:", total)'],
            "trampas": ["if total > 500:", '    print("Total a pagar:", total)', "    total = total * 0.1"],
            "entradas": ["600"],
            "salida": "Total de la compra: Total a pagar: 540.0",
        },
        {
            "titulo": "Par o impar",
            "descripcion": "Pide un número entero y dice si es par o impar.",
            "pasos": ["Pide un número entero n.", "Si el residuo de n entre 2 es 0:", "   muestra Par.", "Si no:", "   muestra Impar."],
            "lineas": ['n = int(input("Número: "))', "if n % 2 == 0:", '    print("Par")', "else:", '    print("Impar")'],
            "trampas": ["if n // 2 == 0:", "if n % 2 = 0:", 'print("Par")'],
            "entradas": ["7"],
            "salida": "Número: Impar",
        },
        {
            "titulo": "Promedio y aprobado",
            "descripcion": "La función promedio(c1, c2, c3) regresa el promedio de tres calificaciones. Se aprueba con 70 o más.",
            "pasos": ["Define la función promedio con c1, c2 y c3:", "   regresa la suma de las tres entre 3.", "Guarda en p el promedio de 80, 90 y 70.", "Muestra el promedio.", "Si p es 70 o más:", "   muestra Aprobado.", "Si no:", "   muestra Reprobado."],
            "lineas": ["def promedio(c1, c2, c3):", "    return (c1 + c2 + c3) / 3", "p = promedio(80, 90, 70)", 'print("Promedio:", p)', "if p >= 70:", '    print("Aprobado")', "else:", '    print("Reprobado")'],
            "trampas": ["    return c1 + c2 + c3 / 3", "    print((c1 + c2 + c3) / 3)"],
            "entradas": [],
            "salida": "Promedio: 80.0 Aprobado",
        },
        {
            "titulo": "Compra válida",
            "descripcion": "Pide el total. Si es negativo, avisa del error. Si es 500 o más, cobra con 10% de descuento. Si no, cobra completo.",
            "pasos": ["Pide el total (decimal).", "Si el total es menor que 0:", "   muestra el error.", "Si no, pero si es 500 o más:", "   muestra el total con 10% de descuento.", "Si no:", "   muestra el total completo."],
            "lineas": ['total = float(input("Total: "))', "if total < 0:", '    print("Error: no puede ser negativo")', "elif total >= 500:", '    print("Pagas:", total * 0.9)', "else:", '    print("Pagas:", total)'],
            "trampas": ["if total >= 500:", '    print("Pagas:", total * 0.1)'],
            "entradas": ["300"],
            "salida": "Total: Pagas: 300.0",
        },
        {
            "titulo": "Estacionamiento",
            "descripcion": "La primera hora cuesta $20 y cada hora extra $15. La función tarifa(horas) regresa cuánto se paga.",
            "pasos": ["Define la función tarifa con horas:", "   si las horas son 1 o menos:", "      regresa 20.", "   regresa 20 más 15 por cada hora extra.", "Pide las horas (entero).", "Muestra lo que se paga."],
            "lineas": ["def tarifa(horas):", "    if horas <= 1:", "        return 20", "    return 20 + (horas - 1) * 15", 'h = int(input("Horas: "))', 'print("Pagas:", tarifa(h))'],
            "trampas": ["    return 20 + horas * 15", "        print(20)"],
            "entradas": ["3"],
            "salida": "Horas: Pagas: 50",
        },
    ],
    "TC1038": [
        {
            "titulo": "Suma de 1 a n",
            "descripcion": "Pide n y muestra la suma 1 + 2 + … + n usando un ciclo for.",
            "pasos": ["Pide n (entero).", "Empieza la suma en 0.", "Para cada i de 1 a n (incluido n):", "   suma i a la suma.", "Muestra la suma (fuera del ciclo)."],
            "lineas": ['n = int(input("n: "))', "suma = 0", "for i in range(1, n + 1):", "    suma += i", 'print("Suma:", suma)'],
            "trampas": ["for i in range(1, n):", '    print("Suma:", suma)'],
            "entradas": ["5"],
            "salida": "n: Suma: 15",
        },
        {
            "titulo": "Cuenta regresiva",
            "descripcion": "Pide un número y cuenta hacia atrás hasta 1 con un ciclo while. Al final muestra ¡Despegue!",
            "pasos": ["Pide el número n (entero).", "Mientras n sea mayor que 0:", "   muestra n.", "   réstale 1 a n.", "Muestra ¡Despegue!"],
            "lineas": ['n = int(input("Desde: "))', "while n > 0:", "    print(n)", "    n -= 1", 'print("¡Despegue!")'],
            "trampas": ["while n >= 0:", "n -= 1"],
            "entradas": ["3"],
            "salida": "Desde: 3 2 1 ¡Despegue!",
        },
        {
            "titulo": "Promedio del grupo",
            "descripcion": "Calcula el promedio de una lista de promedios sin usar sum().",
            "pasos": ["Crea la lista prom con 92.5, 64.5 y 84.0.", "Empieza el total en 0.", "Para cada p en prom:", "   súmale p al total.", "Muestra total entre el tamaño de la lista, con 2 decimales."],
            "lineas": ["prom = [92.5, 64.5, 84.0]", "total = 0", "for p in prom:", "    total += p", "print(round(total / len(prom), 2))"],
            "trampas": ["    total = p", "print(round(total / 2, 2))"],
            "entradas": [],
            "salida": "80.33",
        },
        {
            "titulo": "Buscar alumno",
            "descripcion": "La función buscar(nombres, x) regresa la posición de x en la lista, o -1 si no está.",
            "pasos": ["Define la función buscar con nombres y x:", "   para cada posición i de la lista:", "      si el nombre en i es x:", "         regresa i.", "   después del ciclo, regresa -1.", "Muestra buscar de la lista Ana, Javier, Omar con Omar."],
            "lineas": ["def buscar(nombres, x):", "    for i in range(len(nombres)):", "        if nombres[i] == x:", "            return i", "    return -1", 'print(buscar(["Ana", "Javier", "Omar"], "Omar"))'],
            "trampas": ["        return -1", "            return x"],
            "entradas": [],
            "salida": "2",
        },
        {
            "titulo": "Lista de aprobados",
            "descripcion": "Con dos listas paralelas, arma una lista nueva con los nombres de quienes tienen 70 o más.",
            "pasos": ["Crea la lista nombres: Ana, Javier, Omar.", "Crea la lista prom: 92.5, 64.5, 84.0.", "Empieza aprobados como lista vacía.", "Para cada posición i:", "   si el promedio en i es 70 o más:", "      agrega el NOMBRE en i a aprobados.", "Muestra aprobados y cuántos son."],
            "lineas": ['nombres = ["Ana", "Javier", "Omar"]', "prom = [92.5, 64.5, 84.0]", "aprobados = []", "for i in range(len(prom)):", "    if prom[i] >= 70:", "        aprobados.append(nombres[i])", "print(aprobados, len(aprobados))"],
            "trampas": ["        aprobados.append(prom[i])", "aprobados = 0"],
            "entradas": [],
            "salida": "['Ana', 'Omar'] 2",
        },
        {
            "titulo": "Mejor promedio",
            "descripcion": "Encuentra al alumno con el promedio más alto sin usar max(). Si hay empate, gana el primero.",
            "pasos": ["Crea la lista nombres: Ana, Javier, Omar.", "Crea la lista prom: 92.5, 64.5, 84.0.", "El mejor empieza en la posición 0.", "Para cada posición i desde la 1:", "   si el promedio en i es MAYOR que el del mejor:", "      el mejor ahora es i.", "Muestra el nombre y el promedio del mejor."],
            "lineas": ['nombres = ["Ana", "Javier", "Omar"]', "prom = [92.5, 64.5, 84.0]", "mejor = 0", "for i in range(1, len(prom)):", "    if prom[i] > prom[mejor]:", "        mejor = i", 'print(nombres[mejor], "con", prom[mejor])'],
            "trampas": ["    if prom[i] >= prom[mejor]:", "        mejor = prom[i]"],
            "entradas": [],
            "salida": "Ana con 92.5",
        },
        {
            "titulo": "Eliminar alumno",
            "descripcion": "Quita a Javier de las dos listas paralelas para que sigan alineadas.",
            "pasos": ["Crea la lista nombres: Ana, Javier, Omar.", "Crea la lista prom: 92.5, 64.5, 84.0.", "Busca la posición de Javier en nombres.", "Quita esa posición de nombres.", "Quita la MISMA posición de prom.", "Muestra las dos listas."],
            "lineas": ['nombres = ["Ana", "Javier", "Omar"]', "prom = [92.5, 64.5, 84.0]", 'pos = nombres.index("Javier")', "nombres.pop(pos)", "prom.pop(pos)", "print(nombres, prom)"],
            "trampas": ["prom.pop(0)", "nombres.remove(pos)"],
            "entradas": [],
            "salida": "['Ana', 'Omar'] [92.5, 84.0]",
        },
        {
            "titulo": "Lugar en el grupo",
            "descripcion": "El lugar de cada alumno es 1 más cuántos tienen un promedio mayor. Sin ordenar las listas (ciclo anidado).",
            "pasos": ["Crea la lista nombres: Ana, Javier, Omar.", "Crea la lista prom: 92.5, 64.5, 84.0.", "Para cada alumno i:", "   su lugar empieza en 1.", "   para cada alumno j:", "      si el promedio de j es mayor que el de i:", "         súmale 1 al lugar.", "   muestra el nombre de i y su lugar."],
            "lineas": ['nombres = ["Ana", "Javier", "Omar"]', "prom = [92.5, 64.5, 84.0]", "for i in range(len(prom)):", "    lugar = 1", "    for j in range(len(prom)):", "        if prom[j] > prom[i]:", "            lugar += 1", '    print(nombres[i], "- lugar", lugar)'],
            "trampas": ["lugar = 1", "            lugar = lugar + j"],
            "entradas": [],
            "salida": "Ana - lugar 1 Javier - lugar 3 Omar - lugar 2",
        },
    ],
}

# ---------------------------------------------------------------------------
# Intérprete humano: funciones numeradas del manual. "args" = cada llamada que puede salir.
# "errores" = la misma función con un error típico (de ahí salen las respuestas falsas).
# ---------------------------------------------------------------------------

FUNCIONES = {
    "TC1037": [
        {
            "codigo": "def f1(a, b):\n    return a // b + a % b",
            "args": ["7, 2", "9, 4", "17, 5", "10, 3", "23, 6"],
            "errores": ["def f1(a, b):\n    return a / b + a % b", "def f1(a, b):\n    return a // (b + a) % b", "def f1(a, b):\n    return a % b + a % b"],
            "tema": "// y %",
        },
        {
            "codigo": "def f2(x):\n    return 2 + x * 3 ** 2 // 4",
            "args": ["1", "2", "3", "4", "6"],
            "errores": ["def f2(x):\n    return (2 + x) * 3 ** 2 // 4", "def f2(x):\n    return 2 + x * 3 * 2 // 4", "def f2(x):\n    return 2 + x * 3 ** 2 / 4"],
            "tema": "precedencia",
        },
        {
            "codigo": "def f3(total):\n    if total >= 500:\n        total = total * 0.9\n    return total",
            "args": ["450", "500", "600", "800", "120.0"],
            "errores": ["def f3(total):\n    if total > 500:\n        total = total * 0.9\n    return total", "def f3(total):\n    if total >= 500:\n        total = total * 0.1\n    return total", "def f3(total):\n    return total * 0.9"],
            "tema": "if y operaciones",
        },
        {
            "codigo": "def f4(x):\n    print(x * 2)",
            "args": ["3", "5", "10"],
            "errores": ["def f4(x):\n    return x * 2", "def f4(x):\n    print(x * 2)\n    return x * 2"],
            "tema": "print contra return",
        },
        {
            "codigo": 'def f5(x):\n    if x > 10:\n        return "A"\n    elif x > 5:\n        return "B"\n    else:\n        return "C"',
            "args": ["3", "6", "10", "15"],
            "errores": ['def f5(x):\n    if x > 5:\n        return "B"\n    elif x > 10:\n        return "A"\n    else:\n        return "C"', 'def f5(x):\n    if x >= 10:\n        return "A"\n    elif x >= 5:\n        return "B"\n    else:\n        return "C"'],
            "tema": "if, elif, else",
        },
        {
            "codigo": 'def f6(edad, permiso):\n    if edad >= 18 or permiso:\n        return "Pasa"\n    return "No pasa"',
            "args": ["17, True", "17, False", "18, False", "20, True"],
            "errores": ['def f6(edad, permiso):\n    if edad >= 18 and permiso:\n        return "Pasa"\n    return "No pasa"', 'def f6(edad, permiso):\n    if edad > 18 or permiso:\n        return "Pasa"\n    return "No pasa"'],
            "tema": "or y and",
        },
        {
            "codigo": "def f7(alumnos):\n    return math.ceil(alumnos / 4)",
            "args": ["25", "9", "12", "30", "7"],
            "errores": ["def f7(alumnos):\n    return math.floor(alumnos / 4)", "def f7(alumnos):\n    return alumnos / 4", "def f7(alumnos):\n    return round(alumnos / 4)"],
            "tema": "math.ceil",
        },
        {
            "codigo": "def doble(x):\n    return x * 2\n\ndef f8(x):\n    return doble(x) + 1",
            "args": ["3", "5", "10", "0"],
            "errores": ["def doble(x):\n    return x * 2\n\ndef f8(x):\n    return doble(x + 1)", "def doble(x):\n    return x * 2\n\ndef f8(x):\n    return x + 1", "def doble(x):\n    return x * 2\n\ndef f8(x):\n    return doble(doble(x))"],
            "tema": "una función que llama a otra",
        },
        {
            "codigo": "def f9(c1, c2, c3):\n    return round((c1 + c2 + c3) / 3, 1)",
            "args": ["80, 90, 70", "60, 65, 71", "100, 95, 97", "70, 70, 71"],
            "errores": ["def f9(c1, c2, c3):\n    return round(c1 + c2 + c3 / 3, 1)", "def f9(c1, c2, c3):\n    return (c1 + c2 + c3) // 3", "def f9(c1, c2, c3):\n    return round((c1 + c2 + c3) / 3)"],
            "tema": "promedio y round",
        },
        {
            "codigo": "def f10(horas):\n    if horas <= 1:\n        return 20\n    return 20 + (horas - 1) * 15",
            "args": ["1", "2", "3", "5", "0"],
            "errores": ["def f10(horas):\n    if horas <= 1:\n        return 20\n    return 20 + horas * 15", "def f10(horas):\n    return horas * 15", "def f10(horas):\n    if horas < 1:\n        return 20\n    return 20 + (horas - 1) * 15"],
            "tema": "return dentro de if",
        },
    ],
    "TC1038": [
        {
            "codigo": "def f1(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total",
            "args": ["4", "5", "6", "10"],
            "errores": ["def f1(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total", "def f1(n):\n    total = 0\n    for i in range(n):\n        total += 1\n    return total"],
            "tema": "range y acumulador",
        },
        {
            "codigo": "def f2(n):\n    while n < 20:\n        n = n * 3\n    return n",
            "args": ["1", "2", "5", "7", "20"],
            "errores": ["def f2(n):\n    while n <= 20:\n        n = n * 3\n    return n", "def f2(n):\n    if n < 20:\n        n = n * 3\n    return n"],
            "tema": "while",
        },
        {
            "codigo": "def f3(nums):\n    return nums[1] + nums[-1]",
            "args": ["[4, 8, 15, 16]", "[1, 2, 3]", "[10, 20, 30, 40, 50]", "[5, 7]"],
            "errores": ["def f3(nums):\n    return nums[0] + nums[-1]", "def f3(nums):\n    return nums[1] + nums[len(nums) - 2]", "def f3(nums):\n    return nums[2] + nums[-1]"],
            "tema": "índices y nums[-1]",
        },
        {
            "codigo": "def f4(prom):\n    cuenta = 0\n    for p in prom:\n        if p >= 70:\n            cuenta += 1\n    return cuenta",
            "args": ["[92.5, 64.5, 84.0]", "[70, 69.5, 100]", "[50, 60]", "[70, 70, 70, 71]"],
            "errores": ["def f4(prom):\n    cuenta = 0\n    for p in prom:\n        if p > 70:\n            cuenta += 1\n    return cuenta", "def f4(prom):\n    cuenta = 0\n    for p in prom:\n        if p < 70:\n            cuenta += 1\n    return cuenta"],
            "tema": "contar con if",
        },
        {
            "codigo": "def f5(nombres, x):\n    for i in range(len(nombres)):\n        if nombres[i] == x:\n            return i\n    return -1",
            "args": ['["Ana", "Omar", "Ana"], "Ana"', '["Ana", "Omar", "Luis"], "Luis"', '["Ana", "Omar"], "Pedro"', '["Eva", "Ana", "Luis", "Ana"], "Ana"'],
            "errores": ["def f5(nombres, x):\n    pos = -1\n    for i in range(len(nombres)):\n        if nombres[i] == x:\n            pos = i\n    return pos", "def f5(nombres, x):\n    for i in range(len(nombres)):\n        if nombres[i] == x:\n            return i + 1\n    return 0"],
            "tema": "buscar",
        },
        {
            "codigo": "def f6(prom):\n    mejor = 0\n    for i in range(len(prom)):\n        if prom[i] > prom[mejor]:\n            mejor = i\n    return mejor",
            "args": ["[80, 95, 95, 70]", "[90, 70, 90]", "[60, 75, 88]", "[99, 50]"],
            "errores": ["def f6(prom):\n    mejor = 0\n    for i in range(len(prom)):\n        if prom[i] >= prom[mejor]:\n            mejor = i\n    return mejor", "def f6(prom):\n    mejor = 0\n    for i in range(len(prom)):\n        if prom[i] > prom[mejor]:\n            mejor = i\n    return prom[mejor]"],
            "tema": "el mayor sin max()",
        },
        {
            "codigo": "def f7(a, b):\n    cuenta = 0\n    for i in range(a):\n        for j in range(b):\n            cuenta += 1\n    return cuenta",
            "args": ["3, 2", "2, 4", "4, 3", "1, 5"],
            "errores": ["def f7(a, b):\n    cuenta = 0\n    for i in range(a):\n        cuenta += 1\n    for j in range(b):\n        cuenta += 1\n    return cuenta", "def f7(a, b):\n    cuenta = 0\n    for i in range(a + 1):\n        for j in range(b + 1):\n            cuenta += 1\n    return cuenta"],
            "tema": "ciclo anidado",
        },
        {
            "codigo": "def f8(prom, i):\n    lugar = 1\n    for p in prom:\n        if p > prom[i]:\n            lugar += 1\n    return lugar",
            "args": ["[90, 70, 90], 1", "[90, 70, 90], 0", "[60, 75, 88, 75], 1", "[85, 92, 70], 2"],
            "errores": ["def f8(prom, i):\n    lugar = 1\n    for p in prom:\n        if p >= prom[i]:\n            lugar += 1\n    return lugar", "def f8(prom, i):\n    lugar = 0\n    for p in prom:\n        if p > prom[i]:\n            lugar += 1\n    return lugar"],
            "tema": "lugar en el grupo",
        },
        {
            "codigo": "def f9(nombres, prom, x):\n    pos = nombres.index(x)\n    nombres.pop(pos)\n    prom.pop(pos)\n    return prom",
            "args": ['["Ana", "Javier", "Omar"], [92.5, 64.5, 84.0], "Javier"', '["Ana", "Javier", "Omar"], [92.5, 64.5, 84.0], "Ana"', '["Eva", "Luis", "Mar", "Ivo"], [70, 80, 90, 60], "Mar"'],
            "errores": ["def f9(nombres, prom, x):\n    pos = nombres.index(x)\n    nombres.pop(pos)\n    prom.pop(0)\n    return prom", "def f9(nombres, prom, x):\n    pos = nombres.index(x)\n    nombres.pop(pos)\n    return prom", "def f9(nombres, prom, x):\n    pos = nombres.index(x)\n    prom.pop(pos + 1)\n    return prom"],
            "tema": "listas paralelas",
        },
        {
            "codigo": "def f10(entradas):\n    veces = 0\n    cal = -1\n    while cal < 0 or cal > 100:\n        cal = entradas[veces]\n        veces += 1\n    return veces",
            "args": ["[120, -5, 85]", "[85]", "[-1, 101, 200, 100]", "[0, 50]"],
            "errores": ["def f10(entradas):\n    veces = 0\n    cal = -1\n    while cal < 0 and cal > 100:\n        cal = entradas[veces]\n        veces += 1\n    return veces", "def f10(entradas):\n    veces = 0\n    cal = -1\n    while cal <= 0 or cal >= 100:\n        cal = entradas[veces]\n        veces += 1\n    return veces"],
            "tema": "validar con while",
        },
    ],
}

# ---------------------------------------------------------------------------
# El archivero (TC1038): funciones de Control Escolar (como el segundo examen).
# El visor elige los datos al azar en cada pregunta; generar.py comprueba que las respuestas del
# visor (js/archivero.js) sean iguales a las de este código con 300 listas al azar.
# ---------------------------------------------------------------------------

ARCHIVERO = [
    ("buscar", "def buscar(nombres, x):\n    for i in range(len(nombres)):\n        if nombres[i] == x:\n            return i\n    return -1"),
    ("promedio_grupo", "def promedio_grupo(prom):\n    total = 0\n    for p in prom:\n        total += p\n    return round(total / len(prom), 2)"),
    ("mejor", "def mejor(nombres, prom):\n    m = 0\n    for i in range(len(prom)):\n        if prom[i] > prom[m]:\n            m = i\n    return nombres[m]"),
    ("aprobados", "def aprobados(nombres, prom):\n    lista = []\n    for i in range(len(prom)):\n        if prom[i] >= 70:\n            lista.append(nombres[i])\n    return len(lista)"),
    ("reprobados", "def reprobados(nombres, prom):\n    lista = []\n    for i in range(len(prom)):\n        if prom[i] < 70:\n            lista.append(nombres[i])\n    return len(lista)"),
    ("eliminar", "def eliminar(nombres, prom, x):\n    pos = buscar(nombres, x)\n    nombres.pop(pos)\n    prom.pop(pos)"),
    ("lugar", "def lugar(prom, i):\n    l = 1\n    for p in prom:\n        if p > prom[i]:\n            l += 1\n    return l"),
    ("agregar", "def agregar(nombres, prom, x, p):\n    nombres.append(x)\n    prom.append(p)\n    return len(nombres) - 1"),
]
