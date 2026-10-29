/* Enlace VR · Python · Calculadora humana
 *
 * Enfrente hay un pizarrón con una expresión, por ejemplo print(4 + 6 * 3 // 4 - 2 ** 3 / 8).
 * El Operador la dicta y el equipo la escribe en su hoja. En cada paso:
 *   1. el equipo dice qué operación va primero y el Operador apunta a ese operador;
 *   2. el equipo la calcula a mano y el Operador escribe el resultado en el teclado de la consola.
 * La operación se cambia por su valor y la expresión se va haciendo chica hasta que queda lo que
 * imprime Python. +1 por paso bien hecho; operador que todavía no toca o valor equivocado: bloqueo de 5 s.
 * Python es exacto: 7.0 no es 7 (el juego explica por qué cuando solo cambia el formato).
 *
 * Datos: js/datos_calculadora.js. generador/generar.py arma el árbol con el módulo ast de Python y
 * guarda en cada operación lo que da evaluarla en Python, así que todos los valores son los de Python.
 */
/* global AFRAME, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, COLOR_PY */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosResuelta: 2.8,
  resueltasPorNivel: 3,
  pizarron: { x: 0, y: 1.98, z: -2.1, ancho: 3.3, alto: 1.05 },
};

const TECLAS = [['7', '8', '9', 'Borrar'], ['4', '5', '6', 'True'], ['1', '2', '3', 'False'], ['-', '0', '.', 'OK']];

const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

/** Copia del árbol con número de nodo y marca de "ya resuelto". */
function prepararArbol(a, lista = []) {
  if (a.hoja !== undefined) return { hoja: a.hoja };
  const n = { op: a.op, valor: a.valor, parentesis: a.parentesis, resuelto: false, id: lista.length };
  lista.push(n);
  n.izq = prepararArbol(a.izq, lista);
  n.der = prepararArbol(a.der, lista);
  return n;
}

const listo = (x) => x.hoja !== undefined || x.resuelto;
// un valor negativo se escribe entre paréntesis: -3 ** 2 en Python es -(3 ** 2), no (-3) ** 2
const conSigno = (v) => (v.startsWith('-') ? `(${v})` : v);
const textoDe = (x) => (x.hoja !== undefined ? x.hoja : conSigno(x.valor));

