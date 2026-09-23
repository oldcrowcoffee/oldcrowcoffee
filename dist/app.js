const toggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('#navigation');
function closeNavigation() {
  navigation.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}
toggle.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeNavigation();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    closeNavigation();
    toggle.focus();
  }
});
document.querySelector('#year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Warm the animation assets before a visitor asks a crow to take off.
const flightAssets = ['crow-natural-flight.webp'].map(src => {
  const image = new Image();
  image.src = src;
  return image;
});
const crowMessages = {
  neighbor: ['Caw! Well, hello there.', 'You look like good company.', 'Same perch, new friends.', 'See you at the window!'],
  menu: ['Caw! Still brewing.', 'Good things are worth the wait.', 'Keeping an eye on the menu.']
};
document.querySelectorAll('.crow-friend').forEach(crow => {
  const art = crow.querySelector('.crow-bird');
  const reply = crow.closest('.crow-perch, .menu-card').querySelector('.crow-reply');
  let visits = 0;
  let animation;
  let hoverTimer;
  let flight;
  let flightLayer;
  let departed = false;
  function land() {
    flight?.cancel();
    flight = undefined;
    flightLayer?.remove();
    flightLayer = undefined;
    art.style.visibility = '';
    crow.classList.remove('is-flying');
  }
  function flyAway() {
    if (reducedMotion.matches || flight || document.hidden) return;
    departed = true;

    const bounds = art.getBoundingClientRect();
    flightLayer = document.createElement('div');
    flightLayer.className = 'crow-flight-layer';
    flightLayer.setAttribute('aria-hidden', 'true');
    const bird = document.createElement('div');
    bird.className = 'crow-in-flight';
    const airborne = document.createElement('img');
    airborne.src = 'crow-natural-flight.webp';
    airborne.alt = '';
    airborne.className = 'crow-airborne';
    const perched = art.querySelector('img').cloneNode();
    perched.className = 'crow-takeoff-logo';
    bird.append(airborne, perched);
    const size = bounds.width * 1.9;
    Object.assign(bird.style, { left: `${bounds.left - bounds.width * .45}px`, top: `${bounds.top - bounds.height * .45}px`, width: `${size}px`, height: `${bounds.height * 1.9}px` });
    flightLayer.append(bird);
    document.body.append(flightLayer);
    art.style.visibility = 'hidden';
    crow.classList.add('is-flying');
    reply.textContent = 'Caw! Be right back.';
    const exitX = window.innerWidth - bounds.left + bounds.width;
    const exitY = -Math.min(220, Math.max(100, bounds.top * .45));
    flight = bird.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(0,5px) scale(1.04,.94)', opacity: 1, offset: .05 },
      { transform: 'translate(12px,-20px) scale(1)', opacity: 1, offset: .16 },
      { transform: `translate(${exitX*.28}px,${exitY*.25}px) rotate(-3deg) scale(1)`, opacity: 1, offset: .32 },
      { transform: `translate(${exitX}px,${exitY}px) rotate(-3deg) scale(.85)`, opacity: 0, offset: .58 },
      { transform: 'translate(-70px,-140px) rotate(0deg) scale(.9)', opacity: 0, offset: .72 },
      { transform: 'translate(-30px,-65px) rotate(0deg) scale(1)', opacity: 1, offset: .83 },
      { transform: 'translate(-8px,-18px) scale(1)', opacity: 1, offset: .94 },
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 }
    ], { duration: 4600, easing: 'ease-in-out' });
    flight.onfinish = () => {
      land();
      reply.textContent = 'Back on my perch.';
    };
  }
  function cancelHover() {
    clearTimeout(hoverTimer);
    departed = false;
    art.style.setProperty('--crow-lean', '0deg');
  }
  function waitForFlight() {
    clearTimeout(hoverTimer);
    if (!reducedMotion.matches && !departed && !flight) hoverTimer = setTimeout(flyAway, 1400);
  }
  crow.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') waitForFlight();
  });
  crow.addEventListener('pointerleave', cancelHover);
  crow.addEventListener('pointercancel', cancelHover);
  crow.addEventListener('focus', () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) waitForFlight();
  });
  crow.addEventListener('blur', cancelHover);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelHover(); land(); }
  });
  crow.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = crow.getBoundingClientRect();
    const lean = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
    art.style.setProperty('--crow-lean', `${lean}deg`);
  });

  crow.addEventListener('click', () => {
    clearTimeout(hoverTimer);
    if (flight) return;
    const messages = crowMessages[crow.dataset.crow];
    reply.textContent = messages[visits++ % messages.length];

    if (!reducedMotion.matches) flyAway();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      cancelHover();
      land();
  
      art.style.setProperty('--crow-lean', '0deg');
    }
  });
});



// Native horizontal scrolling supports touch swipes without intercepting page scrolling.
const strip = document.querySelector('#coffee-strip');
const stripSlides = [...strip.querySelectorAll('.strip-slide')];
const stripMobile = window.matchMedia('(max-width: 760px)');
let stripIndex = 0;
let stripScrollTimer;
function showStripSlide(index) {
  if (!stripMobile.matches) return;
  stripIndex = (index + stripSlides.length) % stripSlides.length;
  strip.scrollTo({ left: stripIndex * strip.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.querySelector('.strip-prev').addEventListener('click', () => showStripSlide(stripIndex - 1));
document.querySelector('.strip-next').addEventListener('click', () => showStripSlide(stripIndex + 1));
strip.addEventListener('keydown', event => {
  if (!stripMobile.matches || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  showStripSlide(event.key === 'Home' ? 0 : event.key === 'End' ? stripSlides.length - 1 : stripIndex + (event.key === 'ArrowRight' ? 1 : -1));
});
strip.addEventListener('scroll', () => {
  clearTimeout(stripScrollTimer);
  stripScrollTimer = setTimeout(() => {
    if (!stripMobile.matches) return;
    stripIndex = Math.round(strip.scrollLeft / strip.clientWidth);
    document.querySelector('.strip-status').textContent = `${stripIndex + 1} of ${stripSlides.length}: ${stripSlides[stripIndex].textContent.trim()}`;
  }, 150);
}, { passive: true });
new ResizeObserver(() => {
  strip.scrollTo({ left: stripMobile.matches ? stripIndex * strip.clientWidth : 0, behavior: 'instant' });
  strip.tabIndex = stripMobile.matches ? 0 : -1;
}).observe(strip);
