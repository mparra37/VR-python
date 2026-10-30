/* Enlace VR · Python · Calculadora humana
 *
 * Enfrente hay un pizarrón con una expresión sencilla, por ejemplo print(3 + 17 % 5 * 2).
 * El del visor la resuelve (el equipo puede ayudar en voz alta) y escribe SOLO el resultado final
 * en el teclado de la consola. Si se equivoca: bloqueo de 5 s y la vuelve a intentar.
 * Con 2 correctas sale "¡SIGUIENTE!": el reloj se detiene y el visor pasa a otro del equipo.
 * +1 por expresión correcta. Python es exacto: 4.0 no es 4 (el juego avisa cuando solo cambia el formato).
 *
 * Datos: js/datos_calculadora.js (generador/generar.py evalúa cada expresión y cada paso en Python).
 */
/* global AFRAME, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, COLOR_PY, pintarPython */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosResuelta: 3,
  segundosSaltada: 5,
  aciertosPorTurno: 2,
  resueltasPorNivel: 4,
  pizarron: { x: 0, y: 1.98, z: -2.1, ancho: 3.3, alto: 1.05 },
};

const TECLAS = [['7', '8', '9', 'Borrar'], ['4', '5', '6', '.'], ['1', '2', '3', '0']];

const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

AFRAME.registerComponent('calculadora-humana', {
  init() {
    this.banco = window.CALCULADORA;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], turno: [], fin: [] };
    this.ultimoSegundo = null;
    this.expr = null;
    this.entrada = '';
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
    Object.keys(this.botones).forEach((n) => { this.pantallas[n] = crearEntidad(consola, { visible: false }); });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.22 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 5 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    // juego: a la izquierda lo que se escribe; a la derecha el teclado
    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.11', position: '0 0.44 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 0.76; alto: 0.62', position: '-0.36 0.03 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.07', position: '0 -0.34 0' });
    TECLAS.forEach((fila, r) => fila.forEach((k, c) => {
      this.crearBoton('juego', k, 0.12 + c * 0.17, 0.27 - r * 0.15, { ancho: 0.155, alto: 0.13, accion: 'tecla', valor: k });
    }));
    this.crearBoton('juego', 'OK', 0.375, 0.27 - 3 * 0.15, { ancho: 0.665, alto: 0.13, accion: 'tecla', valor: 'OK', estilo: 'principal' });
    this.crearBoton('juego', 'Saltar', -0.42, -0.45, { ancho: 0.3, alto: 0.08, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.42, -0.45, { ancho: 0.3, alto: 0.08, accion: 'terminar' });

    // cambio de turno: el reloj se detiene hasta que el siguiente se pone el visor
    const tur = this.pantallas.turno;
    this.lienzoTurno = crearEntidad(tur, { lienzo: 'ancho: 1.5; alto: 0.62', position: '0 0.15 0' });
    this.crearBoton('turno', 'Listo: ya tengo el visor', 0, -0.33, { ancho: 0.9, alto: 0.16, accion: 'seguir', estilo: 'principal' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.12 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    const P = CONFIG.pizarron;
    this.pizarron = crearEntidad(this.el, { lienzo: `ancho: ${P.ancho}; alto: ${P.alto}`, position: `${P.x} ${P.y} ${P.z}` });
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
    } else if (accion === 'seguir' && this.pantalla === 'turno') {
      this.seguir();
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.resuelta) return null;
      if (accion === 'tecla') this.teclear(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.resuelta = { bien: false, hasta: performance.now() + CONFIG.segundosSaltada * 1000 };
        this.avisar(`Saltaste: daba ${this.expr.final}`, COLOR.mal);
        sonido.mal();
        this.dibujarTodo();
      }
    }
    return null;
  },

  teclaFisica(e) {
    if (this.pantalla === 'turno' && e.key === 'Enter') return this.presionar('seguir');
    if (this.pantalla !== 'juego') return null;
    const k = e.key;
    if (/^[0-9.]$/.test(k)) this.presionar('tecla', k);
    else if (k === 'Backspace') this.presionar('tecla', 'Borrar');
    else if (k === 'Enter') this.presionar('tecla', 'OK');
    return null;
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.turno = 1;
    this.aciertosTurno = 0;
    this.usadas = new Set();
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.resuelta = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevaExpresion();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Resuelve la expresión del pizarrón', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  /** Otra expresión del nivel actual (sin repetir). */
  nuevaExpresion() {
    this.nivel = Math.min(3, 1 + Math.floor(this.puntaje / CONFIG.resueltasPorNivel));
    let opciones = this.banco.filter((e, i) => e.nivel === this.nivel && !this.usadas.has(i));
    if (!opciones.length) {
      this.banco.forEach((e, i) => { if (e.nivel === this.nivel) this.usadas.delete(i); });
      opciones = this.banco.filter((e) => e.nivel === this.nivel);
    }
    this.expr = barajar(opciones)[0];
    this.usadas.add(this.banco.indexOf(this.expr));
    this.entrada = '';
    this.dibujarTodo();
  },

  teclear(k) {
    sonido.tecla();
    if (k === 'Borrar') this.entrada = this.entrada.slice(0, -1);
    else if (k === 'OK') return this.comprobar();
    else if (k === '.' && this.entrada.includes('.')) return null;
    else if (this.entrada.length < 7) this.entrada += k;
    this.dibujarInfo();
    return null;
  },

  comprobar() {
    if (!this.entrada) {
      this.avisar('Escribe el resultado y luego OK', COLOR.acento);
      return;
    }
    const esperado = this.expr.final;
    if (this.entrada === esperado) {
      this.puntaje += 1;
      this.aciertosTurno += 1;
      this.resuelta = { bien: true, hasta: performance.now() + CONFIG.segundosResuelta * 1000 };
      this.avisar(`¡Correcto! Python imprime ${esperado} · +1`, COLOR.bien);
      sonido.nivel();
      this.dibujarTodo();
      return;
    }
    this.errores += 1;
    // mismo número, otro formato: explicar entero contra decimal
    const mismoNumero = !Number.isNaN(Number(this.entrada)) && Number(this.entrada) === Number(esperado);
    let motivo = `No da ${this.entrada}. Revisen el orden de las operaciones`;
    if (mismoNumero && esperado.includes('.')) motivo = `Casi: Python escribe ${esperado} (con / sale decimal)`;
    else if (mismoNumero) motivo = `Casi: Python escribe ${esperado} (sin decimales)`;
    this.entrada = '';
    this.bloquear(motivo);
  },

  /** Después de una correcta (o saltada): otra expresión, o cambio de turno si ya lleva 2. */
  siguiente() {
    this.resuelta = null;
    if (this.aciertosTurno >= CONFIG.aciertosPorTurno) {
      this.aciertosTurno = 0;
      this.turno += 1;
      this.restantePausa = this.finRonda - performance.now();
      this.mostrar('turno');
      this.dibujarTurno();
      this.dibujarPizarron();
      sonido.bien();
      rondaComun.terminar();
      return;
    }
    this.nuevaExpresion();
  },

  seguir() {
    this.finRonda = performance.now() + this.restantePausa;
    this.mostrar('juego');
    this.nuevaExpresion();
    this.avisar(`Turno ${this.turno} · nivel ${this.nivel} · ¡a resolver!`, COLOR.acento);
    sonido.tecla();
    rondaComun.empezar(this.modo);
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
      ? marcador.registrar('calculadora', this.puntaje, `turnos ${this.turno} · nivel ${this.nivel} · errores ${this.errores}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick() {
    if (this.pantalla !== 'juego') return;
    const ahora = performance.now();
    if (this.resuelta && ahora > this.resuelta.hasta) this.siguiente();
    if (this.pantalla !== 'juego') return;
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

  /** Pizarrón: variables arriba, la expresión en grande y, al terminar, los pasos. */
  dibujarPizarron() {
    pintar(this.pizarron, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#0A1220');
      if (this.pantalla === 'turno') {
        texto(ctx, '¡SIGUIENTE!', w / 2, h * 0.38, { tam: 170, peso: 700, color: COLOR.bien, alinear: 'center' });
        texto(ctx, 'Pasa el visor a otro del equipo (con las dos manos)', w / 2, h * 0.7, { tam: 64, alinear: 'center' });
        return;
      }
      if (!this.expr) {
        texto(ctx, 'CALCULADORA HUMANA', w / 2, h * 0.42, { tam: 110, peso: 700, alinear: 'center' });
        texto(ctx, 'Aquí aparecerá la expresión', w / 2, h * 0.65, { tam: 52, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      const vars = Object.entries(this.expr.variables);
      if (vars.length) texto(ctx, vars.map(([k, v]) => `${k} = ${v}`).join('     '), 50, h * 0.13, { tam: 60, peso: 600, color: COLOR_PY.numero, fuente: MONO });
      texto(ctx, `NIVEL ${this.nivel}`, w - 50, h * 0.13, { tam: 40, peso: 600, color: COLOR.tenue, alinear: 'right', fuente: MONO });
      const linea = `print(${this.expr.expresion})`;
      const y = this.resuelta ? h * 0.4 : h * 0.52;
      ctx.font = `500 150px ${MONO}`;
      const ancho = Math.min(w - 120, ctx.measureText(linea).width);
      pintarPython(ctx, linea, (w - ancho) / 2, y, 150, { max: w - 120 });
      if (this.resuelta) {
        const pasos = this.expr.pasos.join('   →   ');
        texto(ctx, pasos, w / 2, h * 0.66, { tam: Math.min(54, (w - 100) / (pasos.length * 0.62)), color: COLOR.tenue, alinear: 'center', fuente: MONO });
        texto(ctx, `imprime ${this.expr.final}`, w / 2, h * 0.86, { tam: 76, peso: 700, color: this.resuelta.bien ? COLOR.bien : COLOR.mal, alinear: 'center', fuente: MONO });
      }
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, 'CALCULADORA HUMANA', 30, h / 2, { tam: 40, peso: 700 });
      texto(ctx, `Correctas: ${this.puntaje}`, w * 0.6, h / 2, { tam: 42, peso: 700, alinear: 'center' });
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
        texto(ctx, this.resuelta.bien ? '¡CORRECTO!' : 'SALTADA', w / 2, h * 0.3, { tam: 80, peso: 700, color: this.resuelta.bien ? COLOR.bien : COLOR.mal, alinear: 'center' });
        texto(ctx, `imprime ${this.expr.final}`, w / 2, h * 0.55, { tam: 64, peso: 600, alinear: 'center', fuente: MONO });
        return;
      }
      texto(ctx, `TURNO ${this.turno} · ${this.aciertosTurno} DE ${CONFIG.aciertosPorTurno}`, 40, h * 0.12, { tam: 34, peso: 600, color: COLOR.tenue });
      texto(ctx, '¿Qué imprime?', 40, h * 0.3, { tam: 60, peso: 700 });
      rectRedondo(ctx, 40, h * 0.44, w - 80, h * 0.32, 20);
      ctx.fillStyle = '#06080D';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = COLOR.acento;
      ctx.stroke();
      texto(ctx, this.entrada || '_', w / 2, h * 0.6, { tam: 104, peso: 600, alinear: 'center', fuente: MONO });
      texto(ctx, 'Escribe el resultado final y presiona OK', w / 2, h * 0.88, { tam: 32, color: COLOR.tenue, alinear: 'center' });
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

  dibujarTurno() {
    pintar(this.lienzoTurno, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, '¡SIGUIENTE!', w / 2, h * 0.2, { tam: 110, peso: 700, color: COLOR.bien, alinear: 'center' });
      texto(ctx, `Llevan ${this.puntaje} correctas. El reloj está en pausa.`, w / 2, h * 0.43, { tam: 44, alinear: 'center' });
      texto(ctx, 'Quítate el visor con las dos manos y pásalo', w / 2, h * 0.6, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, 'a otro del equipo. Él presiona el botón de abajo.', w / 2, h * 0.72, { tam: 40, color: COLOR.tenue, alinear: 'center' });
      texto(ctx, `Turno ${this.turno}`, w / 2, h * 0.9, { tam: 44, peso: 600, color: COLOR.acento, alinear: 'center' });
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'Calculadora humana', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú resuelves; el equipo te puede ayudar en voz alta.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Mira la expresión del pizarrón y resuélvela.', '2. Escribe solo el resultado final y presiona OK.', `3. Con ${CONFIG.aciertosPorTurno} correctas: ¡siguiente! Pasa el visor.`]
        .forEach((p, i) => texto(ctx, p, w * 0.08, h * (0.58 + i * 0.13), { tam: 40, peso: 500 }));
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#102039');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
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
      unidad: this.puntaje === 1 ? 'expresión correcta' : 'expresiones correctas',
      detalle: `Turnos: ${this.turno} · Nivel: ${this.nivel} · Errores: ${this.errores} · Saltadas: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