AFRAME.registerComponent('calculadora-humana', {
  init() {
    this.banco = window.CALCULADORA;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.expr = null;
    this.elegido = null;
    this.entrada = '';
    this.encima = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrar('inicio');
    window.juego = this;
  },

  crearBoton(pantalla, textoBoton, x, y, opciones) {
    const el = crearEntidad(this.pantallas[pantalla], { position: `${x} ${y} 0.01`, boton: Object.assign({ texto: textoBoton }, opciones) });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    const consola = crearConsola(this.el, 1.6, 1.05);
    ['inicio', 'juego', 'fin'].forEach((n) => { this.pantallas[n] = crearEntidad(consola, { visible: false }); });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.22 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 5 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    // juego: a la izquierda qué hacer y lo que se escribe; a la derecha el teclado
    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.11', position: '0 0.44 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 0.76; alto: 0.62', position: '-0.36 0.03 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.07', position: '0 -0.34 0' });
    TECLAS.forEach((fila, r) => fila.forEach((k, c) => {
      this.crearBoton('juego', k, 0.12 + c * 0.17, 0.27 - r * 0.15, {
        ancho: 0.155, alto: 0.13, accion: 'tecla', valor: k, estilo: k === 'OK' ? 'principal' : 'tecla',
      });
    }));
    this.crearBoton('juego', 'Saltar', -0.42, -0.45, { ancho: 0.3, alto: 0.08, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.42, -0.45, { ancho: 0.3, alto: 0.08, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.12 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // el pizarrón con la expresión y zonas invisibles sobre cada operador
    const P = CONFIG.pizarron;
    this.pizarron = crearEntidad(this.el, { lienzo: `ancho: ${P.ancho}; alto: ${P.alto}`, position: `${P.x} ${P.y} ${P.z}` });
    this.zonas = [];
    for (let i = 0; i < 10; i++) {
      const zona = crearEntidad(this.pizarron, {
        geometry: 'primitive: plane; width: 1; height: 1',
        material: 'shader: flat; transparent: true; opacity: 0; depthWrite: false',
        position: '0 0 0.01', visible: false,
      });
      zona.addEventListener('mouseenter', () => { this.encima = zona.nodo; this.dibujarPizarron(false); });
      zona.addEventListener('mouseleave', () => { if (this.encima === zona.nodo) this.encima = null; this.dibujarPizarron(false); });
      zona.addEventListener('click', () => { if (zona.nodo) this.presionar('operador', zona.nodo.id); });
      this.zonas.push(zona);
      this.botones.juego.push(zona);
    }
    this.dibujarInicio();
    this.dibujarPizarron();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false));
    });
    refrescarApuntadores();
  },

  // --- lógica ---

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.resuelta) return null;
      if (accion === 'operador') this.elegir(Number(valor));
      if (accion === 'tecla') this.teclear(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear(`Saltaste la expresión (daba ${this.expr.final})`);
        this.nuevaExpresion();
      }
    }
    return null;
  },

  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const k = e.key;
    if (/^[0-9.-]$/.test(k)) this.presionar('tecla', k);
    else if (k === 'Backspace') this.presionar('tecla', 'Borrar');
    else if (k === 'Enter') this.presionar('tecla', 'OK');
    else if (k === 't' || k === 'T') this.presionar('tecla', 'True');
    else if (k === 'f' || k === 'F') this.presionar('tecla', 'False');
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.resueltas = 0;
    this.nivel = 1;
    this.usadas = new Set();
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.resuelta = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevaExpresion();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Díctenle la expresión al equipo', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  /** Otra expresión del nivel actual (sin repetir). */
  nuevaExpresion() {
    this.nivel = Math.min(3, 1 + Math.floor(this.resueltas / CONFIG.resueltasPorNivel));
    let opciones = this.banco.filter((e, i) => e.nivel === this.nivel && !this.usadas.has(i));
    if (!opciones.length) {
      this.usadas.clear();
      opciones = this.banco.filter((e) => e.nivel === this.nivel);
    }
    const elegida = barajar(opciones)[0];
    this.usadas.add(this.banco.indexOf(elegida));
    this.expr = elegida;
    this.nodos = [];
    this.raiz = prepararArbol(elegida.arbol, this.nodos);
    this.pasos = [];
    this.elegido = null;
    this.entrada = '';
    this.ultimo = null;
    this.dibujarTodo();
  },

  elegir(id) {
    const n = this.nodos[id];
    if (!n || n.resuelto) return;
    if (!listo(n.izq) || !listo(n.der)) {
      this.errores += 1;
      this.bloquear(`Todavía no: a los lados de ${n.op} hay algo que se resuelve antes`);
      return;
    }
    this.elegido = n;
    this.entrada = '';
    sonido.tecla();
    this.avisar(`¿Cuánto da ${textoDe(n.izq)} ${n.op} ${textoDe(n.der)}? Calcúlenlo a mano`, COLOR.acento);
    this.dibujarTodo();
  },

  teclear(k) {
    if (!this.elegido) {
      this.avisar('Primero apunta al operador que va primero (en el pizarrón)', COLOR.acento);
      return;
    }
    sonido.tecla();
    if (k === 'Borrar') this.entrada = this.entrada.slice(0, -1);
    else if (k === 'True' || k === 'False') this.entrada = k;
    else if (k === 'OK') return this.comprobar();
    else if (this.entrada === 'True' || this.entrada === 'False') this.entrada = k;
    else if (this.entrada.length < 8) this.entrada += k;
    this.dibujarInfo();
    return null;
  },

  comprobar() {
    const n = this.elegido;
    const esperado = n.valor;
    if (this.entrada === esperado) {
      this.puntaje += 1;
      n.resuelto = true;
      this.ultimo = n;
      this.pasos.push(`${textoDe(n.izq)} ${n.op} ${textoDe(n.der)} = ${esperado}`);
      this.elegido = null;
      this.entrada = '';
      sonido.bien();
      if (this.raiz.resuelto) {
        this.resueltas += 1;
        this.resuelta = { hasta: performance.now() + CONFIG.segundosResuelta * 1000 };
        this.avisar(`¡Resuelta! Python imprime ${esperado} · +1`, COLOR.bien);
        sonido.nivel();
      } else {
        this.avisar(`¡Correcto! ${esperado} · +1 · ¿Qué sigue?`, COLOR.bien);
      }
      this.dibujarTodo();
      return;
    }
    this.errores += 1;
    // mismo número, otro formato: explicar entero contra decimal
    const mismoNumero = this.entrada !== '' && !Number.isNaN(Number(this.entrada)) && Number(this.entrada) === Number(esperado);
    let motivo = `${textoDe(n.izq)} ${n.op} ${textoDe(n.der)} no da ${this.entrada || 'eso'}`;
    if (mismoNumero && esperado.includes('.')) motivo = `Casi: Python escribe ${esperado} (con / o con un decimal, da decimal)`;
    else if (mismoNumero) motivo = `Casi: Python escribe ${esperado} (${n.op} entre enteros da entero)`;
    this.entrada = '';
    this.bloquear(motivo);
    this.dibujarInfo();
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo} · bloqueo de ${CONFIG.segundosBloqueo} s`, COLOR.mal);
    sonido.mal();
    this.dibujarInfo();
  },

  bloqueado() { return performance.now() < this.bloqueoHasta; },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 3500 };
    this.dibujarMensaje();
  },

  terminar() {
    sonido.fin();
    rondaComun.terminar();
    this.resuelta = null;
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('calculadora', this.puntaje, `expresiones ${this.resueltas} · nivel ${this.nivel} · errores ${this.errores}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick() {
    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
    if (this.resuelta && ahora > this.resuelta.hasta) {
      this.resuelta = null;
      this.nuevaExpresion();
      this.avisar(`Nueva expresión · nivel ${this.nivel}`, COLOR.acento);
    }
    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.terminar();
      return;
    }
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      this.dibujarBarra();
      rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
      if (this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) this.dibujarInfo();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarPizarron();
    this.dibujarBarra();
    this.dibujarInfo();
    this.dibujarMensaje();
  },

  /** Las piezas de la expresión tal como está ahora. */
  piezas(x, lista = []) {
    if (x.hoja !== undefined) {
      lista.push({ t: x.hoja, tipo: 'hoja' });
    } else if (x.resuelto) {
      lista.push({ t: x === this.raiz ? x.valor : conSigno(x.valor), tipo: 'valor', recien: x === this.ultimo });
    } else {
      if (x.parentesis) lista.push({ t: '(', tipo: 'par' });
      this.piezas(x.izq, lista);
      lista.push({ t: x.op, tipo: 'op', nodo: x });
      this.piezas(x.der, lista);
      if (x.parentesis) lista.push({ t: ')', tipo: 'par' });
    }
    return lista;
  },

  /** Pizarrón: variables arriba, la expresión en grande y los pasos hechos abajo.
   *  Con moverZonas = true también acomoda las zonas para apuntar a cada operador. */
  dibujarPizarron(moverZonas = true) {
    const P = CONFIG.pizarron;
    const ubicaciones = [];
    pintar(this.pizarron, (ctx, w, h) => {
      const m = w / P.ancho;
      fondoPanel(ctx, w, h, '#0A1220');
      if (!this.expr) {
        texto(ctx, 'CALCULADORA HUMANA', w / 2, h * 0.42, { tam: 110, peso: 700, alinear: 'center' });
        texto(ctx, 'Aquí aparecerá la expresión', w / 2, h * 0.65, { tam: 52, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      const vars = Object.entries(this.expr.variables);
      if (vars.length) texto(ctx, vars.map(([k, v]) => `${k} = ${v}`).join('     '), 50, h * 0.13, { tam: 52, peso: 600, color: COLOR_PY.numero, fuente: MONO });
      texto(ctx, `NIVEL ${this.nivel}`, w - 50, h * 0.13, { tam: 40, peso: 600, color: COLOR.tenue, alinear: 'right', fuente: MONO });
      // la expresión, pieza por pieza
      const piezas = [{ t: 'print(', tipo: 'print' }, ...this.piezas(this.raiz), { t: ')', tipo: 'print' }];
      let tam = 132;
      const ancho = (t) => {
        ctx.font = `600 ${t}px ${MONO}`;
        return piezas.reduce((s, p, i) => s + ctx.measureText(p.t).width + (i > 0 && i < piezas.length - 1 && piezas[i - 1].tipo !== 'print' && p.tipo !== 'print' && p.t !== ')' && piezas[i - 1].t !== '(' ? t * 0.6 : 0), 0);
      };
      while (ancho(tam) > w - 100 && tam > 40) tam *= 0.94;
      ctx.font = `600 ${tam}px ${MONO}`;
      let x = (w - ancho(tam)) / 2;
      const y = h * 0.47;
      piezas.forEach((p, i) => {
        const conEspacio = i > 0 && i < piezas.length - 1 && piezas[i - 1].tipo !== 'print' && p.tipo !== 'print' && p.t !== ')' && piezas[i - 1].t !== '(';
        if (conEspacio) x += tam * 0.6;
        ctx.font = `600 ${tam}px ${MONO}`;
        const anchoPieza = ctx.measureText(p.t).width;
        let color = COLOR_PY.normal;
        if (p.tipo === 'print') color = COLOR_PY.clave;
        if (p.tipo === 'hoja') color = /^\d/.test(p.t) ? COLOR_PY.numero : COLOR_PY.normal;
        if (p.tipo === 'op') {
          const nodo = p.nodo;
          const elegido = this.elegido === nodo;
          const encima = this.encima === nodo;
          if (elegido || encima) {
            rectRedondo(ctx, x - 12, y - tam * 0.62, anchoPieza + 24, tam * 1.24, 16);
            ctx.fillStyle = elegido ? 'rgba(90,169,255,.35)' : 'rgba(90,169,255,.18)';
            ctx.fill();
          }
          color = COLOR.acento;
          ubicaciones.push({ nodo, x0: x, x1: x + anchoPieza, y, m });
        }
        if (p.tipo === 'valor') {
          rectRedondo(ctx, x - 10, y - tam * 0.6, anchoPieza + 20, tam * 1.2, 14);
          ctx.fillStyle = p.recien ? 'rgba(61,220,151,.22)' : 'rgba(242,244,248,.08)';
          ctx.fill();
          color = p.recien ? COLOR.bien : COLOR_PY.numero;
        }
        texto(ctx, p.t, x, y, { tam, peso: 600, color, fuente: MONO });
        x += anchoPieza;
      });
      // la operación elegida, subrayada de lado a lado
      if (this.elegido) {
        const n = this.elegido;
        texto(ctx, `${textoDe(n.izq)} ${n.op} ${textoDe(n.der)} = ?`, w / 2, h * 0.73, { tam: 58, peso: 600, color: COLOR.acento, alinear: 'center', fuente: MONO });
      }
      // pasos hechos
      if (this.pasos.length && !this.elegido) {
        const ultimos = this.pasos.slice(-3);
        texto(ctx, ultimos.join('     ·     '), w / 2, h * 0.73, { tam: 46, color: COLOR.tenue, alinear: 'center', fuente: MONO });
      }
      if (this.resuelta) texto(ctx, `print → ${this.expr.final}`, w / 2, h * 0.88, { tam: 58, peso: 700, color: COLOR.bien, alinear: 'center', fuente: MONO });
    });
    if (!moverZonas) return;
    this.zonas.forEach((z, i) => {
      const u = ubicaciones[i];
      z.nodo = u ? u.nodo : null;
      z.setAttribute('visible', Boolean(u) && this.pantalla === 'juego');
      if (!u) return;
      const ancho = Math.max(0.16, (u.x1 - u.x0) / u.m + 0.08);
      z.object3D.position.set(((u.x0 + u.x1) / 2) / u.m - P.ancho / 2, P.alto / 2 - u.y / u.m, 0.01);
      z.object3D.scale.set(ancho, 0.3, 1);
    });
    this.mostrar(this.pantalla);
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON · TC1037 · TC1038', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'Calculadora humana', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú ves la expresión; el equipo la resuelve a mano, paso a paso.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Dicta la expresión: el equipo la escribe en su hoja.', '2. Apunta al operador que te digan que va primero.', '3. Escribe en el teclado cuánto da (7.0 no es 7).']
        .forEach((p, i) => texto(ctx, p, w * 0.08, h * (0.58 + i * 0.13), { tam: 40, peso: 500 }));
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#102039');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'CALCULADORA HUMANA', 30, h / 2, { tam: 42, peso: 700 });
      texto(ctx, `Pasos: ${this.puntaje}`, w * 0.62, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 54, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (!this.expr) return;
      if (this.resuelta) {
        texto(ctx, '¡RESUELTA!', w / 2, h * 0.3, { tam: 80, peso: 700, color: COLOR.bien, alinear: 'center' });
        texto(ctx, `imprime ${this.expr.final}`, w / 2, h * 0.55, { tam: 64, peso: 600, alinear: 'center', fuente: MONO });
        return;
      }
      if (!this.elegido) {
        texto(ctx, 'PASO 1 DE 2', 40, h * 0.12, { tam: 34, peso: 600, color: COLOR.tenue });
        texto(ctx, '¿Qué operación', 40, h * 0.3, { tam: 60, peso: 700 });
        texto(ctx, 'va primero?', 40, h * 0.44, { tam: 60, peso: 700 });
        texto(ctx, 'Apunta a ese operador', 40, h * 0.66, { tam: 42, color: COLOR.acento });
        texto(ctx, 'en el pizarrón.', 40, h * 0.78, { tam: 42, color: COLOR.acento });
      } else {
        const n = this.elegido;
        texto(ctx, 'PASO 2 DE 2 · ¿CUÁNTO DA?', 40, h * 0.12, { tam: 34, peso: 600, color: COLOR.tenue });
        texto(ctx, `${textoDe(n.izq)} ${n.op} ${textoDe(n.der)}`, w / 2, h * 0.32, { tam: 76, peso: 600, color: COLOR.acento, alinear: 'center', fuente: MONO });
        rectRedondo(ctx, 40, h * 0.5, w - 80, h * 0.3, 20);
        ctx.fillStyle = '#06080D';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = COLOR.acento;
        ctx.stroke();
        texto(ctx, this.entrada || '_', w / 2, h * 0.65, { tam: 96, peso: 600, alinear: 'center', fuente: MONO });
        texto(ctx, 'Escribe y presiona OK', w / 2, h * 0.9, { tam: 34, color: COLOR.tenue, alinear: 'center' });
      }
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE', w / 2, h * 0.3, { tam: 76, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, 'CAÍDO!', w / 2, h * 0.46, { tam: 76, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s`, w / 2, h * 0.7, { tam: 50, alinear: 'center' });
      }
    });
  },

  dibujarMensaje() {
    pintar(this.lienzoMensaje, (ctx, w, h) => {
      if (!this.mensaje) return;
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 38, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.puntaje,
      unidad: this.puntaje === 1 ? 'paso bien hecho' : 'pasos bien hechos',
      detalle: `Expresiones resueltas: ${this.resueltas} · Nivel: ${this.nivel} · Errores: ${this.errores}`,
      registro: this.registro,
    }));
  },
});
