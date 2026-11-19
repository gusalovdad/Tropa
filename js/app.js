/* «Тропа»: каталог, карточка снаряжения, расчёт стоимости аренды. */
(() => {
  'use strict';
  const products = window.TROPA_PRODUCTS || [];
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const params = new URLSearchParams(window.location.search);
  const byId = id => products.find(product => product.id === id);
  const localISO = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const today = localISO(new Date());
  // UTC нужен только для разницы календарных дат, без влияния перехода на летнее время.
  const dayNumber = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const [y, m, d] = value.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  const getDays = (start, end) => {
    const difference = dayNumber(end) - dayNumber(start);
    return Number.isFinite(difference) && difference >= 0 ? Math.max(1, difference) : 0;
  };
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localISO(tomorrowDate);

  // Bootstrap отвечает за компоненты. Запасные обработчики — только при отсутствии CDN.
  if (!window.bootstrap) {
    document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(button => {
      button.addEventListener('click', () => {
        const target = document.querySelector(button.dataset.bsTarget);
        if (!target) return;
        const open = !target.classList.contains('show');
        const parent = target.dataset.bsParent;
        if (parent && open) {
          document.querySelector(parent).querySelectorAll('.collapse.show').forEach(other => {
            other.classList.remove('show');
            const trigger = document.querySelector(`[data-bs-target="#${other.id}"]`);
            if (trigger) { trigger.classList.add('collapsed'); trigger.setAttribute('aria-expanded', 'false'); }
          });
        }
        target.classList.toggle('show', open);
        button.classList.toggle('collapsed', !open);
        button.setAttribute('aria-expanded', String(open));
      });
    });
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(button => {
      button.addEventListener('click', () => {
        const list = button.closest('[role="tablist"]');
        list.querySelectorAll('[role="tab"]').forEach(tab => {
          tab.classList.remove('active');
          tab.setAttribute('aria-selected', 'false');
          document.querySelector(tab.dataset.bsTarget).classList.remove('active', 'show');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        document.querySelector(button.dataset.bsTarget).classList.add('active', 'show');
      });
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = Array.from(button.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
        let index = tabs.indexOf(button);
        index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[index].focus(); tabs[index].click();
      });
    });
  }
  const toTop = document.getElementById('toTop');
  if (toTop) {
    const updateScroll = () => { toTop.hidden = window.scrollY < 550; };
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      document.querySelector('.brand').focus({ preventScroll: true });
    });
  }

  // Фильтрация уже существующих в HTML карточек: каталог читается и без JavaScript.
  const filters = document.getElementById('filters');
  if (filters) {
    const grid = document.getElementById('productGrid');
    const cards = Array.from(grid.querySelectorAll('[data-product-id]'));
    const search = document.getElementById('fSearch');
    const category = document.getElementById('fCategory');
    const price = document.getElementById('fPrice');
    const sort = document.getElementById('fSort');
    if (Array.from(category.options).some(option => option.value === params.get('category'))) category.value = params.get('category');
    const apply = () => {
      const term = search.value.trim().toLocaleLowerCase('ru');
      let count = 0;
      const ordered = cards.slice().sort((a, b) => {
        const first = byId(a.dataset.productId), second = byId(b.dataset.productId);
        if (sort.value === 'price-asc') return first.price - second.price;
        if (sort.value === 'price-desc') return second.price - first.price;
        if (sort.value === 'name') return first.name.localeCompare(second.name, 'ru');
        return products.indexOf(first) - products.indexOf(second);
      });
      ordered.forEach(card => {
        const product = byId(card.dataset.productId);
        const match = (!term || `${product.name} ${product.type} ${product.desc}`.toLocaleLowerCase('ru').includes(term)) && (!category.value || category.value === product.category) && (!price.value || product.price <= Number(price.value));
        card.hidden = !match;
        if (match) count += 1;
        grid.append(card);
      });
      document.getElementById('resultCount').textContent = `Найдено: ${count} из ${products.length}`;
      document.getElementById('emptyState').hidden = count !== 0;
    };
    filters.addEventListener('submit', event => event.preventDefault());
    filters.addEventListener('input', apply);
    filters.addEventListener('change', apply);
    filters.addEventListener('reset', () => setTimeout(apply, 0));
    document.getElementById('clearEmpty').addEventListener('click', () => filters.reset());
    apply();
  }

  const rental = document.getElementById('rentalCalculator');
  if (rental) {
    const requested = params.get('id');
    const product = byId(requested || 'taiga-2');
    if (!product) {
      document.getElementById('productContent').hidden = true;
      document.getElementById('productNotFound').hidden = false;
      document.title = 'Снаряжение не найдено — Тропа';
    } else {
      document.title = `${product.name} — аренда от ${money(product.price)} в сутки | Тропа`;
      document.getElementById('productTitle').textContent = product.name;
      document.getElementById('productCrumb').textContent = product.name;
      document.getElementById('productType').textContent = product.type;
      document.getElementById('productDescription').textContent = product.long;
      document.getElementById('productIncludes').textContent = product.includes;
      document.getElementById('productRate').textContent = money(product.price);
      document.getElementById('productDeposit').textContent = money(product.deposit);
      const picture = document.getElementById('productImage');
      picture.src = product.image;
      picture.alt = `Иллюстрация: ${product.name}`;
      const specs = document.getElementById('productSpecs');
      specs.replaceChildren();
      product.specs.forEach(([label, value]) => {
        const row = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row'; th.textContent = label;
        const td = document.createElement('td'); td.textContent = value;
        row.append(th, td); specs.append(row);
      });
      const start = document.getElementById('rentStart');
      const end = document.getElementById('rentEnd');
      const quantity = document.getElementById('rentQuantity');
      start.min = today; start.value = today;
      end.min = today; end.value = tomorrow;
      const update = () => {
        end.min = start.value || today;
        end.setCustomValidity(end.value && start.value && end.value < start.value ? 'Дата возврата не может быть раньше получения.' : '');
        const days = getDays(start.value, end.value);
        const qty = Number(quantity.value);
        const valid = start.validity.valid && end.validity.valid && quantity.validity.valid && days > 0;
        document.getElementById('rentalDays').textContent = valid ? `Расчёт за ${days} сут., количество: ${qty}` : 'Выберите корректные даты и количество.';
        document.getElementById('rentalTotal').textContent = valid ? money(days * product.price * qty) : '—';
      };
      rental.addEventListener('input', update);
      rental.addEventListener('submit', event => {
        event.preventDefault(); update();
        if (!rental.reportValidity()) return;
        const next = new URLSearchParams({ item: product.id, start: start.value, end: end.value, quantity: quantity.value });
        window.location.href = `contacts.html?${next.toString()}#order`;
      });
      update();
    }
  }

  // Предварительный расчёт одного предмета или всего комплекта из корзины.
  const order = document.getElementById('orderForm');
  if (order) {
    const store = window.TropaStore;
    const cartMode = params.get('cart') === '1' && !!store;
    const item = document.getElementById('orderItem');
    const start = document.getElementById('orderStart');
    const end = document.getElementById('orderEnd');
    const quantity = document.getElementById('orderQuantity');
    const phone = document.getElementById('orderPhone');
    const name = document.getElementById('orderName');
    const message = document.getElementById('formMessage');
    const success = document.getElementById('formSuccess');
    const receipt = document.getElementById('receiptText');
    const cartList = document.getElementById('cartOrderItems');
    start.min = today; start.value = today;
    end.min = today; end.value = tomorrow;
    if (byId(params.get('item'))) item.value = params.get('item');
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('start') || '') && params.get('start') >= today) start.value = params.get('start');
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('end') || '') && params.get('end') >= start.value) end.value = params.get('end');
    if (/^[1-5]$/.test(params.get('quantity') || '')) quantity.value = params.get('quantity');
    if (cartMode) {
      const dates = store.dates(); start.value = dates.start; end.value = dates.end;
      item.disabled = true; quantity.disabled = true;
      document.getElementById('singleItemField').hidden = true;
      document.getElementById('singleQuantityField').hidden = true;
      cartList.hidden = false;
      document.getElementById('orderHeading').textContent = 'Рассчитать комплект';
    }
    const selected = () => cartMode ? store.items() : (byId(item.value) ? [{ product: byId(item.value), quantity: Number(quantity.value) }] : []);
    const renderCart = () => {
      if (!cartMode) return;
      cartList.replaceChildren();
      const entries = store.items();
      entries.forEach(entry => {
        const row = document.createElement('div'); row.className = 'cart-order-line';
        const label = document.createElement('span'); label.textContent = `${entry.product.name} × ${entry.quantity}`;
        const price = document.createElement('span'); price.textContent = money(entry.product.price * entry.quantity) + '/сут.';
        row.append(label, price); cartList.append(row);
      });
      if (!entries.length) { const text = document.createElement('p'); text.textContent = 'Корзина пуста. Добавьте снаряжение в каталоге.'; cartList.append(text); }
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'subtle-button'; edit.dataset.openShop = 'cart'; edit.textContent = 'Изменить состав корзины'; cartList.append(edit);
    };
    const update = () => {
      end.min = start.value || today;
      end.setCustomValidity(end.value && start.value && end.value < start.value ? 'Выберите возврат не раньше получения.' : '');
      const digits = phone.value.replace(/\D/g, '');
      phone.setCustomValidity(phone.value && (digits.length < 10 || digits.length > 15 || !/^[+\d\s()\-]+$/.test(phone.value)) ? 'Введите телефон: от 10 до 15 цифр.' : '');
      name.setCustomValidity(name.value && name.value.trim().length < 2 ? 'Укажите имя, не менее двух символов.' : '');
      const entries = selected();
      const days = store ? store.days(start.value, end.value) : getDays(start.value, end.value);
      const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
      const daily = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
      const deposit = entries.reduce((sum, entry) => sum + entry.product.deposit * entry.quantity, 0);
      const valid = entries.length > 0 && days > 0 && start.validity.valid && end.validity.valid && quantity.validity.valid;
      document.getElementById('orderTotal').textContent = valid ? money(daily * days) : '—';
      document.getElementById('orderSummary').textContent = valid ? `${count} шт., ${days} сут. × ${money(daily)} за весь комплект в сутки` : 'Выберите снаряжение и корректные даты.';
      document.getElementById('orderDeposit').textContent = valid ? `Возвратный залог отдельно: ${money(deposit)}.` : 'Залог рассчитывается после выбора снаряжения.';
    };
    order.addEventListener('input', () => { success.hidden = true; message.textContent = ''; update(); });
    order.addEventListener('change', () => { update(); if (cartMode) store.setDates(start.value, end.value); });
    order.addEventListener('submit', event => {
      event.preventDefault(); update(); order.classList.add('was-validated');
      if (!order.checkValidity() || !selected().length) {
        message.textContent = selected().length ? 'Проверьте обязательные поля и даты аренды.' : 'Добавьте снаряжение в корзину.';
        const invalid = order.querySelector(':invalid'); if (invalid) { invalid.focus(); invalid.reportValidity(); } return;
      }
      const entries = selected();
      const days = store ? store.days(start.value, end.value) : getDays(start.value, end.value);
      if (!days) { message.textContent = 'Проверьте даты аренды.'; return; }
      const total = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0) * days;
      receipt.textContent = `${entries.map(entry => `${entry.product.name}, ${entry.quantity} шт.`).join('; ')}. Получение: ${start.value.split('-').reverse().join('.')}, возврат: ${end.value.split('-').reverse().join('.')}. Стоимость аренды: ${money(total)}.`;
      if (cartMode) store.setDates(start.value, end.value);
      success.hidden = false; success.focus(); message.textContent = '';
    });
    order.addEventListener('reset', () => {
      setTimeout(() => {
        order.classList.remove('was-validated'); phone.setCustomValidity(''); name.setCustomValidity(''); end.setCustomValidity('');
        if (cartMode) { const dates = store.dates(); start.value = dates.start; end.value = dates.end; }
        else { start.value = today; end.value = tomorrow; }
        success.hidden = true; message.textContent = ''; update();
      }, 0);
    });
    if (cartMode) window.addEventListener('tropa:state', event => {
      if (event.detail.reason === 'dates' || event.detail.reason === 'sync') { const dates = store.dates(); start.value = dates.start; end.value = dates.end; }
      success.hidden = true; renderCart(); update();
    });
    renderCart(); update();
  }
})();
