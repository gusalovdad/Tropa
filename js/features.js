/* Тема, корзина, избранное и локальный консультант. Без внешних запросов. */
(() => {
  'use strict';
  const store = window.TropaStore;
  if (!store) return;
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const products = window.TROPA_PRODUCTS;
  const params = new URLSearchParams(window.TROPA_QUERY || window.location.search);
  const icons = {
    heart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 14a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
  };
  let toastTimer;
  const toast = text => {
    const output = document.getElementById('shopToast');
    if (dialog.open) dialog.append(output); else document.body.append(output);
    output.textContent = text; output.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { output.hidden = true; }, 3800);
  };
  const themeToggle = document.getElementById('themeToggle');
  const syncTheme = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
    themeToggle.setAttribute('aria-label', label); themeToggle.title = label;
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.innerHTML = dark ? icons.sun : icons.moon;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#15231d' : '#244c3d';
  };
  syncTheme();
  let themeTransitionBusy = false;
  let fallbackThemeTimer;
  const applyTheme = theme => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.setAttribute('data-bs-theme', theme);
    const persisted = window.TropaStorage.write('tropa.theme', theme);
    syncTheme();
    if (!persisted) toast('Тема изменена. Браузер не разрешил сохранить настройку.');
  };
  themeToggle.addEventListener('click', () => {
    if (themeTransitionBusy) return;
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { applyTheme(theme); return; }
    themeTransitionBusy = true; themeToggle.disabled = true;
    const finish = () => { themeTransitionBusy = false; themeToggle.disabled = false; };
    // В поддерживаемых браузерах — плавный наплыв снимков всей страницы.
    if (typeof document.startViewTransition === 'function') {
      try {
        const transition = document.startViewTransition(() => applyTheme(theme));
        transition.finished.catch(() => {
          if (document.documentElement.dataset.theme !== theme) applyTheme(theme);
        }).finally(finish);
        return;
      } catch (_) { /* В старых браузерах меняем цвета через CSS-переход. */ }
    }
    document.documentElement.classList.add('theme-fading');
    applyTheme(theme);
    clearTimeout(fallbackThemeTimer);
    fallbackThemeTimer = setTimeout(() => {
      document.documentElement.classList.remove('theme-fading'); finish();
    }, 950);
  });
  window.addEventListener('storage', event => {
    if (event.key !== 'tropa.theme') return;
    const theme = window.TropaStorage.read('tropa.theme', 'light');
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', document.documentElement.dataset.theme); syncTheme();
  });

  const dialog = document.getElementById('shopDialog');
  const body = document.getElementById('shopBody');
  const title = document.getElementById('shopTitle');
  let panel = 'cart';
  const make = (tag, className = '', text = '') => { const element = document.createElement(tag); if (className) element.className = className; if (text) element.textContent = text; return element; };
  const button = (text, label, attribute, value, className = 'btn btn-outline-primary btn-sm') => {
    const element = make('button', className, text); element.type = 'button'; element.setAttribute('aria-label', label); element.setAttribute(attribute, value); return element;
  };
  const showPanel = mode => {
    closeChat(false);
    panel = mode; renderPanel();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    document.getElementById('shopClose').focus();
  };
  const closePanel = () => { dialog.close(); document.body.classList.remove('dialog-open'); };
  document.getElementById('shopClose').addEventListener('click', closePanel);
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePanel();
  });

  const renderPanel = () => {
    title.textContent = panel === 'cart' ? 'Корзина' : 'Избранное';
    const focusId = document.activeElement && document.activeElement.id;
    body.replaceChildren();
    const entries = panel === 'cart' ? store.items() : store.favorites().map(product => ({ product, id: product.id }));
    if (!entries.length) {
      const empty = make('div', 'drawer-empty');
      empty.innerHTML = icons.heart;
      empty.append(make('h3', '', panel === 'cart' ? 'Соберите свой комплект' : 'Сохраните то, что понравилось'));
      empty.append(make('p', '', panel === 'cart' ? 'Добавляйте снаряжение из каталога. Здесь можно выбрать количество и рассчитать всё вместе.' : 'Нажмите на сердечко в карточке снаряжения — оно появится здесь.'));
      const link = make('a', 'btn btn-primary', 'Перейти в каталог'); link.href = 'catalog.html'; empty.append(link); body.append(empty); return;
    }
    const info = make('p', 'drawer-intro', panel === 'cart' ? 'Все вещи в одном расчёте. Залог показан отдельно.' : 'Ваш список для будущих маршрутов. Добавляйте нужное в корзину, когда определитесь.');
    body.append(info);
    const list = make('div', 'drawer-products');
    entries.forEach(entry => {
      const product = entry.product;
      const row = make('article', 'drawer-product');
      const picture = make('img'); picture.src = product.image; picture.alt = ''; picture.width = 110; picture.height = 90;
      const copy = make('div', 'drawer-product-copy');
      const name = make('a', 'drawer-product-name', product.name); name.href = `equipment.html?id=${product.id}`;
      copy.append(name, make('p', 'drawer-rate', `${money(product.price)} / сутки`));
      if (panel === 'cart') {
        const controls = make('div', 'quantity-controls');
        const minus = button('−', `Уменьшить количество: ${product.name}`, 'data-minus', product.id, 'quantity-button');
        minus.disabled = entry.quantity <= 1; minus.id = `minus-${product.id}`;
        const input = make('input', 'quantity-input'); input.type = 'number'; input.min = '1'; input.max = '5'; input.step = '1'; input.value = entry.quantity;
        input.id = `quantity-${product.id}`; input.setAttribute('aria-label', `Количество: ${product.name}`); input.dataset.quantityId = product.id;
        const plus = button('+', `Увеличить количество: ${product.name}`, 'data-plus', product.id, 'quantity-button');
        plus.disabled = entry.quantity >= 5; plus.id = `plus-${product.id}`;
        controls.append(minus, input, plus);
        const remove = button('Убрать', `Убрать из корзины: ${product.name}`, 'data-remove-cart', product.id, 'subtle-button'); controls.append(remove); copy.append(controls);
      } else {
        const actions = make('div', 'favorite-actions');
        actions.append(button('В корзину', `В корзину: ${product.name}`, 'data-add-cart', product.id, 'btn btn-primary btn-sm'));
        actions.append(button('Убрать', `Убрать из избранного: ${product.name}`, 'data-favorite', product.id, 'subtle-button'));
        copy.append(actions);
      }
      row.append(picture, copy); list.append(row);
    });
    body.append(list);
    if (panel === 'cart') {
      const dates = store.dates(), total = store.totals();
      const datesBox = make('div', 'drawer-dates');
      datesBox.append(make('h3', '', 'Даты для всего комплекта'));
      const datesRow = make('div', 'row g-3');
      [['cartStart', 'Получение', dates.start], ['cartEnd', 'Возврат', dates.end]].forEach(([id, label, value]) => {
        const col = make('div', 'col-6'), labelNode = make('label', 'form-label', label);
        labelNode.htmlFor = id;
        const input = make('input', 'form-control'); input.id = id; input.type = 'date'; input.value = value; input.required = true;
        input.min = id === 'cartStart' ? store.today() : dates.start; col.append(labelNode, input); datesRow.append(col);
      });
      datesBox.append(datesRow, make('p', 'small text-muted mt-3 mb-0', 'Минимум — одни сутки. Количество каждого предмета: от 1 до 5.')); body.append(datesBox);
      const summary = make('div', 'drawer-summary');
      const breakdown = make('p', 'small text-muted', `${total.count} шт. · ${total.days} сут. · ${money(total.daily)} в сутки`); breakdown.id = 'cartBreakdown'; summary.append(breakdown);
      const line = make('div', 'summary-line'); const totalNode = make('strong', '', money(total.rental)); totalNode.id = 'cartTotal'; line.append(make('span', '', 'Аренда'), totalNode); summary.append(line);
      summary.append(make('p', 'small text-muted mt-3', `Возвратный залог: ${money(total.deposit)}. Не включён в аренду.`));
      const next = make('a', 'btn btn-primary', 'Перейти к расчёту комплекта'); next.href = 'contacts.html?cart=1#order'; next.id = 'cartCheckout'; summary.append(next);
      summary.append(make('p', 'drawer-disclaimer', 'Наличие подтвердит пункт проката. Добавление в корзину не создаёт бронь.'));
      summary.append(button('Очистить корзину', 'Очистить корзину', 'data-clear-cart', 'true', 'subtle-button'));
      body.append(summary);
    }
    if (focusId) { const target = document.getElementById(focusId); if (target && !target.disabled) target.focus({ preventScroll: true }); }
  };
  body.addEventListener('change', event => {
    const input = event.target;
    if (input.dataset.quantityId) {
      if (!input.checkValidity()) { const value = Math.max(1, Math.min(5, Math.trunc(Number(input.value) || 1))); store.setQuantity(input.dataset.quantityId, value); toast('Количество должно быть от 1 до 5.'); return; }
      store.setQuantity(input.dataset.quantityId, Number(input.value));
    }
    if (input.id === 'cartStart' || input.id === 'cartEnd') {
      const start = document.getElementById('cartStart'), end = document.getElementById('cartEnd');
      end.min = start.value || store.today();
      end.setCustomValidity(end.value < start.value ? 'Возврат не может быть раньше получения.' : '');
      if (!start.reportValidity() || !end.reportValidity()) {
        document.getElementById('cartTotal').textContent = '—';
        document.getElementById('cartBreakdown').textContent = 'Проверьте даты аренды.';
        const checkout = document.getElementById('cartCheckout'); checkout.removeAttribute('href'); checkout.setAttribute('aria-disabled', 'true');
        return;
      }
      store.setDates(start.value, end.value); renderPanel();
    }
  });

  const updateButtons = () => {
    const count = store.count(), favorites = store.favorites().length;
    document.querySelector('[data-open-shop="cart"]').setAttribute('aria-label', `Корзина: ${count} шт.`);
    document.querySelector('[data-open-shop="favorites"]').setAttribute('aria-label', `Избранное: ${favorites} шт.`);
    document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = count; node.hidden = count === 0; });
    document.querySelectorAll('[data-favorites-count]').forEach(node => { node.textContent = favorites; node.hidden = favorites === 0; });
    document.querySelectorAll('[data-favorite]').forEach(element => {
      const product = products.find(product => product.id === element.dataset.favorite);
      if (!product) return;
      const selected = store.hasFavorite(product.id);
      element.classList.toggle('is-favorite', selected); element.setAttribute('aria-pressed', String(selected));
      const label = `${selected ? 'Убрать из избранного' : 'В избранное'}: ${product.name}`;
      element.setAttribute('aria-label', label); element.title = label;
    });
  };
  const detailId = params.get('id') || 'taiga-2';
  if (products.some(product => product.id === detailId)) {
    document.querySelectorAll('[data-detail-favorite]').forEach(element => { element.dataset.favorite = detailId; });
    document.querySelectorAll('[data-detail-cart]').forEach(element => { element.dataset.addCart = detailId; });
  }
  document.querySelectorAll('.js-shop-control').forEach(element => { element.disabled = false; });
  document.addEventListener('click', event => {
    const trigger = event.target.closest('button');
    if (!trigger) return;
    if (trigger.dataset.openShop) { showPanel(trigger.dataset.openShop); return; }
    if (trigger.dataset.favorite) {
      const selected = store.toggleFavorite(trigger.dataset.favorite);
      toast(selected ? 'Добавлено в избранное.' : 'Убрано из избранного.'); return;
    }
    if (trigger.dataset.addCart) {
      const form = trigger.closest('#rentalCalculator');
      let quantity = 1;
      if (form) {
        if (!form.reportValidity()) return;
        const start = document.getElementById('rentStart').value, end = document.getElementById('rentEnd').value;
        if (!store.setDates(start, end)) { toast('Проверьте даты аренды.'); return; }
        quantity = Number(document.getElementById('rentQuantity').value);
      }
      const added = store.add(trigger.dataset.addCart, quantity);
      toast(added ? (form ? 'Добавлено в корзину. Выбранные даты применены ко всему комплекту.' : 'Добавлено в корзину. Даты можно выбрать для всего комплекта.') : 'В корзине уже 5 единиц этого предмета.'); return;
    }
    if (trigger.dataset.minus || trigger.dataset.plus) {
      const id = trigger.dataset.minus || trigger.dataset.plus;
      const entry = store.items().find(item => item.id === id);
      if (entry) store.setQuantity(id, entry.quantity + (trigger.dataset.plus ? 1 : -1)); return;
    }
    if (trigger.dataset.removeCart) { store.remove(trigger.dataset.removeCart); return; }
    if (trigger.dataset.clearCart) { store.clear(); toast('Корзина очищена.'); }
  });
  window.addEventListener('tropa:state', event => {
    updateButtons(); if (dialog.open) renderPanel();
    if (event.detail && !event.detail.persistent) toast('Изменения работают на этой странице. Браузер не разрешил сохранить их.');
  });
  updateButtons();

  // Это автопомощник с локальными готовыми ответами, не живой оператор и не ИИ-API.
  const reply = text => {
    const query = text.toLocaleLowerCase('ru').trim();
    if (/налич|брон|брони|свобод/.test(query)) return 'Наличие на конкретные даты проверяет пункт проката. Корзина и калькулятор показывают стоимость, но не резервируют вещи. Откройте «Контакты», чтобы связаться с пунктом выдачи.';
    if (/адрес|самовывоз|достав|где|час|график/.test(query)) return 'Самовывоз: Москва, ул. Лесная, д. 12. График: ежедневно 10:00–20:00. Время получения и возврата нужно согласовать заранее. Информация о доставке не указана — уточните её в пункте проката.';
    if (/цен|стоим|залог|сколько|расч[её]т/.test(query)) return 'Цена указана за сутки. Например, палатка «Тайга 2» — 450 ₽/сут., рюкзак — 250 ₽/сут., спальник — 200 ₽/сут. Добавьте нужное в корзину и укажите даты: рассчитаю комплект целиком. Возвратный залог показывается отдельно.';
    if (/спаль|холод|тепл|температур/.test(query)) return 'Выбирайте спальник по температуре комфорта и ночному прогнозу. «Ночь +5» рассчитан на комфорт около +5 °C, но многое зависит от коврика и условий. Для холодного маршрута уточните более тёплый комплект в пункте проката.';
    if (/палат/.test(query)) return 'Для первой ночёвки вдвоём можно рассмотреть «Тайгу 2». Проверьте вместимость, сезонность и тамбур, а перед выездом потренируйтесь собирать палатку. Для зимы и сложных горных условий нужен другой комплект.';
    if (/контакт|телефон|почт|оператор|человек|связ/.test(query)) return 'Я автопомощник и отвечаю на частые вопросы. Для связи с пунктом проката откройте страницу «Контакты»: там телефон, почта, MAX и Telegram. Сейчас ссылки мессенджеров ведут на страницы самих сервисов.';
    if (/перв|нач|поход|собра|взять/.test(query)) return 'Начните с простого маршрута. Для прогулки нужны удобный рюкзак, вода, еда, одежда по погоде, карта и фонарь. Для ночёвки добавьте палатку, подходящий спальник и коврик. В разделе «С чего начать?» есть пошаговый гид и памятка вещей.';
    if (/корзин|избран/.test(query)) return 'Сердечко сохраняет вещь в избранное, а кнопка «В корзину» добавляет её в общий расчёт. Откройте корзину в шапке, измените количество и даты, затем нажмите «Перейти к расчёту комплекта».';
    if (/^привет|здравств|добрый/.test(query)) return 'Здравствуйте! Я автопомощник «Тропы». Подскажу, с чего начать поход, как выбрать снаряжение и как считается аренда. Что вас интересует?';
    return 'Могу подсказать по первому походу, палаткам, спальникам, стоимости, залогу и самовывозу. Напишите тему или выберите быстрый вопрос. Индивидуальные договорённости нужно обсудить с пунктом проката.';
  };
  window.TropaAssistantReply = reply;
  const chat = document.getElementById('consultantPanel'), launcher = document.getElementById('consultantToggle');
  const log = document.getElementById('chatLog');
  function closeChat(restore = true) { chat.hidden = true; launcher.setAttribute('aria-expanded', 'false'); if (restore) launcher.focus(); }
  const addMessage = (text, author) => {
    const node = make('div', `chat-message chat-message-${author}`);
    node.append(make('span', 'chat-author', author === 'user' ? 'Вы' : 'Автопомощник'), make('p', '', text)); log.append(node);
    while (log.children.length > 40) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  };
  launcher.addEventListener('click', () => {
    const open = chat.hidden; chat.hidden = !open; launcher.setAttribute('aria-expanded', String(open));
    if (open) document.getElementById('chatTitle').focus();
  });
  document.getElementById('chatClose').addEventListener('click', () => closeChat());
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !chat.hidden) closeChat(); });
  document.getElementById('chatForm').addEventListener('submit', event => {
    event.preventDefault(); const input = document.getElementById('chatInput'), text = input.value.trim();
    if (!text) { input.focus(); return; } addMessage(text, 'user'); input.value = ''; addMessage(reply(text), 'assistant'); input.focus();
  });
  document.querySelectorAll('[data-chat-question]').forEach(button => button.addEventListener('click', () => {
    addMessage(button.dataset.chatQuestion, 'user'); addMessage(reply(button.dataset.chatQuestion), 'assistant');
  }));
  addMessage('Здравствуйте! Я автопомощник «Тропы». Помогу разобраться со снаряжением и расчётом аренды. Выберите тему или задайте вопрос.', 'assistant');
})();
