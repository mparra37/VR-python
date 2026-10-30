/* Enlace VR · Python · El cadenero (and, or, not)
 *
 * El Operador ve en el pizarrón el número de función, el valor de cada parámetro y la llamada, por
 * ejemplo entra(18, 1.60). El equipo tiene la función completa en su hoja:
 *     def entra(edad, estatura):
 *         if edad >= 18 and estatura > 1.50: ...
 * Ponen cada valor en su parámetro, resuelven cada comparación y le dicen qué regresa. El Operador
 * elige esa respuesta (True / False, o el texto que regresa). Después el pizarrón muestra cada
 * comparación resuelta: 18 >= 18 and 1.60 > 1.50 → True and True → True.
 *
 * +1 por acierto; error o saltar: bloqueo de 5 s. Ronda de 5 minutos.
 * Datos: js/datos_logica.js (generador/generar.py corre cada llamada en Python y evalúa cada comparación).
 */
/* global AFRAME, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, COLOR_PY, pintarPython, pintarBloque */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosExplicacion: 5,
  aciertosPorNivel: 4,
  pizarron: { y: 2.3, z: -2.3, ancho: 3.4, alto: 1.1 },
  respuesta: { y: 1.47, z: -2.05, ancho: 0.8, alto: 0.34, separacion: 0.92 },
};

const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const NUMERO = ['1', '2', '3'];

