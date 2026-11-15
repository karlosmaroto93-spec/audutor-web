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
  /* La línea de arriba del vídeo, con su punto dorado, se toca y se arrastra como una barra de
     tiempo (Carlos, 14-nov). El punto va pintado dentro del vídeo y avanza de forma continua,
     así que esta capa no dibuja nada: dice adónde saltar y el vídeo enseña el punto allí.
     La geometría y los tiempos salen del vídeo (video/src/formato.ts y calendario() de
     guion.ts, formato 4:5): la línea va de x 64 a 1016 de 1080, y el punto recorre de 2,8 s
     (entra la primera escena) a 46,25 s (empieza el cierre; 47,5 con «sin cobertura» y 40
     sin ella, hasta que entró «Te hacemos la web», 15-nov). Si cambia el guion, cambian aquí. */
  var barra=document.querySelector('[data-bucle-barra]');
  if(barra){
    var X0=64/1080, X1=1016/1080, DESDE=2.8, FIN=46.25;
    var arrastrando=false, seguia=false, destino=null;
    var tiempoEn=function(x){ var r=video.getBoundingClientRect(); var p=((x-r.left)/r.width-X0)/(X1-X0); return DESDE+Math.min(1,Math.max(0,p))*(FIN-DESDE); };
    /* Un salto por cuadro: al arrastrar llegan más movimientos que cuadros y cada salto hace
       que el navegador busque el fotograma; con el último basta. */
    var salta=function(t){ var ya=destino!==null; destino=t; if(!ya) requestAnimationFrame(function(){ video.currentTime=destino; destino=null; }); };
    barra.addEventListener('pointerdown',function(e){
      if(e.button>0) return;
      arrastrando=true; seguia=!video.paused; video.pause();
      try{ barra.setPointerCapture(e.pointerId); }catch(_){}
      salta(tiempoEn(e.clientX)); e.preventDefault();
    });
    barra.addEventListener('pointermove',function(e){ if(arrastrando) salta(tiempoEn(e.clientX)); });
    var suelta=function(){ if(!arrastrando) return; arrastrando=false; if(seguia) sigue(); };
    barra.addEventListener('pointerup',suelta); barra.addEventListener('pointercancel',suelta);
    barra.addEventListener('keydown',function(e){
      var t=video.currentTime, n={ArrowLeft:t-5,ArrowDown:t-5,ArrowRight:t+5,ArrowUp:t+5,Home:DESDE,End:FIN}[e.key];
      if(n===undefined) return;
      e.preventDefault(); video.currentTime=Math.min(Math.max(n,0),video.duration||FIN);
    });
    var cuenta=function(){ barra.setAttribute('aria-valuenow',String(Math.round(video.currentTime))); if(video.duration) barra.setAttribute('aria-valuemax',String(Math.round(video.duration))); };
    video.addEventListener('timeupdate',cuenta); video.addEventListener('loadedmetadata',cuenta);
    barra.hidden=false;
  }
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
