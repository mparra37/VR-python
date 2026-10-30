/* Enlace VR · Python · El archivero (listas)
 *
 * Enfrente hay dos listas como filas de cajas: nombres y otra (edades, ciudades, colores o califs).
 * La consola muestra una llamada, por ejemplo f3(nombres). El equipo tiene las funciones en su hoja:
 *     def f3(lista1):
 *         return lista1[-1]
 * y le dice al Operador qué caja regresa ("el último de nombres"). El Operador toca esa caja.
 * Después la consola muestra la función y cómo se llega a la posición: lista1[-1] → nombres[-1] → nombres[4].
 *
 * +1 por acierto; error o saltar: bloqueo de 5 s. Ronda de 5 minutos.
 * Datos: js/datos_listas.js (generador/generar.py corre cada llamada en Python con esas listas).
 */
/* global AFRAME, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, COLOR_PY, pintarPython, pintarBloque */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosExplicacion: 4.5,
  caja: { ancho: 0.48, alto: 0.3, fondo: 0.16, paso: 0.54 },
  filas: [2.0, 1.6],
  indices: 2.24,
  x0: 0.18,
  z: -1.95,
  msAparecer: 450,
};

const COLORES_FILA = [COLOR.acento, '#7FD1C7'];
const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

AFRAME.registerComponent('archivero', {
  init() {
    this.datos = window.LISTAS;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.reto = null;
    this.cajas = []; // { el, cara, fila, indice }
    this.encima = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    this.mostrar('inicio');
    window.juego = this;
  },

  crearBoton(pantalla, textoBoton, x, y, opciones) {
    const el = crearEntidad(this.pantallas[pantalla], { position: `${x} ${y} 0.01`, boton: Object.assign({ texto: textoBoton }, opciones) });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    const consola = crearConsola(this.el);
    ['inicio', 'juego', 'fin'].forEach((n) => { this.pantallas[n] = crearEntidad(consola, { visible: false }); });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.2 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 5 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.12', position: '0 0.38 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.44', position: '0 0.07 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.22 0' });
    this.crearBoton('juego', 'Saltar', -0.4, -0.36, { ancho: 0.32, alto: 0.1, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.4, -0.36, { ancho: 0.32, alto: 0.1, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // el estante: nombres de las listas a la izquierda, posiciones arriba y repisas
    this.estante = crearEntidad(this.el, { position: `0 0 ${CONFIG.z}` });
    this.lienzoEtiquetas = crearEntidad(this.estante, { lienzo: 'ancho: 0.8; alto: 0.8', position: `${CONFIG.x0 - 2.02} 1.8 0` });
    this.lienzoIndices = crearEntidad(this.estante, { lienzo: 'ancho: 3.4; alto: 0.14', position: `${CONFIG.x0} ${CONFIG.indices} 0` });
    CONFIG.filas.forEach((y, f) => crearEntidad(this.estante, {
      geometry: 'primitive: box; width: 3.4; height: 0.03; depth: 0.26', material: `color: ${COLORES_FILA[f]}; emissive: ${COLORES_FILA[f]}; emissiveIntensity: 0.4`,
      position: `${CONFIG.x0} ${y - CONFIG.caja.alto / 2 - 0.02} 0`,
    }));
    this.dibujarInicio();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false));
    });
    this.cajas.forEach((c) => c.cara.classList.toggle('clickable', nombre === 'juego'));
    refrescarApuntadores();
  },

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.explicando()) return null;
      if (accion === 'caja') this.responder(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.explicar(false, null);
        this.bloquear('Saltaste la llamada');
      }
    }
    return null;
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.explicacion = null;
    this.mazo = [];
    this.pendientes = [];
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevoReto();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Léanle la llamada al equipo', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  // --- las cajas ---

  xDe(i, n) { return CONFIG.x0 + (i - (n - 1) / 2) * CONFIG.caja.paso; },

  /** Pone las dos listas de un conjunto como cajas nuevas. */
  ponerListas(conjunto) {
    this.cajas.forEach((c) => c.el.remove());
    this.cajas = [];
    this.listas = conjunto.listas;
    const C = CONFIG.caja;
    this.listas.forEach((lista, f) => lista.valores.forEach((v, i) => {
      const el = crearEntidad(this.estante, { position: `${this.xDe(i, lista.valores.length)} ${CONFIG.filas[f]} 0` });
      crearEntidad(el, { geometry: `primitive: box; width: ${C.ancho}; height: ${C.alto}; depth: ${C.fondo}`, material: 'color: #13233D; roughness: 0.6; metalness: 0.3' });
      const cara = crearEntidad(el, { lienzo: `ancho: ${C.ancho - 0.02}; alto: ${C.alto - 0.02}`, position: `0 0 ${C.fondo / 2 + 0.002}` });
      const caja = { el, cara, fila: f, indice: i, valor: v };
      cara.addEventListener('mouseenter', () => { this.encima = caja; this.pintarCaja(caja); });
      cara.addEventListener('mouseleave', () => { if (this.encima === caja) this.encima = null; this.pintarCaja(caja); });
      cara.addEventListener('click', () => this.presionar('caja', caja));
      el.object3D.scale.setScalar(0.01);
      this.cajas.push(caja);
    }));
    this.apareciendo = performance.now();
    this.cajas.forEach((c) => this.pintarCaja(c));
    pintar(this.lienzoEtiquetas, (ctx, w, h) => {
      this.listas.forEach((l, f) => {
        let tam = 130;
        ctx.font = `600 ${tam}px ${MONO}`;
        while (ctx.measureText(l.nombre).width > w - 30) { tam *= 0.92; ctx.font = `600 ${tam}px ${MONO}`; }
        texto(ctx, l.nombre, w - 20, h / 2 + (f === 0 ? -0.2 : 0.2) * 1000, { tam, peso: 600, color: COLORES_FILA[f], alinear: 'right', fuente: MONO });
      });
    });
    const n = this.listas[0].valores.length;
    pintar(this.lienzoIndices, (ctx, w, h) => {
      const m = w / 3.4;
      for (let i = 0; i < n; i++) {
        texto(ctx, String(i), w / 2 + (this.xDe(i, n) - CONFIG.x0) * m, h / 2, { tam: 80, peso: 700, color: COLOR.tenue, alinear: 'center', fuente: MONO });
      }
    });
    this.mostrar(this.pantalla);
  },

  pintarCaja(c) {
    const ex = this.explicando() ? this.explicacion : null;
    const esCorrecta = this.reto && c.fila === this.reto.lista && c.indice === this.reto.indice;
    pintar(c.cara, (ctx, w, h) => {
      let borde = COLORES_FILA[c.fila];
      let fondo = '#0C1628';
      let grueso = 6;
      if (this.encima === c && !ex) { fondo = '#1A3560'; grueso = 14; borde = '#F2F4F8'; }
      if (ex && esCorrecta) { fondo = '#0E2E26'; borde = COLOR.bien; grueso = 16; }
      if (ex && ex.elegida === c && !esCorrecta) { fondo = '#3A1219'; borde = COLOR.mal; grueso = 16; }
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = borde;
      ctx.lineWidth = grueso;
      ctx.strokeRect(grueso / 2, grueso / 2, w - grueso, h - grueso);
      let tam = 100;
      ctx.font = `600 ${tam}px ${MONO}`;
      while (ctx.measureText(c.valor).width > w - 40 && tam > 30) { tam *= 0.93; ctx.font = `600 ${tam}px ${MONO}`; }
      const color = c.valor.startsWith('"') ? '#F2F4F8' : COLOR_PY.numero;
      texto(ctx, c.valor, w / 2, h / 2 + 4, { tam, peso: 600, color, alinear: 'center', fuente: MONO });
    });
  },

  // --- preguntas ---

  /** Siguiente llamada; al acabar las de un conjunto, otras listas. */
  nuevoReto() {
    if (!this.pendientes.length) {
      if (!this.mazo.length) this.mazo = barajar(this.datos.conjuntos.slice());
      const conjunto = this.mazo.pop();
      this.pendientes = conjunto.retos.slice();
      this.ponerListas(conjunto);
    }
    this.reto = this.pendientes.shift();
    this.funcion = this.datos.funciones.find((f) => f.id === this.reto.f);
    this.cajas.forEach((c) => this.pintarCaja(c));
    this.dibujarInfo();
  },

  responder(caja) {
    const bien = caja.fila === this.reto.lista && caja.indice === this.reto.indice;
    if (bien) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar('¡Correcto! · +1', COLOR.bien);
    } else {
      this.errores += 1;
      this.bloquear('Esa caja no es');
    }
    this.explicar(bien, caja);
    this.dibujarBarra();
  },

  explicar(bien, elegida) {
    this.explicacion = { bien, elegida, hasta: performance.now() + Math.max(CONFIG.segundosExplicacion, bien ? 0 : CONFIG.segundosBloqueo) * 1000 };
    this.cajas.forEach((c) => this.pintarCaja(c));
    this.dibujarInfo();
  },

  explicando() { return this.explicacion && performance.now() < this.explicacion.hasta; },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
  },

  bloqueado() { return performance.now() < this.bloqueoHasta; },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2800 };
    this.dibujarMensaje();
  },

  terminar() {
    sonido.fin();
    rondaComun.terminar();
    this.explicacion = null;
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('archivero', this.puntaje, `errores ${this.errores} · saltadas ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick() {
    const ahora = performance.now();
    if (this.apareciendo) {
      const f = Math.min(1, (ahora - this.apareciendo) / CONFIG.msAparecer);
      const s = 0.01 + 0.99 * f * f * (3 - 2 * f);
      this.cajas.forEach((c) => c.el.object3D.scale.setScalar(s));
      if (f >= 1) this.apareciendo = null;
    }
    if (this.pantalla !== 'juego') return;
    if (this.explicacion && ahora >= this.explicacion.hasta) {
      this.explicacion = null;
      this.nuevoReto();
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

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON · LISTAS', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'El archivero', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú ves las listas; el equipo tiene las funciones.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Lee la llamada en voz alta: f3(nombres).', '2. El equipo te dice qué caja regresa la función.', '3. Toca esa caja con el láser.']
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
      texto(ctx, 'EL ARCHIVERO', 30, h / 2, { tam: 42, peso: 700 });
      texto(ctx, `Aciertos: ${this.puntaje}`, w * 0.6, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 56, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    const ex = this.explicando() ? this.explicacion : null;
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (!this.reto) return;
      if (ex) {
        // la función, los parámetros y cómo se llega a la caja
        texto(ctx, `FUNCIÓN ${this.funcion.id}`, 36, 40, { tam: 30, peso: 600, color: COLOR.tenue });
        pintarBloque(ctx, this.funcion.codigo, 40, 110, 40, { max: w * 0.48 });
        const x0 = w * 0.53;
        this.reto.parametros.forEach((par, i) => pintarPython(ctx, par, 60, h * (0.56 + i * 0.14), 44, { max: x0 - 100 }));
        this.reto.pasos.forEach((paso, i) => pintarPython(ctx, `${i ? '→ ' : ''}${paso}`, x0, h * (0.2 + i * 0.17), 52, { max: w - x0 - 30 }));
        texto(ctx, `regresa ${this.reto.valor}`, x0, h * 0.86, { tam: 60, peso: 700, color: ex.bien ? COLOR.bien : COLOR.mal, fuente: MONO });
        return;
      }
      texto(ctx, '¿QUÉ CAJA REGRESA?', 40, h * 0.13, { tam: 32, peso: 600, color: COLOR.tenue });
      texto(ctx, `Función ${this.reto.f} del manual`, w - 40, h * 0.13, { tam: 32, peso: 600, color: COLOR.acento, alinear: 'right' });
      ctx.font = `500 110px ${MONO}`;
      const ancho = Math.min(w - 120, ctx.measureText(this.reto.llamada).width);
      pintarPython(ctx, this.reto.llamada, (w - ancho) / 2, h * 0.5, 110, { max: w - 120 });
      texto(ctx, 'Léela al equipo · toca la caja que te digan', w / 2, h * 0.85, { tam: 34, color: COLOR.acento, alinear: 'center' });
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.4, { tam: 80, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.68, { tam: 48, alinear: 'center' });
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
      unidad: this.puntaje === 1 ? 'caja correcta' : 'cajas correctas',
      detalle: `Errores: ${this.errores} · Saltadas: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
