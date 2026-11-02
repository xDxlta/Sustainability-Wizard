/* Number formatting helpers (browser + Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.format = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function int(n) { if (n == null || !isFinite(n)) return '-'; return Math.round(n).toLocaleString('en-US'); }
  function dec(n, d) { if (n == null || !isFinite(n)) return '-'; return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  /** Money with the symbol before the digits and the sign before the symbol: "-RM1,200". */
  function money(symbol, n, decimals) {
    if (n == null || !isFinite(n)) return '-';
    var d = decimals == null ? 0 : decimals; if (Math.abs(n) >= 1000) d = 0;
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (n < 0 ? '-' : '') + symbol + s;
  }
  /** Short money for headline tiles: "Rp1.2B", "₱3.4M", else full. */
  function moneyShort(symbol, n, decimals) {
    if (n == null || !isFinite(n)) return '-';
    var a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a >= 1e9) return sign + symbol + dec(a / 1e9, a / 1e9 >= 10 ? 1 : 2) + 'B';
    if (a >= 1e6) return sign + symbol + dec(a / 1e6, a / 1e6 >= 10 ? 1 : 2) + 'M';
    return money(symbol, n, decimals);
  }
  function years(y) {
    if (y == null) return '-';
    if (!isFinite(y)) return 'no payback';
    if (y > 30) return 'more than 30 years';
    if (y < 1) return Math.round(y * 12) + ' months';
    return dec(y, 1) + ' years';
  }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pct(p) { return dec(p * 100, p * 100 % 1 === 0 ? 0 : 1) + '%'; }
  function compact(n) { if (n == null || !isFinite(n)) return '-'; var a = Math.abs(n); if (a >= 1e6) return dec(n / 1e6, 2) + ' million'; return int(n); }
  return { int: int, dec: dec, money: money, moneyShort: moneyShort, years: years, cap: cap, pct: pct, compact: compact };
});