AFRAME.registerComponent('cadenero', {
  init() {
    this.datos = window.LOGICA;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.reto = null;
    this.explicacion = null;
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
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.4', position: '0 0.1 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.19 0' });
    this.crearBoton('juego', 'Saltar', -0.4, -0.35, { ancho: 0.32, alto: 0.1, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.4, -0.35, { ancho: 0.32, alto: 0.1, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    const P = CONFIG.pizarron;
    this.pizarron = crearEntidad(this.el, { lienzo: `ancho: ${P.ancho}; alto: ${P.alto}`, position: `0 ${P.y} ${P.z}` });

    // hasta 3 respuestas, debajo del pizarrón
    const R = CONFIG.respuesta;
    this.respuestas = [0, 1, 2].map((i) => {
      const el = crearEntidad(this.el, { lienzo: `ancho: ${R.ancho}; alto: ${R.alto}`, position: `0 ${R.y} ${R.z}`, visible: false });
      el.addEventListener('mouseenter', () => { this.encima = i; this.dibujarRespuestas(); });
      el.addEventListener('mouseleave', () => { if (this.encima === i) this.encima = null; this.dibujarRespuestas(); });
      el.addEventListener('click', () => this.presionar('respuesta', i));
      this.botones.juego.push(el);
      return { el, texto: '' };
    });

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

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.explicando()) return null;
      if (accion === 'respuesta' && valor < this.reto.opciones.length) this.responder(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.explicar(false, null);
        this.bloquear('Saltaste la llamada');
      }
    }
    return null;
  },

  /** En la computadora: teclas 1, 2, 3 = respuestas (también T = True y F = False). */
  teclaFisica(e) {
    if (this.pantalla !== 'juego' || !this.reto) return;
    const k = e.key.toUpperCase();
    let i = NUMERO.indexOf(k);
    if (k === 'T') i = this.reto.opciones.indexOf('True');
    if (k === 'F') i = this.reto.opciones.indexOf('False');
    if (i >= 0) this.presionar('respuesta', i);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.explicacion = null;
    this.mazos = {};
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.respuestas.forEach((r) => r.el.setAttribute('visible', true));
    this.mostrar('juego');
    this.nuevoReto();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Díganle al equipo la función y los valores', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  /** Otra llamada del nivel actual, sin repetir hasta acabar ese nivel. */
  nuevoReto() {
    this.nivel = Math.min(3, 1 + Math.floor(this.puntaje / CONFIG.aciertosPorNivel));
    if (!this.mazos[this.nivel] || !this.mazos[this.nivel].length) {
      this.mazos[this.nivel] = barajar(this.datos.retos.filter((r) => r.nivel === this.nivel));
    }
    this.reto = this.mazos[this.nivel].pop();
    this.funcion = this.datos.funciones.find((f) => f.id === this.reto.f);
    this.correcta = this.reto.opciones.indexOf(this.reto.correcta);
    this.elegida = null;
    // acomodar las respuestas (2 o 3) en una fila centrada
    const R = CONFIG.respuesta;
    const n = this.reto.opciones.length;
    this.respuestas.forEach((r, i) => {
      r.texto = this.reto.opciones[i] || '';
      r.el.setAttribute('visible', i < n);
      r.el.object3D.position.x = (i - (n - 1) / 2) * R.separacion;
    });
    this.mostrar('juego');
    this.dibujarTodo();
  },

  responder(i) {
    const bien = i === this.correcta;
    if (bien) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar('¡Correcto! · +1', COLOR.bien);
    } else {
      this.errores += 1;
      this.bloquear('La función no regresa eso');
    }
    this.explicar(bien, i);
  },

  /** El pizarrón muestra la función y cada comparación resuelta; luego sigue otra llamada. */
  explicar(bien, elegida) {
    this.explicacion = { bien, elegida, hasta: performance.now() + Math.max(CONFIG.segundosExplicacion, bien ? 0 : CONFIG.segundosBloqueo) * 1000 };
    this.dibujarTodo();
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
    this.respuestas.forEach((r) => r.el.setAttribute('visible', false));
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('cadenero', this.puntaje, `nivel ${this.nivel} · errores ${this.errores} · saltadas ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    this.respuestas.forEach((r, i) => { r.el.object3D.position.y = CONFIG.respuesta.y + Math.sin(t / 900 + i) * 0.01; });
    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
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

  dibujarTodo() {
    this.dibujarPizarron();
    this.dibujarRespuestas();
    this.dibujarBarra();
    this.dibujarInfo();
    this.dibujarMensaje();
  },

  dibujarPizarron() {
    const ex = this.explicacion;
    pintar(this.pizarron, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#0A1220');
      if (!this.reto || this.pantalla !== 'juego') {
        texto(ctx, 'EL CADENERO', w / 2, h * 0.4, { tam: 130, peso: 700, alinear: 'center' });
        texto(ctx, 'and  ·  or  ·  not', w / 2, h * 0.64, { tam: 64, color: COLOR_PY.clave, alinear: 'center', fuente: MONO });
        return;
      }
      texto(ctx, `FUNCIÓN ${this.funcion.id} DEL MANUAL`, 50, 70, { tam: 46, peso: 700, color: COLOR.acento });
      texto(ctx, `NIVEL ${this.nivel}`, w - 50, 70, { tam: 40, peso: 600, color: COLOR.tenue, alinear: 'right', fuente: MONO });
      if (ex) {
        this.dibujarExplicacion(ctx, w, h, ex);
        return;
      }
      // los valores de cada parámetro y la llamada
      this.reto.parametros.forEach((v, i) => {
        const y = h * 0.28 + i * 115;
        texto(ctx, `parámetro ${i + 1}`, 90, y, { tam: 72, color: COLOR.tenue, fuente: MONO });
        texto(ctx, '=', 640, y, { tam: 72, color: COLOR.tenue, fuente: MONO });
        pintarPython(ctx, v, 730, y, 84);
      });
      ctx.font = `500 130px ${MONO}`;
      const ancho = Math.min(w - 140, ctx.measureText(this.reto.llamada).width);
      pintarPython(ctx, this.reto.llamada, (w - ancho) / 2, h * 0.8, 130, { max: w - 140 });
      texto(ctx, '¿Qué regresa?', w - 70, h * 0.3, { tam: 64, peso: 700, alinear: 'right' });
    });
  },

  /** La función a la izquierda; a la derecha cada condición, con valores y ya resuelta. */
  dibujarExplicacion(ctx, w, h, ex) {
    const lineasCodigo = this.funcion.codigo.split('\n').length;
    const tamCodigo = Math.min(54, (h - 170) / (lineasCodigo * 1.32));
    pintarBloque(ctx, this.funcion.codigo, 50, 150, tamCodigo, { max: w * 0.46 });
    const x0 = w * 0.52;
    const max = w - x0 - 50;
    let y = 150;
    const filas = this.reto.pasos.reduce((s, p) => s + p.lineas.length, 0) + 1;
    const tam = Math.min(62, (h - 190) / (filas * 1.35));
    this.reto.pasos.forEach((p) => {
      p.lineas.forEach((l, k) => {
        const prefijo = k === 0 ? `${p.clave} ` : '→ ';
        const final = k === p.lineas.length - 1 ? `  → ${p.valor}` : '';
        pintarPython(ctx, `${prefijo}${l}${final}`, x0, y, tam, { max });
        y += tam * 1.35;
      });
    });
    const color = ex.bien ? COLOR.bien : COLOR.mal;
    texto(ctx, `regresa ${this.reto.correcta}`, x0, Math.min(y + tam * 0.6, h - 50), { tam: Math.max(tam * 1.2, 54), peso: 700, color, fuente: MONO });
  },

  dibujarRespuestas() {
    const ex = this.explicando() ? this.explicacion : null;
    this.respuestas.forEach((r, i) => {
      pintar(r.el, (ctx, w, h) => {
        let borde = this.encima === i ? COLOR.acento : 'rgba(242,244,248,.3)';
        let fondo = this.encima === i ? '#13284A' : '#0C1628';
        if (ex && i === this.correcta) { borde = COLOR.bien; fondo = '#0E2E26'; }
        if (ex && ex.elegida === i && i !== this.correcta) { borde = COLOR.mal; fondo = '#3A1219'; }
        rectRedondo(ctx, 6, 6, w - 12, h - 12, 34);
        ctx.fillStyle = fondo;
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.strokeStyle = borde;
        ctx.stroke();
        texto(ctx, NUMERO[i], 46, h / 2, { tam: 46, peso: 700, color: COLOR.tenue, alinear: 'center' });
        let tam = 120;
        ctx.font = `600 ${tam}px ${MONO}`;
        while (ctx.measureText(r.texto).width > w - 140 && tam > 40) {
          tam *= 0.92;
          ctx.font = `600 ${tam}px ${MONO}`;
        }
        let color = COLOR_PY.texto;
        if (r.texto === 'True') color = COLOR.bien;
        if (r.texto === 'False') color = COLOR.mal;
        texto(ctx, r.texto, w / 2 + 20, h / 2, { tam, peso: 600, color, alinear: 'center', fuente: MONO });
      });
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON · AND · OR · NOT', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'El cadenero', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú ves los valores; el equipo tiene la función completa.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Diles el número de función y cada parámetro.', '2. El equipo resuelve las comparaciones y te dice qué regresa.', '3. Apunta a esa respuesta (abajo del pizarrón).']
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
      texto(ctx, 'EL CADENERO', 30, h / 2, { tam: 42, peso: 700 });
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
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (!this.reto) return;
      texto(ctx, 'DILE AL EQUIPO', 40, h * 0.15, { tam: 32, peso: 600, color: COLOR.tenue });
      texto(ctx, `"Función ${this.funcion.id}: ${this.reto.llamada}"`, w / 2, h * 0.45, { tam: 64, peso: 600, alinear: 'center', fuente: MONO });
      texto(ctx, 'Ellos resuelven cada comparación · tú apuntas a la respuesta', w / 2, h * 0.78, { tam: 34, color: COLOR.acento, alinear: 'center' });
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.4, { tam: 80, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · miren el pizarrón`, w / 2, h * 0.7, { tam: 46, alinear: 'center' });
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
      unidad: this.puntaje === 1 ? 'respuesta correcta' : 'respuestas correctas',
      detalle: `Nivel: ${this.nivel} · Errores: ${this.errores} · Saltadas: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
