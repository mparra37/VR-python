# Enlace VR · Python

Juegos de realidad virtual para jugar en equipo en los cursos de Python. Un Operador usa el visor
(Meta Quest) y ve el reto; el resto del equipo tiene el manual impreso. Solo hablando lo logran. Misma
base que [Enlace VR](https://github.com/mparra37/ITC-VR-Games): menú, música, códigos de verificación y marcador.

| Juego | El Operador ve | El equipo tiene |
| --- | --- | --- |
| Calculadora humana | Una expresión sencilla como `print(3 + 17 % 5 * 2)` y un teclado: escribe solo el resultado final. Con 2 correctas sale **¡Siguiente!** y se pasa el visor (el reloj se detiene) | La tabla de prioridad, reglas de entero/decimal y una hoja de trabajo para ayudar |
| Intérprete humano | `print(f3(9, 2))` y 4 puertas con respuestas | El código de 10 funciones con números chicos (`//`, `%`, `/`, `**`, orden de las operaciones) |
| El cadenero | El número de función, el valor de cada parámetro y la llamada, por ejemplo `entra(18, 1.60)` | El código de 12 funciones con `and`, `or`, `not`: dicen qué regresa (True, False o un texto) |
| El archivero | Dos listas como cajas (`nombres` y `edades`, `ciudades`, `colores` o `califs`) y una llamada como `f3(nombres)` | El código de 11 funciones de listas (`lista1[-1]`, `len`, `index`…): dicen qué caja tocar |

## Para empezar

- `index.html`: menú. Ahí se elige el **equipo** de cada visor (se guarda en el visor).
- `empezar.html`: instrucciones cortas, enlaces a los manuales y la hoja de puntajes.
- `marcador.html`: verifica los códigos que da el visor al final de cada ronda y arma el marcador.
- `material/`: PDF de los manuales del equipo y los instructivos de una hoja.

## Cambiar ejercicios

Todo sale de `generador/bancos.py`. Después de editarlo:

```
python generador/generar.py
```

El generador **ejecuta** todo en Python: calcula lo que imprime cada pregunta del Intérprete (y las
respuestas falsas, corriendo versiones con errores típicos), corre cada llamada del Cadenero y evalúa cada
comparación por separado (para la explicación), evalúa cada expresión de la Calculadora paso a paso y
corre cada llamada del Archivero con sus listas para saber qué caja regresa. Las preguntas del test de antes
y después están prohibidas (`DEL_TEST`, `DEL_TEST_LLAMADAS`). Luego escribe `js/datos_*.js` y los PDF (con Microsoft Edge).

## Probar en la computadora

```
python -m http.server 8091
```

y abrir http://localhost:8091. En modo 2D se arrastra para mirar y se hace clic (también hay teclas).
Probado en el navegador de la computadora; falta probarlo en un Quest.
