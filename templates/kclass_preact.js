var kclass = (() => {
  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var s;
  var a;
  var h;
  var p = {};
  var v = [];
  var y = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var d = Array.isArray;
  function w(n2, l3) {
    for (var u4 in l3)
      n2[u4] = l3[u4];
    return n2;
  }
  function g(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function _(l3, u4, t3) {
    var i4, r3, o3, e3 = {};
    for (o3 in u4)
      "key" == o3 ? i4 = u4[o3] : "ref" == o3 ? r3 = u4[o3] : e3[o3] = u4[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l3 && null != l3.defaultProps)
      for (o3 in l3.defaultProps)
        void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
    return m(l3, e3, i4, r3, null);
  }
  function m(n2, t3, i4, r3, o3) {
    var e3 = { type: n2, props: t3, key: i4, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
    return null == o3 && null != l.vnode && l.vnode(e3), e3;
  }
  function k(n2) {
    return n2.children;
  }
  function x(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function S(n2, l3) {
    if (null == l3)
      return n2.__ ? S(n2.__, n2.__i + 1) : null;
    for (var u4; l3 < n2.__k.length; l3++)
      if (null != (u4 = n2.__k[l3]) && null != u4.__e)
        return u4.__e;
    return "function" == typeof n2.type ? S(n2) : null;
  }
  function C(n2) {
    if (n2.__P && n2.__d) {
      var u4 = n2.__v, t3 = u4.__e, i4 = [], r3 = [], o3 = w({}, u4);
      o3.__v = u4.__v + 1, l.vnode && l.vnode(o3), z(n2.__P, o3, u4, n2.__n, n2.__P.namespaceURI, 32 & u4.__u ? [t3] : null, i4, null == t3 ? S(u4) : t3, !!(32 & u4.__u), r3), o3.__v = u4.__v, o3.__.__k[o3.__i] = o3, V(i4, o3, r3), u4.__e = u4.__ = null, o3.__e != t3 && M(o3);
    }
  }
  function M(n2) {
    if (null != (n2 = n2.__) && null != n2.__c)
      return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
        if (null != l3 && null != l3.__e)
          return n2.__e = n2.__c.base = l3.__e;
      }), M(n2);
  }
  function $(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !I.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(I);
  }
  function I() {
    for (var n2, l3 = 1; i.length; )
      i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, C(n2);
    I.__r = 0;
  }
  function P(n2, l3, u4, t3, i4, r3, o3, e3, f4, c3, s3) {
    var a3, h3, y3, d3, w3, g2, _2, m3 = t3 && t3.__k || v, b = l3.length;
    for (f4 = A(u4, l3, m3, f4, b), a3 = 0; a3 < b; a3++)
      null != (y3 = u4.__k[a3]) && (h3 = -1 != y3.__i && m3[y3.__i] || p, y3.__i = a3, g2 = z(n2, y3, h3, i4, r3, o3, e3, f4, c3, s3), d3 = y3.__e, y3.ref && h3.ref != y3.ref && (h3.ref && D(h3.ref, null, y3), s3.push(y3.ref, y3.__c || d3, y3)), null == w3 && null != d3 && (w3 = d3), (_2 = !!(4 & y3.__u)) || h3.__k === y3.__k ? f4 = H(y3, f4, n2, _2) : "function" == typeof y3.type && void 0 !== g2 ? f4 = g2 : d3 && (f4 = d3.nextSibling), y3.__u &= -7);
    return u4.__e = w3, f4;
  }
  function A(n2, l3, u4, t3, i4) {
    var r3, o3, e3, f4, c3, s3 = u4.length, a3 = s3, h3 = 0;
    for (n2.__k = new Array(i4), r3 = 0; r3 < i4; r3++)
      null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = m(null, o3, null, null, null) : d(o3) ? o3 = n2.__k[r3] = m(k, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = m(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f4 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = T(o3, u4, f4, a3)) && (a3--, (e3 = u4[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i4 > s3 ? h3-- : i4 < s3 && h3++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h3-- : c3 == f4 + 1 ? h3++ : (c3 > f4 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (a3)
      for (r3 = 0; r3 < s3; r3++)
        null != (e3 = u4[r3]) && 0 == (2 & e3.__u) && (e3.__e == t3 && (t3 = S(e3)), E(e3, e3));
    return t3;
  }
  function H(n2, l3, u4, t3) {
    var i4, r3;
    if ("function" == typeof n2.type) {
      for (i4 = n2.__k, r3 = 0; i4 && r3 < i4.length; r3++)
        i4[r3] && (i4[r3].__ = n2, l3 = H(i4[r3], l3, u4, t3));
      return l3;
    }
    n2.__e != l3 && (t3 && (l3 && n2.type && !l3.parentNode && (l3 = S(n2)), u4.insertBefore(n2.__e, l3 || null)), l3 = n2.__e);
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function T(n2, l3, u4, t3) {
    var i4, r3, o3, e3 = n2.key, f4 = n2.type, c3 = l3[u4], s3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e3 || s3 && e3 == c3.key && f4 == c3.type)
      return u4;
    if (t3 > (s3 ? 1 : 0)) {
      for (i4 = u4 - 1, r3 = u4 + 1; i4 >= 0 || r3 < l3.length; )
        if (null != (c3 = l3[o3 = i4 >= 0 ? i4-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f4 == c3.type)
          return o3;
    }
    return -1;
  }
  function j(n2, l3, u4) {
    "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || y.test(l3) ? u4 : u4 + "px";
  }
  function F(n2, l3, u4, t3, i4) {
    var r3, o3;
    n:
      if ("style" == l3)
        if ("string" == typeof u4)
          n2.style.cssText = u4;
        else {
          if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3)
            for (l3 in t3)
              u4 && l3 in u4 || j(n2.style, l3, "");
          if (u4)
            for (l3 in u4)
              t3 && u4[l3] == t3[l3] || j(n2.style, l3, u4[l3]);
        }
      else if ("o" == l3[0] && "n" == l3[1])
        r3 = l3 != (l3 = l3.replace(f, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u4, u4 ? t3 ? u4.u = t3.u : (u4.u = c, n2.addEventListener(l3, r3 ? a : s, r3)) : n2.removeEventListener(l3, r3 ? a : s, r3);
      else {
        if ("http://www.w3.org/2000/svg" == i4)
          l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2)
          try {
            n2[l3] = null == u4 ? "" : u4;
            break n;
          } catch (n3) {
          }
        "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
      }
  }
  function O(n2) {
    return function(u4) {
      if (this.l) {
        var t3 = this.l[u4.type + n2];
        if (null == u4.t)
          u4.t = c++;
        else if (u4.t < t3.u)
          return;
        return t3(l.event ? l.event(u4) : u4);
      }
    };
  }
  function z(n2, u4, t3, i4, r3, o3, e3, f4, c3, s3) {
    var a3, h3, p3, y3, _2, m3, b, S2, C3, M2, $2, I2, A3, H2, L, T3 = u4.type;
    if (void 0 !== u4.constructor)
      return null;
    128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f4 = u4.__e = t3.__e]), (a3 = l.__b) && a3(u4);
    n:
      if ("function" == typeof T3)
        try {
          if (S2 = u4.props, C3 = "prototype" in T3 && T3.prototype.render, M2 = (a3 = T3.contextType) && i4[a3.__c], $2 = a3 ? M2 ? M2.props.value : a3.__ : i4, t3.__c ? b = (h3 = u4.__c = t3.__c).__ = h3.__E : (C3 ? u4.__c = h3 = new T3(S2, $2) : (u4.__c = h3 = new x(S2, $2), h3.constructor = T3, h3.render = G), M2 && M2.sub(h3), h3.state || (h3.state = {}), h3.__n = i4, p3 = h3.__d = true, h3.__h = [], h3._sb = []), C3 && null == h3.__s && (h3.__s = h3.state), C3 && null != T3.getDerivedStateFromProps && (h3.__s == h3.state && (h3.__s = w({}, h3.__s)), w(h3.__s, T3.getDerivedStateFromProps(S2, h3.__s))), y3 = h3.props, _2 = h3.state, h3.__v = u4, p3)
            C3 && null == T3.getDerivedStateFromProps && null != h3.componentWillMount && h3.componentWillMount(), C3 && null != h3.componentDidMount && h3.__h.push(h3.componentDidMount);
          else {
            if (C3 && null == T3.getDerivedStateFromProps && S2 !== y3 && null != h3.componentWillReceiveProps && h3.componentWillReceiveProps(S2, $2), u4.__v == t3.__v || !h3.__e && null != h3.shouldComponentUpdate && false === h3.shouldComponentUpdate(S2, h3.__s, $2)) {
              u4.__v != t3.__v && (h3.props = S2, h3.state = h3.__s, h3.__d = false), u4.__e = t3.__e, u4.__k = t3.__k, u4.__k.some(function(n3) {
                n3 && (n3.__ = u4);
              }), v.push.apply(h3.__h, h3._sb), h3._sb = [], h3.__h.length && e3.push(h3);
              break n;
            }
            null != h3.componentWillUpdate && h3.componentWillUpdate(S2, h3.__s, $2), C3 && null != h3.componentDidUpdate && h3.__h.push(function() {
              h3.componentDidUpdate(y3, _2, m3);
            });
          }
          if (h3.context = $2, h3.props = S2, h3.__P = n2, h3.__e = false, I2 = l.__r, A3 = 0, C3)
            h3.state = h3.__s, h3.__d = false, I2 && I2(u4), a3 = h3.render(h3.props, h3.state, h3.context), v.push.apply(h3.__h, h3._sb), h3._sb = [];
          else
            do {
              h3.__d = false, I2 && I2(u4), a3 = h3.render(h3.props, h3.state, h3.context), h3.state = h3.__s;
            } while (h3.__d && ++A3 < 25);
          h3.state = h3.__s, null != h3.getChildContext && (i4 = w(w({}, i4), h3.getChildContext())), C3 && !p3 && null != h3.getSnapshotBeforeUpdate && (m3 = h3.getSnapshotBeforeUpdate(y3, _2)), H2 = null != a3 && a3.type === k && null == a3.key ? q(a3.props.children) : a3, f4 = P(n2, d(H2) ? H2 : [H2], u4, t3, i4, r3, o3, e3, f4, c3, s3), h3.base = u4.__e, u4.__u &= -161, h3.__h.length && e3.push(h3), b && (h3.__E = h3.__ = null);
        } catch (n3) {
          if (u4.__v = null, c3 || null != o3)
            if (n3.then) {
              for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; )
                f4 = f4.nextSibling;
              o3[o3.indexOf(f4)] = null, u4.__e = f4;
            } else {
              for (L = o3.length; L--; )
                g(o3[L]);
              N(u4);
            }
          else
            u4.__e = t3.__e, u4.__k = t3.__k, n3.then || N(u4);
          l.__e(n3, u4, t3);
        }
      else
        null == o3 && u4.__v == t3.__v ? (u4.__k = t3.__k, u4.__e = t3.__e) : f4 = u4.__e = B(t3.__e, u4, t3, i4, r3, o3, e3, c3, s3);
    return (a3 = l.diffed) && a3(u4), 128 & u4.__u ? void 0 : f4;
  }
  function N(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(N));
  }
  function V(n2, u4, t3) {
    for (var i4 = 0; i4 < t3.length; i4++)
      D(t3[i4], t3[++i4], t3[++i4]);
    l.__c && l.__c(u4, n2), n2.some(function(u5) {
      try {
        n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
          n3.call(u5);
        });
      } catch (n3) {
        l.__e(n3, u5.__v);
      }
    });
  }
  function q(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : d(n2) ? n2.map(q) : w({}, n2);
  }
  function B(u4, t3, i4, r3, o3, e3, f4, c3, s3) {
    var a3, h3, v3, y3, w3, _2, m3, b = i4.props || p, k3 = t3.props, x3 = t3.type;
    if ("svg" == x3 ? o3 = "http://www.w3.org/2000/svg" : "math" == x3 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
      for (a3 = 0; a3 < e3.length; a3++)
        if ((w3 = e3[a3]) && "setAttribute" in w3 == !!x3 && (x3 ? w3.localName == x3 : 3 == w3.nodeType)) {
          u4 = w3, e3[a3] = null;
          break;
        }
    }
    if (null == u4) {
      if (null == x3)
        return document.createTextNode(k3);
      u4 = document.createElementNS(o3, x3, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
    }
    if (null == x3)
      b === k3 || c3 && u4.data == k3 || (u4.data = k3);
    else {
      if (e3 = e3 && n.call(u4.childNodes), !c3 && null != e3)
        for (b = {}, a3 = 0; a3 < u4.attributes.length; a3++)
          b[(w3 = u4.attributes[a3]).name] = w3.value;
      for (a3 in b)
        w3 = b[a3], "dangerouslySetInnerHTML" == a3 ? v3 = w3 : "children" == a3 || a3 in k3 || "value" == a3 && "defaultValue" in k3 || "checked" == a3 && "defaultChecked" in k3 || F(u4, a3, null, w3, o3);
      for (a3 in k3)
        w3 = k3[a3], "children" == a3 ? y3 = w3 : "dangerouslySetInnerHTML" == a3 ? h3 = w3 : "value" == a3 ? _2 = w3 : "checked" == a3 ? m3 = w3 : c3 && "function" != typeof w3 || b[a3] === w3 || F(u4, a3, w3, b[a3], o3);
      if (h3)
        c3 || v3 && (h3.__html == v3.__html || h3.__html == u4.innerHTML) || (u4.innerHTML = h3.__html), t3.__k = [];
      else if (v3 && (u4.innerHTML = ""), P("template" == t3.type ? u4.content : u4, d(y3) ? y3 : [y3], t3, i4, r3, "foreignObject" == x3 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i4.__k && S(i4, 0), c3, s3), null != e3)
        for (a3 = e3.length; a3--; )
          g(e3[a3]);
      c3 || (a3 = "value", "progress" == x3 && null == _2 ? u4.removeAttribute("value") : null != _2 && (_2 !== u4[a3] || "progress" == x3 && !_2 || "option" == x3 && _2 != b[a3]) && F(u4, a3, _2, b[a3], o3), a3 = "checked", null != m3 && m3 != u4[a3] && F(u4, a3, m3, b[a3], o3));
    }
    return u4;
  }
  function D(n2, u4, t3) {
    try {
      if ("function" == typeof n2) {
        var i4 = "function" == typeof n2.__u;
        i4 && n2.__u(), i4 && null == u4 || (n2.__u = n2(u4));
      } else
        n2.current = u4;
    } catch (n3) {
      l.__e(n3, t3);
    }
  }
  function E(n2, u4, t3) {
    var i4, r3;
    if (l.unmount && l.unmount(n2), (i4 = n2.ref) && (i4.current && i4.current != n2.__e || D(i4, null, u4)), null != (i4 = n2.__c)) {
      if (i4.componentWillUnmount)
        try {
          i4.componentWillUnmount();
        } catch (n3) {
          l.__e(n3, u4);
        }
      i4.base = i4.__P = null;
    }
    if (i4 = n2.__k)
      for (r3 = 0; r3 < i4.length; r3++)
        i4[r3] && E(i4[r3], u4, t3 || "function" != typeof n2.type);
    t3 || g(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function G(n2, l3, u4) {
    return this.constructor(n2, u4);
  }
  function J(u4, t3, i4) {
    var r3, o3, e3, f4;
    t3 == document && (t3 = document.documentElement), l.__ && l.__(u4, t3), o3 = (r3 = "function" == typeof i4) ? null : i4 && i4.__k || t3.__k, e3 = [], f4 = [], z(t3, u4 = (!r3 && i4 || t3).__k = _(k, null, [u4]), o3 || p, p, t3.namespaceURI, !r3 && i4 ? [i4] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i4 ? i4 : o3 ? o3.__e : t3.firstChild, r3, f4), V(e3, u4, f4);
  }
  function R(n2) {
    function l3(n3) {
      var u4, t3;
      return this.getChildContext || (u4 = /* @__PURE__ */ new Set(), (t3 = {})[l3.__c] = this, this.getChildContext = function() {
        return t3;
      }, this.componentWillUnmount = function() {
        u4 = null;
      }, this.shouldComponentUpdate = function(n4) {
        this.props.value != n4.value && u4.forEach(function(n5) {
          n5.__e = true, $(n5);
        });
      }, this.sub = function(n4) {
        u4.add(n4);
        var l4 = n4.componentWillUnmount;
        n4.componentWillUnmount = function() {
          u4 && u4.delete(n4), l4 && l4.call(n4);
        };
      }), n3.children;
    }
    return l3.__c = "__cC" + h++, l3.__ = n2, l3.Provider = l3.__l = (l3.Consumer = function(n3, l4) {
      return n3.children(l4);
    }).contextType = l3, l3;
  }
  n = v.slice, l = { __e: function(n2, l3, u4, t3) {
    for (var i4, r3, o3; l3 = l3.__; )
      if ((i4 = l3.__c) && !i4.__)
        try {
          if ((r3 = i4.constructor) && null != r3.getDerivedStateFromError && (i4.setState(r3.getDerivedStateFromError(n2)), o3 = i4.__d), null != i4.componentDidCatch && (i4.componentDidCatch(n2, t3 || {}), o3 = i4.__d), o3)
            return i4.__E = i4;
        } catch (l4) {
          n2 = l4;
        }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, x.prototype.setState = function(n2, l3) {
    var u4;
    u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = w({}, this.state), "function" == typeof n2 && (n2 = n2(w({}, u4), this.props)), n2 && w(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), $(this));
  }, x.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), $(this));
  }, x.prototype.render = k, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, I.__r = 0, f = /(PointerCapture)$|Capture$/i, c = 0, s = O(false), a = O(true), h = 0;

  // node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var s2 = c2.__;
  function p2(n2, t3) {
    c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
    var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
  }
  function d2(n2) {
    return o2 = 1, h2(D2, n2);
  }
  function h2(n2, u4, i4) {
    var o3 = p2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i4 ? i4(u4) : D2(void 0, u4), function(n3) {
      var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
      t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f4 = function(n3, t3, r3) {
        if (!o3.__c.__H)
          return true;
        var u5 = o3.__c.__H.__.filter(function(n4) {
          return n4.__c;
        });
        if (u5.every(function(n4) {
          return !n4.__N;
        }))
          return !c3 || c3.call(this, n3, t3, r3);
        var i5 = o3.__c.props !== n3;
        return u5.some(function(n4) {
          if (n4.__N) {
            var t4 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i5 = true);
          }
        }), c3 && c3.call(this, n3, t3, r3) || i5;
      };
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t3, r3) {
        if (this.__e) {
          var u5 = c3;
          c3 = void 0, f4(n3, t3, r3), c3 = u5;
        }
        e3 && e3.call(this, n3, t3, r3);
      }, r2.shouldComponentUpdate = f4;
    }
    return o3.__N || o3.__;
  }
  function y2(n2, u4) {
    var i4 = p2(t2++, 3);
    !c2.__s && C2(i4.__H, u4) && (i4.__ = n2, i4.u = u4, r2.__H.__h.push(i4));
  }
  function A2(n2) {
    return o2 = 5, T2(function() {
      return { current: n2 };
    }, []);
  }
  function T2(n2, r3) {
    var u4 = p2(t2++, 7);
    return C2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3, u4.__h = n2), u4.__;
  }
  function q2(n2, t3) {
    return o2 = 8, T2(function() {
      return n2;
    }, t3);
  }
  function x2(n2) {
    var u4 = r2.context[n2.__c], i4 = p2(t2++, 9);
    return i4.c = n2, u4 ? (null == i4.__ && (i4.__ = true, u4.sub(r2)), u4.props.value) : n2.__;
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3)
        try {
          t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
        } catch (r3) {
          t3.__h = [], c2.__e(r3, n2.__v);
        }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), s2 && s2(n2, t3);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i4 = (r2 = n2.__c).__H;
    i4 && (u2 === r2 ? (i4.__h = [], r2.__h = [], i4.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i4.__h.some(z2), i4.__h.some(B2), i4.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u), n3.u = void 0;
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t3);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t3, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t3 = n4;
      }
    }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n2) {
    var t3, r3 = function() {
      clearTimeout(u4), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u4 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t3 = r2, u4 = n2.__c;
    "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t3;
  }
  function B2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function C2(n2, t3) {
    return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
      return t4 !== n2[r3];
    });
  }
  function D2(n2, t3) {
    return "function" == typeof t3 ? t3(n2) : t3;
  }

  // src/components/constants.js
  var penIcons = {
    pen: `<svg width="20" height="20" viewBox="0 0 18.24 18.24" color="#000000" xmlns="http://www.w3.org/2000/svg" ><g id="g1" transform="translate(-3.173,-2.84)"><path id="path3" style="fill-rule:evenodd" d="m 3.486,16.01 -0.327,3.57 c 0.08,0.89 1.231,1.58 1.737,1.53 L 8.418,20.73 C 9.147,20.53 9.644,19.95 9.964,19.61 13.42,16.11 17.12,12.25 20.9,8.609 21.76,7.588 21.38,5.886 20.79,5.28 L 18.85,3.379 C 17.75,2.318 16.09,2.838 15.36,3.523 L 4.084,14.88 C 3.652,15.31 3.501,15.75 3.486,16.01 Z M 15.42,5.627 18.67,8.915 19.79,7.628 C 20.05,7.242 20.03,6.654 19.73,6.339 L 17.9,4.552 C 17.42,4.173 16.97,4.165 16.65,4.452 Z M 5.547,15.5 c -0.371,0.41 2.855,3.58 3.137,3.28 L 17.56,9.902 14.34,6.715 Z m -0.636,0.83 c -0.07,0.65 -0.502,3.03 -0.181,3.23 0.216,0.2 2.03,0 3.119,-0.19 C 5.543,17.58 4.926,16.2 4.911,16.33 Z" /></g></svg>`,
    "thick-highlighter": `<svg viewBox="0 0 497.4 542" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g id="g6" transform="translate(0,18.69)"><path d="M 186.6,453.4 447.1,183.6 C 463.8,166.3 484,143 494.9,120.9 l 2.5,-5.1 -135,-134.49 -5.1,2.63 C 335.7,-4.899 316.1,9.353 299.1,26.72 L 39.36,293.8 l -0.38,2.5 c -5.54,36.5 -0.96,78.4 -9.62,114.2 l -6.84,28.2 2.17,2.2 L 0,465.6 v 39.3 h 43.31 l 22.46,-20.4 2.17,2.2 8.98,-3.9 C 110.7,468.2 142.5,446 178.8,452.1 Z M 36.69,484.9 H 16 v -12.7 l 20,-20 18.46,18.3 z M 69.68,466.7 41.49,435.1 C 51.71,405 51.47,353.8 52.12,319.2 L 159.5,431.7 c -32.2,5.7 -59.77,22.2 -89.82,35 z M 94.47,337.4 185.7,246.7 c 7.1,-6.9 16.4,-10.9 26.3,-10.9 20.6,0 44,25.8 44,46.3 0,10 -3.9,19.3 -10.9,26.4 L 152,401.6 Z m 68.83,75.5 93.1,-93.1 c 10.1,-10.1 15.6,-23.4 15.6,-37.7 0,-29.3 -30.6,-62.3 -60,-62.3 -14.2,0 -27.4,5.6 -37.6,15.6 L 83.16,326.1 58.14,297.4 310.6,37.9 C 324.9,23.16 341.4,10.73 359.4,0.9131 L 478,119.1 c -9.4,18.3 -22.8,34.6 -37.2,49.3 L 182.2,434 Z" id="path1" /><rect x="-406" y="37.07" transform="rotate(-135)" width="16" height="135.8" id="rect1" style="stroke-width:0.99999" /><rect x="72" y="476.9" width="392" height="46.36" id="rect3" /></g></svg>`,
    "thin-highlighter": `<svg viewBox="0 0 496 496" width="20" height="20" xmlns="http://www.w3.org/2000/svg" ><g id="g4"><path d="M179.832,444.412l266.024-272.904c16.816-17.216,30.656-36.96,41.376-59.184l2.424-5.104L385.544,3.116l-5.176,2.632     c-21.624,11.016-41.192,25.408-58.16,42.784L56.456,321.164l-0.376,2.584c-5.208,36.48-15.208,72.136-29.712,105.968     l-3.848,8.992l2.168,2.176L0,465.572v27.312h43.312L60,476.196l2.168,2.168l8.984-3.848     c33.84-14.504,69.504-24.504,105.976-29.712L179.832,444.412z M36.688,476.884H16v-4.688l20-20l12.688,12.688L36.688,476.884z      M65.832,459.396l-24.344-24.344c12.792-30.048,21.952-61.512,27.728-93.648l90.264,90.264     C127.336,437.444,95.88,446.604,65.832,459.396z M99.312,348.884l93.088-93.088c7.04-7.04,16.392-10.912,26.344-10.912     c20.544,0,37.256,16.712,37.256,37.256c0,9.952-3.872,19.304-10.912,26.344L152,401.572L99.312,348.884z M163.312,412.884     l93.088-93.088c10.064-10.064,15.6-23.432,15.6-37.656c0-29.368-23.888-53.256-53.256-53.256c-14.224,0-27.592,5.536-37.656,15.6     L88,337.572l-12.76-12.76L333.664,59.708c14.384-14.736,30.8-27.168,48.84-36.992l87.776,87.768     c-9.416,18.344-21.472,35.096-35.88,49.856L175.928,425.5L163.312,412.884z" id="path1" /><rect x="327.996" y="153.003" transform="matrix(-0.7071 -0.7071 0.7071 -0.7071 417.3918 614.6613)" width="16" height="135.767" id="rect1" /><rect x="72" y="476.884" width="392" height="16" id="rect3" /></g></svg>`,
    eraser: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="m 5.505,11.41 0.53,0.53 z M 3,14.95 H 2.25 Z m 9.59,3.54 -0.53,-0.53 z M 9.048,21 v 0.75 z M 11.41,5.505 10.88,4.975 Z m 1.83,12.335 c 0.58,0.59 1.6,-0.52 1.06,-1.06 z M 7.216,9.698 C 6.519,9.001 5.463,10.07 6.156,10.76 Z M 6.035,11.94 11.94,6.035 10.88,4.975 4.975,10.88 Z m 0,6.02 C 5.185,17.11 4.602,16.53 4.223,16.03 3.856,15.55 3.75,15.24 3.75,14.95 h -1.5 c 0,0.75 0.312,1.38 0.78,1.99 0.455,0.6 1.125,1.27 1.945,2.09 z M 4.975,10.88 C 4.155,11.7 3.485,12.37 3.03,12.96 2.562,13.58 2.25,14.2 2.25,14.95 h 1.5 c 0,-0.29 0.106,-0.6 0.473,-1.08 0.379,-0.49 0.962,-1.08 1.812,-1.93 z m 7.085,7.08 c -0.85,0.85 -1.44,1.44 -1.93,1.82 -0.483,0.36 -0.793,0.47 -1.082,0.47 v 1.5 c 0.748,0 1.372,-0.31 1.992,-0.78 0.59,-0.46 1.26,-1.12 2.08,-1.94 z m -7.085,1.07 c 0.82,0.82 1.487,1.48 2.084,1.94 0.614,0.47 1.24,0.78 1.989,0.78 v -1.5 C 8.759,20.25 8.449,20.14 7.968,19.78 7.471,19.4 6.885,18.81 6.035,17.96 Z M 17.96,6.035 c 0.85,0.85 1.44,1.436 1.82,1.933 0.36,0.481 0.47,0.791 0.47,1.08 h 1.5 C 21.75,8.299 21.44,7.673 20.97,7.059 20.51,6.462 19.85,5.795 19.03,4.975 Z m 1.07,-1.06 C 18.21,4.155 17.54,3.485 16.94,3.03 16.33,2.562 15.7,2.25 14.95,2.25 v 1.5 c 0.29,0 0.6,0.106 1.08,0.473 0.5,0.379 1.08,0.962 1.93,1.812 z m -7.09,1.06 C 12.79,5.185 13.38,4.602 13.87,4.223 14.35,3.856 14.66,3.75 14.95,3.75 v -1.5 c -0.75,0 -1.37,0.312 -1.99,0.78 -0.59,0.455 -1.26,1.125 -2.08,1.945 z M 14.3,16.78 7.216,9.698 6.156,10.76 13.24,17.84 Z m 5.23,-4.17 c 0.66,-0.66 1.21,-1.23 1.58,-1.77 0.39,-0.55 0.64,-1.125 0.64,-1.792 h -1.5 c 0,0.26 -0.1,0.534 -0.36,0.931 -0.3,0.411 -0.75,0.901 -1.42,1.581 l -2.5,2.52 -3.91,3.88 1.06,1.07 2.95,-2.96 z" fill="#1c274c" id="path1" /></g></svg>`
  };
  var penSettings = {
    pen: { width: 2, alpha: 255 },
    "thick-highlighter": { width: 25, alpha: 50 },
    "thin-highlighter": { width: 5, alpha: 50 }
  };
  var toolbarIcons = {
    togglePen: `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M21 12L3 12L8 7M3 12L8 17" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    shift: `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 21L12 3L17 8M12 3L7 8M12 21L7 16M12 21L17 16" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    prevPage: `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 21L12 3L17 8M12 3L7 8" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    nextPage: `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 3L12 21L7 16M12 21L17 16" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`
  };
  var penTypes = [
    { value: "pen", label: "Pen" },
    { value: "thick-highlighter", label: "Highlighter" },
    { value: "thin-highlighter", label: "Thin highlighter" },
    { value: "eraser", label: "Eraser" }
  ];

  // src/helpers/navigation.js
  function goLastPage() {
    const pages = document.querySelectorAll(".worksheet-navigator-page");
    pages[pages.length - 1]?.click();
  }
  function goNextCorrectionPage() {
    const cur = document.querySelector(".worksheet-navigator-page.active");
    const pages = Array.from(document.querySelectorAll(".worksheet-navigator-page"));
    const i4 = pages.indexOf(cur);
    for (let j3 = i4 + 1; j3 < pages.length; j3++) {
      if (pages[j3].querySelector("span:not(.disabled)")) {
        pages[j3].click();
        return;
      }
    }
    document.querySelector(".navigator-header-top button.grading-btn")?.click();
  }
  function goPrevCorrectionPage() {
    const cur = document.querySelector(".worksheet-navigator-page.active");
    const pages = Array.from(document.querySelectorAll(".worksheet-navigator-page"));
    const i4 = pages.indexOf(cur);
    for (let j3 = i4 - 1; j3 >= 0; j3--) {
      if (pages[j3].querySelector("span:not(.disabled)")) {
        pages[j3].click();
        break;
      }
    }
  }

  // src/helpers/constants.js
  var DOWN = 1;
  var UP = -1;
  var RIGHT = 1;
  var LEFT = -1;
  var keyindexmap = ["0", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "=", "_", "+"];
  var keyindexdisplay = {
    "!": "\u21E71",
    "@": "\u21E72",
    "#": "\u21E73",
    "$": "\u21E74",
    "%": "\u21E75",
    "^": "\u21E76",
    "&": "\u21E77",
    "*": "\u21E78",
    "(": "\u21E79",
    ")": "\u21E70",
    "_": "\u21E7-",
    "+": "\u21E7="
  };

  // src/helpers/actions.js
  function updatePenSettings() {
    const penType = document.querySelector("input[name=penType]:checked")?.value || "pen";
    const pencolorbtn = document.querySelector(".pencolorbtn");
    if (penType !== "eraser") {
      StampLib.setPenSettings({
        color: pencolorbtn?.value,
        ...penSettings[penType]
      });
    }
    const drawbtn = document.querySelector(".drawbtn");
    if (drawbtn) {
      drawbtn.innerHTML = penIcons[penType];
      if (pencolorbtn) {
        drawbtn.style.fill = pencolorbtn.value;
      }
    }
  }
  function clickReading() {
    document.querySelector(".btn-subject.border-radius-right:not(.btn-subject-disabled)")?.click();
  }
  function clickMath() {
    document.querySelector(".btn-subject.border-radius-left:not(.btn-subject-disabled)")?.click();
  }
  function doBackspace() {
    (document.querySelector(".btn-dialog-cancel") || document.querySelector(".close-btn") || document.querySelector(".btn-close") || document.querySelector("app-page-back-button"))?.click();
  }
  function doEnter() {
    const mainBtn = document.querySelector("#EndScoringButton") || document.querySelector(".btn-dialog-navy") || document.querySelector(".bottomSheet.open .scoreBtn");
    if (mainBtn) {
      mainBtn.click();
      return;
    }
    const studentPulldownKbfocus = document.querySelector("#customPulldown:not([hidden]) > .kbfocus");
    if (studentPulldownKbfocus) {
      studentPulldownKbfocus.dispatchEvent(
        new MouseEvent("mousedown"),
        {
          button: 0,
          bubbles: true
        }
      );
      showHeader(false);
      return;
    }
    const focusedSet = document.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
      focusedSet.querySelector(".barWrap")?.click();
    }
  }
  function isPulldownOpen() {
    return document.querySelector("#customPulldown")?.checkVisibility() ?? false;
  }
  function showHeader(show) {
    const header = document.querySelector(".grading-header");
    if (!header)
      return;
    if (!show && header.classList.contains("z300")) {
      header.classList.remove("z300");
    } else if (show && !header.classList.contains("z300")) {
      header.classList.add("z300");
    }
  }
  function doEscape(e3) {
    let escapable = document.querySelector(".btn-dialog-cancel") || document.querySelector(".end-scoring-area") || document.querySelector(".playback-control .close") || document.querySelector(".btn-close") || document.querySelector(".close-btn");
    if (escapable) {
      escapable.click();
      return;
    }
    if (isPulldownOpen()) {
      document.querySelector("#studentInfoPullDown")?.click();
      document.querySelector("#studentInfoPullDown")?.blur();
      document.querySelectorAll("#customPulldown > .kbfocus").forEach((p3) => {
        p3.classList.remove("kbfocus");
      });
      showHeader(false);
      return;
    }
    const drawtab = document.querySelector(".drawtab");
    if (drawtab?.checkVisibility()) {
      window.__hideDrawTab?.();
      return;
    }
    if (e3.target.classList.contains("search-input")) {
      clearSearch();
      e3.target.parentElement.querySelector(".search-btn")?.focus();
    }
    document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
  }
  function clearSearch() {
    const searchInput = document.querySelector("input.search-input");
    if (!searchInput)
      return;
    searchInput.value = "";
    searchInput.setAttribute("value", "");
    searchInput.dispatchEvent(new Event("input"), {});
    document.querySelector(".search-bar .search-btn")?.click();
    document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
  }
  function cycleHighlighter() {
    if (document.querySelector("input[name=penType]:checked")?.value === "thick-highlighter") {
      document.querySelector("input[name=penType][value=thin-highlighter]")?.click();
    } else {
      document.querySelector("input[name=penType][value=thick-highlighter]")?.click();
    }
  }
  function selectEraser() {
    StampLib.expandToolbar();
    document.querySelector(".grading-toolbar-box .grading-toolbar .eraser")?.click();
    StampLib.collapseToolbar();
    document.querySelector("input[name=penType][value=eraser]")?.click();
  }
  function getPlaybackControl() {
    return document.querySelector(".playback-control");
  }
  function doP() {
    const breakScoringButton = document.querySelector("#BreakScoringButton");
    if (breakScoringButton) {
      breakScoringButton.click();
      return;
    }
    const playbackControl = getPlaybackControl();
    if (playbackControl) {
      playbackControl.querySelector(".play,.pause")?.click();
      return;
    }
    document.querySelector("input[name=penType][value=pen]")?.click();
    updatePenSettings();
  }
  function doDown() {
    if (isPulldownOpen()) {
      const kbfocus = document.querySelector("#customPulldown .option.kbfocus") || document.querySelector("#customPulldown > .option-select");
      const options = Array.from(document.querySelectorAll("#customPulldown > .option"));
      const i4 = options.indexOf(kbfocus);
      if (options[i4 + 1]) {
        kbfocus.classList.remove("kbfocus");
        options[i4 + 1].classList.add("kbfocus");
        options[i4 + 1].scrollIntoViewIfNeeded();
      }
      return;
    }
    document.querySelector("button.pager-button.down")?.click();
  }
  function doUp() {
    if (isPulldownOpen()) {
      const kbfocus = document.querySelector("#customPulldown .option.kbfocus") || document.querySelector("#customPulldown > .option-select");
      const options = Array.from(document.querySelectorAll("#customPulldown > .option"));
      const i4 = options.indexOf(kbfocus);
      if (options[i4 - 1]) {
        kbfocus.classList.remove("kbfocus");
        options[i4 - 1].classList.add("kbfocus");
        options[i4 - 1].scrollIntoViewIfNeeded();
      }
      return;
    }
    document.querySelector("button.pager-button.up")?.click();
  }
  function doS() {
    const playbackControl = getPlaybackControl();
    if (playbackControl) {
      playbackControl.querySelector(".stop")?.click();
      return;
    }
    document.querySelector("button#OneSideDisplayButton")?.click();
  }
  function do2(key) {
    const playbackControl = getPlaybackControl();
    if (playbackControl) {
      playbackControl.querySelector(".speed-2")?.click();
      return;
    }
    doKeyboardDefault(key);
  }
  function do8(key) {
    const playbackControl = getPlaybackControl();
    if (playbackControl) {
      playbackControl.querySelector(".speed-8")?.click();
      return;
    }
    doKeyboardDefault(key);
  }
  function doKeyboardDefault(key) {
    const worksheet = document.querySelector(".ATD0020P-worksheet-container.selected");
    if (!worksheet)
      return;
    const markboxMap = window.__markboxMap || {};
    worksheet.querySelectorAll(".mark-box")[markboxMap[key]]?.click();
  }
  function matchPreviousMarkings() {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
  }
  function clearMarkboxs() {
    for (let i4 = 0; i4 < 2; i4++) {
      document.querySelectorAll(
        ".worksheet-container .worksheet-container.selected .mark-boxs .mark-box"
      ).forEach((markbox) => {
        if (!markbox.querySelector(`.default`)) {
          markbox.click();
        }
      });
    }
  }

  // src/hooks/usePageChange.js
  var usePageChange = (options = {}) => {
    const {
      onEnable = () => {
      },
      onPageEnter = () => {
      },
      onPageLeave = () => {
      },
      onDisable = () => {
      },
      onStartLoading = () => {
      }
    } = options;
    const loadObserverRef = A2(null);
    const pageChangeObserverRef = A2(null);
    const callbacksRef = A2({ onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading });
    callbacksRef.current = { onEnable, onPageEnter, onPageLeave, onDisable, onStartLoading };
    const setupPageObserver = q2(() => {
      if (!pageChangeObserverRef.current) {
        pageChangeObserverRef.current = new MutationObserver((ml) => {
          for (const m3 of ml) {
            if (m3.target.classList.contains("selected")) {
              callbacksRef.current.onPageEnter(m3.target);
            } else {
              callbacksRef.current.onPageLeave(m3.target);
            }
          }
        });
      }
      pageChangeObserverRef.current.disconnect();
      document.querySelectorAll(".ATD0020P-worksheet-container").forEach((page) => {
        pageChangeObserverRef.current.observe(page, { attributeFilter: ["class"] });
      });
      callbacksRef.current.onPageEnter(document.querySelector(".ATD0020P-worksheet-container.selected"));
    }, []);
    y2(() => {
      const appRoot = document.querySelector("app-root");
      if (!appRoot)
        return;
      const { onEnable: onEnable2, onPageEnter: onPageEnter2, onPageLeave: onPageLeave2, onStartLoading: onStartLoading2 } = callbacksRef.current;
      loadObserverRef.current = new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          if (mutation.target.nodeName === "LOADING-SPINNER") {
            if (mutation.removedNodes.length) {
              if (!document.querySelector("app-atd0020p"))
                return;
              callbacksRef.current.onEnable();
              setupPageObserver();
            } else {
              callbacksRef.current.onStartLoading();
            }
            break;
          }
        }
      });
      loadObserverRef.current.observe(appRoot, { childList: true, subtree: true });
      if (document.querySelector("app-atd0020p")) {
        callbacksRef.current.onEnable();
        setupPageObserver();
      }
      return () => {
        loadObserverRef.current?.disconnect();
        pageChangeObserverRef.current?.disconnect();
        const activePage = document.querySelector(".ATD0020P-worksheet-container.selected");
        callbacksRef.current.onDisable(activePage);
      };
    }, []);
    const disable = q2(() => {
      loadObserverRef.current?.disconnect();
      pageChangeObserverRef.current?.disconnect();
    }, []);
    return { disable };
  };

  // src/hooks/useTimestamp.js
  var useTimestampDisplay = (enabled) => {
    const [timestamp, setTimestamp] = d2("");
    const [colorClass, setColorClass] = d2("");
    const clearPageTimestamp = q2((page) => {
      if (page)
        page.style.outlineColor = "";
    }, []);
    const updateTimestamp = q2((page) => {
      const is = stamp?.getStudentDrawing();
      if (is) {
        if (is.length === 0) {
          setTimestamp("None");
          setColorClass("red");
          if (page)
            page.style.outlineColor = "red";
          return;
        }
        try {
          const lastStroke = new Date(is[is.length - 1].cs[0].t);
          setTimestamp(`Last change:<br>${lastStroke.toString()}`);
          const activePageEl = document.querySelector(".worksheet-navigator-page.active .text.disabled");
          if (activePageEl) {
            setColorClass("");
            if (page)
              page.style.outlineColor = "";
            return;
          }
          const gradingPage = window.kclass?.ng?.context?._contentsManagerService?.paging?._currentPage?.gradingWaitingSet;
          if (gradingPage?.GradingStartTime && gradingPage?.StudyFinishTime) {
            const lastGraded = /* @__PURE__ */ new Date(gradingPage.GradingStartTime + "Z");
            const submitted = /* @__PURE__ */ new Date(gradingPage.StudyFinishTime + "Z");
            if (lastGraded > submitted) {
              setColorClass("");
              if (page)
                page.style.outlineColor = "";
            } else if (lastStroke > lastGraded) {
              setColorClass("green");
              if (page)
                page.style.outlineColor = "lightgreen";
            } else {
              setColorClass("red");
              if (page)
                page.style.outlineColor = "red";
            }
          } else {
            setColorClass("");
            if (page)
              page.style.outlineColor = "";
          }
        } catch {
          setTimestamp("");
          setColorClass("");
          if (page)
            page.style.outlineColor = "";
        }
      } else {
        setTimestamp("");
        setColorClass("");
        if (page)
          page.style.outlineColor = "";
      }
    }, []);
    const onEnable = q2(() => {
      if (!enabled)
        return;
      const activePage = document.querySelector(".ATD0020P-worksheet-container.selected");
      setTimeout(() => updateTimestamp(activePage), 100);
    }, [enabled, updateTimestamp]);
    const onPageEnter = q2((page) => {
      if (!enabled)
        return;
      setTimeout(() => updateTimestamp(page), 100);
    }, [enabled, updateTimestamp]);
    const onPageLeave = q2((page) => {
      clearPageTimestamp(page);
    }, [clearPageTimestamp]);
    const onDisable = q2((page) => {
      clearPageTimestamp(page);
      setTimestamp("");
      setColorClass("");
    }, [clearPageTimestamp]);
    usePageChange({
      onEnable,
      onPageEnter,
      onPageLeave,
      onDisable
    });
    return { timestamp, colorClass };
  };

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f3 = 0;
  var i3 = Array.isArray;
  function u3(e3, t3, n2, o3, i4, u4) {
    t3 || (t3 = {});
    var a3, c3, p3 = t3;
    if ("ref" in p3)
      for (c3 in p3 = {}, t3)
        "ref" == c3 ? a3 = t3[c3] : p3[c3] = t3[c3];
    var l3 = { type: e3, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i4, __self: u4 };
    if ("function" == typeof e3 && (a3 = e3.defaultProps))
      for (c3 in a3)
        void 0 === p3[c3] && (p3[c3] = a3[c3]);
    return l.vnode && l.vnode(l3), l3;
  }

  // src/components/CustomToolbar.jsx
  var CustomToolbar = () => {
    const [headerVisible, setHeaderVisible] = d2(true);
    const [shifted, setShifted] = d2(false);
    const [timestampEnabled, setTimestampEnabled] = d2(false);
    const { timestamp, colorClass } = useTimestampDisplay(timestampEnabled);
    y2(() => {
      window.__setTimestampEnabled = setTimestampEnabled;
      return () => {
        delete window.__setTimestampEnabled;
      };
    }, []);
    y2(() => {
      updatePenSettings();
    }, []);
    const toggleHeader = () => {
      const header = document.querySelector(".grading-header");
      if (!header)
        return;
      const isVisible = header.classList.contains("z300");
      if (isVisible) {
        header.classList.remove("z300");
      } else {
        header.classList.add("z300");
      }
      setHeaderVisible(!isVisible);
    };
    const toggleShift = () => {
      const container = document.querySelector(".worksheet-container");
      if (!container)
        return;
      if (shifted) {
        container.classList.remove("shiftup");
      } else {
        container.classList.add("shiftup");
      }
      setShifted(!shifted);
    };
    const togglePenToolbar = () => {
      const gradingToolbarBox = document.querySelector(".grading-toolbar-box");
      if (!gradingToolbarBox)
        return;
      if (gradingToolbarBox.classList.contains("close")) {
        gradingToolbarBox.querySelector(".toolbar-item")?.click();
      } else {
        StampLib.collapseToolbar();
      }
    };
    const handleDrawTab = () => {
      const drawtab = document.querySelector(".drawtab");
      if (!drawtab)
        return;
      const isHidden = drawtab.classList.contains("hidden");
      if (isHidden) {
        window.__showDrawTab?.();
        const clearBtn = document.querySelector(".clearAll");
        if (clearBtn) {
          clearBtn.focus();
          clearBtn.blur();
        }
        const textarea = drawtab.querySelector("textarea");
        if (textarea) {
          textarea.style.height = "";
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
        updatePenSettings();
      } else {
        window.__hideDrawTab?.();
      }
    };
    const handleXAll = () => {
      document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
    };
    return /* @__PURE__ */ u3("div", { class: "customToolbar", style: { display: "none" }, children: [
      /* @__PURE__ */ u3(
        "button",
        {
          class: "hoverToolbarBtn",
          onClick: togglePenToolbar,
          onMouseOver: (e3) => e3.stopPropagation(),
          title: "Toggle pen toolbar visibility",
          dangerouslySetInnerHTML: { __html: toolbarIcons.togglePen }
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          class: "headerZindexBtn",
          onClick: toggleHeader,
          title: "Toggle header bar visibility",
          children: "H"
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          class: "shiftbtn",
          onClick: toggleShift,
          onMouseOver: (e3) => e3.stopPropagation(),
          title: "Toggle shifting the page up/down",
          dangerouslySetInnerHTML: { __html: toolbarIcons.shift }
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          class: "xallbtn",
          onClick: handleXAll,
          title: "Click every grading box on the page",
          children: "x all"
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          class: "drawbtn",
          onClick: handleDrawTab,
          onMouseOver: (e3) => e3.stopPropagation(),
          title: "Show the draw tab",
          accessKey: "d",
          dangerouslySetInnerHTML: { __html: penIcons.pen }
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          class: "mobileUpBtn",
          onClick: () => goPrevCorrectionPage?.(),
          onMouseOver: (e3) => e3.stopPropagation(),
          title: "Previous marking page",
          dangerouslySetInnerHTML: { __html: toolbarIcons.prevPage }
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          class: "mobileDownBtn",
          onClick: () => goNextCorrectionPage?.(),
          onMouseOver: (e3) => e3.stopPropagation(),
          title: "Next marking page",
          dangerouslySetInnerHTML: { __html: toolbarIcons.nextPage }
        }
      ),
      timestampEnabled && /* @__PURE__ */ u3(
        "div",
        {
          class: `timestampBox ${colorClass}`,
          dangerouslySetInnerHTML: { __html: timestamp }
        }
      )
    ] });
  };

  // src/components/PrintOverlay.jsx
  var PrintOverlayContext = R(null);
  var usePrintOverlay = () => {
    const context = x2(PrintOverlayContext);
    if (!context) {
      throw new Error("usePrintOverlay must be used within PrintOverlayProvider");
    }
    return context;
  };
  var PrintOverlayProvider = ({ children }) => {
    const [state, setState2] = d2({
      visible: false,
      mode: null,
      previewStyle: {},
      previewContent: null,
      stampData: null,
      textValue: "",
      color: "#ff2200"
    });
    const showStampPreview = (stamp2, stampDimensions, maxScaleFactor, scale, borderColor, svg) => {
      setState2({
        visible: true,
        mode: "stamp",
        stampData: { stamp: stamp2, maxScaleFactor },
        previewStyle: {
          height: `${stampDimensions.height * scale}px`,
          width: `${stampDimensions.width * scale}px`,
          "border-color": borderColor
        },
        previewContent: svg,
        textValue: "",
        color: borderColor
      });
    };
    const showTextPreview = (text, writeDimensions, scale, borderColor) => {
      setState2({
        visible: true,
        mode: "text",
        stampData: null,
        previewStyle: {
          height: `${writeDimensions.height}px`,
          width: `${writeDimensions.width}px`,
          "border-color": borderColor
        },
        previewContent: text,
        textValue: text,
        color: borderColor
      });
    };
    const hidePreview = () => {
      setState2((prev) => ({ ...prev, visible: false }));
    };
    return /* @__PURE__ */ u3(PrintOverlayContext.Provider, { value: { state, showStampPreview, showTextPreview, hidePreview }, children });
  };
  var PrintOverlay = () => {
    const { state, hidePreview } = usePrintOverlay();
    const { visible, mode, previewStyle, previewContent, stampData, textValue, color } = state;
    const overlayRef = A2(null);
    y2(() => {
      if (!visible)
        return;
      const overlay = overlayRef.current;
      if (!overlay)
        return;
      const handlePMove = (e3) => {
        setState((prev) => ({
          ...prev,
          previewStyle: { ...prev.previewStyle, left: `${e3.clientX}px`, top: `${e3.clientY}px` }
        }));
      };
      const handleClick = (e3) => {
        const atd = StampLib.getAtd();
        if (!atd?.bcanvas)
          return;
        const canvasRect = atd.bcanvas.getBoundingClientRect();
        const zoomRatio = atd.bcanvas.clientHeight / atd.inkHeight;
        let x3 = e3.clientX, y3 = e3.clientY;
        if (e3.clientX < canvasRect.left && e3.clientX > canvasRect.left - 10)
          x3 = canvasRect.left;
        if (e3.clientY < canvasRect.top && e3.clientY > canvasRect.top - 10)
          y3 = canvasRect.top;
        if (x3 < canvasRect.left || y3 < canvasRect.top || x3 > canvasRect.right || y3 > canvasRect.bottom) {
          hidePreview();
          return;
        }
        const position = { x: (x3 - canvasRect.left) / zoomRatio, y: (y3 - canvasRect.top) / zoomRatio };
        if (mode === "stamp" && stampData) {
          const scale = parseInt(document.querySelector(".sizeslider")?.value || 25) / 100 * stampData.maxScaleFactor;
          const stampColorType = document.querySelector("select#stampColorType")?.value || "Unchanged";
          const options = {
            color,
            rainbow: stampColorType === "Rainbow" || stampColorType === "Rainbow Fill",
            rainbowSpeed: parseFloat(document.querySelector(".rainbowspeed")?.value || 1),
            usePredefinedColor: stampColorType === "Unchanged",
            rainbowFill: stampColorType === "Rainbow Fill"
          };
          StampLib.writeStampAt(stampData.stamp, position, scale, options);
        } else if (mode === "text") {
          const scale = parseInt(document.querySelector(".sizeslider")?.value || 25) / 100;
          StampLib.writeAllAt(textValue, position, scale, { color });
        }
        hidePreview();
      };
      overlay.addEventListener("pointermove", handlePMove);
      overlay.addEventListener("click", handleClick);
      return () => {
        overlay.removeEventListener("pointermove", handlePMove);
        overlay.removeEventListener("click", handleClick);
      };
    }, [visible, mode, stampData, textValue, color, hidePreview]);
    if (!visible)
      return null;
    return /* @__PURE__ */ u3(
      "div",
      {
        ref: overlayRef,
        class: "printoverlay",
        style: { display: "unset" },
        onMouseOver: (e3) => e3.stopPropagation(),
        children: /* @__PURE__ */ u3(
          "div",
          {
            class: mode === "stamp" ? "stampPrintPreviewDiv" : "printPreviewDiv",
            style: previewStyle,
            dangerouslySetInnerHTML: { __html: mode === "stamp" ? previewContent : void 0 },
            children: mode === "text" ? previewContent : null
          }
        )
      }
    );
  };

  // src/helpers/marking.js
  function doMarkingListHL(direction) {
    const studentList = document.querySelector(".studentList:not(.tabItem)");
    if (!studentList)
      return;
    const focusedStudent = studentList.querySelector("app-score-list-item .checkbox.kbfocus");
    if (focusedStudent) {
      if (direction === LEFT)
        return;
      doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item:has(.kbfocus) .studyBarWrap"));
      return;
    }
    const focusedSet = studentList.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
      const subject = getFocusedSetSubject(focusedSet);
      if (direction === RIGHT) {
        if (subject === "KNA")
          return;
        moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject);
      } else if (direction === LEFT) {
        if (subject === "math") {
          selectStudentCheckboxFromSet(studentList, focusedSet);
        } else {
          if (!moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject)) {
            selectStudentCheckboxFromSet(studentList, focusedSet);
          }
        }
      }
      return;
    }
    if (studentList.querySelector("app-score-list-header .checkbox.kbfocus"))
      return;
    if (direction === LEFT) {
      doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
    } else {
      doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .studyBarWrap"));
    }
  }
  function selectStudentCheckboxFromSet(studentList, focusedSet) {
    doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item:has(.kbfocus) i.checkbox"));
  }
  function moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject) {
    const otherSubjectSets = studentList.querySelectorAll(
      `app-score-list-item:has(.kbfocus) .subjectCellWrapColumn:has(.studyBarWrap.${subject === "math" ? "KNA" : "math"}) .studyBarWrap`
    );
    if (!otherSubjectSets.length)
      return false;
    const sameSubjectSets = studentList.querySelectorAll(
      `app-score-list-item:has(.kbfocus) .subjectCellWrapColumn:has(.studyBarWrap.${subject}) .studyBarWrap`
    );
    const i4 = Array.from(sameSubjectSets).indexOf(focusedSet);
    doMarkingListFocusAndScroll(studentList, otherSubjectSets[Math.min(i4, otherSubjectSets.length - 1)]);
    return true;
  }
  function doMarkingListJK(direction) {
    const studentList = document.querySelector(".studentList:not(.tabItem)");
    if (!studentList)
      return;
    const focusedStudent = studentList.querySelector("app-score-list-item .checkbox.kbfocus");
    if (focusedStudent) {
      moveMarkingListCheckboxFocus(studentList, focusedStudent, direction);
      return;
    }
    const focusedSet = studentList.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
      moveMarkingListSetFocusUpDown(studentList, focusedSet, direction);
      return;
    }
    const headerCheckbox = studentList.querySelector("app-score-list-header .checkbox");
    if (headerCheckbox?.classList.contains("kbfocus")) {
      if (direction === DOWN) {
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
      } else {
        const items = studentList.querySelectorAll("app-score-list-item .checkbox");
        doMarkingListFocusAndScroll(studentList, items[items.length - 1]);
      }
      return;
    }
    if (direction === DOWN) {
      doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
    } else {
      markingListSelectHeaderCheckbox(studentList);
    }
  }
  function getFocusedSetSubject(focusedSet) {
    const entry = focusedSet.classList.entries().find((a3) => a3[1] === "math" || a3[1] === "KNA");
    return entry?.[1];
  }
  function moveMarkingListSetFocusUpDown(studentList, focusedSet, direction) {
    const currentStudentSets = Array.from(studentList.querySelectorAll(".subjectCellWrapColumn:has(.kbfocus) .studyBarWrap"));
    const i4 = currentStudentSets.indexOf(focusedSet);
    const subject = getFocusedSetSubject(focusedSet);
    if (direction === UP && i4 === 0) {
      const student = getMarkingListStudent(studentList, direction);
      const subjectColumn = getMarkingListStudentSubjectColumn(student, subject);
      const sets = subjectColumn.querySelectorAll(".studyBarWrap");
      doMarkingListFocusAndScroll(studentList, sets[sets.length - 1]);
    } else if (direction === DOWN && i4 === currentStudentSets.length - 1) {
      const student = getMarkingListStudent(studentList, direction);
      const subjectColumn = getMarkingListStudentSubjectColumn(student, subject);
      doMarkingListFocusAndScroll(studentList, subjectColumn.querySelector(".studyBarWrap"));
    } else {
      doMarkingListFocusAndScroll(studentList, currentStudentSets[i4 + direction]);
    }
  }
  function getMarkingListStudent(studentList, direction) {
    const students = Array.from(studentList.querySelectorAll("app-score-list-item"));
    const i4 = students.indexOf(studentList.querySelector("app-score-list-item:has(.kbfocus)"));
    if (direction === UP && i4 === 0) {
      return students[students.length - 1];
    } else if (direction === DOWN && i4 === students.length - 1) {
      return students[0];
    }
    return students[i4 + direction];
  }
  function getMarkingListStudentSubjectColumn(student, subject) {
    return student.querySelector(`.subjectCellWrapColumn:has(.studyBarWrap.${subject})`) || student.querySelector(".subjectCellWrapColumn:has(.studyBarWrap)");
  }
  function moveMarkingListCheckboxFocus(studentList, focusedStudent, direction) {
    const items = Array.from(studentList.querySelectorAll("app-score-list-item .checkbox"));
    const i4 = items.indexOf(focusedStudent);
    if (direction === UP && i4 === 0 || direction === DOWN && i4 === items.length - 1) {
      focusedStudent.classList.remove("kbfocus");
      markingListSelectHeaderCheckbox(studentList);
    } else {
      doMarkingListFocusAndScroll(studentList, items[i4 + direction]);
    }
  }
  function markingListSelectHeaderCheckbox(studentList) {
    studentList.querySelector("app-score-list-header .checkbox")?.classList.add("kbfocus");
    studentList.scrollTop = 0;
  }
  function doMarkingListFocusAndScroll(studentList, toFocus) {
    if (!studentList || !toFocus)
      return;
    studentList.querySelector(".kbfocus")?.classList.remove("kbfocus");
    toFocus.classList.add("kbfocus");
    const firstCheckbox = studentList.querySelector("app-score-list-item .checkbox");
    if (toFocus.classList.contains("checkbox")) {
      studentList.scrollTop = toFocus.offsetTop - firstCheckbox.offsetTop;
    } else {
      toFocus.scrollIntoViewIfNeeded();
      if (studentList.scrollTop > toFocus.offsetTop - firstCheckbox.offsetTop) {
        studentList.scrollTop = toFocus.offsetTop - firstCheckbox.offsetTop;
      }
    }
  }

  // src/helpers/scrolling.js
  var pageScrolling = false;
  var pageSideScrolling = false;
  var pageScrollingDirection = null;
  var pageScrollingItem = null;
  var pageScrollingStartPos = 0;
  var pageScrollingStartTime = void 0;
  function scrollStudents(direction) {
    startScrolling(direction, ".studentList:not(.tabItem)");
  }
  function scrollAnswer(direction) {
    startScrolling(direction, ".content-answer-content.image");
  }
  function scrollDashboard(direction) {
    startScrolling(direction, ".dashboard");
  }
  function scrollProgressChart(direction) {
    startScrolling(direction, ".dashboard-progress-chart .chart");
  }
  function sideScrollProgressChart(direction) {
    startSideScrolling(direction, ".dashboard-progress-chart .plan-footer");
  }
  function scrollScore(direction) {
    startScrolling(direction, ".score-grid-all");
  }
  function startScrolling(direction, item) {
    pageScrolling = true;
    pageSideScrolling = false;
    pageScrollingDirection = direction;
    pageScrollingItem = document.querySelector(item);
    pageScrollingStartPos = pageScrollingItem?.scrollTop || 0;
    pageScrollingStartTime = void 0;
    if (pageScrollingItem) {
      requestAnimationFrame(scrollPage);
    }
  }
  function startSideScrolling(direction, item) {
    pageScrolling = true;
    pageSideScrolling = true;
    pageScrollingDirection = direction;
    pageScrollingItem = document.querySelector(item);
    pageScrollingStartPos = pageScrollingItem?.scrollLeft || 0;
    pageScrollingStartTime = void 0;
    if (pageScrollingItem) {
      requestAnimationFrame(scrollPage);
    }
  }
  function scrollPage(timestamp) {
    if (!pageScrolling || !pageScrollingItem)
      return;
    if (pageScrollingStartTime === void 0) {
      pageScrollingStartTime = timestamp;
    }
    if (pageSideScrolling) {
      pageScrollingItem.scrollTo({
        left: pageScrollingStartPos + 1.5 * pageScrollingDirection * (timestamp - pageScrollingStartTime),
        behavior: "instant"
      });
    } else {
      pageScrollingItem.scrollTo({
        top: pageScrollingStartPos + 1.5 * pageScrollingDirection * (timestamp - pageScrollingStartTime),
        behavior: "instant"
      });
    }
    requestAnimationFrame(scrollPage);
  }
  function stopScrolling() {
    pageScrolling = false;
  }

  // src/hooks/useKeyboardMode.js
  var keyboardHelp = `Navigation:
j: down
k: up
g: top
G: bottom
n: next active page
N: previous active page
D: go to next set
R: switch to reading
M: switch to math
H: header dropdown or show/hide header
p: pause marking (when bottom pause button is visible)
J (hold): scroll answer key down
K (hold): scroll answer key up
s: display one side of page (instead of 2)

Marking (\u21E7 means shift):
x: match previous markings or x all
X: x all
c: clear x's
A: toggle answers
alt+t: show timestamp of when the page was last changed. *TIMEZONE IS ASSUMED*. Red means the page hasn't been changed since it was last graded (this can be wrong if the student's timezone is different or their clock is wrong)
P: start replay / pause replay
(during replay):
s: stop replay
p: pause / resume replay
2/\u21E72: replay 2x speed
8/\u21E78: replay 8x speed

Drawing:
d: open the draw tab
p: select pen
h: select highlighter / cycle highlighter type
e: select eraser
u: undo
r: redo
U: undo stamp
-: decrease stamp size
+/=: increase stamp size

With draw tab open:
t: focus the text area
u: set Stamp Color to "Unchanged"
r: set Stamp Color to "Rainbow" / "Rainbow Fill"
c: set Stamp Color to "Color Picker"
p: select pen
h: select highlighter / cycle highlighter type
-: decrease stamp size
+/= : increase stamp size
J (hold): scroll stamps down
K (hold): scroll stamps up
escape: close draw tab

General:
escape: close dialog
backspace: exit/cancel
enter: submit/accept dialog`;
  var keyboardHelpText = keyboardHelp;
  var useKeyboardMode = (enabled, drawTabRef) => {
    y2(() => {
      if (!enabled)
        return;
      const handleKeyDown = (e3) => {
        if (e3.repeat && ["j", "J", "k", "K", "l", "L", "h", "H"].includes(e3.key))
          return;
        if (e3.target.nodeName === "INPUT" || e3.target.nodeName === "TEXTAREA") {
          if (e3.key === "Escape") {
            doEscape?.(e3);
          } else if (e3.key === "Enter" && e3.target.classList.contains("search-input")) {
            const searchBtn = e3.target.parentElement?.querySelector(".search-btn");
            if (searchBtn) {
              e3.preventDefault();
              searchBtn.click();
              e3.target.blur();
              if (document.querySelector(".markingList.tabActive")) {
                if (!document.querySelector(".studentList .kbfocus")) {
                  doMarkingListJK?.(DOWN);
                }
              }
            }
          }
          return;
        }
        if (e3.altKey && !e3.ctrlKey && !e3.metaKey) {
          if (e3.key === "d") {
            drawTabRef.current?.click();
          } else if (e3.key === "t") {
            window.__setTimestampEnabled?.((prev) => !prev);
          }
          return;
        }
        if (e3.altKey || e3.ctrlKey || e3.metaKey)
          return;
        const drawtab = drawTabRef.current;
        const isDrawTabOpen = drawtab && !drawtab.classList.contains("hidden");
        if (isDrawTabOpen) {
          switch (e3.key) {
            case "d":
            case "Escape":
              window.__hideDrawTab?.();
              break;
            case "-":
            case "+":
            case "=":
              const slider = drawtab.querySelector(".sizeslider");
              if (slider) {
                e3.key === "-" ? slider.value-- : slider.value++;
                slider.dispatchEvent(new Event("input"));
              }
              break;
            case "J":
            case "K":
              startScrolling?.(e3.key === "J" ? 1 : -1, ".drawtab");
              break;
            case "h":
              cycleHighlighter?.();
              break;
            case "p":
              document.querySelector("input[name=penType][value=pen]")?.click();
              break;
            case "r":
            case "u":
            case "c": {
              const select = drawtab.querySelector("select#stampColorType");
              if (select) {
                if (e3.key === "r")
                  select.value = select.value === "Rainbow" ? "Rainbow Fill" : "Rainbow";
                else if (e3.key === "u")
                  select.value = "Unchanged";
                else if (e3.key === "c")
                  select.value = "Color Picker";
                select.dispatchEvent(new Event("change"));
              }
              break;
            }
            case "t":
              const textarea = drawtab.querySelector("textarea");
              if (textarea) {
                textarea.focus();
                textarea.select();
                e3.preventDefault();
              }
              break;
          }
          return;
        }
        const markingList = document.querySelector(".markingList.tabActive");
        const studentList = document.querySelector(".studentList.tabActive");
        const worksheet = document.querySelector(".ATD0020P-worksheet-container.selected");
        const studentProfile = document.querySelector(".student-profile");
        const studyRecords = document.querySelector(".ATD0010P-root");
        if (markingList) {
          switch (e3.key) {
            case "f":
            case "/":
              const searchInput1 = document.querySelector("input.search-input");
              if (searchInput1) {
                searchInput1.focus();
                searchInput1.value = "";
                searchInput1.setAttribute("value", "");
                searchInput1.dispatchEvent(new Event("input"), {});
              }
              e3.preventDefault();
              break;
            case "c":
              clearSearch?.();
              break;
            case "C":
              document.querySelectorAll(".studentRow .checkbox.checked").forEach((c3) => c3.click());
              break;
            case "g":
              document.querySelector(".studentList:not(.tabItem)")?.scrollTo(0, 0);
              break;
            case "G":
              const sl1 = document.querySelector(".studentList:not(.tabItem)");
              sl1?.scrollTo(0, sl1.scrollHeight - sl1.clientHeight);
              break;
            case "J":
              scrollStudents?.(DOWN);
              break;
            case "K":
              scrollStudents?.(UP);
              break;
            case "j":
              doMarkingListJK?.(DOWN);
              break;
            case "k":
              doMarkingListJK?.(UP);
              break;
            case "h":
              doMarkingListHL?.(LEFT);
              break;
            case "l":
              doMarkingListHL?.(RIGHT);
              break;
            case " ":
              document.querySelector(".studentList .checkbox.kbfocus")?.click();
              e3.preventDefault();
              break;
            case "S":
              document.querySelector(".studentList.tabItem")?.click();
              break;
            case "r":
              document.querySelector(".studentListUpdateButton")?.click();
              break;
            case "A":
              document.querySelector("app-student-list-filter-capsule .all")?.click();
              break;
            case "M":
              document.querySelector("app-student-list-filter-capsule .math")?.click();
              break;
            case "R":
              document.querySelector("app-student-list-filter-capsule .KNA")?.click();
              break;
            case "Enter":
              document.querySelector(".bottomSheet.open .scoreBtn")?.click();
              document.querySelector(".studyBarWrap.kbfocus .barWrap")?.click();
              doEnter?.();
              break;
            case "Escape":
              doEscape?.(e3);
              break;
          }
        } else if (studentList) {
          switch (e3.key) {
            case "f":
            case "/":
              const searchInput2 = document.querySelector("input.search-input");
              if (searchInput2) {
                searchInput2.focus();
                searchInput2.value = "";
                searchInput2.setAttribute("value", "");
                searchInput2.dispatchEvent(new Event("input"), {});
              }
              e3.preventDefault();
              break;
            case "c":
              clearSearch?.();
              break;
            case "M":
              document.querySelector(".markingList.tabItem")?.click();
              break;
            case "J":
              scrollStudents?.(DOWN);
              break;
            case "K":
              scrollStudents?.(UP);
              break;
            case "r":
              document.querySelector(".studentListUpdateButton")?.click();
              break;
          }
        } else if (worksheet) {
          switch (e3.key) {
            case "j":
              doDown?.();
              break;
            case "k":
              doUp?.();
              break;
            case "g":
              document.querySelectorAll(".worksheet-navigator-page span:not(.disabled)")[0]?.click();
              break;
            case "G":
              goLastPage?.();
              break;
            case "X":
              const xallbtn = document.querySelector(".xallbtn");
              xallbtn?.click();
              xallbtn?.blur();
              break;
            case "x":
              matchPreviousMarkings?.();
              break;
            case "c":
              clearMarkboxs?.();
              break;
            case "Backspace":
              doBackspace?.();
              break;
            case "n":
              goNextCorrectionPage?.();
              break;
            case "N":
              goPrevCorrectionPage?.();
              break;
            case "p":
              doP?.();
              break;
            case "P":
              const playback = getPlaybackControl?.();
              if (playback) {
                playback.querySelector(".play,.pause")?.click();
                return;
              } else {
                StampLib.expandToolbar();
                document.querySelector(".grading-toolbar-box .grading-toolbar .play")?.click();
                StampLib.collapseToolbar();
              }
              break;
            case "s":
              doS?.();
              break;
            case "u": {
              const atd = StampLib.getAtd();
              if (atd) {
                atd.undoInk();
                atd.penUpFunc(atd);
              }
              break;
            }
            case "U":
              StampLib.undoLastWriteAll?.();
              break;
            case "r": {
              const atd = StampLib.getAtd();
              if (atd) {
                atd.redoInk();
                atd.penUpFunc(atd);
              }
              break;
            }
            case "2":
            case "@":
              do2?.(e3.key);
              break;
            case "8":
            case "*":
              do8?.(e3.key);
              break;
            case "A":
              document.querySelector("#AnswerDisplayButton")?.click();
              break;
            case "Enter":
              doEnter?.();
              break;
            case "Escape":
              doEscape?.(e3);
              break;
            case "d":
              e3.preventDefault();
              window.__showDrawTab?.();
              break;
            case "D":
              document.querySelector(".other-worksheet-button")?.click();
              break;
            case "h":
              cycleHighlighter?.();
              break;
            case "e":
              selectEraser?.();
              break;
            case "R":
              clickReading?.();
              break;
            case "M":
              clickMath?.();
              break;
            case "H":
              const wasPulldownOpen = isPulldownOpen?.();
              const pulldownExists = !!document.querySelector("#studentInfoPullDown.student-info-btn");
              document.querySelector("#studentInfoPullDown")?.click();
              document.querySelector("#studentInfoPullDown")?.blur();
              document.querySelectorAll("#customPulldown > .kbfocus").forEach((p3) => p3.classList.remove("kbfocus"));
              if (pulldownExists) {
                if (!wasPulldownOpen) {
                  document.querySelector("#customPulldown > .option-select")?.classList.add("kbfocus");
                }
              } else {
                const header = document.querySelector(".grading-header");
                header?.classList.toggle("z300");
              }
              break;
            case "J":
              scrollAnswer?.(DOWN);
              break;
            case "K":
              scrollAnswer?.(UP);
              break;
            case "-":
            case "+":
            case "=":
              const slider2 = drawtab?.querySelector(".sizeslider");
              if (slider2) {
                e3.key === "-" ? slider2.value-- : slider2.value++;
                slider2.dispatchEvent(new Event("input"));
              } else {
                doKeyboardDefault?.(e3.key);
              }
              break;
            default:
              doKeyboardDefault?.(e3.key);
              break;
          }
        } else if (studentProfile) {
          switch (e3.key) {
            case "R":
              if (!document.querySelector("loading-spinner div")) {
                document.querySelector(".btn-close")?.click();
                clickReading?.();
              }
              break;
            case "M":
              if (!document.querySelector("loading-spinner div")) {
                document.querySelector(".btn-close")?.click();
                clickMath?.();
              }
              break;
            case "S":
              document.querySelector(".dashboard-set-left .btn-primary")?.click();
              break;
            case "J":
              scrollProgressChart?.(DOWN) || scrollDashboard?.(DOWN);
              break;
            case "K":
              scrollProgressChart?.(UP) || scrollDashboard?.(UP);
              break;
            case "H":
              sideScrollProgressChart?.(LEFT);
              break;
            case "L":
              sideScrollProgressChart?.(RIGHT);
              break;
            case "p":
              document.querySelector(".dashboard-progress-chart .finally > .icon")?.click();
              break;
            case "e":
              Array.from(document.querySelectorAll(".dashboard-menu-right .options-btn")).find((b) => b.innerHTML?.trim() === "Edit")?.click();
              break;
            case "Backspace":
              doBackspace?.();
              break;
            case "Escape":
              doEscape?.(e3);
              break;
            case "Enter":
              doEnter?.();
              break;
          }
        } else if (studyRecords) {
          switch (e3.key) {
            case "R":
              clickReading?.();
              break;
            case "M":
              clickMath?.();
              break;
            case "Backspace":
              doBackspace?.();
              break;
            case "J":
              scrollScore?.(DOWN);
              break;
            case "K":
              scrollScore?.(UP);
              break;
            case "G":
              document.querySelector(".score-grid-all")?.scrollIntoView();
              break;
          }
        }
      };
      const handleKeyUp = (e3) => {
        if (["J", "j", "K", "k", "H", "h", "L", "l"].includes(e3.key)) {
          stopScrolling?.();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
      };
    }, [enabled, drawTabRef]);
  };

  // src/components/DrawTab.jsx
  var DrawTab = ({ stamps: _stamps }) => {
    const [hidden, setHidden] = d2(true);
    const [size, setSize] = d2(25);
    const [penColor, setPenColor] = d2("#ff2200");
    const [penType, setPenType] = d2("pen");
    const [hdMode, setHdMode] = d2(false);
    const [text, setText] = d2("");
    const [stampColorType, setStampColorType] = d2("Unchanged");
    const [rainbowSpeed, setRainbowSpeed] = d2(1);
    const [keyboardMode, setKeyboardMode] = d2(false);
    const { showStampPreview, showTextPreview } = usePrintOverlay();
    const textareaRef = A2(null);
    const stampsRef = A2(null);
    const rootRef = A2(null);
    const drawTabRef = { current: null };
    useKeyboardMode(keyboardMode, drawTabRef);
    y2(() => {
      window.__keyboardModeEnabled = keyboardMode;
      const currentPage = document.querySelector(".ATD0020P-worksheet-container.selected");
      if (keyboardMode) {
        window.__addMarkboxKeys?.(currentPage);
      } else {
        window.__removeMarkboxKeys?.(currentPage);
      }
    }, [keyboardMode]);
    const stamps = window.StampLib?.stamps || {};
    y2(() => {
      if (!hidden && textareaRef.current) {
        textareaRef.current.style.height = "";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [text, hidden]);
    y2(() => {
      document.body.classList.toggle("drawtab-hidden", hidden);
    }, [hidden]);
    const hide = () => setHidden(true);
    const show = () => {
      setHidden(false);
      updatePenSettings();
    };
    const toggle = () => {
      if (hidden) {
        show();
      } else {
        hide();
      }
    };
    y2(() => {
      window.__toggleDrawTab = toggle;
      window.__showDrawTab = show;
      window.__hideDrawTab = hide;
      return () => {
        delete window.__toggleDrawTab;
        delete window.__showDrawTab;
        delete window.__hideDrawTab;
      };
    }, [toggle, show, hide]);
    const handleSizeChange = (e3) => setSize(e3.target.value);
    const handleColorChange = (e3) => {
      setPenColor(e3.target.value);
      updatePenSettings();
    };
    const handlePenTypeChange = (e3) => {
      setPenType(e3.target.value);
      updatePenSettings();
    };
    const handleStampColorChange = (e3) => setStampColorType(e3.target.value);
    const handleRainbowSpeedChange = (e3) => setRainbowSpeed(e3.target.value);
    const handleUnlock = () => {
      stamp.unlockPage();
      hide();
    };
    const toggleHdMode = (e3) => {
      const enabled = e3.target.checked;
      setHdMode(enabled);
      if (window.__hdModeSetEnabled) {
        window.__hdModeSetEnabled(enabled);
      }
    };
    const handleUndo = () => StampLib.undoLastWriteAll();
    const handleClear = () => StampLib.clearPage();
    const handleTextStamp = () => {
      hide();
      const scale = size / 100;
      const writeDimensions = StampLib.getWriteAllDimensions(text, scale);
      showTextPreview(text, writeDimensions, scale, penColor);
    };
    const handleStampClick = (stamp2) => {
      hide();
      const stampDimensions = StampLib.getWriteStampDimensions(stamp2, 1);
      const maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
      const scale = size / 100 * maxScaleFactor;
      const svg = typeof stamp2.svg === "string" ? stamp2.svg : stamp2.svg.outerHTML;
      showStampPreview(stamp2, stampDimensions, maxScaleFactor, scale, penColor, svg);
    };
    y2(() => {
      drawTabRef.current = rootRef.current;
    }, []);
    y2(() => {
      const parent = rootRef.current;
      const draggable = stampsRef.current;
      if (!parent || !draggable)
        return;
      let dragging = false;
      let startY = 0;
      let scrollStart = 0;
      let dragged = 0;
      const dragStart = (ev) => {
        dragging = true;
        startY = ev.clientY;
        scrollStart = parent.scrollTop;
        dragged = 0;
      };
      const dragEnd = (ev) => {
        dragging = false;
        if (draggable.hasPointerCapture(ev.pointerId)) {
          draggable.releasePointerCapture(ev.pointerId);
        }
      };
      const drag = (ev) => {
        if (dragging) {
          dragged++;
          parent.scrollTop = scrollStart - (ev.clientY - startY);
          if (dragged === 40) {
            draggable.setPointerCapture(ev.pointerId);
          }
        }
      };
      draggable.addEventListener("pointerdown", dragStart);
      draggable.addEventListener("pointerup", dragEnd);
      draggable.addEventListener("pointermove", drag);
      return () => {
        draggable.removeEventListener("pointerdown", dragStart);
        draggable.removeEventListener("pointerup", dragEnd);
        draggable.removeEventListener("pointermove", drag);
      };
    }, []);
    const handleMouseLeave = (e3) => {
      const rect = rootRef.current.getBoundingClientRect();
      if (e3.clientX <= rect.left || e3.clientX >= rect.right - 2 || e3.clientY <= rect.top || e3.clientY >= rect.bottom - 2) {
        hide();
      }
    };
    return /* @__PURE__ */ u3("div", { ref: rootRef, class: `drawtab ${hidden ? "hidden" : ""}`, onMouseLeave: handleMouseLeave, children: [
      /* @__PURE__ */ u3("div", { class: "header", children: [
        /* @__PURE__ */ u3("div", { class: "buttonsleft", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "range",
              class: "sizeslider",
              min: "10",
              max: "100",
              value: size,
              onInput: handleSizeChange,
              title: "Adjust stamp size"
            }
          ),
          /* @__PURE__ */ u3(
            "button",
            {
              class: "unlockbtn",
              onClick: handleUnlock,
              title: "Unlock the page for writing",
              children: "\u{1F513}"
            }
          ),
          /* @__PURE__ */ u3("div", { class: "toggle", children: [
            /* @__PURE__ */ u3(
              "input",
              {
                type: "checkbox",
                id: "hdbtn",
                checked: hdMode,
                onChange: toggleHdMode,
                accessKey: "h"
              }
            ),
            /* @__PURE__ */ u3("label", { for: "hdbtn", children: "HD mode" })
          ] })
        ] }),
        /* @__PURE__ */ u3("span", { class: "stackedButtons", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "color",
              class: "pencolorbtn",
              value: penColor,
              onInput: handleColorChange,
              accessKey: "c"
            }
          ),
          /* @__PURE__ */ u3("fieldset", { children: [
            /* @__PURE__ */ u3("legend", { children: "Pen type:" }),
            penTypes.map((type) => /* @__PURE__ */ u3("label", { children: [
              /* @__PURE__ */ u3(
                "input",
                {
                  type: "radio",
                  name: "penType",
                  value: type.value,
                  checked: penType === type.value,
                  onChange: handlePenTypeChange
                }
              ),
              type.label
            ] }, type.value))
          ] }),
          /* @__PURE__ */ u3("button", { class: "undoLast", onClick: handleUndo, title: "Undo last stamp", children: "Undo stamp" })
        ] }),
        /* @__PURE__ */ u3("span", { class: "stackedButtons right", children: [
          /* @__PURE__ */ u3("button", { class: "closeDrawTab", onClick: hide, title: "Close the draw tab", children: "x" }),
          /* @__PURE__ */ u3("button", { class: "clearAll", onClick: handleClear, title: "Clear the entire page", children: "Clear all" })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3(
            "textarea",
            {
              ref: textareaRef,
              name: "stampTextArea",
              value: text,
              onInput: (e3) => setText(e3.target.value),
              style: { color: penColor }
            }
          ),
          /* @__PURE__ */ u3("button", { class: "textprintbtn", onClick: handleTextStamp, children: "T" })
        ] }),
        /* @__PURE__ */ u3("label", { children: [
          "Stamp Color:",
          /* @__PURE__ */ u3("select", { value: stampColorType, onChange: handleStampColorChange, children: [
            /* @__PURE__ */ u3("option", { value: "Color Picker", children: "Color Picker" }),
            /* @__PURE__ */ u3("option", { value: "Rainbow", children: "Rainbow" }),
            /* @__PURE__ */ u3("option", { value: "Rainbow Fill", children: "Rainbow Fill" }),
            /* @__PURE__ */ u3("option", { value: "Unchanged", children: "Unchanged" })
          ] })
        ] }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "range",
            class: "rainbowspeed",
            min: "1",
            max: "130",
            value: rainbowSpeed,
            onInput: handleRainbowSpeedChange,
            disabled: stampColorType !== "Rainbow" && stampColorType !== "Rainbow Fill"
          }
        ),
        /* @__PURE__ */ u3("div", { class: "toggle", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "checkbox",
              id: "kbbtn",
              checked: keyboardMode,
              onChange: (e3) => setKeyboardMode(e3.target.checked),
              title: keyboardHelpText,
              accessKey: "k"
            }
          ),
          /* @__PURE__ */ u3("label", { for: "kbbtn", title: keyboardHelpText, children: "Keyboard mode" })
        ] })
      ] }),
      /* @__PURE__ */ u3("div", { class: "stamps", ref: stampsRef, children: Object.entries(stamps).map(([category, stampList]) => /* @__PURE__ */ u3("details", { open: category === Object.keys(stamps)[0], children: [
        /* @__PURE__ */ u3("summary", { children: category }),
        stampList.map((stamp2) => /* @__PURE__ */ u3(
          "button",
          {
            class: "stampbtn",
            onMouseOver: (e3) => e3.stopPropagation(),
            onClick: () => handleStampClick(stamp2),
            children: typeof stamp2.svg === "string" ? stamp2.svg : stamp2.svg
          },
          stamp2.name
        ))
      ] }, category)) })
    ] });
  };

  // src/components/Misc.jsx
  var LoginAssistantsList = () => {
    const isAndroid = /[Aa]ndroid/.test(navigator.userAgent);
    if (isAndroid)
      return null;
    const logins = [
      { id: 1, name: "Dhanya" },
      { id: 2, name: "Gowri" },
      { id: 3, name: "Gautham" },
      { id: 4, name: "Alex" },
      { id: 5, name: "Ibrahim" },
      { id: 6, name: "Neethi" },
      { id: 7, name: "Ridhima" },
      { id: 8, name: "Samarth" },
      { id: 10, name: "Vaishnavi" },
      { id: 12, name: "Nainika" },
      { id: 13, name: "Arsheen" },
      { id: 14, name: "Parthini" },
      { id: 15, name: "Parvathy" },
      { id: 16, name: "Yen" }
    ];
    return /* @__PURE__ */ u3("details", { class: "loginAssistantsList", open: true, children: [
      /* @__PURE__ */ u3("summary", { children: "Logins" }),
      /* @__PURE__ */ u3("ul", { children: logins.map((login) => /* @__PURE__ */ u3("li", { children: [
        login.id,
        ": ",
        login.name
      ] }, login.id)) })
    ] });
  };
  var RefreshButton = () => /* @__PURE__ */ u3(
    "button",
    {
      class: "loginRefreshBtn",
      onClick: () => window.location.href = window.location.href,
      title: "refresh",
      children: "refresh"
    }
  );

  // src/hooks/useHDMode.js
  var useHDMode = () => {
    const [enabled, setEnabled] = d2(false);
    const initHD = q2(() => {
      const penType = document.querySelector('input[name="penType"]:checked')?.value || "pen";
      const pencolorbtn = document.querySelector(".pencolorbtn");
      if (penType !== "eraser" && pencolorbtn) {
        const penSettings2 = {
          pen: { width: 2, alpha: 255 },
          "thick-highlighter": { width: 25, alpha: 50 },
          "thin-highlighter": { width: 5, alpha: 50 }
        };
        StampLib.setPenSettings({
          color: pencolorbtn.value,
          ...penSettings2[penType]
        });
      }
      document.querySelectorAll(".content-scroll-container .content-bg .content-detail").forEach((detail) => {
        detail.style.minWidth = "372px";
        detail.style.width = "372px";
      });
      document.querySelectorAll(".worksheet-group").forEach((i4) => i4.style.width = "410px");
      document.querySelectorAll(".worksheet-group-page").forEach((i4) => i4.style.maxWidth = "410px");
      document.querySelectorAll(".ATD0020P-worksheet-container img.worksheet-img").forEach((i4) => {
        i4.style.height = "612px";
        i4.style.width = "370px";
      });
      document.querySelectorAll(".ATD0020P-worksheet-container canvas").forEach((i4) => {
        i4.style.height = "612px";
        i4.style.width = "370px";
      });
    }, []);
    const makeHD = q2(() => {
      if (enabled)
        StampLib.makeHD();
    }, [enabled]);
    const makeSD = q2(() => {
      StampLib.makeSD();
    }, []);
    const { disable } = usePageChange({
      onEnable: initHD,
      onPageEnter: makeHD,
      onPageLeave: makeSD,
      onDisable: makeSD
    });
    y2(() => {
      if (enabled) {
        const appRoot = document.querySelector("app-root");
        if (appRoot && document.querySelector("app-atd0020p")) {
          initHD();
          const selectedPage = document.querySelector(".ATD0020P-worksheet-container.selected");
          if (selectedPage) {
            makeHD(selectedPage);
          }
        }
      } else {
        disable();
      }
    }, [enabled, initHD, makeHD, makeSD, disable]);
    return [enabled, setEnabled];
  };
  var useHDModeExposed = () => {
    const [enabled, setEnabled] = useHDMode();
    y2(() => {
      window.__hdModeSetEnabled = setEnabled;
      return () => {
        window.__hdModeSetEnabled = null;
      };
    }, [setEnabled]);
    return [enabled, setEnabled];
  };

  // src/hooks/useAutoPen.js
  var useAutoPen = () => {
    usePageChange({
      onPageEnter: () => {
        setTimeout(() => {
          const atd = StampLib.getAtd();
          if (atd?.drawingMode) {
            const penType = document.querySelector('input[name="penType"]:checked')?.value || "pen";
            const pencolorbtn = document.querySelector(".pencolorbtn");
            if (penType !== "eraser" && pencolorbtn) {
              const penSettings2 = {
                pen: { width: 2, alpha: 255 },
                "thick-highlighter": { width: 25, alpha: 50 },
                "thin-highlighter": { width: 5, alpha: 50 }
              };
              StampLib.setPenSettings({
                color: pencolorbtn.value,
                ...penSettings2[penType]
              });
            }
          }
        }, 300);
      }
    });
  };

  // src/hooks/useMarkboxKeys.js
  var useMarkboxKeys = () => {
    const [markboxMap, setMarkboxMap] = d2({});
    const addMarkboxKeys = q2((page) => {
      if (!page)
        return;
      const boxparent = page.querySelector(".mark-boxs");
      if (!boxparent)
        return;
      boxparent.querySelectorAll(".markboxkey").forEach((el) => el.remove());
      const parentWidth = boxparent.offsetWidth;
      const newMap = {};
      page.querySelectorAll(".mark-box").forEach((box, index) => {
        let key = index + 1;
        if (key > 9) {
          key = keyindexmap[key - 10];
        } else {
          key = String(key);
        }
        const markboxkey = document.createElement("div");
        if (box.offsetLeft >= 3) {
          markboxkey.style.right = `${parentWidth - box.offsetLeft - 4}px`;
          markboxkey.style.top = `${box.offsetTop + 4}px`;
        } else {
          markboxkey.style.left = "0px";
          markboxkey.style.top = `${box.offsetTop - 7}px`;
        }
        markboxkey.className = "markboxkey";
        markboxkey.textContent = keyindexdisplay[key] ?? key;
        newMap[key] = index;
        boxparent.appendChild(markboxkey);
      });
      setMarkboxMap(newMap);
      window.__markboxMap = newMap;
    }, []);
    const removeMarkboxKeys = q2((page) => {
      if (!page)
        return;
      const boxparent = page.querySelector(".mark-boxs");
      boxparent?.querySelectorAll(".markboxkey").forEach((el) => el.remove());
    }, []);
    const onPageEnter = q2((page) => {
      if (window.__keyboardModeEnabled) {
        addMarkboxKeys(page);
      }
    }, [addMarkboxKeys]);
    const onPageLeave = q2((page) => {
      removeMarkboxKeys(page);
    }, [removeMarkboxKeys]);
    const onDisable = q2((page) => {
      removeMarkboxKeys(page);
    }, [removeMarkboxKeys]);
    usePageChange({
      onEnable: () => {
      },
      onPageEnter,
      onPageLeave,
      onDisable
    });
    y2(() => {
      window.__addMarkboxKeys = addMarkboxKeys;
      window.__removeMarkboxKeys = removeMarkboxKeys;
      return () => {
        delete window.__addMarkboxKeys;
        delete window.__removeMarkboxKeys;
      };
    }, [addMarkboxKeys, removeMarkboxKeys]);
    return { markboxMap };
  };

  // src/kclass.jsx
  var PageChangeManager = ({ keyboardEnabled }) => {
    useHDModeExposed();
    useAutoPen();
    useMarkboxKeys();
    return null;
  };
  var PrintOverlayWrapper = () => {
    const printOverlay = usePrintOverlay();
    y2(() => {
      window.__showStampPreview = (stamp2, dims, maxScale, scale, color, svg) => {
        printOverlay.showStampPreview(stamp2, dims, maxScale, scale, color, svg);
      };
      window.__showTextPreview = (text, dims, scale, color) => {
        printOverlay.showTextPreview(text, dims, scale, color);
      };
      window.__hidePrintPreview = () => {
        printOverlay.hidePreview();
      };
      return () => {
        delete window.__showStampPreview;
        delete window.__showTextPreview;
        delete window.__hidePrintPreview;
      };
    }, [printOverlay]);
    return /* @__PURE__ */ u3(PrintOverlay, {});
  };
  var App = () => {
    return /* @__PURE__ */ u3(k, { children: [
      /* @__PURE__ */ u3(CustomToolbar, {}),
      /* @__PURE__ */ u3(DrawTab, {}),
      /* @__PURE__ */ u3(PageChangeManager, { keyboardEnabled: false }),
      /* @__PURE__ */ u3(LoginAssistantsList, {}),
      /* @__PURE__ */ u3(RefreshButton, {}),
      /* @__PURE__ */ u3(PrintOverlayWrapper, {})
    ] });
  };
  var appContainer = document.createElement("div");
  appContainer.id = "app-container";
  document.body.appendChild(appContainer);
  J(
    /* @__PURE__ */ u3(PrintOverlayProvider, { children: /* @__PURE__ */ u3(App, {}) }),
    appContainer
  );
  function findPinchDisabler() {
    for (let listener of document.eventListeners("touchstart")) {
      if (listener.toString().indexOf("disable pinch zoom") > -1) {
        return listener;
      }
    }
    return null;
  }
  var pinchDisablerDisabler = setInterval(() => {
    let pinchDisabler = findPinchDisabler();
    if (pinchDisabler) {
      document.removeEventListener("touchstart", pinchDisabler);
      clearInterval(pinchDisablerDisabler);
      const meta = document.querySelector("meta[content*='user-scalable']");
      if (meta) {
        meta.content = "width=410px, initial-scale=1";
      }
    }
  }, 1e3);
  function getngc() {
    const ngc = document.querySelector("app-root")?.__ngContext__;
    if (!ngc) {
      setTimeout(getngc, 1e3);
      return;
    }
    for (let i4 = ngc.length; i4 >= 0; i4--) {
      if (ngc[i4]?.context) {
        window.kclass = window.kclass || {};
        window.kclass.ng = ngc[i4];
        break;
      }
    }
  }
  getngc();
})();
