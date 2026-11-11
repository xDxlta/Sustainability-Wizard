/* Number formatting helpers (browser + Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.format = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function int(n) { if (n == null || !isFinite(n)) return '-'; return Math.round(n).toLocaleString('en-US'); }
  function dec(n, d) { if (n == null || !isFinite(n)) return '-'; return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  /** Legacy compact money without a space ("-RM1,200"); kept for the benchmark script and older tests. */
  function money(symbol, n, decimals) {
    if (n == null || !isFinite(n)) return '-';
    var d = decimals == null ? 0 : decimals; if (Math.abs(n) >= 1000) d = 0;
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (n < 0 ? '-' : '') + symbol + s;
  }
  /** Legacy short money ("Rp1.2B"); kept for the benchmark script and older tests. */
  function moneyShort(symbol, n, decimals) {
    if (n == null || !isFinite(n)) return '-';
    var a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a >= 1e9) return sign + symbol + dec(a / 1e9, a / 1e9 >= 10 ? 1 : 2) + 'B';
    if (a >= 1e6) return sign + symbol + dec(a / 1e6, a / 1e6 >= 10 ? 1 : 2) + 'M';
    return money(symbol, n, decimals);
  }

  /* ---- display format of the interface (version 3 design) ---- */
  var MINUS = '−';
  /** Currency label as shown: always code or symbol, then a space. Singapore dollars read "SGD". */
  function code(symbol) { return symbol === 'S$' ? 'SGD' : symbol; }
  /** Full amount: "RM 0.81", "Rp 2,360", "SGD 140", "−RM 54,104". Whole amounts drop ".00". */
  function cur(symbol, n, decimals) {
    if (n == null || !isFinite(n)) return '-';
    var d = decimals == null ? 0 : decimals, a = Math.abs(n);
    if (a >= 1000) d = 0;
    var s = a.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    if (d > 0) s = s.replace(/\.0+$/, '');
    return (n < 0 ? MINUS : '') + code(symbol) + ' ' + s;
  }
  /** Amounts of 100,000 and above abbreviated: "RM 127k", "Rp 13.1M", "Rp 496M", "SGD 1.2M". */
  function curShort(symbol, n, decimals) {
    if (n == null || !isFinite(n)) return '-';
    var a = Math.abs(n);
    if (a < 100000) return cur(symbol, n, decimals);
    var units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']], out = null;
    for (var i = 0; i < units.length && out == null; i++) {
      var v = a / units[i][0];
      if (v < 1) continue;
      var r = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
      if (r >= 1000 && i > 0) { r = Math.round(a / units[i - 1][0] * 10) / 10; out = String(r).replace(/\.0$/, '') + units[i - 1][1]; }
      else out = (v >= 100 ? String(r) : r.toFixed(1).replace(/\.0$/, '')) + units[i][1];
    }
    return (n < 0 ? MINUS : '') + code(symbol) + ' ' + out;
  }
  /** "1,090 h" */
  function hours(n) { if (n == null || !isFinite(n)) return '-'; return int(n) + ' h'; }
  /** Weight from kilograms: "615 kg", "1.5 t". */
  function weight(kg) { if (kg == null || !isFinite(kg)) return '-'; return Math.abs(kg) < 1000 ? int(kg) + ' kg' : dec(kg / 1000, 1) + ' t'; }

  function years(y) {
    if (y == null) return '-';
    if (!isFinite(y)) return 'no payback';
    if (y > 30) return 'more than 30 years';
    if (y < 1) { var mo = Math.round(y * 12); return mo < 1 ? 'under 1 month' : mo === 1 ? '1 month' : mo + ' months'; }
    return dec(y, 1) + ' years';
  }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pct(p) { return dec(p * 100, p * 100 % 1 === 0 ? 0 : 1) + '%'; }
  function compact(n) { if (n == null || !isFinite(n)) return '-'; var a = Math.abs(n); if (a >= 1e6) return dec(n / 1e6, 2) + ' million'; return int(n); }
  return { int: int, dec: dec, money: money, moneyShort: moneyShort, cur: cur, curShort: curShort, code: code, hours: hours, weight: weight, MINUS: MINUS, years: years, cap: cap, pct: pct, compact: compact };
});
