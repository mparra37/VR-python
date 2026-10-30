/* Enlace VR · Python · Intérprete humano
 *
 * El Operador ve una instrucción como print(f3(9, 2)) y, enfrente, 4 puertas con respuestas posibles.
 * El equipo tiene el código de las funciones en su manual: la sigue a mano con esos valores y le dice
 * qué imprime Python. El Operador dispara a esa puerta. Al acertar (o fallar) se muestra el código de
 * la función y la respuesta correcta, para que todos vean por qué.
 *
 * +1 por acierto; error o saltar: bloqueo de 5 s. Ronda de 5 minutos.
 * Datos: js/datos_interprete.js (lo genera generador/generar.py ejecutando cada llamada en Python;
 * las respuestas falsas salen de versiones de la función con un error típico).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, pintarPython, pintarBloque */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosExplicacion: 4,
  radio: 2.3,
  puerta: { ancho: 0.78, alto: 0.56 },
  angulos: [-45, -15, 15, 45],
  altura: 1.9,
};

const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const LETRAS = ['A', 'B', 'C', 'D'];

AFRAME.registerComponent('interprete-humano', {
  init() {
    this.datos = window.INTERPRETE;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.reto = null;
    this.explicacion = null;
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
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.46', position: '0 0.07 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.22 0' });
    this.crearBoton('juego', 'Saltar', -0.4, -0.36, { ancho: 0.32, alto: 0.1, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0, -0.36, { ancho: 0.32, alto: 0.1, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // 4 puertas de respuesta, enfrente y arriba de la consola
    const P = CONFIG.puerta;
    this.puertas = CONFIG.angulos.map((a, i) => {
      const rad = THREE.MathUtils.degToRad(a);
      const el = crearEntidad(this.el, {
        lienzo: `ancho: ${P.ancho}; alto: ${P.alto}`,
        position: `${(Math.sin(rad) * CONFIG.radio).toFixed(3)} ${CONFIG.altura + (i % 2 ? 0.08 : -0.04)} ${(-Math.cos(rad) * CONFIG.radio).toFixed(3)}`,
        rotation: `0 ${-a} 0`,
      });
      el.addEventListener('mouseenter', () => { this.encima = i; this.dibujarPuertas(); el.object3D.scale.setScalar(1.08); });
      el.addEventListener('mouseleave', () => { if (this.encima === i) this.encima = null; this.dibujarPuertas(); el.object3D.scale.setScalar(1); });
      el.addEventListener('click', () => this.presionar('respuesta', i));
      this.botones.juego.push(el);
      return { el, texto: '' };
    });

    this.dibujarInicio();
    this.dibujarPuertas();
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
      if (accion === 'respuesta') this.responder(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.explicar(false, null);
        this.bloquear('Saltaste la pregunta');
      }
    }
    return null;
  },

  /** En la computadora: teclas A, B, C, D (o 1 a 4) = puertas. */
  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const k = e.key.toUpperCase();
    const i = LETRAS.includes(k) ? LETRAS.indexOf(k) : Number(k) - 1;
    if (i >= 0 && i < 4) this.presionar('respuesta', i);
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
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevoReto();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Léanle la instrucción al equipo', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  /** Otra pregunta, sin repetir hasta acabar el mazo. */
  nuevoReto() {
    if (!this.mazo.length) this.mazo = barajar(this.datos.retos.slice());
    this.reto = this.mazo.pop();
    this.funcion = this.datos.funciones.find((f) => f.id === this.reto.f);
    const opciones = barajar([this.reto.correcta, ...this.reto.falsas]);
    this.puertas.forEach((p, i) => { p.texto = opciones[i]; });
    this.correcta = opciones.indexOf(this.reto.correcta);
    this.elegida = null;
    this.dibujarPuertas();
    this.dibujarInfo();
  },

  responder(i) {
    const bien = i === this.correcta;
    this.elegida = i;
    if (bien) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar('¡Correcto! · +1', COLOR.bien);
    } else {
      this.errores += 1;
      this.bloquear('Python no imprime eso');
    }
    this.explicar(bien, i);
    this.dibujarBarra();
  },

  /** Muestra la función y la respuesta correcta unos segundos; luego sigue la siguiente pregunta. */
  explicar(bien, elegida) {
    this.explicacion = { bien, elegida, hasta: performance.now() + Math.max(CONFIG.segundosExplicacion, bien ? 0 : CONFIG.segundosBloqueo) * 1000 };
    this.dibujarPuertas();
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
      ? marcador.registrar('interprete', this.puntaje, `errores ${this.errores} · saltadas ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    this.puertas.forEach((p, i) => {
      p.el.object3D.position.y = CONFIG.altura + (i % 2 ? 0.08 : -0.04) + Math.sin(t / 900 + i) * 0.015;
    });
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

  dibujarPuertas() {
    const ex = this.explicacion;
    this.puertas.forEach((p, i) => {
      pintar(p.el, (ctx, w, h) => {
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
        texto(ctx, LETRAS[i], 50, 60, { tam: 52, peso: 700, color: COLOR.acento, alinear: 'center' });
        texto(ctx, 'EN LA PANTALLA SALE:', w / 2 + 20, 60, { tam: 30, peso: 600, color: COLOR.tenue, alinear: 'center' });
        const lineas = (p.texto || '').split('\n');
        const tam = lineas.length > 1 ? 74 : 104;
        lineas.forEach((l, k) => texto(ctx, l, w / 2, h * 0.58 + (k - (lineas.length - 1) / 2) * tam * 1.15, { tam, peso: 600, alinear: 'center', fuente: MONO }));
      });
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'Intérprete humano', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú ves la instrucción; el equipo tiene el código de las funciones.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Lee la instrucción en voz alta: print(f3(9, 2)).', '2. El equipo sigue la función y te dice qué imprime.', '3. Dispárale a esa puerta (A, B, C o D).']
        .forEach((p, i) => texto(ctx, p, w * 0.1, h * (0.58 + i * 0.13), { tam: 40, peso: 500 }));
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#102039');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'INTÉRPRETE HUMANO', 30, h / 2, { tam: 40, peso: 700 });
      texto(ctx, `Aciertos: ${this.puntaje}`, w * 0.68, h / 2, { tam: 44, peso: 700, alinear: 'center' });
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
        // la función completa y la respuesta correcta
        texto(ctx, `FUNCIÓN ${this.funcion.id} DEL MANUAL`, 40, 40, { tam: 30, peso: 600, color: COLOR.tenue });
        const lineas = this.funcion.codigo.split('\n').length;
        const tam = Math.min(40, (h * 0.62) / (lineas * 1.32));
        pintarBloque(ctx, this.funcion.codigo, 50, 90, tam, { max: w * 0.62 });
        texto(ctx, this.reto.llamada, w - 40, h * 0.72, { tam: 38, peso: 600, color: COLOR.tenue, alinear: 'right', fuente: MONO });
        const sale = this.reto.correcta.replace(/\n/g, ' ⏎ ');
        texto(ctx, `→ ${sale}`, w - 40, h * 0.86, { tam: 52, peso: 700, color: ex.bien ? COLOR.bien : COLOR.mal, alinear: 'right', fuente: MONO });
        return;
      }
      texto(ctx, '¿QUÉ IMPRIME PYTHON?', 40, h * 0.12, { tam: 34, peso: 600, color: COLOR.tenue });
      texto(ctx, `Función ${this.reto.f} del manual`, w - 40, h * 0.12, { tam: 34, peso: 600, color: COLOR.acento, alinear: 'right' });
      pintarPython(ctx, this.reto.llamada, w / 2 - Math.min(w - 120, this.reto.llamada.length * 58) / 2, h * 0.47, 96, { max: w - 120 });
      texto(ctx, 'Léela al equipo · ellos la siguen a mano · dispara a la puerta', w / 2, h * 0.84, { tam: 34, color: COLOR.acento, alinear: 'center' });
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.4, { tam: 80, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.65, { tam: 50, alinear: 'center' });
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
      detalle: `Errores: ${this.errores} · Saltadas: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
