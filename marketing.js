'use strict';
/* El bucle del titular. El HTML no lleva `autoplay`: lo arranca este código, para que sin
   JavaScript o con «reducir movimiento» se quede quieto en su portada. Todo lo que se mueve
   más de cinco segundos tiene que poder pararse (WCAG 2.2.2), de ahí el botón; y fuera de la
   pantalla se para solo, para no gastar batería mientras se lee el resto de la página. */
(function(){
  var video=document.querySelector('[data-bucle]'), boton=document.querySelector('[data-bucle-pausa]');
  if(!video||!boton) return;
  var quieto=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var parado=quieto, visible=true;
  function pinta(){ boton.textContent=video.paused?boton.getAttribute('data-sigue'):boton.getAttribute('data-pausa'); }
  function sigue(){
    if(parado||!visible){ video.pause(); return; }
    /* Safari con ahorro de energía rechaza el play() sin sonido: queda en pausa y el botón
       ofrece reproducir, en vez de un error en la consola. Un AbortError (una pausa que llega
       antes de que arranque, al salir de la pantalla) no es una negativa: no lo para del todo. */
    var p=video.play(); if(p&&p.catch) p.catch(function(e){ if(e&&e.name==='NotAllowedError') parado=true; pinta(); });
  }
  video.addEventListener('play',pinta); video.addEventListener('pause',pinta);
  boton.addEventListener('click',function(){ parado=!video.paused; sigue(); pinta(); });
  if('IntersectionObserver' in window) new IntersectionObserver(function(e){ visible=e[0].isIntersecting; sigue(); }).observe(video);
  boton.hidden=false; pinta(); sigue();
  /* El vídeo lleva música y efectos, pero arranca mudo: un navegador no deja sonar nada sin
     un toque. Al activar el sonido vuelve al principio, porque la música cuenta el día entero
     y empezarla a mitad no tiene sentido. */
  var sonido=document.querySelector('[data-bucle-sonido]');
  if(!sonido) return;
  function pintaSonido(){ sonido.textContent=video.muted?sonido.getAttribute('data-con'):sonido.getAttribute('data-sin'); }
  sonido.addEventListener('click',function(){
    video.muted=!video.muted;
    if(!video.muted){ video.currentTime=0; parado=false; sigue(); }
    pintaSonido();
  });
  sonido.hidden=false; pintaSonido();
})();
/* La muestra del cuaderno solo cambia el DOM local. No realiza peticiones ni guarda datos. */
(function(){
  var libro=document.querySelector('[data-cuaderno]');
  if(!libro) return;
  var tabs=Array.prototype.slice.call(libro.querySelectorAll('.cuaderno-tabs [role="tab"]'));
  function abre(i){
    tabs.forEach(function(tab,n){
      var activo=n===i;
      tab.setAttribute('aria-selected',String(activo));
      tab.tabIndex=activo?0:-1;
      var panel=document.getElementById(tab.getAttribute('aria-controls'));
      if(panel) panel.hidden=!activo;
    });
  }
  tabs.forEach(function(tab,i){
    tab.addEventListener('click',function(){ abre(i); });
    tab.addEventListener('keydown',function(e){
      var n=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:
        e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
      if(n!==null){ e.preventDefault(); abre(n); tabs[n].focus(); }
    });
  });
  var siguiente=libro.querySelector('.cuaderno-siguiente');
  if(siguiente) siguiente.addEventListener('click',function(){
    var i=tabs.findIndex(function(t){return t.getAttribute('aria-selected')==='true';});
    abre((i+1)%tabs.length);
    tabs[(i+1)%tabs.length].focus();
  });
  var ajustes=Array.prototype.slice.call(libro.querySelectorAll('.cuaderno-ajuste'));
  function actualiza(){
    var reservados=0, walkins=0;
    ajustes.forEach(function(a){
      var n=Number(a.getAttribute('data-count'))||0, max=Number(a.getAttribute('data-max'))||0;
      var walkin=a.hasAttribute('data-walkin');
      if(walkin) walkins+=n; else reservados+=n;
      /* Con su tope a la vista, «4/4»: dice por qué el «+» de una reserva completa ya no
         suma. Y el botón que no puede hacer nada se apaga con aria-disabled —no con
         disabled, que le quitaría el foco a quien va con el teclado—. */
      var o=a.querySelector('output');
      o.textContent=String(n);
      if(!walkin){ var de=document.createElement('small'); de.textContent='/'+max; o.appendChild(de); }
      a.querySelector('[data-delta="-1"]').setAttribute('aria-disabled',String(n<=0));
      a.querySelector('[data-delta="1"]').setAttribute('aria-disabled',String(n>=max));
    });
    libro.querySelectorAll('[data-ruta-llegados]').forEach(function(x){x.textContent=String(reservados);});
    libro.querySelectorAll('[data-ruta-faltan]').forEach(function(x){x.textContent=String(14-reservados);});
    libro.querySelectorAll('[data-ruta-total]').forEach(function(x){x.textContent=String(reservados+walkins);});
  }
  ajustes.forEach(function(a){
    a.addEventListener('click',function(e){
      var boton=e.target.closest('button[data-delta]');
      if(!boton) return;
      var n=Number(a.getAttribute('data-count'))||0;
      var max=Number(a.getAttribute('data-max'))||0;
      var nuevo=Math.max(0,Math.min(max,n+Number(boton.getAttribute('data-delta'))));
      if(nuevo===n) return;
      a.setAttribute('data-count',String(nuevo));
      a.classList.remove('cambia');
      void a.offsetWidth;
      a.classList.add('cambia');
      actualiza();
    });
  });
  actualiza();
})();

/* La selección estable de sección se distingue del hover y del foco. */
(function(){
  var cab=document.querySelector('.cabecera'),menu=cab.querySelector('.menu');
  var enlaces=Array.from(cab.querySelectorAll('a[href^="#"]'));
  var secciones=Array.from(new Set(enlaces.map(function(a){return a.hash.slice(1);}))).map(function(id){return document.getElementById(id);}).filter(Boolean);
  var pendiente=false;
  function actualiza(){
    pendiente=false;
    var limite=cab.getBoundingClientRect().height+100;
    var actual=secciones.find(function(s){var r=s.getBoundingClientRect();return r.top<=limite&&r.bottom>limite;});
    enlaces.forEach(function(a){if(actual&&a.hash==='#'+actual.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  }
  function pide(){if(!pendiente){pendiente=true;requestAnimationFrame(actualiza);}}
  window.addEventListener('scroll',pide,{passive:true});window.addEventListener('hashchange',pide);
  window.addEventListener('resize',function(){if(innerWidth>1000)menu.open=false;pide();});
  menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.open=false;});});
  document.addEventListener('pointerdown',function(e){if(menu.open&&!menu.contains(e.target))menu.open=false;});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
  pide();
})();
