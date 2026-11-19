/* Живая походная открытка: вечер только внутри иллюстрации. */
(() => {
  'use strict';
  const scene = document.getElementById('campPostcard');
  const button = document.getElementById('campEveningToggle');
  const caption = document.getElementById('campSceneCaption');
  if (!scene || !button || !caption) return;
  const label = button.querySelector('[data-evening-label]');
  const picture = scene.querySelector('.camp-night-picture');
  if (!label || !picture) return;
  const nightImage = new Image();
  let ready = false;
  const enable = () => {
    if (ready) return;
    ready = true; button.hidden = false;
    button.addEventListener('click', () => {
      const night = !scene.classList.contains('is-night');
      scene.classList.toggle('is-night', night);
      button.setAttribute('aria-pressed', String(night));
      label.textContent = night ? 'Вернуть день' : 'Вечер в горах';
      caption.textContent = night ? 'Звёзды над головой. Тёплый свет в палатке.' : 'Хороший выходной начинается с рюкзака.';
    });
  };
  nightImage.addEventListener('load', enable, { once: true });
  nightImage.src = picture.src;
  if (nightImage.complete && nightImage.naturalWidth) enable();
})();
