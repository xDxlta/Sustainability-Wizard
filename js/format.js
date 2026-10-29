/* Number formatting helpers (browser + Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.format = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function int(n) { if (n == null || !isFinite(n)) return '-'; return Math.round(n).toLocaleString('en-US'); }
  function dec(n, d) { if (n == null || !isFinite(n)) return '-'; return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function money(symbol, n, decimals) { if (n == null || !isFinite(n)) return '-'; var d = decimals == null ? 0 : decimals; if (Math.abs(n) >= 1000) d = 0; return symbol + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function years(y) { if (y == null) return '-'; if (!isFinite(y)) return 'no payback'; if (y < 1) return Math.round(y * 12) + ' months'; return dec(y, 1) + ' years'; }
  function pct(p) { return dec(p * 100, p * 100 % 1 === 0 ? 0 : 1) + '%'; }
  function compact(n) { if (n == null || !isFinite(n)) return '-'; var a = Math.abs(n); if (a >= 1e6) return dec(n / 1e6, 2) + ' million'; if (a >= 1e4) return int(n); return int(n); }
  return { int: int, dec: dec, money: money, years: years, pct: pct, compact: compact };
});
