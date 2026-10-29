/* Enlace VR · Python · El archivero: preguntas y respuestas (sin A-Frame).
 *
 * Arma una pregunta al azar sobre las listas paralelas nombres y prom, con la respuesta correcta tal
 * como la imprime Python y 3 respuestas falsas (errores típicos). generador/generar.py comprueba con
 * 300 listas al azar que estas respuestas sean iguales a las del código del manual corrido en Python.
 * Sirve en el navegador (window.ArchiveroLogica) y en Node (require).
 */
(function (raiz) {
  const NOMBRES = ['Ana', 'Javier', 'Omar', 'Luis', 'Eva', 'Sofía', 'Mar', 'Iván', 'Zoe', 'Leo', 'Paty', 'Raúl', 'Nora', 'Beto'];

  /** Un número como lo imprime Python: los decimales siempre con punto (85.0, no 85). */
  const decimal = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
  const redondear2 = (x) => Number(x.toFixed(2));
  const listaPython = (prom) => `[${prom.map(decimal).join(', ')}]`;

  function crearAzar(semilla) {
    if (semilla === undefined) return Math.random;
    let s = semilla >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /** 5 o 6 alumnos con promedios de 50 a 100 (de medio en medio punto). */
  function nuevosDatos(azar) {
    const n = azar() < 0.5 ? 5 : 6;
    const libres = NOMBRES.slice();
    const nombres = [];
    for (let i = 0; i < n; i++) nombres.push(libres.splice(Math.floor(azar() * libres.length), 1)[0]);
    const prom = nombres.map(() => (100 + Math.floor(azar() * 101)) / 2);
    // a veces un empate con el mejor, para que importe "gana el primero"
    if (azar() < 0.35) {
      const m = prom.indexOf(Math.max(...prom));
      const otro = (m + 1 + Math.floor(azar() * (n - 1))) % n;
      prom[otro] = prom[m];
    }
    return { nombres, prom };
  }

  // las funciones del manual, igual que en Python
  const buscar = (nombres, x) => nombres.indexOf(x);
  const promedioGrupo = (prom) => redondear2(prom.reduce((a, b) => a + b, 0) / prom.length);
  const mejorPos = (prom) => { let m = 0; prom.forEach((p, i) => { if (p > prom[m]) m = i; }); return m; };
  const contar = (prom, f) => prom.filter(f).length;
  const lugar = (prom, i, mayorIgual) => 1 + prom.filter((p) => (mayorIgual ? p >= prom[i] : p > prom[i])).length;

  /** Completa hasta 3 respuestas falsas distintas entre sí y de la correcta. */
  function tresFalsas(correcta, candidatas, respaldo) {
    const falsas = [];
    candidatas.concat(respaldo).forEach((c) => {
      const s = String(c);
      if (falsas.length < 3 && s !== correcta && !falsas.includes(s)) falsas.push(s);
    });
    return falsas;
  }

  const TIPOS = ['buscar', 'buscar_no', 'promedio_grupo', 'mejor', 'aprobados', 'reprobados', 'lugar', 'eliminar', 'agregar'];

  /** Una pregunta. tipo opcional; azar opcional (para pruebas repetibles). */
  function pregunta(datos, tipo, azar = Math.random) {
    const { nombres, prom } = datos;
    const n = nombres.length;
    const t = tipo || TIPOS[Math.floor(azar() * TIPOS.length)];
    const alAzar = (lista) => lista[Math.floor(azar() * lista.length)];
    const nums = (lista) => lista.map(String);
    let r;
    if (t === 'buscar') {
      const i = Math.floor(azar() * n);
      const c = String(i);
      r = { fn: 'buscar', codigo: `print(buscar(nombres, "${nombres[i]}"))`, correcta: c, falsas: tresFalsas(c, nums([i + 1, i - 1, -1]), nums([n, n - 1, 0])) };
    } else if (t === 'buscar_no') {
      const x = alAzar(NOMBRES.filter((m) => !nombres.includes(m)));
      r = { fn: 'buscar', codigo: `print(buscar(nombres, "${x}"))`, correcta: '-1', falsas: tresFalsas('-1', ['0', String(n), 'None'], [String(n - 1)]) };
    } else if (t === 'promedio_grupo') {
      const total = prom.reduce((a, b) => a + b, 0);
      const c = decimal(promedioGrupo(prom));
      r = { fn: 'promedio_grupo', codigo: 'print(promedio_grupo(prom))', correcta: c,
        falsas: tresFalsas(c, [decimal(redondear2(total / (n - 1))), decimal(total), decimal(redondear2(total / (n + 1)))], [decimal(Math.round(total / n))]) };
    } else if (t === 'mejor') {
      const m = mejorPos(prom);
      let ultimo = m;
      prom.forEach((p, i) => { if (p >= prom[ultimo]) ultimo = i; });
      const sinMejor = prom.map((p, i) => (p === prom[m] ? -1 : p));
      const segundo = mejorPos(sinMejor);
      const peor = prom.indexOf(Math.min(...prom));
      r = { fn: 'mejor', codigo: 'print(mejor(nombres, prom))', correcta: nombres[m],
        falsas: tresFalsas(nombres[m], [nombres[ultimo], nombres[segundo], nombres[peor]], nombres) };
    } else if (t === 'aprobados') {
      const c = String(contar(prom, (p) => p >= 70));
      r = { fn: 'aprobados', codigo: 'print(aprobados(nombres, prom))', correcta: c,
        falsas: tresFalsas(c, nums([contar(prom, (p) => p > 70), contar(prom, (p) => p < 70), n]), nums([Number(c) + 1, Number(c) - 1, 0])) };
    } else if (t === 'reprobados') {
      const c = String(contar(prom, (p) => p < 70));
      r = { fn: 'reprobados', codigo: 'print(reprobados(nombres, prom))', correcta: c,
        falsas: tresFalsas(c, nums([contar(prom, (p) => p <= 70), contar(prom, (p) => p >= 70), n]), nums([Number(c) + 1, Number(c) + 2, 0])) };
    } else if (t === 'lugar') {
      const i = Math.floor(azar() * n);
      const c = String(lugar(prom, i, false));
      r = { fn: 'lugar', codigo: `print(lugar(prom, ${i}))`, correcta: c,
        falsas: tresFalsas(c, nums([lugar(prom, i, true), Number(c) - 1, i + 1, i]), nums([Number(c) + 1, n, 1])) };
    } else if (t === 'eliminar') {
      const p = Math.floor(azar() * n);
      const k = Math.min(p, n - 2);
      const nombresDespues = nombres.filter((_, i) => i !== p);
      const promDespues = prom.filter((_, i) => i !== p);
      const c = `${nombresDespues[k]} ${decimal(promDespues[k])}`;
      const otraK = k + 1 < n - 1 ? k + 1 : k - 1;
      r = { fn: 'eliminar', codigo: `eliminar(nombres, prom, "${nombres[p]}")\nprint(nombres[${k}], prom[${k}])`, correcta: c,
        falsas: tresFalsas(c, [`${nombres[k]} ${decimal(prom[k])}`, `${nombresDespues[k]} ${decimal(prom[k])}`, `${nombres[k]} ${decimal(promDespues[k])}`],
          [`${nombresDespues[otraK]} ${decimal(promDespues[otraK])}`, `${nombres[p]} ${decimal(prom[p])}`,
            ...nombresDespues.map((m, j) => `${m} ${decimal(promDespues[(j + 1) % (n - 1)])}`)]),
        accion: { tipo: 'eliminar', pos: p } };
    } else {
      const x = alAzar(NOMBRES.filter((m) => !nombres.includes(m)));
      const p = (100 + Math.floor(azar() * 101)) / 2;
      const c = String(n);
      r = { fn: 'agregar', codigo: `print(agregar(nombres, prom, "${x}", ${decimal(p)}))`, correcta: c,
        falsas: tresFalsas(c, nums([n + 1, n - 1, 0]), nums([-1, 1])), accion: { tipo: 'agregar', nombre: x, prom: p } };
    }
    r.tipo = t;
    return r;
  }

  const API = { nuevosDatos, pregunta, crearAzar, decimal, listaPython, TIPOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.ArchiveroLogica = API;
}(typeof window !== 'undefined' ? window : globalThis));
