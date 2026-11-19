/* «Тропа»: состояние корзины и избранного. Контакты здесь не сохраняются. */
(() => {
  'use strict';
  const products = window.TROPA_PRODUCTS || [];
  const storage = window.TropaStorage;
  const validId = id => products.some(product => product.id === id);
  const iso = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const today = () => iso(new Date());
  const defaultDates = () => { const next = new Date(); next.setDate(next.getDate() + 1); return { start: today(), end: iso(next) }; };
  const day = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const [year, month, date] = value.split('-').map(Number);
    const timestamp = Date.UTC(year, month - 1, date);
    return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp / 86400000 : NaN;
  };
  const days = (start, end) => {
    const a = day(start), b = day(end);
    return Number.isFinite(a) && Number.isFinite(b) && start >= today() && b >= a ? Math.max(1, b - a) : 0;
  };
  const normalize = value => {
    const input = value && typeof value === 'object' ? value : {};
    const map = new Map();
    (Array.isArray(input.cart) ? input.cart : []).forEach(entry => {
      if (entry && validId(entry.id) && Number.isFinite(Number(entry.quantity))) {
        map.set(entry.id, { id: entry.id, quantity: Math.max(1, Math.min(5, Math.trunc(Number(entry.quantity)))) });
      }
    });
    const favorites = [...new Set((Array.isArray(input.favorites) ? input.favorites : []).filter(validId))];
    const dates = input.dates && days(input.dates.start, input.dates.end) ? { start: input.dates.start, end: input.dates.end } : defaultDates();
    return { cart: [...map.values()], favorites, dates };
  };
  let state = normalize(storage.read('tropa.shop', {}));
  let saved = true;
  const notify = reason => window.dispatchEvent(new CustomEvent('tropa:state', { detail: { reason, persistent: saved } }));
  const commit = reason => { saved = storage.write('tropa.shop', state); notify(reason); return saved; };
  const copy = value => JSON.parse(JSON.stringify(value));
  const api = {
    snapshot: () => copy(state),
    items: () => state.cart.map(entry => ({ ...entry, product: products.find(product => product.id === entry.id) })),
    favorites: () => state.favorites.map(id => products.find(product => product.id === id)),
    hasFavorite: id => state.favorites.includes(id),
    count: () => state.cart.reduce((sum, item) => sum + item.quantity, 0),
    dates: () => copy(state.dates),
    days, today,
    add(id, quantity = 1) {
      if (!validId(id)) return 0;
      const amount = Math.max(1, Math.min(5, Math.trunc(Number(quantity) || 1)));
      const entry = state.cart.find(item => item.id === id);
      const before = entry ? entry.quantity : 0;
      const next = Math.min(5, before + amount);
      if (entry) entry.quantity = next; else state.cart.push({ id, quantity: next });
      commit('cart'); return next - before;
    },
    setQuantity(id, quantity) {
      const entry = state.cart.find(item => item.id === id);
      if (!entry || !Number.isFinite(Number(quantity))) return;
      entry.quantity = Math.max(1, Math.min(5, Math.trunc(Number(quantity)))); commit('cart');
    },
    remove(id) { state.cart = state.cart.filter(entry => entry.id !== id); commit('cart'); },
    clear() { state.cart = []; commit('cart'); },
    toggleFavorite(id) {
      if (!validId(id)) return false;
      state.favorites = state.favorites.includes(id) ? state.favorites.filter(value => value !== id) : [...state.favorites, id];
      commit('favorites'); return state.favorites.includes(id);
    },
    setDates(start, end) {
      if (!days(start, end)) return false;
      if (state.dates.start !== start || state.dates.end !== end) { state.dates = { start, end }; commit('dates'); }
      return true;
    },
    totals(start = state.dates.start, end = state.dates.end) {
      const duration = days(start, end);
      const daily = api.items().reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
      const deposit = api.items().reduce((sum, entry) => sum + entry.product.deposit * entry.quantity, 0);
      return { days: duration, daily, rental: daily * duration, deposit, count: api.count() };
    }
  };
  window.TropaStore = api;
  window.addEventListener('storage', event => {
    if (event.key === 'tropa.shop') { state = normalize(storage.read('tropa.shop', {})); notify('sync'); }
  });
})();
