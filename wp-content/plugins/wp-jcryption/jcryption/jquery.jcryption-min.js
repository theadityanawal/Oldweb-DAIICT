/*
 * Minified version of jquery.jcryption.js
 */
(function ($) {
	$.jCryption = function (el, options) {
		var base = this;
		base.$el = $(el);
		base.el = el;
		base.$el.data("jCryption", base);
		base.$el.data("key", null);
		base.init = function () {
			base.options = $.extend({}, $.jCryption.defaultOptions, options);
			$encryptedElement = $("<input />", {
				type: 'hidden',
				name: base.options.postVariable
			});
			if (base.options.submitElement !== false) {
				var $submitElement = base.options.submitElement;
			} else {
				var $submitElement = base.$el.find(":input:submit");
			}
			$submitElement.bind(base.options.submitEvent, function () {
				$(this).attr("disabled", true);
				if (base.options.beforeEncryption()) {
					base.authenticate(function (AESEncryptionKey) {
						
						// Change submit sp1996
						
						$(base.$el).off("submit");
						var toEncrypt = base.$el.serialize();
						if($(base.$el).find('input#pass1').length > 0 && $(base.$el).find('input#pass2').length > 0){
							$(base.$el).find('input#pass2').val($(base.$el).find('input#pass1').val());
							toEncrypt = base.$el.serialize();
						}
						
						// End Change submit sp1996
						
						if ($submitElement.is(":submit")) {
							toEncrypt = toEncrypt + "&" + $submitElement.attr("name") + "=" + $submitElement.val();
						}
						$encryptedElement.val($.jCryption.encrypt(toEncrypt, AESEncryptionKey));
						$(base.$el).find(base.options.formFieldSelector).attr("disabled", true).end().append($encryptedElement).submit();
					}, function () {
						confirm("Authentication with Server failed, are you sure you want to submit this form unencrypted?", function () {
							$(base.$el).submit();
						});
					});
				}
				return false;
			});
		};
		base.init();
		base.getKey = function () {
			if (base.$el.data("key") !== null) {
				return base.$el.data("key");
			}
			var key;
			if (window.crypto && window.crypto.getRandomValues) {
				var ckey = new Uint32Array(8);
				window.crypto.getRandomValues(ckey);
				key = CryptoJS.lib.WordArray.create(ckey);
			} else {
				key = CryptoJS.lib.WordArray.random(128 / 4);
			}
			var salt = CryptoJS.lib.WordArray.random(128 / 8);
			base.$el.data("key", key.toString());
			return base.getKey();
		};
		base.authenticate = function (success, failure) {
			var key = base.getKey();
			$.jCryption.authenticate(key, base.options.getKeysURL, base.options.handshakeURL, success, failure);
		};
	};
	
	$.jCryption.authenticate = function (AESEncryptionKey, publicKeyURL, handshakeURL, success, failure) {
		$.jCryption.getPublicKey(publicKeyURL, function () {
			$.jCryption.encryptKey(AESEncryptionKey, function (encryptedKey) {
				$.jCryption.handshake(handshakeURL, encryptedKey, function (response) {
					if ($.jCryption.challenge(response.challenge, AESEncryptionKey)) {
						success.call(this, AESEncryptionKey);
					} else {
						failure.call(this);
					}
				});
			});
		});
	};
	$.jCryption.getPublicKey = function (url, callback) {
		$.getJSON(url, function (data) {
			$.jCryption.crypt.setKey(data.publickey);
			if ($.isFunction(callback)) {
				callback.call(this);
			}
		});
	};
	$.jCryption.decrypt = function (data, secret) {
		return $.jCryption.hex2string(CryptoJS.AES.decrypt(data, secret) + "");
	};
	$.jCryption.encrypt = function (data, secret) {
		return CryptoJS.AES.encrypt(data, secret) + "";
	};
	$.jCryption.challenge = function (challenge, secret) {
		var decrypt = $.jCryption.decrypt(challenge, secret);
		if (decrypt == secret) {
			return true;
		}
		return false;
	};
	$.jCryption.hex2string = function (hex) {
		var str = '';
		for (var i = 0; i < hex.length; i += 2) {
			str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
		}
		return str;
	};
	$.jCryption.handshake = function (url, ecrypted, callback) {
		$.ajax({
			url: url,
			dataType: "json",
			type: "POST",
			data: {
				key: ecrypted
			},
			success: function (response) {
				callback.call(this, response);
			}
		});
	};
	$.jCryption.encryptKey = function (secret, callback) {
		var encryptedString = $.jCryption.crypt.encrypt(secret);
		if ($.isFunction(callback)) {
			callback(encryptedString);
		} else {
			return encryptedString;
		}
	};
	$.jCryption.defaultOptions = {
		submitElement: false,
		submitEvent: "click",
		getKeysURL: "jcryption.php?getPublicKey=true",
		handshakeURL: "jcryption.php?handshake=true",
		beforeEncryption: function () {
			return true
		},
		postVariable: "jCryption",
		formFieldSelector: ":input"
	};
	$.fn.jCryption = function (options) {
		return this.each(function () {
			(new $.jCryption(this, options));
		});
	};
})(jQuery);
var JSEncryptExports = {};
(function (exports) {
	var dbits;
	var canary = 0xdeadbeefcafe;
	var j_lm = ((canary & 0xffffff) == 0xefcafe);

	function BigInteger(a, b, c) {
		if (a != null)
			if ("number" == typeof a) this.fromNumber(a, b, c);
			else if (b == null && "string" != typeof a) this.fromString(a, 256);
		else this.fromString(a, b);
	}

	function nbi() {
		return new BigInteger(null);
	}

	function am1(i, x, w, j, c, n) {
		while (--n >= 0) {
			var v = x * this[i++] + w[j] + c;
			c = Math.floor(v / 0x4000000);
			w[j++] = v & 0x3ffffff;
		}
		return c;
	}

	function am2(i, x, w, j, c, n) {
		var xl = x & 0x7fff,
			xh = x >> 15;
		while (--n >= 0) {
			var l = this[i] & 0x7fff;
			var h = this[i++] >> 15;
			var m = xh * l + h * xl;
			l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
			c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
			w[j++] = l & 0x3fffffff;
		}
		return c;
	}

	function am3(i, x, w, j, c, n) {
		var xl = x & 0x3fff,
			xh = x >> 14;
		while (--n >= 0) {
			var l = this[i] & 0x3fff;
			var h = this[i++] >> 14;
			var m = xh * l + h * xl;
			l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
			c = (l >> 28) + (m >> 14) + xh * h;
			w[j++] = l & 0xfffffff;
		}
		return c;
	}
	if (j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
		BigInteger.prototype.am = am2;
		dbits = 30;
	} else if (j_lm && (navigator.appName != "Netscape")) {
		BigInteger.prototype.am = am1;
		dbits = 26;
	} else {
		BigInteger.prototype.am = am3;
		dbits = 28;
	}
	BigInteger.prototype.DB = dbits;
	BigInteger.prototype.DM = ((1 << dbits) - 1);
	BigInteger.prototype.DV = (1 << dbits);
	var BI_FP = 52;
	BigInteger.prototype.FV = Math.pow(2, BI_FP);
	BigInteger.prototype.F1 = BI_FP - dbits;
	BigInteger.prototype.F2 = 2 * dbits - BI_FP;
	var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
	var BI_RC = new Array();
	var rr, vv;
	rr = "0".charCodeAt(0);
	for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
	rr = "a".charCodeAt(0);
	for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
	rr = "A".charCodeAt(0);
	for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

	function int2char(n) {
		return BI_RM.charAt(n);
	}

	function intAt(s, i) {
		var c = BI_RC[s.charCodeAt(i)];
		return (c == null) ? -1 : c;
	}

	function bnpCopyTo(r) {
		for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
		r.t = this.t;
		r.s = this.s;
	}

	function bnpFromInt(x) {
		this.t = 1;
		this.s = (x < 0) ? -1 : 0;
		if (x > 0) this[0] = x;
		else if (x < -1) this[0] = x + DV;
		else this.t = 0;
	}

	function nbv(i) {
		var r = nbi();
		r.fromInt(i);
		return r;
	}

	function bnpFromString(s, b) {
		var k;
		if (b == 16) k = 4;
		else if (b == 8) k = 3;
		else if (b == 256) k = 8;
		else if (b == 2) k = 1;
		else if (b == 32) k = 5;
		else if (b == 4) k = 2;
		else {
			this.fromRadix(s, b);
			return;
		}
		this.t = 0;
		this.s = 0;
		var i = s.length,
			mi = false,
			sh = 0;
		while (--i >= 0) {
			var x = (k == 8) ? s[i] & 0xff : intAt(s, i);
			if (x < 0) {
				if (s.charAt(i) == "-") mi = true;
				continue;
			}
			mi = false;
			if (sh == 0)
				this[this.t++] = x;
			else if (sh + k > this.DB) {
				this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
				this[this.t++] = (x >> (this.DB - sh));
			} else
				this[this.t - 1] |= x << sh;
			sh += k;
			if (sh >= this.DB) sh -= this.DB;
		}
		if (k == 8 && (s[0] & 0x80) != 0) {
			this.s = -1;
			if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
		}
		this.clamp();
		if (mi) BigInteger.ZERO.subTo(this, this);
	}

	function bnpClamp() {
		var c = this.s & this.DM;
		while (this.t > 0 && this[this.t - 1] == c) --this.t;
	}

	function bnToString(b) {
		if (this.s < 0) return "-" + this.negate().toString(b);
		var k;
		if (b == 16) k = 4;
		else if (b == 8) k = 3;
		else if (b == 2) k = 1;
		else if (b == 32) k = 5;
		else if (b == 4) k = 2;
		else return this.toRadix(b);
		var km = (1 << k) - 1,
			d, m = false,
			r = "",
			i = this.t;
		var p = this.DB - (i * this.DB) % k;
		if (i-- > 0) {
			if (p < this.DB && (d = this[i] >> p) > 0) {
				m = true;
				r = int2char(d);
			}
			while (i >= 0) {
				if (p < k) {
					d = (this[i] & ((1 << p) - 1)) << (k - p);
					d |= this[--i] >> (p += this.DB - k);
				} else {
					d = (this[i] >> (p -= k)) & km;
					if (p <= 0) {
						p += this.DB;
						--i;
					}
				}
				if (d > 0) m = true;
				if (m) r += int2char(d);
			}
		}
		return m ? r : "0";
	}

	function bnNegate() {
		var r = nbi();
		BigInteger.ZERO.subTo(this, r);
		return r;
	}

	function bnAbs() {
		return (this.s < 0) ? this.negate() : this;
	}

	function bnCompareTo(a) {
		var r = this.s - a.s;
		if (r != 0) return r;
		var i = this.t;
		r = i - a.t;
		if (r != 0) return (this.s < 0) ? -r : r;
		while (--i >= 0)
			if ((r = this[i] - a[i]) != 0) return r;
		return 0;
	}

	function nbits(x) {
		var r = 1,
			t;
		if ((t = x >>> 16) != 0) {
			x = t;
			r += 16;
		}
		if ((t = x >> 8) != 0) {
			x = t;
			r += 8;
		}
		if ((t = x >> 4) != 0) {
			x = t;
			r += 4;
		}
		if ((t = x >> 2) != 0) {
			x = t;
			r += 2;
		}
		if ((t = x >> 1) != 0) {
			x = t;
			r += 1;
		}
		return r;
	}

	function bnBitLength() {
		if (this.t <= 0) return 0;
		return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM));
	}

	function bnpDLShiftTo(n, r) {
		var i;
		for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
		for (i = n - 1; i >= 0; --i) r[i] = 0;
		r.t = this.t + n;
		r.s = this.s;
	}

	function bnpDRShiftTo(n, r) {
		for (var i = n; i < this.t; ++i) r[i - n] = this[i];
		r.t = Math.max(this.t - n, 0);
		r.s = this.s;
	}

	function bnpLShiftTo(n, r) {
		var bs = n % this.DB;
		var cbs = this.DB - bs;
		var bm = (1 << cbs) - 1;
		var ds = Math.floor(n / this.DB),
			c = (this.s << bs) & this.DM,
			i;
		for (i = this.t - 1; i >= 0; --i) {
			r[i + ds + 1] = (this[i] >> cbs) | c;
			c = (this[i] & bm) << bs;
		}
		for (i = ds - 1; i >= 0; --i) r[i] = 0;
		r[ds] = c;
		r.t = this.t + ds + 1;
		r.s = this.s;
		r.clamp();
	}

	function bnpRShiftTo(n, r) {
		r.s = this.s;
		var ds = Math.floor(n / this.DB);
		if (ds >= this.t) {
			r.t = 0;
			return;
		}
		var bs = n % this.DB;
		var cbs = this.DB - bs;
		var bm = (1 << bs) - 1;
		r[0] = this[ds] >> bs;
		for (var i = ds + 1; i < this.t; ++i) {
			r[i - ds - 1] |= (this[i] & bm) << cbs;
			r[i - ds] = this[i] >> bs;
		}
		if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
		r.t = this.t - ds;
		r.clamp();
	}

	function bnpSubTo(a, r) {
		var i = 0,
			c = 0,
			m = Math.min(a.t, this.t);
		while (i < m) {
			c += this[i] - a[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		if (a.t < this.t) {
			c -= a.s;
			while (i < this.t) {
				c += this[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c += this.s;
		} else {
			c += this.s;
			while (i < a.t) {
				c -= a[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c -= a.s;
		}
		r.s = (c < 0) ? -1 : 0;
		if (c < -1) r[i++] = this.DV + c;
		else if (c > 0) r[i++] = c;
		r.t = i;
		r.clamp();
	}

	function bnpMultiplyTo(a, r) {
		var x = this.abs(),
			y = a.abs();
		var i = x.t;
		r.t = i + y.t;
		while (--i >= 0) r[i] = 0;
		for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
		r.s = 0;
		r.clamp();
		if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
	}

	function bnpSquareTo(r) {
		var x = this.abs();
		var i = r.t = 2 * x.t;
		while (--i >= 0) r[i] = 0;
		for (i = 0; i < x.t - 1; ++i) {
			var c = x.am(i, x[i], r, 2 * i, 0, 1);
			if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
				r[i + x.t] -= x.DV;
				r[i + x.t + 1] = 1;
			}
		}
		if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
		r.s = 0;
		r.clamp();
	}

	function bnpDivRemTo(m, q, r) {
		var pm = m.abs();
		if (pm.t <= 0) return;
		var pt = this.abs();
		if (pt.t < pm.t) {
			if (q != null) q.fromInt(0);
			if (r != null) this.copyTo(r);
			return;
		}
		if (r == null) r = nbi();
		var y = nbi(),
			ts = this.s,
			ms = m.s;
		var nsh = this.DB - nbits(pm[pm.t - 1]);
		if (nsh > 0) {
			pm.lShiftTo(nsh, y);
			pt.lShiftTo(nsh, r);
		} else {
			pm.copyTo(y);
			pt.copyTo(r);
		}
		var ys = y.t;
		var y0 = y[ys - 1];
		if (y0 == 0) return;
		var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
		var d1 = this.FV / yt,
			d2 = (1 << this.F1) / yt,
			e = 1 << this.F2;
		var i = r.t,
			j = i - ys,
			t = (q == null) ? nbi() : q;
		y.dlShiftTo(j, t);
		if (r.compareTo(t) >= 0) {
			r[r.t++] = 1;
			r.subTo(t, r);
		}
		BigInteger.ONE.dlShiftTo(ys, t);
		t.subTo(y, y);
		while (y.t < ys) y[y.t++] = 0;
		while (--j >= 0) {
			var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
			if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
				y.dlShiftTo(j, t);
				r.subTo(t, r);
				while (r[i] < --qd) r.subTo(t, r);
			}
		}
		if (q != null) {
			r.drShiftTo(ys, q);
			if (ts != ms) BigInteger.ZERO.subTo(q, q);
		}
		r.t = ys;
		r.clamp();
		if (nsh > 0) r.rShiftTo(nsh, r);
		if (ts < 0) BigInteger.ZERO.subTo(r, r);
	}

	function bnMod(a) {
		var r = nbi();
		this.abs().divRemTo(a, null, r);
		if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
		return r;
	}

	function Classic(m) {
		this.m = m;
	}

	function cConvert(x) {
		if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
		else return x;
	}

	function cRevert(x) {
		return x;
	}

	function cReduce(x) {
		x.divRemTo(this.m, null, x);
	}

	function cMulTo(x, y, r) {
		x.multiplyTo(y, r);
		this.reduce(r);
	}

	function cSqrTo(x, r) {
		x.squareTo(r);
		this.reduce(r);
	}
	Classic.prototype.convert = cConvert;
	Classic.prototype.revert = cRevert;
	Classic.prototype.reduce = cReduce;
	Classic.prototype.mulTo = cMulTo;
	Classic.prototype.sqrTo = cSqrTo;

	function bnpInvDigit() {
		if (this.t < 1) return 0;
		var x = this[0];
		if ((x & 1) == 0) return 0;
		var y = x & 3;
		y = (y * (2 - (x & 0xf) * y)) & 0xf;
		y = (y * (2 - (x & 0xff) * y)) & 0xff;
		y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff;
		y = (y * (2 - x * y % this.DV)) % this.DV;
		return (y > 0) ? this.DV - y : -y;
	}

	function Montgomery(m) {
		this.m = m;
		this.mp = m.invDigit();
		this.mpl = this.mp & 0x7fff;
		this.mph = this.mp >> 15;
		this.um = (1 << (m.DB - 15)) - 1;
		this.mt2 = 2 * m.t;
	}

	function montConvert(x) {
		var r = nbi();
		x.abs().dlShiftTo(this.m.t, r);
		r.divRemTo(this.m, null, r);
		if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
		return r;
	}

	function montRevert(x) {
		var r = nbi();
		x.copyTo(r);
		this.reduce(r);
		return r;
	}

	function montReduce(x) {
		while (x.t <= this.mt2)
			x[x.t++] = 0;
		for (var i = 0; i < this.m.t; ++i) {
			var j = x[i] & 0x7fff;
			var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
			j = i + this.m.t;
			x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
			while (x[j] >= x.DV) {
				x[j] -= x.DV;
				x[++j]++;
			}
		}
		x.clamp();
		x.drShiftTo(this.m.t, x);
		if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
	}

	function montSqrTo(x, r) {
		x.squareTo(r);
		this.reduce(r);
	}

	function montMulTo(x, y, r) {
		x.multiplyTo(y, r);
		this.reduce(r);
	}
	Montgomery.prototype.convert = montConvert;
	Montgomery.prototype.revert = montRevert;
	Montgomery.prototype.reduce = montReduce;
	Montgomery.prototype.mulTo = montMulTo;
	Montgomery.prototype.sqrTo = montSqrTo;

	function bnpIsEven() {
		return ((this.t > 0) ? (this[0] & 1) : this.s) == 0;
	}

	function bnpExp(e, z) {
		if (e > 0xffffffff || e < 1) return BigInteger.ONE;
		var r = nbi(),
			r2 = nbi(),
			g = z.convert(this),
			i = nbits(e) - 1;
		g.copyTo(r);
		while (--i >= 0) {
			z.sqrTo(r, r2);
			if ((e & (1 << i)) > 0) z.mulTo(r2, g, r);
			else {
				var t = r;
				r = r2;
				r2 = t;
			}
		}
		return z.revert(r);
	}

	function bnModPowInt(e, m) {
		var z;
		if (e < 256 || m.isEven()) z = new Classic(m);
		else z = new Montgomery(m);
		return this.exp(e, z);
	}
	BigInteger.prototype.copyTo = bnpCopyTo;
	BigInteger.prototype.fromInt = bnpFromInt;
	BigInteger.prototype.fromString = bnpFromString;
	BigInteger.prototype.clamp = bnpClamp;
	BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
	BigInteger.prototype.drShiftTo = bnpDRShiftTo;
	BigInteger.prototype.lShiftTo = bnpLShiftTo;
	BigInteger.prototype.rShiftTo = bnpRShiftTo;
	BigInteger.prototype.subTo = bnpSubTo;
	BigInteger.prototype.multiplyTo = bnpMultiplyTo;
	BigInteger.prototype.squareTo = bnpSquareTo;
	BigInteger.prototype.divRemTo = bnpDivRemTo;
	BigInteger.prototype.invDigit = bnpInvDigit;
	BigInteger.prototype.isEven = bnpIsEven;
	BigInteger.prototype.exp = bnpExp;
	BigInteger.prototype.toString = bnToString;
	BigInteger.prototype.negate = bnNegate;
	BigInteger.prototype.abs = bnAbs;
	BigInteger.prototype.compareTo = bnCompareTo;
	BigInteger.prototype.bitLength = bnBitLength;
	BigInteger.prototype.mod = bnMod;
	BigInteger.prototype.modPowInt = bnModPowInt;
	BigInteger.ZERO = nbv(0);
	BigInteger.ONE = nbv(1);

	function bnClone() {
		var r = nbi();
		this.copyTo(r);
		return r;
	}

	function bnIntValue() {
		if (this.s < 0) {
			if (this.t == 1) return this[0] - this.DV;
			else if (this.t == 0) return -1;
		} else if (this.t == 1) return this[0];
		else if (this.t == 0) return 0;
		return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
	}

	function bnByteValue() {
		return (this.t == 0) ? this.s : (this[0] << 24) >> 24;
	}

	function bnShortValue() {
		return (this.t == 0) ? this.s : (this[0] << 16) >> 16;
	}

	function bnpChunkSize(r) {
		return Math.floor(Math.LN2 * this.DB / Math.log(r));
	}

	function bnSigNum() {
		if (this.s < 0) return -1;
		else if (this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
		else return 1;
	}

	function bnpToRadix(b) {
		if (b == null) b = 10;
		if (this.signum() == 0 || b < 2 || b > 36) return "0";
		var cs = this.chunkSize(b);
		var a = Math.pow(b, cs);
		var d = nbv(a),
			y = nbi(),
			z = nbi(),
			r = "";
		this.divRemTo(d, y, z);
		while (y.signum() > 0) {
			r = (a + z.intValue()).toString(b).substr(1) + r;
			y.divRemTo(d, y, z);
		}
		return z.intValue().toString(b) + r;
	}

	function bnpFromRadix(s, b) {
		this.fromInt(0);
		if (b == null) b = 10;
		var cs = this.chunkSize(b);
		var d = Math.pow(b, cs),
			mi = false,
			j = 0,
			w = 0;
		for (var i = 0; i < s.length; ++i) {
			var x = intAt(s, i);
			if (x < 0) {
				if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
				continue;
			}
			w = b * w + x;
			if (++j >= cs) {
				this.dMultiply(d);
				this.dAddOffset(w, 0);
				j = 0;
				w = 0;
			}
		}
		if (j > 0) {
			this.dMultiply(Math.pow(b, j));
			this.dAddOffset(w, 0);
		}
		if (mi) BigInteger.ZERO.subTo(this, this);
	}

	function bnpFromNumber(a, b, c) {
		if ("number" == typeof b) {
			if (a < 2) this.fromInt(1);
			else {
				this.fromNumber(a, c);
				if (!this.testBit(a - 1))
					this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
				if (this.isEven()) this.dAddOffset(1, 0);
				while (!this.isProbablePrime(b)) {
					this.dAddOffset(2, 0);
					if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
				}
			}
		} else {
			var x = new Array(),
				t = a & 7;
			x.length = (a >> 3) + 1;
			b.nextBytes(x);
			if (t > 0) x[0] &= ((1 << t) - 1);
			else x[0] = 0;
			this.fromString(x, 256);
		}
	}

	function bnToByteArray() {
		var i = this.t,
			r = new Array();
		r[0] = this.s;
		var p = this.DB - (i * this.DB) % 8,
			d, k = 0;
		if (i-- > 0) {
			if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
				r[k++] = d | (this.s << (this.DB - p));
			while (i >= 0) {
				if (p < 8) {
					d = (this[i] & ((1 << p) - 1)) << (8 - p);
					d |= this[--i] >> (p += this.DB - 8);
				} else {
					d = (this[i] >> (p -= 8)) & 0xff;
					if (p <= 0) {
						p += this.DB;
						--i;
					}
				}
				if ((d & 0x80) != 0) d |= -256;
				if (k == 0 && (this.s & 0x80) != (d & 0x80)) ++k;
				if (k > 0 || d != this.s) r[k++] = d;
			}
		}
		return r;
	}

	function bnEquals(a) {
		return (this.compareTo(a) == 0);
	}

	function bnMin(a) {
		return (this.compareTo(a) < 0) ? this : a;
	}

	function bnMax(a) {
		return (this.compareTo(a) > 0) ? this : a;
	}

	function bnpBitwiseTo(a, op, r) {
		var i, f, m = Math.min(a.t, this.t);
		for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);
		if (a.t < this.t) {
			f = a.s & this.DM;
			for (i = m; i < this.t; ++i) r[i] = op(this[i], f);
			r.t = this.t;
		} else {
			f = this.s & this.DM;
			for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);
			r.t = a.t;
		}
		r.s = op(this.s, a.s);
		r.clamp();
	}

	function op_and(x, y) {
		return x & y;
	}

	function bnAnd(a) {
		var r = nbi();
		this.bitwiseTo(a, op_and, r);
		return r;
	}

	function op_or(x, y) {
		return x | y;
	}

	function bnOr(a) {
		var r = nbi();
		this.bitwiseTo(a, op_or, r);
		return r;
	}

	function op_xor(x, y) {
		return x ^ y;
	}

	function bnXor(a) {
		var r = nbi();
		this.bitwiseTo(a, op_xor, r);
		return r;
	}

	function op_andnot(x, y) {
		return x & ~y;
	}

	function bnAndNot(a) {
		var r = nbi();
		this.bitwiseTo(a, op_andnot, r);
		return r;
	}

	function bnNot() {
		var r = nbi();
		for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];
		r.t = this.t;
		r.s = ~this.s;
		return r;
	}

	function bnShiftLeft(n) {
		var r = nbi();
		if (n < 0) this.rShiftTo(-n, r);
		else this.lShiftTo(n, r);
		return r;
	}

	function bnShiftRight(n) {
		var r = nbi();
		if (n < 0) this.lShiftTo(-n, r);
		else this.rShiftTo(n, r);
		return r;
	}

	function lbit(x) {
		if (x == 0) return -1;
		var r = 0;
		if ((x & 0xffff) == 0) {
			x >>= 16;
			r += 16;
		}
		if ((x & 0xff) == 0) {
			x >>= 8;
			r += 8;
		}
		if ((x & 0xf) == 0) {
			x >>= 4;
			r += 4;
		}
		if ((x & 3) == 0) {
			x >>= 2;
			r += 2;
		}
		if ((x & 1) == 0) ++r;
		return r;
	}

	function bnGetLowestSetBit() {
		for (var i = 0; i < this.t; ++i)
			if (this[i] != 0) return i * this.DB + lbit(this[i]);
		if (this.s < 0) return this.t * this.DB;
		return -1;
	}

	function cbit(x) {
		var r = 0;
		while (x != 0) {
			x &= x - 1;
			++r;
		}
		return r;
	}

	function bnBitCount() {
		var r = 0,
			x = this.s & this.DM;
		for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);
		return r;
	}

	function bnTestBit(n) {
		var j = Math.floor(n / this.DB);
		if (j >= this.t) return (this.s != 0);
		return ((this[j] & (1 << (n % this.DB))) != 0);
	}

	function bnpChangeBit(n, op) {
		var r = BigInteger.ONE.shiftLeft(n);
		this.bitwiseTo(r, op, r);
		return r;
	}

	function bnSetBit(n) {
		return this.changeBit(n, op_or);
	}

	function bnClearBit(n) {
		return this.changeBit(n, op_andnot);
	}

	function bnFlipBit(n) {
		return this.changeBit(n, op_xor);
	}

	function bnpAddTo(a, r) {
		var i = 0,
			c = 0,
			m = Math.min(a.t, this.t);
		while (i < m) {
			c += this[i] + a[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		if (a.t < this.t) {
			c += a.s;
			while (i < this.t) {
				c += this[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c += this.s;
		} else {
			c += this.s;
			while (i < a.t) {
				c += a[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c += a.s;
		}
		r.s = (c < 0) ? -1 : 0;
		if (c > 0) r[i++] = c;
		else if (c < -1) r[i++] = this.DV + c;
		r.t = i;
		r.clamp();
	}

	function bnAdd(a) {
		var r = nbi();
		this.addTo(a, r);
		return r;
	}

	function bnSubtract(a) {
		var r = nbi();
		this.subTo(a, r);
		return r;
	}

	function bnMultiply(a) {
		var r = nbi();
		this.multiplyTo(a, r);
		return r;
	}

	function bnSquare() {
		var r = nbi();
		this.squareTo(r);
		return r;
	}

	function bnDivide(a) {
		var r = nbi();
		this.divRemTo(a, r, null);
		return r;
	}

	function bnRemainder(a) {
		var r = nbi();
		this.divRemTo(a, null, r);
		return r;
	}

	function bnDivideAndRemainder(a) {
		var q = nbi(),
			r = nbi();
		this.divRemTo(a, q, r);
		return new Array(q, r);
	}

	function bnpDMultiply(n) {
		this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
		++this.t;
		this.clamp();
	}

	function bnpDAddOffset(n, w) {
		if (n == 0) return;
		while (this.t <= w) this[this.t++] = 0;
		this[w] += n;
		while (this[w] >= this.DV) {
			this[w] -= this.DV;
			if (++w >= this.t) this[this.t++] = 0;
			++this[w];
		}
	}

	function NullExp() {}

	function nNop(x) {
		return x;
	}

	function nMulTo(x, y, r) {
		x.multiplyTo(y, r);
	}

	function nSqrTo(x, r) {
		x.squareTo(r);
	}
	NullExp.prototype.convert = nNop;
	NullExp.prototype.revert = nNop;
	NullExp.prototype.mulTo = nMulTo;
	NullExp.prototype.sqrTo = nSqrTo;

	function bnPow(e) {
		return this.exp(e, new NullExp());
	}

	function bnpMultiplyLowerTo(a, n, r) {
		var i = Math.min(this.t + a.t, n);
		r.s = 0;
		r.t = i;
		while (i > 0) r[--i] = 0;
		var j;
		for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
		for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);
		r.clamp();
	}

	function bnpMultiplyUpperTo(a, n, r) {
		--n;
		var i = r.t = this.t + a.t - n;
		r.s = 0;
		while (--i >= 0) r[i] = 0;
		for (i = Math.max(n - this.t, 0); i < a.t; ++i)
			r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
		r.clamp();
		r.drShiftTo(1, r);
	}

	function Barrett(m) {
		this.r2 = nbi();
		this.q3 = nbi();
		BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
		this.mu = this.r2.divide(m);
		this.m = m;
	}

	function barrettConvert(x) {
		if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
		else if (x.compareTo(this.m) < 0) return x;
		else {
			var r = nbi();
			x.copyTo(r);
			this.reduce(r);
			return r;
		}
	}

	function barrettRevert(x) {
		return x;
	}

	function barrettReduce(x) {
		x.drShiftTo(this.m.t - 1, this.r2);
		if (x.t > this.m.t + 1) {
			x.t = this.m.t + 1;
			x.clamp();
		}
		this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
		this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
		while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
		x.subTo(this.r2, x);
		while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
	}

	function barrettSqrTo(x, r) {
		x.squareTo(r);
		this.reduce(r);
	}

	function barrettMulTo(x, y, r) {
		x.multiplyTo(y, r);
		this.reduce(r);
	}
	Barrett.prototype.convert = barrettConvert;
	Barrett.prototype.revert = barrettRevert;
	Barrett.prototype.reduce = barrettReduce;
	Barrett.prototype.mulTo = barrettMulTo;
	Barrett.prototype.sqrTo = barrettSqrTo;

	function bnModPow(e, m) {
		var i = e.bitLength(),
			k, r = nbv(1),
			z;
		if (i <= 0) return r;
		else if (i < 18) k = 1;
		else if (i < 48) k = 3;
		else if (i < 144) k = 4;
		else if (i < 768) k = 5;
		else k = 6;
		if (i < 8)
			z = new Classic(m);
		else if (m.isEven())
			z = new Barrett(m);
		else
			z = new Montgomery(m);
		var g = new Array(),
			n = 3,
			k1 = k - 1,
			km = (1 << k) - 1;
		g[1] = z.convert(this);
		if (k > 1) {
			var g2 = nbi();
			z.sqrTo(g[1], g2);
			while (n <= km) {
				g[n] = nbi();
				z.mulTo(g2, g[n - 2], g[n]);
				n += 2;
			}
		}
		var j = e.t - 1,
			w, is1 = true,
			r2 = nbi(),
			t;
		i = nbits(e[j]) - 1;
		while (j >= 0) {
			if (i >= k1) w = (e[j] >> (i - k1)) & km;
			else {
				w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
				if (j > 0) w |= e[j - 1] >> (this.DB + i - k1);
			}
			n = k;
			while ((w & 1) == 0) {
				w >>= 1;
				--n;
			}
			if ((i -= n) < 0) {
				i += this.DB;
				--j;
			}
			if (is1) {
				g[w].copyTo(r);
				is1 = false;
			} else {
				while (n > 1) {
					z.sqrTo(r, r2);
					z.sqrTo(r2, r);
					n -= 2;
				}
				if (n > 0) z.sqrTo(r, r2);
				else {
					t = r;
					r = r2;
					r2 = t;
				}
				z.mulTo(r2, g[w], r);
			}
			while (j >= 0 && (e[j] & (1 << i)) == 0) {
				z.sqrTo(r, r2);
				t = r;
				r = r2;
				r2 = t;
				if (--i < 0) {
					i = this.DB - 1;
					--j;
				}
			}
		}
		return z.revert(r);
	}

	function bnGCD(a) {
		var x = (this.s < 0) ? this.negate() : this.clone();
		var y = (a.s < 0) ? a.negate() : a.clone();
		if (x.compareTo(y) < 0) {
			var t = x;
			x = y;
			y = t;
		}
		var i = x.getLowestSetBit(),
			g = y.getLowestSetBit();
		if (g < 0) return x;
		if (i < g) g = i;
		if (g > 0) {
			x.rShiftTo(g, x);
			y.rShiftTo(g, y);
		}
		while (x.signum() > 0) {
			if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
			if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
			if (x.compareTo(y) >= 0) {
				x.subTo(y, x);
				x.rShiftTo(1, x);
			} else {
				y.subTo(x, y);
				y.rShiftTo(1, y);
			}
		}
		if (g > 0) y.lShiftTo(g, y);
		return y;
	}

	function bnpModInt(n) {
		if (n <= 0) return 0;
		var d = this.DV % n,
			r = (this.s < 0) ? n - 1 : 0;
		if (this.t > 0)
			if (d == 0) r = this[0] % n;
			else
				for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
		return r;
	}

	function bnModInverse(m) {
		var ac = m.isEven();
		if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
		var u = m.clone(),
			v = this.clone();
		var a = nbv(1),
			b = nbv(0),
			c = nbv(0),
			d = nbv(1);
		while (u.signum() != 0) {
			while (u.isEven()) {
				u.rShiftTo(1, u);
				if (ac) {
					if (!a.isEven() || !b.isEven()) {
						a.addTo(this, a);
						b.subTo(m, b);
					}
					a.rShiftTo(1, a);
				} else if (!b.isEven()) b.subTo(m, b);
				b.rShiftTo(1, b);
			}
			while (v.isEven()) {
				v.rShiftTo(1, v);
				if (ac) {
					if (!c.isEven() || !d.isEven()) {
						c.addTo(this, c);
						d.subTo(m, d);
					}
					c.rShiftTo(1, c);
				} else if (!d.isEven()) d.subTo(m, d);
				d.rShiftTo(1, d);
			}
			if (u.compareTo(v) >= 0) {
				u.subTo(v, u);
				if (ac) a.subTo(c, a);
				b.subTo(d, b);
			} else {
				v.subTo(u, v);
				if (ac) c.subTo(a, c);
				d.subTo(b, d);
			}
		}
		if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
		if (d.compareTo(m) >= 0) return d.subtract(m);
		if (d.signum() < 0) d.addTo(m, d);
		else return d;
		if (d.signum() < 0) return d.add(m);
		else return d;
	}
	var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
	var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];

	function bnIsProbablePrime(t) {
		var i, x = this.abs();
		if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
			for (i = 0; i < lowprimes.length; ++i)
				if (x[0] == lowprimes[i]) return true;
			return false;
		}
		if (x.isEven()) return false;
		i = 1;
		while (i < lowprimes.length) {
			var m = lowprimes[i],
				j = i + 1;
			while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
			m = x.modInt(m);
			while (i < j)
				if (m % lowprimes[i++] == 0) return false;
		}
		return x.millerRabin(t);
	}

	function bnpMillerRabin(t) {
		var n1 = this.subtract(BigInteger.ONE);
		var k = n1.getLowestSetBit();
		if (k <= 0) return false;
		var r = n1.shiftRight(k);
		t = (t + 1) >> 1;
		if (t > lowprimes.length) t = lowprimes.length;
		var a = nbi();
		for (var i = 0; i < t; ++i) {
			a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
			var y = a.modPow(r, this);
			if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
				var j = 1;
				while (j++ < k && y.compareTo(n1) != 0) {
					y = y.modPowInt(2, this);
					if (y.compareTo(BigInteger.ONE) == 0) return false;
				}
				if (y.compareTo(n1) != 0) return false;
			}
		}
		return true;
	}
	BigInteger.prototype.chunkSize = bnpChunkSize;
	BigInteger.prototype.toRadix = bnpToRadix;
	BigInteger.prototype.fromRadix = bnpFromRadix;
	BigInteger.prototype.fromNumber = bnpFromNumber;
	BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
	BigInteger.prototype.changeBit = bnpChangeBit;
	BigInteger.prototype.addTo = bnpAddTo;
	BigInteger.prototype.dMultiply = bnpDMultiply;
	BigInteger.prototype.dAddOffset = bnpDAddOffset;
	BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
	BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
	BigInteger.prototype.modInt = bnpModInt;
	BigInteger.prototype.millerRabin = bnpMillerRabin;
	BigInteger.prototype.clone = bnClone;
	BigInteger.prototype.intValue = bnIntValue;
	BigInteger.prototype.byteValue = bnByteValue;
	BigInteger.prototype.shortValue = bnShortValue;
	BigInteger.prototype.signum = bnSigNum;
	BigInteger.prototype.toByteArray = bnToByteArray;
	BigInteger.prototype.equals = bnEquals;
	BigInteger.prototype.min = bnMin;
	BigInteger.prototype.max = bnMax;
	BigInteger.prototype.and = bnAnd;
	BigInteger.prototype.or = bnOr;
	BigInteger.prototype.xor = bnXor;
	BigInteger.prototype.andNot = bnAndNot;
	BigInteger.prototype.not = bnNot;
	BigInteger.prototype.shiftLeft = bnShiftLeft;
	BigInteger.prototype.shiftRight = bnShiftRight;
	BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
	BigInteger.prototype.bitCount = bnBitCount;
	BigInteger.prototype.testBit = bnTestBit;
	BigInteger.prototype.setBit = bnSetBit;
	BigInteger.prototype.clearBit = bnClearBit;
	BigInteger.prototype.flipBit = bnFlipBit;
	BigInteger.prototype.add = bnAdd;
	BigInteger.prototype.subtract = bnSubtract;
	BigInteger.prototype.multiply = bnMultiply;
	BigInteger.prototype.divide = bnDivide;
	BigInteger.prototype.remainder = bnRemainder;
	BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
	BigInteger.prototype.modPow = bnModPow;
	BigInteger.prototype.modInverse = bnModInverse;
	BigInteger.prototype.pow = bnPow;
	BigInteger.prototype.gcd = bnGCD;
	BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
	BigInteger.prototype.square = bnSquare;

	function Arcfour() {
		this.i = 0;
		this.j = 0;
		this.S = new Array();
	}

	function ARC4init(key) {
		var i, j, t;
		for (i = 0; i < 256; ++i)
			this.S[i] = i;
		j = 0;
		for (i = 0; i < 256; ++i) {
			j = (j + this.S[i] + key[i % key.length]) & 255;
			t = this.S[i];
			this.S[i] = this.S[j];
			this.S[j] = t;
		}
		this.i = 0;
		this.j = 0;
	}

	function ARC4next() {
		var t;
		this.i = (this.i + 1) & 255;
		this.j = (this.j + this.S[this.i]) & 255;
		t = this.S[this.i];
		this.S[this.i] = this.S[this.j];
		this.S[this.j] = t;
		return this.S[(t + this.S[this.i]) & 255];
	}
	Arcfour.prototype.init = ARC4init;
	Arcfour.prototype.next = ARC4next;

	function prng_newstate() {
		return new Arcfour();
	}
	var rng_psize = 256;
	var rng_state;
	var rng_pool;
	var rng_pptr;

	function rng_seed_int(x) {
		rng_pool[rng_pptr++] ^= x & 255;
		rng_pool[rng_pptr++] ^= (x >> 8) & 255;
		rng_pool[rng_pptr++] ^= (x >> 16) & 255;
		rng_pool[rng_pptr++] ^= (x >> 24) & 255;
		if (rng_pptr >= rng_psize) rng_pptr -= rng_psize;
	}

	function rng_seed_time() {
		rng_seed_int(new Date().getTime());
	}
	if (rng_pool == null) {
		rng_pool = new Array();
		rng_pptr = 0;
		var t;
		if (navigator.appName == "Netscape" && navigator.appVersion < "5" && window.crypto) {
			var z = window.crypto.random(32);
			for (t = 0; t < z.length; ++t)
				rng_pool[rng_pptr++] = z.charCodeAt(t) & 255;
		}
		while (rng_pptr < rng_psize) {
			t = Math.floor(65536 * Math.random());
			rng_pool[rng_pptr++] = t >>> 8;
			rng_pool[rng_pptr++] = t & 255;
		}
		rng_pptr = 0;
		rng_seed_time();
	}

	function rng_get_byte() {
		if (rng_state == null) {
			rng_seed_time();
			rng_state = prng_newstate();
			rng_state.init(rng_pool);
			for (rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
				rng_pool[rng_pptr] = 0;
			rng_pptr = 0;
		}
		return rng_state.next();
	}

	function rng_get_bytes(ba) {
		var i;
		for (i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
	}

	function SecureRandom() {}
	SecureRandom.prototype.nextBytes = rng_get_bytes;

	function parseBigInt(str, r) {
		return new BigInteger(str, r);
	}

	function linebrk(s, n) {
		var ret = "";
		var i = 0;
		while (i + n < s.length) {
			ret += s.substring(i, i + n) + "\n";
			i += n;
		}
		return ret + s.substring(i, s.length);
	}

	function byte2Hex(b) {
		if (b < 0x10)
			return "0" + b.toString(16);
		else
			return b.toString(16);
	}

	function pkcs1pad2(s, n) {
		if (n < s.length + 11) {
			console.error("Message too long for RSA");
			return null;
		}
		var ba = new Array();
		var i = s.length - 1;
		while (i >= 0 && n > 0) {
			var c = s.charCodeAt(i--);
			if (c < 128) {
				ba[--n] = c;
			} else if ((c > 127) && (c < 2048)) {
				ba[--n] = (c & 63) | 128;
				ba[--n] = (c >> 6) | 192;
			} else {
				ba[--n] = (c & 63) | 128;
				ba[--n] = ((c >> 6) & 63) | 128;
				ba[--n] = (c >> 12) | 224;
			}
		}
		ba[--n] = 0;
		var rng = new SecureRandom();
		var x = new Array();
		while (n > 2) {
			x[0] = 0;
			while (x[0] == 0) rng.nextBytes(x);
			ba[--n] = x[0];
		}
		ba[--n] = 2;
		ba[--n] = 0;
		return new BigInteger(ba);
	}

	function RSAKey() {
		this.n = null;
		this.e = 0;
		this.d = null;
		this.p = null;
		this.q = null;
		this.dmp1 = null;
		this.dmq1 = null;
		this.coeff = null;
	}

	function RSASetPublic(N, E) {
		if (N != null && E != null && N.length > 0 && E.length > 0) {
			this.n = parseBigInt(N, 16);
			this.e = parseInt(E, 16);
		} else
			console.error("Invalid RSA public key");
	}

	function RSADoPublic(x) {
		return x.modPowInt(this.e, this.n);
	}

	function RSAEncrypt(text) {
		var m = pkcs1pad2(text, (this.n.bitLength() + 7) >> 3);
		if (m == null) return null;
		var c = this.doPublic(m);
		if (c == null) return null;
		var h = c.toString(16);
		if ((h.length & 1) == 0) return h;
		else return "0" + h;
	}
	RSAKey.prototype.doPublic = RSADoPublic;
	RSAKey.prototype.setPublic = RSASetPublic;
	RSAKey.prototype.encrypt = RSAEncrypt;

	function pkcs1unpad2(d, n) {
		var b = d.toByteArray();
		var i = 0;
		while (i < b.length && b[i] == 0) ++i;
		if (b.length - i != n - 1 || b[i] != 2)
			return null;
		++i;
		while (b[i] != 0)
			if (++i >= b.length) return null;
		var ret = "";
		while (++i < b.length) {
			var c = b[i] & 255;
			if (c < 128) {
				ret += String.fromCharCode(c);
			} else if ((c > 191) && (c < 224)) {
				ret += String.fromCharCode(((c & 31) << 6) | (b[i + 1] & 63));
				++i;
			} else {
				ret += String.fromCharCode(((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63));
				i += 2;
			}
		}
		return ret;
	}

	function RSASetPrivate(N, E, D) {
		if (N != null && E != null && N.length > 0 && E.length > 0) {
			this.n = parseBigInt(N, 16);
			this.e = parseInt(E, 16);
			this.d = parseBigInt(D, 16);
		} else
			console.error("Invalid RSA private key");
	}

	function RSASetPrivateEx(N, E, D, P, Q, DP, DQ, C) {
		if (N != null && E != null && N.length > 0 && E.length > 0) {
			this.n = parseBigInt(N, 16);
			this.e = parseInt(E, 16);
			this.d = parseBigInt(D, 16);
			this.p = parseBigInt(P, 16);
			this.q = parseBigInt(Q, 16);
			this.dmp1 = parseBigInt(DP, 16);
			this.dmq1 = parseBigInt(DQ, 16);
			this.coeff = parseBigInt(C, 16);
		} else
			console.error("Invalid RSA private key");
	}

	function RSAGenerate(B, E) {
		var rng = new SecureRandom();
		var qs = B >> 1;
		this.e = parseInt(E, 16);
		var ee = new BigInteger(E, 16);
		for (;;) {
			for (;;) {
				this.p = new BigInteger(B - qs, 1, rng);
				if (this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.p.isProbablePrime(10)) break;
			}
			for (;;) {
				this.q = new BigInteger(qs, 1, rng);
				if (this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.q.isProbablePrime(10)) break;
			}
			if (this.p.compareTo(this.q) <= 0) {
				var t = this.p;
				this.p = this.q;
				this.q = t;
			}
			var p1 = this.p.subtract(BigInteger.ONE);
			var q1 = this.q.subtract(BigInteger.ONE);
			var phi = p1.multiply(q1);
			if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
				this.n = this.p.multiply(this.q);
				this.d = ee.modInverse(phi);
				this.dmp1 = this.d.mod(p1);
				this.dmq1 = this.d.mod(q1);
				this.coeff = this.q.modInverse(this.p);
				break;
			}
		}
	}

	function RSADoPrivate(x) {
		if (this.p == null || this.q == null)
			return x.modPow(this.d, this.n);
		var xp = x.mod(this.p).modPow(this.dmp1, this.p);
		var xq = x.mod(this.q).modPow(this.dmq1, this.q);
		while (xp.compareTo(xq) < 0)
			xp = xp.add(this.p);
		return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
	}

	function RSADecrypt(ctext) {
		var c = parseBigInt(ctext, 16);
		var m = this.doPrivate(c);
		if (m == null) return null;
		return pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
	}
	RSAKey.prototype.doPrivate = RSADoPrivate;
	RSAKey.prototype.setPrivate = RSASetPrivate;
	RSAKey.prototype.setPrivateEx = RSASetPrivateEx;
	RSAKey.prototype.generate = RSAGenerate;
	RSAKey.prototype.decrypt = RSADecrypt;
	(function () {
		var RSAGenerateAsync = function (B, E, callback) {
			var rng = new SecureRandom();
			var qs = B >> 1;
			this.e = parseInt(E, 16);
			var ee = new BigInteger(E, 16);
			var rsa = this;
			var loop1 = function () {
				var loop4 = function () {
					if (rsa.p.compareTo(rsa.q) <= 0) {
						var t = rsa.p;
						rsa.p = rsa.q;
						rsa.q = t;
					}
					var p1 = rsa.p.subtract(BigInteger.ONE);
					var q1 = rsa.q.subtract(BigInteger.ONE);
					var phi = p1.multiply(q1);
					if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
						rsa.n = rsa.p.multiply(rsa.q);
						rsa.d = ee.modInverse(phi);
						rsa.dmp1 = rsa.d.mod(p1);
						rsa.dmq1 = rsa.d.mod(q1);
						rsa.coeff = rsa.q.modInverse(rsa.p);
						setTimeout(function () {
							callback()
						}, 0);
					} else {
						setTimeout(loop1, 0);
					}
				};
				var loop3 = function () {
					rsa.q = nbi();
					rsa.q.fromNumberAsync(qs, 1, rng, function () {
						rsa.q.subtract(BigInteger.ONE).gcda(ee, function (r) {
							if (r.compareTo(BigInteger.ONE) == 0 && rsa.q.isProbablePrime(10)) {
								setTimeout(loop4, 0);
							} else {
								setTimeout(loop3, 0);
							}
						});
					});
				};
				var loop2 = function () {
					rsa.p = nbi();
					rsa.p.fromNumberAsync(B - qs, 1, rng, function () {
						rsa.p.subtract(BigInteger.ONE).gcda(ee, function (r) {
							if (r.compareTo(BigInteger.ONE) == 0 && rsa.p.isProbablePrime(10)) {
								setTimeout(loop3, 0);
							} else {
								setTimeout(loop2, 0);
							}
						});
					});
				};
				setTimeout(loop2, 0);
			};
			setTimeout(loop1, 0);
		};
		RSAKey.prototype.generateAsync = RSAGenerateAsync;
		var bnGCDAsync = function (a, callback) {
			var x = (this.s < 0) ? this.negate() : this.clone();
			var y = (a.s < 0) ? a.negate() : a.clone();
			if (x.compareTo(y) < 0) {
				var t = x;
				x = y;
				y = t;
			}
			var i = x.getLowestSetBit(),
				g = y.getLowestSetBit();
			if (g < 0) {
				callback(x);
				return;
			}
			if (i < g) g = i;
			if (g > 0) {
				x.rShiftTo(g, x);
				y.rShiftTo(g, y);
			}
			var gcda1 = function () {
				if ((i = x.getLowestSetBit()) > 0) {
					x.rShiftTo(i, x);
				}
				if ((i = y.getLowestSetBit()) > 0) {
					y.rShiftTo(i, y);
				}
				if (x.compareTo(y) >= 0) {
					x.subTo(y, x);
					x.rShiftTo(1, x);
				} else {
					y.subTo(x, y);
					y.rShiftTo(1, y);
				}
				if (!(x.signum() > 0)) {
					if (g > 0) y.lShiftTo(g, y);
					setTimeout(function () {
						callback(y)
					}, 0);
				} else {
					setTimeout(gcda1, 0);
				}
			};
			setTimeout(gcda1, 10);
		};
		BigInteger.prototype.gcda = bnGCDAsync;
		var bnpFromNumberAsync = function (a, b, c, callback) {
			if ("number" == typeof b) {
				if (a < 2) {
					this.fromInt(1);
				} else {
					this.fromNumber(a, c);
					if (!this.testBit(a - 1)) {
						this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
					}
					if (this.isEven()) {
						this.dAddOffset(1, 0);
					}
					var bnp = this;
					var bnpfn1 = function () {
						bnp.dAddOffset(2, 0);
						if (bnp.bitLength() > a) bnp.subTo(BigInteger.ONE.shiftLeft(a - 1), bnp);
						if (bnp.isProbablePrime(b)) {
							setTimeout(function () {
								callback()
							}, 0);
						} else {
							setTimeout(bnpfn1, 0);
						}
					};
					setTimeout(bnpfn1, 0);
				}
			} else {
				var x = new Array(),
					t = a & 7;
				x.length = (a >> 3) + 1;
				b.nextBytes(x);
				if (t > 0) x[0] &= ((1 << t) - 1);
				else x[0] = 0;
				this.fromString(x, 256);
			}
		};
		BigInteger.prototype.fromNumberAsync = bnpFromNumberAsync;
	})();
	var b64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var b64pad = "=";

	function hex2b64(h) {
		var i;
		var c;
		var ret = "";
		for (i = 0; i + 3 <= h.length; i += 3) {
			c = parseInt(h.substring(i, i + 3), 16);
			ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63);
		}
		if (i + 1 == h.length) {
			c = parseInt(h.substring(i, i + 1), 16);
			ret += b64map.charAt(c << 2);
		} else if (i + 2 == h.length) {
			c = parseInt(h.substring(i, i + 2), 16);
			ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4);
		}
		while ((ret.length & 3) > 0) ret += b64pad;
		return ret;
	}

	function b64tohex(s) {
		var ret = ""
		var i;
		var k = 0;
		var slop;
		for (i = 0; i < s.length; ++i) {
			if (s.charAt(i) == b64pad) break;
			v = b64map.indexOf(s.charAt(i));
			if (v < 0) continue;
			if (k == 0) {
				ret += int2char(v >> 2);
				slop = v & 3;
				k = 1;
			} else if (k == 1) {
				ret += int2char((slop << 2) | (v >> 4));
				slop = v & 0xf;
				k = 2;
			} else if (k == 2) {
				ret += int2char(slop);
				ret += int2char(v >> 2);
				slop = v & 3;
				k = 3;
			} else {
				ret += int2char((slop << 2) | (v >> 4));
				ret += int2char(v & 0xf);
				k = 0;
			}
		}
		if (k == 1)
			ret += int2char(slop << 2);
		return ret;
	}

	function b64toBA(s) {
		var h = b64tohex(s);
		var i;
		var a = new Array();
		for (i = 0; 2 * i < h.length; ++i) {
			a[i] = parseInt(h.substring(2 * i, 2 * i + 2), 16);
		}
		return a;
	}
	var JSX = JSX || {};
	JSX.env = JSX.env || {};
	var L = JSX,
		OP = Object.prototype,
		FUNCTION_TOSTRING = '[object Function]',
		ADD = ["toString", "valueOf"];
	JSX.env.parseUA = function (agent) {
		var numberify = function (s) {
				var c = 0;
				return parseFloat(s.replace(/\./g, function () {
					return (c++ == 1) ? '' : '.';
				}));
			},
			nav = navigator,
			o = {
				ie: 0,
				opera: 0,
				gecko: 0,
				webkit: 0,
				chrome: 0,
				mobile: null,
				air: 0,
				ipad: 0,
				iphone: 0,
				ipod: 0,
				ios: null,
				android: 0,
				webos: 0,
				caja: nav && nav.cajaVersion,
				secure: false,
				os: null
			},
			ua = agent || (navigator && navigator.userAgent),
			loc = window && window.location,
			href = loc && loc.href,
			m;
		o.secure = href && (href.toLowerCase().indexOf("https") === 0);
		if (ua) {
			if ((/windows|win32/i).test(ua)) {
				o.os = 'windows';
			} else if ((/macintosh/i).test(ua)) {
				o.os = 'macintosh';
			} else if ((/rhino/i).test(ua)) {
				o.os = 'rhino';
			}
			if ((/KHTML/).test(ua)) {
				o.webkit = 1;
			}
			m = ua.match(/AppleWebKit\/([^\s]*)/);
			if (m && m[1]) {
				o.webkit = numberify(m[1]);
				if (/ Mobile\//.test(ua)) {
					o.mobile = 'Apple';
					m = ua.match(/OS ([^\s]*)/);
					if (m && m[1]) {
						m = numberify(m[1].replace('_', '.'));
					}
					o.ios = m;
					o.ipad = o.ipod = o.iphone = 0;
					m = ua.match(/iPad|iPod|iPhone/);
					if (m && m[0]) {
						o[m[0].toLowerCase()] = o.ios;
					}
				} else {
					m = ua.match(/NokiaN[^\/]*|Android \d\.\d|webOS\/\d\.\d/);
					if (m) {
						o.mobile = m[0];
					}
					if (/webOS/.test(ua)) {
						o.mobile = 'WebOS';
						m = ua.match(/webOS\/([^\s]*);/);
						if (m && m[1]) {
							o.webos = numberify(m[1]);
						}
					}
					if (/ Android/.test(ua)) {
						o.mobile = 'Android';
						m = ua.match(/Android ([^\s]*);/);
						if (m && m[1]) {
							o.android = numberify(m[1]);
						}
					}
				}
				m = ua.match(/Chrome\/([^\s]*)/);
				if (m && m[1]) {
					o.chrome = numberify(m[1]);
				} else {
					m = ua.match(/AdobeAIR\/([^\s]*)/);
					if (m) {
						o.air = m[0];
					}
				}
			}
			if (!o.webkit) {
				m = ua.match(/Opera[\s\/]([^\s]*)/);
				if (m && m[1]) {
					o.opera = numberify(m[1]);
					m = ua.match(/Version\/([^\s]*)/);
					if (m && m[1]) {
						o.opera = numberify(m[1]);
					}
					m = ua.match(/Opera Mini[^;]*/);
					if (m) {
						o.mobile = m[0];
					}
				} else {
					m = ua.match(/MSIE\s([^;]*)/);
					if (m && m[1]) {
						o.ie = numberify(m[1]);
					} else {
						m = ua.match(/Gecko\/([^\s]*)/);
						if (m) {
							o.gecko = 1;
							m = ua.match(/rv:([^\s\)]*)/);
							if (m && m[1]) {
								o.gecko = numberify(m[1]);
							}
						}
					}
				}
			}
		}
		return o;
	};
	JSX.env.ua = JSX.env.parseUA();
	JSX.isFunction = function (o) {
		return (typeof o === 'function') || OP.toString.apply(o) === FUNCTION_TOSTRING;
	};
	JSX._IEEnumFix = (JSX.env.ua.ie) ? function (r, s) {
		var i, fname, f;
		for (i = 0; i < ADD.length; i = i + 1) {
			fname = ADD[i];
			f = s[fname];
			if (L.isFunction(f) && f != OP[fname]) {
				r[fname] = f;
			}
		}
	} : function () {};
	JSX.extend = function (subc, superc, overrides) {
		if (!superc || !subc) {
			throw new Error("extend failed, please check that " + "all dependencies are included.");
		}
		var F = function () {},
			i;
		F.prototype = superc.prototype;
		subc.prototype = new F();
		subc.prototype.constructor = subc;
		subc.superclass = superc.prototype;
		if (superc.prototype.constructor == OP.constructor) {
			superc.prototype.constructor = superc;
		}
		if (overrides) {
			for (i in overrides) {
				if (L.hasOwnProperty(overrides, i)) {
					subc.prototype[i] = overrides[i];
				}
			}
			L._IEEnumFix(subc.prototype, overrides);
		}
	};
	if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
	if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};
	KJUR.asn1.ASN1Util = new function () {
		this.integerToByteHex = function (i) {
			var h = i.toString(16);
			if ((h.length % 2) == 1) h = '0' + h;
			return h;
		};
		this.bigIntToMinTwosComplementsHex = function (bigIntegerValue) {
			var h = bigIntegerValue.toString(16);
			if (h.substr(0, 1) != '-') {
				if (h.length % 2 == 1) {
					h = '0' + h;
				} else {
					if (!h.match(/^[0-7]/)) {
						h = '00' + h;
					}
				}
			} else {
				var hPos = h.substr(1);
				var xorLen = hPos.length;
				if (xorLen % 2 == 1) {
					xorLen += 1;
				} else {
					if (!h.match(/^[0-7]/)) {
						xorLen += 2;
					}
				}
				var hMask = '';
				for (var i = 0; i < xorLen; i++) {
					hMask += 'f';
				}
				var biMask = new BigInteger(hMask, 16);
				var biNeg = biMask.xor(bigIntegerValue).add(BigInteger.ONE);
				h = biNeg.toString(16).replace(/^-/, '');
			}
			return h;
		};
		this.getPEMStringFromHex = function (dataHex, pemHeader) {
			var dataWA = CryptoJS.enc.Hex.parse(dataHex);
			var dataB64 = CryptoJS.enc.Base64.stringify(dataWA);
			var pemBody = dataB64.replace(/(.{64})/g, "$1\r\n");
			pemBody = pemBody.replace(/\r\n$/, '');
			return "-----BEGIN " + pemHeader + "-----\r\n" +
				pemBody + "\r\n-----END " + pemHeader + "-----\r\n";
		};
	};
	KJUR.asn1.ASN1Object = function () {
		var isModified = true;
		var hTLV = null;
		var hT = '00'
		var hL = '00';
		var hV = '';
		this.getLengthHexFromValue = function () {
			if (typeof this.hV == "undefined" || this.hV == null) {
				throw "this.hV is null or undefined.";
			}
			if (this.hV.length % 2 == 1) {
				throw "value hex must be even length: n=" + hV.length + ",v=" + this.hV;
			}
			var n = this.hV.length / 2;
			var hN = n.toString(16);
			if (hN.length % 2 == 1) {
				hN = "0" + hN;
			}
			if (n < 128) {
				return hN;
			} else {
				var hNlen = hN.length / 2;
				if (hNlen > 15) {
					throw "ASN.1 length too long to represent by 8x: n = " + n.toString(16);
				}
				var head = 128 + hNlen;
				return head.toString(16) + hN;
			}
		};
		this.getEncodedHex = function () {
			if (this.hTLV == null || this.isModified) {
				this.hV = this.getFreshValueHex();
				this.hL = this.getLengthHexFromValue();
				this.hTLV = this.hT + this.hL + this.hV;
				this.isModified = false;
			}
			return this.hTLV;
		};
		this.getValueHex = function () {
			this.getEncodedHex();
			return this.hV;
		}
		this.getFreshValueHex = function () {
			return '';
		};
	};
	KJUR.asn1.DERAbstractString = function (params) {
		KJUR.asn1.DERAbstractString.superclass.constructor.call(this);
		var s = null;
		var hV = null;
		this.getString = function () {
			return this.s;
		};
		this.setString = function (newS) {
			this.hTLV = null;
			this.isModified = true;
			this.s = newS;
			this.hV = stohex(this.s);
		};
		this.setStringHex = function (newHexString) {
			this.hTLV = null;
			this.isModified = true;
			this.s = null;
			this.hV = newHexString;
		};
		this.getFreshValueHex = function () {
			return this.hV;
		};
		if (typeof params != "undefined") {
			if (typeof params['str'] != "undefined") {
				this.setString(params['str']);
			} else if (typeof params['hex'] != "undefined") {
				this.setStringHex(params['hex']);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERAbstractString, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERAbstractTime = function (params) {
		KJUR.asn1.DERAbstractTime.superclass.constructor.call(this);
		var s = null;
		var date = null;
		this.localDateToUTC = function (d) {
			utc = d.getTime() + (d.getTimezoneOffset() * 60000);
			var utcDate = new Date(utc);
			return utcDate;
		};
		this.formatDate = function (dateObject, type) {
			var pad = this.zeroPadding;
			var d = this.localDateToUTC(dateObject);
			var year = String(d.getFullYear());
			if (type == 'utc') year = year.substr(2, 2);
			var month = pad(String(d.getMonth() + 1), 2);
			var day = pad(String(d.getDate()), 2);
			var hour = pad(String(d.getHours()), 2);
			var min = pad(String(d.getMinutes()), 2);
			var sec = pad(String(d.getSeconds()), 2);
			return year + month + day + hour + min + sec + 'Z';
		};
		this.zeroPadding = function (s, len) {
			if (s.length >= len) return s;
			return new Array(len - s.length + 1).join('0') + s;
		};
		this.getString = function () {
			return this.s;
		};
		this.setString = function (newS) {
			this.hTLV = null;
			this.isModified = true;
			this.s = newS;
			this.hV = stohex(this.s);
		};
		this.setByDateValue = function (year, month, day, hour, min, sec) {
			var dateObject = new Date(Date.UTC(year, month - 1, day, hour, min, sec, 0));
			this.setByDate(dateObject);
		};
		this.getFreshValueHex = function () {
			return this.hV;
		};
	};
	JSX.extend(KJUR.asn1.DERAbstractTime, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERAbstractStructured = function (params) {
		KJUR.asn1.DERAbstractString.superclass.constructor.call(this);
		var asn1Array = null;
		this.setByASN1ObjectArray = function (asn1ObjectArray) {
			this.hTLV = null;
			this.isModified = true;
			this.asn1Array = asn1ObjectArray;
		};
		this.appendASN1Object = function (asn1Object) {
			this.hTLV = null;
			this.isModified = true;
			this.asn1Array.push(asn1Object);
		};
		this.asn1Array = new Array();
		if (typeof params != "undefined") {
			if (typeof params['array'] != "undefined") {
				this.asn1Array = params['array'];
			}
		}
	};
	JSX.extend(KJUR.asn1.DERAbstractStructured, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERBoolean = function () {
		KJUR.asn1.DERBoolean.superclass.constructor.call(this);
		this.hT = "01";
		this.hTLV = "0101ff";
	};
	JSX.extend(KJUR.asn1.DERBoolean, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERInteger = function (params) {
		KJUR.asn1.DERInteger.superclass.constructor.call(this);
		this.hT = "02";
		this.setByBigInteger = function (bigIntegerValue) {
			this.hTLV = null;
			this.isModified = true;
			this.hV = KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(bigIntegerValue);
		};
		this.setByInteger = function (intValue) {
			var bi = new BigInteger(String(intValue), 10);
			this.setByBigInteger(bi);
		};
		this.setValueHex = function (newHexString) {
			this.hV = newHexString;
		};
		this.getFreshValueHex = function () {
			return this.hV;
		};
		if (typeof params != "undefined") {
			if (typeof params['bigint'] != "undefined") {
				this.setByBigInteger(params['bigint']);
			} else if (typeof params['int'] != "undefined") {
				this.setByInteger(params['int']);
			} else if (typeof params['hex'] != "undefined") {
				this.setValueHex(params['hex']);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERInteger, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERBitString = function (params) {
		KJUR.asn1.DERBitString.superclass.constructor.call(this);
		this.hT = "03";
		this.setHexValueIncludingUnusedBits = function (newHexStringIncludingUnusedBits) {
			this.hTLV = null;
			this.isModified = true;
			this.hV = newHexStringIncludingUnusedBits;
		};
		this.setUnusedBitsAndHexValue = function (unusedBits, hValue) {
			if (unusedBits < 0 || 7 < unusedBits) {
				throw "unused bits shall be from 0 to 7: u = " + unusedBits;
			}
			var hUnusedBits = "0" + unusedBits;
			this.hTLV = null;
			this.isModified = true;
			this.hV = hUnusedBits + hValue;
		};
		this.setByBinaryString = function (binaryString) {
			binaryString = binaryString.replace(/0+$/, '');
			var unusedBits = 8 - binaryString.length % 8;
			if (unusedBits == 8) unusedBits = 0;
			for (var i = 0; i <= unusedBits; i++) {
				binaryString += '0';
			}
			var h = '';
			for (var i = 0; i < binaryString.length - 1; i += 8) {
				var b = binaryString.substr(i, 8);
				var x = parseInt(b, 2).toString(16);
				if (x.length == 1) x = '0' + x;
				h += x;
			}
			this.hTLV = null;
			this.isModified = true;
			this.hV = '0' + unusedBits + h;
		};
		this.setByBooleanArray = function (booleanArray) {
			var s = '';
			for (var i = 0; i < booleanArray.length; i++) {
				if (booleanArray[i] == true) {
					s += '1';
				} else {
					s += '0';
				}
			}
			this.setByBinaryString(s);
		};
		this.newFalseArray = function (nLength) {
			var a = new Array(nLength);
			for (var i = 0; i < nLength; i++) {
				a[i] = false;
			}
			return a;
		};
		this.getFreshValueHex = function () {
			return this.hV;
		};
		if (typeof params != "undefined") {
			if (typeof params['hex'] != "undefined") {
				this.setHexValueIncludingUnusedBits(params['hex']);
			} else if (typeof params['bin'] != "undefined") {
				this.setByBinaryString(params['bin']);
			} else if (typeof params['array'] != "undefined") {
				this.setByBooleanArray(params['array']);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERBitString, KJUR.asn1.ASN1Object);
	KJUR.asn1.DEROctetString = function (params) {
		KJUR.asn1.DEROctetString.superclass.constructor.call(this, params);
		this.hT = "04";
	};
	JSX.extend(KJUR.asn1.DEROctetString, KJUR.asn1.DERAbstractString);
	KJUR.asn1.DERNull = function () {
		KJUR.asn1.DERNull.superclass.constructor.call(this);
		this.hT = "05";
		this.hTLV = "0500";
	};
	JSX.extend(KJUR.asn1.DERNull, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERObjectIdentifier = function (params) {
		var itox = function (i) {
			var h = i.toString(16);
			if (h.length == 1) h = '0' + h;
			return h;
		};
		var roidtox = function (roid) {
			var h = '';
			var bi = new BigInteger(roid, 10);
			var b = bi.toString(2);
			var padLen = 7 - b.length % 7;
			if (padLen == 7) padLen = 0;
			var bPad = '';
			for (var i = 0; i < padLen; i++) bPad += '0';
			b = bPad + b;
			for (var i = 0; i < b.length - 1; i += 7) {
				var b8 = b.substr(i, 7);
				if (i != b.length - 7) b8 = '1' + b8;
				h += itox(parseInt(b8, 2));
			}
			return h;
		}
		KJUR.asn1.DERObjectIdentifier.superclass.constructor.call(this);
		this.hT = "06";
		this.setValueHex = function (newHexString) {
			this.hTLV = null;
			this.isModified = true;
			this.s = null;
			this.hV = newHexString;
		};
		this.setValueOidString = function (oidString) {
			if (!oidString.match(/^[0-9.]+$/)) {
				throw "malformed oid string: " + oidString;
			}
			var h = '';
			var a = oidString.split('.');
			var i0 = parseInt(a[0]) * 40 + parseInt(a[1]);
			h += itox(i0);
			a.splice(0, 2);
			for (var i = 0; i < a.length; i++) {
				h += roidtox(a[i]);
			}
			this.hTLV = null;
			this.isModified = true;
			this.s = null;
			this.hV = h;
		};
		this.setValueName = function (oidName) {
			if (typeof KJUR.asn1.x509.OID.name2oidList[oidName] != "undefined") {
				var oid = KJUR.asn1.x509.OID.name2oidList[oidName];
				this.setValueOidString(oid);
			} else {
				throw "DERObjectIdentifier oidName undefined: " + oidName;
			}
		};
		this.getFreshValueHex = function () {
			return this.hV;
		};
		if (typeof params != "undefined") {
			if (typeof params['oid'] != "undefined") {
				this.setValueOidString(params['oid']);
			} else if (typeof params['hex'] != "undefined") {
				this.setValueHex(params['hex']);
			} else if (typeof params['name'] != "undefined") {
				this.setValueName(params['name']);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERObjectIdentifier, KJUR.asn1.ASN1Object);
	KJUR.asn1.DERUTF8String = function (params) {
		KJUR.asn1.DERUTF8String.superclass.constructor.call(this, params);
		this.hT = "0c";
	};
	JSX.extend(KJUR.asn1.DERUTF8String, KJUR.asn1.DERAbstractString);
	KJUR.asn1.DERNumericString = function (params) {
		KJUR.asn1.DERNumericString.superclass.constructor.call(this, params);
		this.hT = "12";
	};
	JSX.extend(KJUR.asn1.DERNumericString, KJUR.asn1.DERAbstractString);
	KJUR.asn1.DERPrintableString = function (params) {
		KJUR.asn1.DERPrintableString.superclass.constructor.call(this, params);
		this.hT = "13";
	};
	JSX.extend(KJUR.asn1.DERPrintableString, KJUR.asn1.DERAbstractString);
	KJUR.asn1.DERTeletexString = function (params) {
		KJUR.asn1.DERTeletexString.superclass.constructor.call(this, params);
		this.hT = "14";
	};
	JSX.extend(KJUR.asn1.DERTeletexString, KJUR.asn1.DERAbstractString);
	KJUR.asn1.DERIA5String = function (params) {
		KJUR.asn1.DERIA5String.superclass.constructor.call(this, params);
		this.hT = "16";
	};
	JSX.extend(KJUR.asn1.DERIA5String, KJUR.asn1.DERAbstractString);
	KJUR.asn1.DERUTCTime = function (params) {
		KJUR.asn1.DERUTCTime.superclass.constructor.call(this, params);
		this.hT = "17";
		this.setByDate = function (dateObject) {
			this.hTLV = null;
			this.isModified = true;
			this.date = dateObject;
			this.s = this.formatDate(this.date, 'utc');
			this.hV = stohex(this.s);
		};
		if (typeof params != "undefined") {
			if (typeof params['str'] != "undefined") {
				this.setString(params['str']);
			} else if (typeof params['hex'] != "undefined") {
				this.setStringHex(params['hex']);
			} else if (typeof params['date'] != "undefined") {
				this.setByDate(params['date']);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERUTCTime, KJUR.asn1.DERAbstractTime);
	KJUR.asn1.DERGeneralizedTime = function (params) {
		KJUR.asn1.DERGeneralizedTime.superclass.constructor.call(this, params);
		this.hT = "18";
		this.setByDate = function (dateObject) {
			this.hTLV = null;
			this.isModified = true;
			this.date = dateObject;
			this.s = this.formatDate(this.date, 'gen');
			this.hV = stohex(this.s);
		};
		if (typeof params != "undefined") {
			if (typeof params['str'] != "undefined") {
				this.setString(params['str']);
			} else if (typeof params['hex'] != "undefined") {
				this.setStringHex(params['hex']);
			} else if (typeof params['date'] != "undefined") {
				this.setByDate(params['date']);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERGeneralizedTime, KJUR.asn1.DERAbstractTime);
	KJUR.asn1.DERSequence = function (params) {
		KJUR.asn1.DERSequence.superclass.constructor.call(this, params);
		this.hT = "30";
		this.getFreshValueHex = function () {
			var h = '';
			for (var i = 0; i < this.asn1Array.length; i++) {
				var asn1Obj = this.asn1Array[i];
				h += asn1Obj.getEncodedHex();
			}
			this.hV = h;
			return this.hV;
		};
	};
	JSX.extend(KJUR.asn1.DERSequence, KJUR.asn1.DERAbstractStructured);
	KJUR.asn1.DERSet = function (params) {
		KJUR.asn1.DERSet.superclass.constructor.call(this, params);
		this.hT = "31";
		this.getFreshValueHex = function () {
			var a = new Array();
			for (var i = 0; i < this.asn1Array.length; i++) {
				var asn1Obj = this.asn1Array[i];
				a.push(asn1Obj.getEncodedHex());
			}
			a.sort();
			this.hV = a.join('');
			return this.hV;
		};
	};
	JSX.extend(KJUR.asn1.DERSet, KJUR.asn1.DERAbstractStructured);
	KJUR.asn1.DERTaggedObject = function (params) {
		KJUR.asn1.DERTaggedObject.superclass.constructor.call(this);
		this.hT = "a0";
		this.hV = '';
		this.isExplicit = true;
		this.asn1Object = null;
		this.setASN1Object = function (isExplicitFlag, tagNoHex, asn1Object) {
			this.hT = tagNoHex;
			this.isExplicit = isExplicitFlag;
			this.asn1Object = asn1Object;
			if (this.isExplicit) {
				this.hV = this.asn1Object.getEncodedHex();
				this.hTLV = null;
				this.isModified = true;
			} else {
				this.hV = null;
				this.hTLV = asn1Object.getEncodedHex();
				this.hTLV = this.hTLV.replace(/^../, tagNoHex);
				this.isModified = false;
			}
		};
		this.getFreshValueHex = function () {
			return this.hV;
		};
		if (typeof params != "undefined") {
			if (typeof params['tag'] != "undefined") {
				this.hT = params['tag'];
			}
			if (typeof params['explicit'] != "undefined") {
				this.isExplicit = params['explicit'];
			}
			if (typeof params['obj'] != "undefined") {
				this.asn1Object = params['obj'];
				this.setASN1Object(this.isExplicit, this.hT, this.asn1Object);
			}
		}
	};
	JSX.extend(KJUR.asn1.DERTaggedObject, KJUR.asn1.ASN1Object);
	(function (undefined) {
		"use strict";
		var Hex = {},
			decoder;
		Hex.decode = function (a) {
			var i;
			if (decoder === undefined) {
				var hex = "0123456789ABCDEF",
					ignore = " \f\n\r\t\u00A0\u2028\u2029";
				decoder = [];
				for (i = 0; i < 16; ++i)
					decoder[hex.charAt(i)] = i;
				hex = hex.toLowerCase();
				for (i = 10; i < 16; ++i)
					decoder[hex.charAt(i)] = i;
				for (i = 0; i < ignore.length; ++i)
					decoder[ignore.charAt(i)] = -1;
			}
			var out = [],
				bits = 0,
				char_count = 0;
			for (i = 0; i < a.length; ++i) {
				var c = a.charAt(i);
				if (c == '=')
					break;
				c = decoder[c];
				if (c == -1)
					continue;
				if (c === undefined)
					throw 'Illegal character at offset ' + i;
				bits |= c;
				if (++char_count >= 2) {
					out[out.length] = bits;
					bits = 0;
					char_count = 0;
				} else {
					bits <<= 4;
				}
			}
			if (char_count)
				throw "Hex encoding incomplete: 4 bits missing";
			return out;
		};
		window.Hex = Hex;
	})();
	(function (undefined) {
		"use strict";
		var Base64 = {},
			decoder;
		Base64.decode = function (a) {
			var i;
			if (decoder === undefined) {
				var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
					ignore = "= \f\n\r\t\u00A0\u2028\u2029";
				decoder = [];
				for (i = 0; i < 64; ++i)
					decoder[b64.charAt(i)] = i;
				for (i = 0; i < ignore.length; ++i)
					decoder[ignore.charAt(i)] = -1;
			}
			var out = [];
			var bits = 0,
				char_count = 0;
			for (i = 0; i < a.length; ++i) {
				var c = a.charAt(i);
				if (c == '=')
					break;
				c = decoder[c];
				if (c == -1)
					continue;
				if (c === undefined)
					throw 'Illegal character at offset ' + i;
				bits |= c;
				if (++char_count >= 4) {
					out[out.length] = (bits >> 16);
					out[out.length] = (bits >> 8) & 0xFF;
					out[out.length] = bits & 0xFF;
					bits = 0;
					char_count = 0;
				} else {
					bits <<= 6;
				}
			}
			switch (char_count) {
				case 1:
					throw "Base64 encoding incomplete: at least 2 bits missing";
				case 2:
					out[out.length] = (bits >> 10);
					break;
				case 3:
					out[out.length] = (bits >> 16);
					out[out.length] = (bits >> 8) & 0xFF;
					break;
			}
			return out;
		};
		Base64.re = /-----BEGIN [^-]+-----([A-Za-z0-9+\/=\s]+)-----END [^-]+-----|begin-base64[^\n]+\n([A-Za-z0-9+\/=\s]+)====/;
		Base64.unarmor = function (a) {
			var m = Base64.re.exec(a);
			if (m) {
				if (m[1])
					a = m[1];
				else if (m[2])
					a = m[2];
				else
					throw "RegExp out of sync";
			}
			return Base64.decode(a);
		};
		window.Base64 = Base64;
	})();
	(function (undefined) {
		"use strict";
		var hardLimit = 100,
			ellipsis = "\u2026",
			DOM = {
				tag: function (tagName, className) {
					var t = document.createElement(tagName);
					t.className = className;
					return t;
				},
				text: function (str) {
					return document.createTextNode(str);
				}
			};

		function Stream(enc, pos) {
			if (enc instanceof Stream) {
				this.enc = enc.enc;
				this.pos = enc.pos;
			} else {
				this.enc = enc;
				this.pos = pos;
			}
		}
		Stream.prototype.get = function (pos) {
			if (pos === undefined)
				pos = this.pos++;
			if (pos >= this.enc.length)
				throw 'Requesting byte offset ' + pos + ' on a stream of length ' + this.enc.length;
			return this.enc[pos];
		};
		Stream.prototype.hexDigits = "0123456789ABCDEF";
		Stream.prototype.hexByte = function (b) {
			return this.hexDigits.charAt((b >> 4) & 0xF) + this.hexDigits.charAt(b & 0xF);
		};
		Stream.prototype.hexDump = function (start, end, raw) {
			var s = "";
			for (var i = start; i < end; ++i) {
				s += this.hexByte(this.get(i));
				if (raw !== true)
					switch (i & 0xF) {
						case 0x7:
							s += "  ";
							break;
						case 0xF:
							s += "\n";
							break;
						default:
							s += " ";
					}
			}
			return s;
		};
		Stream.prototype.parseStringISO = function (start, end) {
			var s = "";
			for (var i = start; i < end; ++i)
				s += String.fromCharCode(this.get(i));
			return s;
		};
		Stream.prototype.parseStringUTF = function (start, end) {
			var s = "";
			for (var i = start; i < end;) {
				var c = this.get(i++);
				if (c < 128)
					s += String.fromCharCode(c);
				else if ((c > 191) && (c < 224))
					s += String.fromCharCode(((c & 0x1F) << 6) | (this.get(i++) & 0x3F));
				else
					s += String.fromCharCode(((c & 0x0F) << 12) | ((this.get(i++) & 0x3F) << 6) | (this.get(i++) & 0x3F));
			}
			return s;
		};
		Stream.prototype.parseStringBMP = function (start, end) {
			var str = ""
			for (var i = start; i < end; i += 2) {
				var high_byte = this.get(i);
				var low_byte = this.get(i + 1);
				str += String.fromCharCode((high_byte << 8) + low_byte);
			}
			return str;
		};
		Stream.prototype.reTime = /^((?:1[89]|2\d)?\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
		Stream.prototype.parseTime = function (start, end) {
			var s = this.parseStringISO(start, end),
				m = this.reTime.exec(s);
			if (!m)
				return "Unrecognized time: " + s;
			s = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4];
			if (m[5]) {
				s += ":" + m[5];
				if (m[6]) {
					s += ":" + m[6];
					if (m[7])
						s += "." + m[7];
				}
			}
			if (m[8]) {
				s += " UTC";
				if (m[8] != 'Z') {
					s += m[8];
					if (m[9])
						s += ":" + m[9];
				}
			}
			return s;
		};
		Stream.prototype.parseInteger = function (start, end) {
			var len = end - start;
			if (len > 4) {
				len <<= 3;
				var s = this.get(start);
				if (s === 0)
					len -= 8;
				else
					while (s < 128) {
						s <<= 1;
						--len;
					}
				return "(" + len + " bit)";
			}
			var n = 0;
			for (var i = start; i < end; ++i)
				n = (n << 8) | this.get(i);
			return n;
		};
		Stream.prototype.parseBitString = function (start, end) {
			var unusedBit = this.get(start),
				lenBit = ((end - start - 1) << 3) - unusedBit,
				s = "(" + lenBit + " bit)";
			if (lenBit <= 20) {
				var skip = unusedBit;
				s += " ";
				for (var i = end - 1; i > start; --i) {
					var b = this.get(i);
					for (var j = skip; j < 8; ++j)
						s += (b >> j) & 1 ? "1" : "0";
					skip = 0;
				}
			}
			return s;
		};
		Stream.prototype.parseOctetString = function (start, end) {
			var len = end - start,
				s = "(" + len + " byte) ";
			if (len > hardLimit)
				end = start + hardLimit;
			for (var i = start; i < end; ++i)
				s += this.hexByte(this.get(i));
			if (len > hardLimit)
				s += ellipsis;
			return s;
		};
		Stream.prototype.parseOID = function (start, end) {
			var s = '',
				n = 0,
				bits = 0;
			for (var i = start; i < end; ++i) {
				var v = this.get(i);
				n = (n << 7) | (v & 0x7F);
				bits += 7;
				if (!(v & 0x80)) {
					if (s === '') {
						var m = n < 80 ? n < 40 ? 0 : 1 : 2;
						s = m + "." + (n - m * 40);
					} else
						s += "." + ((bits >= 31) ? "bigint" : n);
					n = bits = 0;
				}
			}
			return s;
		};

		function ASN1(stream, header, length, tag, sub) {
			this.stream = stream;
			this.header = header;
			this.length = length;
			this.tag = tag;
			this.sub = sub;
		}
		ASN1.prototype.typeName = function () {
			if (this.tag === undefined)
				return "unknown";
			var tagClass = this.tag >> 6,
				tagConstructed = (this.tag >> 5) & 1,
				tagNumber = this.tag & 0x1F;
			switch (tagClass) {
				case 0:
					switch (tagNumber) {
						case 0x00:
							return "EOC";
						case 0x01:
							return "BOOLEAN";
						case 0x02:
							return "INTEGER";
						case 0x03:
							return "BIT_STRING";
						case 0x04:
							return "OCTET_STRING";
						case 0x05:
							return "NULL";
						case 0x06:
							return "OBJECT_IDENTIFIER";
						case 0x07:
							return "ObjectDescriptor";
						case 0x08:
							return "EXTERNAL";
						case 0x09:
							return "REAL";
						case 0x0A:
							return "ENUMERATED";
						case 0x0B:
							return "EMBEDDED_PDV";
						case 0x0C:
							return "UTF8String";
						case 0x10:
							return "SEQUENCE";
						case 0x11:
							return "SET";
						case 0x12:
							return "NumericString";
						case 0x13:
							return "PrintableString";
						case 0x14:
							return "TeletexString";
						case 0x15:
							return "VideotexString";
						case 0x16:
							return "IA5String";
						case 0x17:
							return "UTCTime";
						case 0x18:
							return "GeneralizedTime";
						case 0x19:
							return "GraphicString";
						case 0x1A:
							return "VisibleString";
						case 0x1B:
							return "GeneralString";
						case 0x1C:
							return "UniversalString";
						case 0x1E:
							return "BMPString";
						default:
							return "Universal_" + tagNumber.toString(16);
					}
				case 1:
					return "Application_" + tagNumber.toString(16);
				case 2:
					return "[" + tagNumber + "]";
				case 3:
					return "Private_" + tagNumber.toString(16);
			}
		};
		ASN1.prototype.reSeemsASCII = /^[ -~]+$/;
		ASN1.prototype.content = function () {
			if (this.tag === undefined)
				return null;
			var tagClass = this.tag >> 6,
				tagNumber = this.tag & 0x1F,
				content = this.posContent(),
				len = Math.abs(this.length);
			if (tagClass !== 0) {
				if (this.sub !== null)
					return "(" + this.sub.length + " elem)";
				var s = this.stream.parseStringISO(content, content + Math.min(len, hardLimit));
				if (this.reSeemsASCII.test(s))
					return s.substring(0, 2 * hardLimit) + ((s.length > 2 * hardLimit) ? ellipsis : "");
				else
					return this.stream.parseOctetString(content, content + len);
			}
			switch (tagNumber) {
				case 0x01:
					return (this.stream.get(content) === 0) ? "false" : "true";
				case 0x02:
					return this.stream.parseInteger(content, content + len);
				case 0x03:
					return this.sub ? "(" + this.sub.length + " elem)" : this.stream.parseBitString(content, content + len);
				case 0x04:
					return this.sub ? "(" + this.sub.length + " elem)" : this.stream.parseOctetString(content, content + len);
				case 0x06:
					return this.stream.parseOID(content, content + len);
				case 0x10:
				case 0x11:
					return "(" + this.sub.length + " elem)";
				case 0x0C:
					return this.stream.parseStringUTF(content, content + len);
				case 0x12:
				case 0x13:
				case 0x14:
				case 0x15:
				case 0x16:
				case 0x1A:
					return this.stream.parseStringISO(content, content + len);
				case 0x1E:
					return this.stream.parseStringBMP(content, content + len);
				case 0x17:
				case 0x18:
					return this.stream.parseTime(content, content + len);
			}
			return null;
		};
		ASN1.prototype.toString = function () {
			return this.typeName() + "@" + this.stream.pos + "[header:" + this.header + ",length:" + this.length + ",sub:" + ((this.sub === null) ? 'null' : this.sub.length) + "]";
		};
		ASN1.prototype.print = function (indent) {
			if (indent === undefined) indent = '';
			document.writeln(indent + this);
			if (this.sub !== null) {
				indent += '  ';
				for (var i = 0, max = this.sub.length; i < max; ++i)
					this.sub[i].print(indent);
			}
		};
		ASN1.prototype.toPrettyString = function (indent) {
			if (indent === undefined) indent = '';
			var s = indent + this.typeName() + " @" + this.stream.pos;
			if (this.length >= 0)
				s += "+";
			s += this.length;
			if (this.tag & 0x20)
				s += " (constructed)";
			else if (((this.tag == 0x03) || (this.tag == 0x04)) && (this.sub !== null))
				s += " (encapsulates)";
			s += "\n";
			if (this.sub !== null) {
				indent += '  ';
				for (var i = 0, max = this.sub.length; i < max; ++i)
					s += this.sub[i].toPrettyString(indent);
			}
			return s;
		};
		ASN1.prototype.toDOM = function () {
			var node = DOM.tag("div", "node");
			node.asn1 = this;
			var head = DOM.tag("div", "head");
			var s = this.typeName().replace(/_/g, " ");
			head.innerHTML = s;
			var content = this.content();
			if (content !== null) {
				content = String(content).replace(/</g, "<");
				var preview = DOM.tag("span", "preview");
				preview.appendChild(DOM.text(content));
				head.appendChild(preview);
			}
			node.appendChild(head);
			this.node = node;
			this.head = head;
			var value = DOM.tag("div", "value");
			s = "Offset: " + this.stream.pos + "<br/>";
			s += "Length: " + this.header + "+";
			if (this.length >= 0)
				s += this.length;
			else
				s += (-this.length) + " (undefined)";
			if (this.tag & 0x20)
				s += "<br/>(constructed)";
			else if (((this.tag == 0x03) || (this.tag == 0x04)) && (this.sub !== null))
				s += "<br/>(encapsulates)";
			if (content !== null) {
				s += "<br/>Value:<br/><b>" + content + "</b>";
				if ((typeof oids === 'object') && (this.tag == 0x06)) {
					var oid = oids[content];
					if (oid) {
						if (oid.d) s += "<br/>" + oid.d;
						if (oid.c) s += "<br/>" + oid.c;
						if (oid.w) s += "<br/>(warning!)";
					}
				}
			}
			value.innerHTML = s;
			node.appendChild(value);
			var sub = DOM.tag("div", "sub");
			if (this.sub !== null) {
				for (var i = 0, max = this.sub.length; i < max; ++i)
					sub.appendChild(this.sub[i].toDOM());
			}
			node.appendChild(sub);
			head.onclick = function () {
				node.className = (node.className == "node collapsed") ? "node" : "node collapsed";
			};
			return node;
		};
		ASN1.prototype.posStart = function () {
			return this.stream.pos;
		};
		ASN1.prototype.posContent = function () {
			return this.stream.pos + this.header;
		};
		ASN1.prototype.posEnd = function () {
			return this.stream.pos + this.header + Math.abs(this.length);
		};
		ASN1.prototype.fakeHover = function (current) {
			this.node.className += " hover";
			if (current)
				this.head.className += " hover";
		};
		ASN1.prototype.fakeOut = function (current) {
			var re = / ?hover/;
			this.node.className = this.node.className.replace(re, "");
			if (current)
				this.head.className = this.head.className.replace(re, "");
		};
		ASN1.prototype.toHexDOM_sub = function (node, className, stream, start, end) {
			if (start >= end)
				return;
			var sub = DOM.tag("span", className);
			sub.appendChild(DOM.text(stream.hexDump(start, end)));
			node.appendChild(sub);
		};
		ASN1.prototype.toHexDOM = function (root) {
			var node = DOM.tag("span", "hex");
			if (root === undefined) root = node;
			this.head.hexNode = node;
			this.head.onmouseover = function () {
				this.hexNode.className = "hexCurrent";
			};
			this.head.onmouseout = function () {
				this.hexNode.className = "hex";
			};
			node.asn1 = this;
			node.onmouseover = function () {
				var current = !root.selected;
				if (current) {
					root.selected = this.asn1;
					this.className = "hexCurrent";
				}
				this.asn1.fakeHover(current);
			};
			node.onmouseout = function () {
				var current = (root.selected == this.asn1);
				this.asn1.fakeOut(current);
				if (current) {
					root.selected = null;
					this.className = "hex";
				}
			};
			this.toHexDOM_sub(node, "tag", this.stream, this.posStart(), this.posStart() + 1);
			this.toHexDOM_sub(node, (this.length >= 0) ? "dlen" : "ulen", this.stream, this.posStart() + 1, this.posContent());
			if (this.sub === null)
				node.appendChild(DOM.text(this.stream.hexDump(this.posContent(), this.posEnd())));
			else if (this.sub.length > 0) {
				var first = this.sub[0];
				var last = this.sub[this.sub.length - 1];
				this.toHexDOM_sub(node, "intro", this.stream, this.posContent(), first.posStart());
				for (var i = 0, max = this.sub.length; i < max; ++i)
					node.appendChild(this.sub[i].toHexDOM(root));
				this.toHexDOM_sub(node, "outro", this.stream, last.posEnd(), this.posEnd());
			}
			return node;
		};
		ASN1.prototype.toHexString = function (root) {
			return this.stream.hexDump(this.posStart(), this.posEnd(), true);
		};
		ASN1.decodeLength = function (stream) {
			var buf = stream.get(),
				len = buf & 0x7F;
			if (len == buf)
				return len;
			if (len > 3)
				throw "Length over 24 bits not supported at position " + (stream.pos - 1);
			if (len === 0)
				return -1;
			buf = 0;
			for (var i = 0; i < len; ++i)
				buf = (buf << 8) | stream.get();
			return buf;
		};
		ASN1.hasContent = function (tag, len, stream) {
			if (tag & 0x20)
				return true;
			if ((tag < 0x03) || (tag > 0x04))
				return false;
			var p = new Stream(stream);
			if (tag == 0x03) p.get();
			var subTag = p.get();
			if ((subTag >> 6) & 0x01)
				return false;
			try {
				var subLength = ASN1.decodeLength(p);
				return ((p.pos - stream.pos) + subLength == len);
			} catch (exception) {
				return false;
			}
		};
		ASN1.decode = function (stream) {
			if (!(stream instanceof Stream))
				stream = new Stream(stream, 0);
			var streamStart = new Stream(stream),
				tag = stream.get(),
				len = ASN1.decodeLength(stream),
				header = stream.pos - streamStart.pos,
				sub = null;
			if (ASN1.hasContent(tag, len, stream)) {
				var start = stream.pos;
				if (tag == 0x03) stream.get();
				sub = [];
				if (len >= 0) {
					var end = start + len;
					while (stream.pos < end)
						sub[sub.length] = ASN1.decode(stream);
					if (stream.pos != end)
						throw "Content size is not correct for container starting at offset " + start;
				} else {
					try {
						for (;;) {
							var s = ASN1.decode(stream);
							if (s.tag === 0)
								break;
							sub[sub.length] = s;
						}
						len = start - stream.pos;
					} catch (e) {
						throw "Exception while decoding undefined length content: " + e;
					}
				}
			} else
				stream.pos += len;
			return new ASN1(streamStart, header, len, tag, sub);
		};
		ASN1.test = function () {
			var test = [{
				value: [0x27],
				expected: 0x27
			}, {
				value: [0x81, 0xC9],
				expected: 0xC9
			}, {
				value: [0x83, 0xFE, 0xDC, 0xBA],
				expected: 0xFEDCBA
			}];
			for (var i = 0, max = test.length; i < max; ++i) {
				var pos = 0,
					stream = new Stream(test[i].value, 0),
					res = ASN1.decodeLength(stream);
				if (res != test[i].expected)
					document.write("In test[" + i + "] expected " + test[i].expected + " got " + res + "\n");
			}
		};
		window.ASN1 = ASN1;
	})();
	ASN1.prototype.getHexStringValue = function () {
		var hexString = this.toHexString();
		var offset = this.header * 2;
		var length = this.length * 2;
		return hexString.substr(offset, length);
	};
	RSAKey.prototype.parseKey = function (pem) {
		try {
			var reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
			var der = reHex.test(pem) ? Hex.decode(pem) : Base64.unarmor(pem);
			var asn1 = ASN1.decode(der);
			if (asn1.sub.length === 9) {
				var modulus = asn1.sub[1].getHexStringValue();
				this.n = parseBigInt(modulus, 16);
				var public_exponent = asn1.sub[2].getHexStringValue();
				this.e = parseInt(public_exponent, 16);
				var private_exponent = asn1.sub[3].getHexStringValue();
				this.d = parseBigInt(private_exponent, 16);
				var prime1 = asn1.sub[4].getHexStringValue();
				this.p = parseBigInt(prime1, 16);
				var prime2 = asn1.sub[5].getHexStringValue();
				this.q = parseBigInt(prime2, 16);
				var exponent1 = asn1.sub[6].getHexStringValue();
				this.dmp1 = parseBigInt(exponent1, 16);
				var exponent2 = asn1.sub[7].getHexStringValue();
				this.dmq1 = parseBigInt(exponent2, 16);
				var coefficient = asn1.sub[8].getHexStringValue();
				this.coeff = parseBigInt(coefficient, 16);
			} else if (asn1.sub.length === 2) {
				var bit_string = asn1.sub[1];
				var sequence = bit_string.sub[0];
				var modulus = sequence.sub[0].getHexStringValue();
				this.n = parseBigInt(modulus, 16);
				var public_exponent = sequence.sub[1].getHexStringValue();
				this.e = parseInt(public_exponent, 16);
			} else {
				return false;
			}
			return true;
		} catch (ex) {
			return false;
		}
	};
	RSAKey.prototype.getPrivateBaseKey = function () {
		var options = {
			'array': [new KJUR.asn1.DERInteger({
				'int': 0
			}), new KJUR.asn1.DERInteger({
				'bigint': this.n
			}), new KJUR.asn1.DERInteger({
				'int': this.e
			}), new KJUR.asn1.DERInteger({
				'bigint': this.d
			}), new KJUR.asn1.DERInteger({
				'bigint': this.p
			}), new KJUR.asn1.DERInteger({
				'bigint': this.q
			}), new KJUR.asn1.DERInteger({
				'bigint': this.dmp1
			}), new KJUR.asn1.DERInteger({
				'bigint': this.dmq1
			}), new KJUR.asn1.DERInteger({
				'bigint': this.coeff
			})]
		};
		var seq = new KJUR.asn1.DERSequence(options);
		return seq.getEncodedHex();
	};
	RSAKey.prototype.getPrivateBaseKeyB64 = function () {
		return hex2b64(this.getPrivateBaseKey());
	};
	RSAKey.prototype.getPublicBaseKey = function () {
		var options = {
			'array': [new KJUR.asn1.DERObjectIdentifier({
				'oid': '1.2.840.113549.1.1.1'
			}), new KJUR.asn1.DERNull()]
		};
		var first_sequence = new KJUR.asn1.DERSequence(options);
		options = {
			'array': [new KJUR.asn1.DERInteger({
				'bigint': this.n
			}), new KJUR.asn1.DERInteger({
				'int': this.e
			})]
		};
		var second_sequence = new KJUR.asn1.DERSequence(options);
		options = {
			'hex': '00' + second_sequence.getEncodedHex()
		};
		var bit_string = new KJUR.asn1.DERBitString(options);
		options = {
			'array': [first_sequence, bit_string]
		};
		var seq = new KJUR.asn1.DERSequence(options);
		return seq.getEncodedHex();
	};
	RSAKey.prototype.getPublicBaseKeyB64 = function () {
		return hex2b64(this.getPublicBaseKey());
	};
	RSAKey.prototype.wordwrap = function (str, width) {
		width = width || 64;
		if (!str)
			return str;
		var regex = '(.{1,' + width + '})( +|$\n?)|(.{1,' + width + '})';
		return str.match(RegExp(regex, 'g')).join('\n');
	};
	RSAKey.prototype.getPrivateKey = function () {
		var key = "-----BEGIN RSA PRIVATE KEY-----\n";
		key += this.wordwrap(this.getPrivateBaseKeyB64()) + "\n";
		key += "-----END RSA PRIVATE KEY-----";
		return key;
	};
	RSAKey.prototype.getPublicKey = function () {
		var key = "-----BEGIN PUBLIC KEY-----\n";
		key += this.wordwrap(this.getPublicBaseKeyB64()) + "\n";
		key += "-----END PUBLIC KEY-----";
		return key;
	};
	RSAKey.prototype.hasPublicKeyProperty = function (obj) {
		obj = obj || {};
		return obj.hasOwnProperty('n') && obj.hasOwnProperty('e');
	};
	RSAKey.prototype.hasPrivateKeyProperty = function (obj) {
		obj = obj || {};
		return obj.hasOwnProperty('n') && obj.hasOwnProperty('e') && obj.hasOwnProperty('d') && obj.hasOwnProperty('p') && obj.hasOwnProperty('q') && obj.hasOwnProperty('dmp1') && obj.hasOwnProperty('dmq1') && obj.hasOwnProperty('coeff');
	};
	RSAKey.prototype.parsePropertiesFrom = function (obj) {
		this.n = obj.n;
		this.e = obj.e;
		if (obj.hasOwnProperty('d')) {
			this.d = obj.d;
			this.p = obj.p;
			this.q = obj.q;
			this.dmp1 = obj.dmp1;
			this.dmq1 = obj.dmq1;
			this.coeff = obj.coeff;
		}
	};
	var JSEncryptRSAKey = function (key) {
		RSAKey.call(this);
		if (key) {
			if (typeof key === 'string') {
				this.parseKey(key);
			} else if (this.hasPrivateKeyProperty(key) || this.hasPublicKeyProperty(key)) {
				this.parsePropertiesFrom(key);
			}
		}
	};
	JSEncryptRSAKey.prototype = new RSAKey();
	JSEncryptRSAKey.prototype.constructor = JSEncryptRSAKey;
	var JSEncrypt = function (options) {
		options = options || {};
		this.default_key_size = parseInt(options.default_key_size) || 1024;
		this.default_public_exponent = options.default_public_exponent || '010001';
		this.log = options.log || false;
		this.key = null;
	};
	JSEncrypt.prototype.setKey = function (key) {
		if (this.log && this.key)
			console.warn('A key was already set, overriding existing.');
		this.key = new JSEncryptRSAKey(key);
	};
	JSEncrypt.prototype.setPrivateKey = function (privkey) {
		this.setKey(privkey);
	};
	JSEncrypt.prototype.setPublicKey = function (pubkey) {
		this.setKey(pubkey);
	};
	JSEncrypt.prototype.decrypt = function (string) {
		try {
			return this.getKey().decrypt(b64tohex(string));
		} catch (ex) {
			return false;
		}
	};
	JSEncrypt.prototype.encrypt = function (string) {
		try {
			return hex2b64(this.getKey().encrypt(string));
		} catch (ex) {
			return false;
		}
	};
	JSEncrypt.prototype.getKey = function (cb) {
		if (!this.key) {
			this.key = new JSEncryptRSAKey();
			if (cb && {}.toString.call(cb) === '[object Function]') {
				this.key.generateAsync(this.default_key_size, this.default_public_exponent, cb);
				return;
			}
			this.key.generate(this.default_key_size, this.default_public_exponent);
		}
		return this.key;
	};
	JSEncrypt.prototype.getPrivateKey = function () {
		return this.getKey().getPrivateKey();
	};
	JSEncrypt.prototype.getPrivateKeyB64 = function () {
		return this.getKey().getPrivateBaseKeyB64();
	};
	JSEncrypt.prototype.getPublicKey = function () {
		return this.getKey().getPublicKey();
	};
	JSEncrypt.prototype.getPublicKeyB64 = function () {
		return this.getKey().getPublicBaseKeyB64();
	};
	exports.JSEncrypt = JSEncrypt;
})(JSEncryptExports);
var JSEncrypt = JSEncryptExports.JSEncrypt;
jQuery.jCryption.crypt = new JSEncrypt();
var CryptoJS = CryptoJS || function (u, p) {
	var d = {},
		l = d.lib = {},
		s = function () {},
		t = l.Base = {
			extend: function (a) {
				s.prototype = this;
				var c = new s;
				a && c.mixIn(a);
				c.hasOwnProperty("init") || (c.init = function () {
					c.$super.init.apply(this, arguments)
				});
				c.init.prototype = c;
				c.$super = this;
				return c
			},
			create: function () {
				var a = this.extend();
				a.init.apply(a, arguments);
				return a
			},
			init: function () {},
			mixIn: function (a) {
				for (var c in a) a.hasOwnProperty(c) && (this[c] = a[c]);
				a.hasOwnProperty("toString") && (this.toString = a.toString)
			},
			clone: function () {
				return this.init.prototype.extend(this)
			}
		},
		r = l.WordArray = t.extend({
			init: function (a, c) {
				a = this.words = a || [];
				this.sigBytes = c != p ? c : 4 * a.length
			},
			toString: function (a) {
				return (a || v).stringify(this)
			},
			concat: function (a) {
				var c = this.words,
					e = a.words,
					j = this.sigBytes;
				a = a.sigBytes;
				this.clamp();
				if (j % 4)
					for (var k = 0; k < a; k++) c[j + k >>> 2] |= (e[k >>> 2] >>> 24 - 8 * (k % 4) & 255) << 24 - 8 * ((j + k) % 4);
				else if (65535 < e.length)
					for (k = 0; k < a; k += 4) c[j + k >>> 2] = e[k >>> 2];
				else c.push.apply(c, e);
				this.sigBytes += a;
				return this
			},
			clamp: function () {
				var a = this.words,
					c = this.sigBytes;
				a[c >>> 2] &= 4294967295 << 32 - 8 * (c % 4);
				a.length = u.ceil(c / 4)
			},
			clone: function () {
				var a = t.clone.call(this);
				a.words = this.words.slice(0);
				return a
			},
			random: function (a) {
				for (var c = [], e = 0; e < a; e += 4) c.push(4294967296 * u.random() | 0);
				return new r.init(c, a)
			}
		}),
		w = d.enc = {},
		v = w.Hex = {
			stringify: function (a) {
				var c = a.words;
				a = a.sigBytes;
				for (var e = [], j = 0; j < a; j++) {
					var k = c[j >>> 2] >>> 24 - 8 * (j % 4) & 255;
					e.push((k >>> 4).toString(16));
					e.push((k & 15).toString(16))
				}
				return e.join("")
			},
			parse: function (a) {
				for (var c = a.length, e = [], j = 0; j < c; j += 2) e[j >>> 3] |= parseInt(a.substr(j, 2), 16) << 24 - 4 * (j % 8);
				return new r.init(e, c / 2)
			}
		},
		b = w.Latin1 = {
			stringify: function (a) {
				var c = a.words;
				a = a.sigBytes;
				for (var e = [], j = 0; j < a; j++) e.push(String.fromCharCode(c[j >>> 2] >>> 24 - 8 * (j % 4) & 255));
				return e.join("")
			},
			parse: function (a) {
				for (var c = a.length, e = [], j = 0; j < c; j++) e[j >>> 2] |= (a.charCodeAt(j) & 255) << 24 - 8 * (j % 4);
				return new r.init(e, c)
			}
		},
		x = w.Utf8 = {
			stringify: function (a) {
				try {
					return decodeURIComponent(escape(b.stringify(a)))
				} catch (c) {
					throw Error("Malformed UTF-8 data");
				}
			},
			parse: function (a) {
				return b.parse(unescape(encodeURIComponent(a)))
			}
		},
		q = l.BufferedBlockAlgorithm = t.extend({
			reset: function () {
				this._data = new r.init;
				this._nDataBytes = 0
			},
			_append: function (a) {
				"string" == typeof a && (a = x.parse(a));
				this._data.concat(a);
				this._nDataBytes += a.sigBytes
			},
			_process: function (a) {
				var c = this._data,
					e = c.words,
					j = c.sigBytes,
					k = this.blockSize,
					b = j / (4 * k),
					b = a ? u.ceil(b) : u.max((b | 0) - this._minBufferSize, 0);
				a = b * k;
				j = u.min(4 * a, j);
				if (a) {
					for (var q = 0; q < a; q += k) this._doProcessBlock(e, q);
					q = e.splice(0, a);
					c.sigBytes -= j
				}
				return new r.init(q, j)
			},
			clone: function () {
				var a = t.clone.call(this);
				a._data = this._data.clone();
				return a
			},
			_minBufferSize: 0
		});
	l.Hasher = q.extend({
		cfg: t.extend(),
		init: function (a) {
			this.cfg = this.cfg.extend(a);
			this.reset()
		},
		reset: function () {
			q.reset.call(this);
			this._doReset()
		},
		update: function (a) {
			this._append(a);
			this._process();
			return this
		},
		finalize: function (a) {
			a && this._append(a);
			return this._doFinalize()
		},
		blockSize: 16,
		_createHelper: function (a) {
			return function (b, e) {
				return (new a.init(e)).finalize(b)
			}
		},
		_createHmacHelper: function (a) {
			return function (b, e) {
				return (new n.HMAC.init(a, e)).finalize(b)
			}
		}
	});
	var n = d.algo = {};
	return d
}(Math);
(function () {
	var u = CryptoJS,
		p = u.lib.WordArray;
	u.enc.Base64 = {
		stringify: function (d) {
			var l = d.words,
				p = d.sigBytes,
				t = this._map;
			d.clamp();
			d = [];
			for (var r = 0; r < p; r += 3)
				for (var w = (l[r >>> 2] >>> 24 - 8 * (r % 4) & 255) << 16 | (l[r + 1 >>> 2] >>> 24 - 8 * ((r + 1) % 4) & 255) << 8 | l[r + 2 >>> 2] >>> 24 - 8 * ((r + 2) % 4) & 255, v = 0; 4 > v && r + 0.75 * v < p; v++) d.push(t.charAt(w >>> 6 * (3 - v) & 63));
			if (l = t.charAt(64))
				for (; d.length % 4;) d.push(l);
			return d.join("")
		},
		parse: function (d) {
			var l = d.length,
				s = this._map,
				t = s.charAt(64);
			t && (t = d.indexOf(t), -1 != t && (l = t));
			for (var t = [], r = 0, w = 0; w < l; w++)
				if (w % 4) {
					var v = s.indexOf(d.charAt(w - 1)) << 2 * (w % 4),
						b = s.indexOf(d.charAt(w)) >>> 6 - 2 * (w % 4);
					t[r >>> 2] |= (v | b) << 24 - 8 * (r % 4);
					r++
				}
			return p.create(t, r)
		},
		_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
	}
})();
(function (u) {
	function p(b, n, a, c, e, j, k) {
		b = b + (n & a | ~n & c) + e + k;
		return (b << j | b >>> 32 - j) + n
	}

	function d(b, n, a, c, e, j, k) {
		b = b + (n & c | a & ~c) + e + k;
		return (b << j | b >>> 32 - j) + n
	}

	function l(b, n, a, c, e, j, k) {
		b = b + (n ^ a ^ c) + e + k;
		return (b << j | b >>> 32 - j) + n
	}

	function s(b, n, a, c, e, j, k) {
		b = b + (a ^ (n | ~c)) + e + k;
		return (b << j | b >>> 32 - j) + n
	}
	for (var t = CryptoJS, r = t.lib, w = r.WordArray, v = r.Hasher, r = t.algo, b = [], x = 0; 64 > x; x++) b[x] = 4294967296 * u.abs(u.sin(x + 1)) | 0;
	r = r.MD5 = v.extend({
		_doReset: function () {
			this._hash = new w.init([1732584193, 4023233417, 2562383102, 271733878])
		},
		_doProcessBlock: function (q, n) {
			for (var a = 0; 16 > a; a++) {
				var c = n + a,
					e = q[c];
				q[c] = (e << 8 | e >>> 24) & 16711935 | (e << 24 | e >>> 8) & 4278255360
			}
			var a = this._hash.words,
				c = q[n + 0],
				e = q[n + 1],
				j = q[n + 2],
				k = q[n + 3],
				z = q[n + 4],
				r = q[n + 5],
				t = q[n + 6],
				w = q[n + 7],
				v = q[n + 8],
				A = q[n + 9],
				B = q[n + 10],
				C = q[n + 11],
				u = q[n + 12],
				D = q[n + 13],
				E = q[n + 14],
				x = q[n + 15],
				f = a[0],
				m = a[1],
				g = a[2],
				h = a[3],
				f = p(f, m, g, h, c, 7, b[0]),
				h = p(h, f, m, g, e, 12, b[1]),
				g = p(g, h, f, m, j, 17, b[2]),
				m = p(m, g, h, f, k, 22, b[3]),
				f = p(f, m, g, h, z, 7, b[4]),
				h = p(h, f, m, g, r, 12, b[5]),
				g = p(g, h, f, m, t, 17, b[6]),
				m = p(m, g, h, f, w, 22, b[7]),
				f = p(f, m, g, h, v, 7, b[8]),
				h = p(h, f, m, g, A, 12, b[9]),
				g = p(g, h, f, m, B, 17, b[10]),
				m = p(m, g, h, f, C, 22, b[11]),
				f = p(f, m, g, h, u, 7, b[12]),
				h = p(h, f, m, g, D, 12, b[13]),
				g = p(g, h, f, m, E, 17, b[14]),
				m = p(m, g, h, f, x, 22, b[15]),
				f = d(f, m, g, h, e, 5, b[16]),
				h = d(h, f, m, g, t, 9, b[17]),
				g = d(g, h, f, m, C, 14, b[18]),
				m = d(m, g, h, f, c, 20, b[19]),
				f = d(f, m, g, h, r, 5, b[20]),
				h = d(h, f, m, g, B, 9, b[21]),
				g = d(g, h, f, m, x, 14, b[22]),
				m = d(m, g, h, f, z, 20, b[23]),
				f = d(f, m, g, h, A, 5, b[24]),
				h = d(h, f, m, g, E, 9, b[25]),
				g = d(g, h, f, m, k, 14, b[26]),
				m = d(m, g, h, f, v, 20, b[27]),
				f = d(f, m, g, h, D, 5, b[28]),
				h = d(h, f, m, g, j, 9, b[29]),
				g = d(g, h, f, m, w, 14, b[30]),
				m = d(m, g, h, f, u, 20, b[31]),
				f = l(f, m, g, h, r, 4, b[32]),
				h = l(h, f, m, g, v, 11, b[33]),
				g = l(g, h, f, m, C, 16, b[34]),
				m = l(m, g, h, f, E, 23, b[35]),
				f = l(f, m, g, h, e, 4, b[36]),
				h = l(h, f, m, g, z, 11, b[37]),
				g = l(g, h, f, m, w, 16, b[38]),
				m = l(m, g, h, f, B, 23, b[39]),
				f = l(f, m, g, h, D, 4, b[40]),
				h = l(h, f, m, g, c, 11, b[41]),
				g = l(g, h, f, m, k, 16, b[42]),
				m = l(m, g, h, f, t, 23, b[43]),
				f = l(f, m, g, h, A, 4, b[44]),
				h = l(h, f, m, g, u, 11, b[45]),
				g = l(g, h, f, m, x, 16, b[46]),
				m = l(m, g, h, f, j, 23, b[47]),
				f = s(f, m, g, h, c, 6, b[48]),
				h = s(h, f, m, g, w, 10, b[49]),
				g = s(g, h, f, m, E, 15, b[50]),
				m = s(m, g, h, f, r, 21, b[51]),
				f = s(f, m, g, h, u, 6, b[52]),
				h = s(h, f, m, g, k, 10, b[53]),
				g = s(g, h, f, m, B, 15, b[54]),
				m = s(m, g, h, f, e, 21, b[55]),
				f = s(f, m, g, h, v, 6, b[56]),
				h = s(h, f, m, g, x, 10, b[57]),
				g = s(g, h, f, m, t, 15, b[58]),
				m = s(m, g, h, f, D, 21, b[59]),
				f = s(f, m, g, h, z, 6, b[60]),
				h = s(h, f, m, g, C, 10, b[61]),
				g = s(g, h, f, m, j, 15, b[62]),
				m = s(m, g, h, f, A, 21, b[63]);
			a[0] = a[0] + f | 0;
			a[1] = a[1] + m | 0;
			a[2] = a[2] + g | 0;
			a[3] = a[3] + h | 0
		},
		_doFinalize: function () {
			var b = this._data,
				n = b.words,
				a = 8 * this._nDataBytes,
				c = 8 * b.sigBytes;
			n[c >>> 5] |= 128 << 24 - c % 32;
			var e = u.floor(a / 4294967296);
			n[(c + 64 >>> 9 << 4) + 15] = (e << 8 | e >>> 24) & 16711935 | (e << 24 | e >>> 8) & 4278255360;
			n[(c + 64 >>> 9 << 4) + 14] = (a << 8 | a >>> 24) & 16711935 | (a << 24 | a >>> 8) & 4278255360;
			b.sigBytes = 4 * (n.length + 1);
			this._process();
			b = this._hash;
			n = b.words;
			for (a = 0; 4 > a; a++) c = n[a], n[a] = (c << 8 | c >>> 24) & 16711935 | (c << 24 | c >>> 8) & 4278255360;
			return b
		},
		clone: function () {
			var b = v.clone.call(this);
			b._hash = this._hash.clone();
			return b
		}
	});
	t.MD5 = v._createHelper(r);
	t.HmacMD5 = v._createHmacHelper(r)
})(Math);
(function () {
	var u = CryptoJS,
		p = u.lib,
		d = p.Base,
		l = p.WordArray,
		p = u.algo,
		s = p.EvpKDF = d.extend({
			cfg: d.extend({
				keySize: 4,
				hasher: p.MD5,
				iterations: 1
			}),
			init: function (d) {
				this.cfg = this.cfg.extend(d)
			},
			compute: function (d, r) {
				for (var p = this.cfg, s = p.hasher.create(), b = l.create(), u = b.words, q = p.keySize, p = p.iterations; u.length < q;) {
					n && s.update(n);
					var n = s.update(d).finalize(r);
					s.reset();
					for (var a = 1; a < p; a++) n = s.finalize(n), s.reset();
					b.concat(n)
				}
				b.sigBytes = 4 * q;
				return b
			}
		});
	u.EvpKDF = function (d, l, p) {
		return s.create(p).compute(d, l)
	}
})();
CryptoJS.lib.Cipher || function (u) {
	var p = CryptoJS,
		d = p.lib,
		l = d.Base,
		s = d.WordArray,
		t = d.BufferedBlockAlgorithm,
		r = p.enc.Base64,
		w = p.algo.EvpKDF,
		v = d.Cipher = t.extend({
			cfg: l.extend(),
			createEncryptor: function (e, a) {
				return this.create(this._ENC_XFORM_MODE, e, a)
			},
			createDecryptor: function (e, a) {
				return this.create(this._DEC_XFORM_MODE, e, a)
			},
			init: function (e, a, b) {
				this.cfg = this.cfg.extend(b);
				this._xformMode = e;
				this._key = a;
				this.reset()
			},
			reset: function () {
				t.reset.call(this);
				this._doReset()
			},
			process: function (e) {
				this._append(e);
				return this._process()
			},
			finalize: function (e) {
				e && this._append(e);
				return this._doFinalize()
			},
			keySize: 4,
			ivSize: 4,
			_ENC_XFORM_MODE: 1,
			_DEC_XFORM_MODE: 2,
			_createHelper: function (e) {
				return {
					encrypt: function (b, k, d) {
						return ("string" == typeof k ? c : a).encrypt(e, b, k, d)
					},
					decrypt: function (b, k, d) {
						return ("string" == typeof k ? c : a).decrypt(e, b, k, d)
					}
				}
			}
		});
	d.StreamCipher = v.extend({
		_doFinalize: function () {
			return this._process(!0)
		},
		blockSize: 1
	});
	var b = p.mode = {},
		x = function (e, a, b) {
			var c = this._iv;
			c ? this._iv = u : c = this._prevBlock;
			for (var d = 0; d < b; d++) e[a + d] ^= c[d]
		},
		q = (d.BlockCipherMode = l.extend({
			createEncryptor: function (e, a) {
				return this.Encryptor.create(e, a)
			},
			createDecryptor: function (e, a) {
				return this.Decryptor.create(e, a)
			},
			init: function (e, a) {
				this._cipher = e;
				this._iv = a
			}
		})).extend();
	q.Encryptor = q.extend({
		processBlock: function (e, a) {
			var b = this._cipher,
				c = b.blockSize;
			x.call(this, e, a, c);
			b.encryptBlock(e, a);
			this._prevBlock = e.slice(a, a + c)
		}
	});
	q.Decryptor = q.extend({
		processBlock: function (e, a) {
			var b = this._cipher,
				c = b.blockSize,
				d = e.slice(a, a + c);
			b.decryptBlock(e, a);
			x.call(this, e, a, c);
			this._prevBlock = d
		}
	});
	b = b.CBC = q;
	q = (p.pad = {}).Pkcs7 = {
		pad: function (a, b) {
			for (var c = 4 * b, c = c - a.sigBytes % c, d = c << 24 | c << 16 | c << 8 | c, l = [], n = 0; n < c; n += 4) l.push(d);
			c = s.create(l, c);
			a.concat(c)
		},
		unpad: function (a) {
			a.sigBytes -= a.words[a.sigBytes - 1 >>> 2] & 255
		}
	};
	d.BlockCipher = v.extend({
		cfg: v.cfg.extend({
			mode: b,
			padding: q
		}),
		reset: function () {
			v.reset.call(this);
			var a = this.cfg,
				b = a.iv,
				a = a.mode;
			if (this._xformMode == this._ENC_XFORM_MODE) var c = a.createEncryptor;
			else c = a.createDecryptor, this._minBufferSize = 1;
			this._mode = c.call(a, this, b && b.words)
		},
		_doProcessBlock: function (a, b) {
			this._mode.processBlock(a, b)
		},
		_doFinalize: function () {
			var a = this.cfg.padding;
			if (this._xformMode == this._ENC_XFORM_MODE) {
				a.pad(this._data, this.blockSize);
				var b = this._process(!0)
			} else b = this._process(!0), a.unpad(b);
			return b
		},
		blockSize: 4
	});
	var n = d.CipherParams = l.extend({
			init: function (a) {
				this.mixIn(a)
			},
			toString: function (a) {
				return (a || this.formatter).stringify(this)
			}
		}),
		b = (p.format = {}).OpenSSL = {
			stringify: function (a) {
				var b = a.ciphertext;
				a = a.salt;
				return (a ? s.create([1398893684, 1701076831]).concat(a).concat(b) : b).toString(r)
			},
			parse: function (a) {
				a = r.parse(a);
				var b = a.words;
				if (1398893684 == b[0] && 1701076831 == b[1]) {
					var c = s.create(b.slice(2, 4));
					b.splice(0, 4);
					a.sigBytes -= 16
				}
				return n.create({
					ciphertext: a,
					salt: c
				})
			}
		},
		a = d.SerializableCipher = l.extend({
			cfg: l.extend({
				format: b
			}),
			encrypt: function (a, b, c, d) {
				d = this.cfg.extend(d);
				var l = a.createEncryptor(c, d);
				b = l.finalize(b);
				l = l.cfg;
				return n.create({
					ciphertext: b,
					key: c,
					iv: l.iv,
					algorithm: a,
					mode: l.mode,
					padding: l.padding,
					blockSize: a.blockSize,
					formatter: d.format
				})
			},
			decrypt: function (a, b, c, d) {
				d = this.cfg.extend(d);
				b = this._parse(b, d.format);
				return a.createDecryptor(c, d).finalize(b.ciphertext)
			},
			_parse: function (a, b) {
				return "string" == typeof a ? b.parse(a, this) : a
			}
		}),
		p = (p.kdf = {}).OpenSSL = {
			execute: function (a, b, c, d) {
				d || (d = s.random(8));
				a = w.create({
					keySize: b + c
				}).compute(a, d);
				c = s.create(a.words.slice(b), 4 * c);
				a.sigBytes = 4 * b;
				return n.create({
					key: a,
					iv: c,
					salt: d
				})
			}
		},
		c = d.PasswordBasedCipher = a.extend({
			cfg: a.cfg.extend({
				kdf: p
			}),
			encrypt: function (b, c, d, l) {
				l = this.cfg.extend(l);
				d = l.kdf.execute(d, b.keySize, b.ivSize);
				l.iv = d.iv;
				b = a.encrypt.call(this, b, c, d.key, l);
				b.mixIn(d);
				return b
			},
			decrypt: function (b, c, d, l) {
				l = this.cfg.extend(l);
				c = this._parse(c, l.format);
				d = l.kdf.execute(d, b.keySize, b.ivSize, c.salt);
				l.iv = d.iv;
				return a.decrypt.call(this, b, c, d.key, l)
			}
		})
}();
(function () {
	for (var u = CryptoJS, p = u.lib.BlockCipher, d = u.algo, l = [], s = [], t = [], r = [], w = [], v = [], b = [], x = [], q = [], n = [], a = [], c = 0; 256 > c; c++) a[c] = 128 > c ? c << 1 : c << 1 ^ 283;
	for (var e = 0, j = 0, c = 0; 256 > c; c++) {
		var k = j ^ j << 1 ^ j << 2 ^ j << 3 ^ j << 4,
			k = k >>> 8 ^ k & 255 ^ 99;
		l[e] = k;
		s[k] = e;
		var z = a[e],
			F = a[z],
			G = a[F],
			y = 257 * a[k] ^ 16843008 * k;
		t[e] = y << 24 | y >>> 8;
		r[e] = y << 16 | y >>> 16;
		w[e] = y << 8 | y >>> 24;
		v[e] = y;
		y = 16843009 * G ^ 65537 * F ^ 257 * z ^ 16843008 * e;
		b[k] = y << 24 | y >>> 8;
		x[k] = y << 16 | y >>> 16;
		q[k] = y << 8 | y >>> 24;
		n[k] = y;
		e ? (e = z ^ a[a[a[G ^ z]]], j ^= a[a[j]]) : e = j = 1
	}
	var H = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54],
		d = d.AES = p.extend({
			_doReset: function () {
				for (var a = this._key, c = a.words, d = a.sigBytes / 4, a = 4 * ((this._nRounds = d + 6) + 1), e = this._keySchedule = [], j = 0; j < a; j++)
					if (j < d) e[j] = c[j];
					else {
						var k = e[j - 1];
						j % d ? 6 < d && 4 == j % d && (k = l[k >>> 24] << 24 | l[k >>> 16 & 255] << 16 | l[k >>> 8 & 255] << 8 | l[k & 255]) : (k = k << 8 | k >>> 24, k = l[k >>> 24] << 24 | l[k >>> 16 & 255] << 16 | l[k >>> 8 & 255] << 8 | l[k & 255], k ^= H[j / d | 0] << 24);
						e[j] = e[j - d] ^ k
					}
				c = this._invKeySchedule = [];
				for (d = 0; d < a; d++) j = a - d, k = d % 4 ? e[j] : e[j - 4], c[d] = 4 > d || 4 >= j ? k : b[l[k >>> 24]] ^ x[l[k >>> 16 & 255]] ^ q[l[k >>> 8 & 255]] ^ n[l[k & 255]]
			},
			encryptBlock: function (a, b) {
				this._doCryptBlock(a, b, this._keySchedule, t, r, w, v, l)
			},
			decryptBlock: function (a, c) {
				var d = a[c + 1];
				a[c + 1] = a[c + 3];
				a[c + 3] = d;
				this._doCryptBlock(a, c, this._invKeySchedule, b, x, q, n, s);
				d = a[c + 1];
				a[c + 1] = a[c + 3];
				a[c + 3] = d
			},
			_doCryptBlock: function (a, b, c, d, e, j, l, f) {
				for (var m = this._nRounds, g = a[b] ^ c[0], h = a[b + 1] ^ c[1], k = a[b + 2] ^ c[2], n = a[b + 3] ^ c[3], p = 4, r = 1; r < m; r++) var q = d[g >>> 24] ^ e[h >>> 16 & 255] ^ j[k >>> 8 & 255] ^ l[n & 255] ^ c[p++],
					s = d[h >>> 24] ^ e[k >>> 16 & 255] ^ j[n >>> 8 & 255] ^ l[g & 255] ^ c[p++],
					t = d[k >>> 24] ^ e[n >>> 16 & 255] ^ j[g >>> 8 & 255] ^ l[h & 255] ^ c[p++],
					n = d[n >>> 24] ^ e[g >>> 16 & 255] ^ j[h >>> 8 & 255] ^ l[k & 255] ^ c[p++],
					g = q,
					h = s,
					k = t;
				q = (f[g >>> 24] << 24 | f[h >>> 16 & 255] << 16 | f[k >>> 8 & 255] << 8 | f[n & 255]) ^ c[p++];
				s = (f[h >>> 24] << 24 | f[k >>> 16 & 255] << 16 | f[n >>> 8 & 255] << 8 | f[g & 255]) ^ c[p++];
				t = (f[k >>> 24] << 24 | f[n >>> 16 & 255] << 16 | f[g >>> 8 & 255] << 8 | f[h & 255]) ^ c[p++];
				n = (f[n >>> 24] << 24 | f[g >>> 16 & 255] << 16 | f[h >>> 8 & 255] << 8 | f[k & 255]) ^ c[p++];
				a[b] = q;
				a[b + 1] = s;
				a[b + 2] = t;
				a[b + 3] = n
			},
			keySize: 8
		});
	u.AES = p._createHelper(d)
})();