# Enlace VR · Python

Juegos de realidad virtual para jugar en equipo en **TC1037 (Pensamiento Algorítmico)** y
**TC1038 (Fundamentos de Programación)**. Un Operador usa el visor (Meta Quest) y ve el código; el resto
del equipo tiene el manual impreso. Solo hablando lo logran. Misma base que
[Enlace VR](https://github.com/mparra37/ITC-VR-Games): menú, música, códigos de verificación y marcador.

| Juego | Curso | El Operador ve | El equipo tiene |
| --- | --- | --- | --- |
| Arma el programa | TC1037 y TC1038 | Líneas de código revueltas (con trampas) y un editor con renglones numerados | Pseudocódigo y ejemplo de ejecución de cada programa |
| Intérprete humano | TC1037 y TC1038 | `print(f3(600))` y 4 puertas con respuestas | El código de 10 funciones numeradas |
| El archivero | TC1038 | Las listas paralelas `nombres` y `prom` como cajas | Las funciones de Control Escolar (buscar, mejor, eliminar, lugar…) |

## Para empezar

- `index.html`: menú. Ahí se elige el **equipo** y el **curso** de cada visor (se guardan en el visor).
- `empezar.html`: instrucciones cortas, enlaces a los manuales (uno por curso) y la hoja de puntajes.
- `marcador.html`: verifica los códigos que da el visor al final de cada ronda y arma el marcador.
- `material/`: PDF de los manuales del equipo y los instructivos de una hoja.

## Cambiar ejercicios

Todo sale de `generador/bancos.py`. Después de editarlo:

```
python generador/generar.py
```

El generador **ejecuta** cada programa y cada función en Python: comprueba la salida de los programas,
calcula las respuestas correctas del Intérprete (y las falsas, corriendo versiones con errores típicos)
y compara las respuestas de El archivero (`js/archivero_logica.js`, con Node) contra el mismo código en
Python con 300 listas al azar. Luego escribe `js/datos_*.js` y los PDF (con Microsoft Edge).

## Probar en la computadora

```
python -m http.server 8091
```

y abrir http://localhost:8091. En modo 2D se arrastra para mirar y se hace clic (también hay teclas).
Probado en el navegador de la computadora; falta probarlo en un Quest.
