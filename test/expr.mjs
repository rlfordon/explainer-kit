#!/usr/bin/env node
/* expr.mjs — the formula language: right answers, and hostile formulas rejected or inert.
 *
 *   node test/expr.mjs
 */
import { compile, fmt, template } from "../lib/expr.js";

const fails = [];
const eq = (what, got, want) => { if (!(Object.is(got, want) || (typeof want === "number" && Math.abs(got - want) < 1e-9))) fails.push(`${what}: got ${got}, want ${want}`); };
const run = (src, scope = {}) => compile(src, Object.keys(scope)).run(scope);

eq("precedence", run("1 + 2 * 3"), 7);
eq("power is right-associative", run("2 ^ 3 ^ 2"), 512);
eq("** is power", run("2 ** 10"), 1024);
eq("unary minus", run("-2 ^ 2"), -4);
eq("names", run("t + q*40", { t: 600, q: 4 }), 760);
eq("ternary", run("x > 3 ? 10 : 20", { x: 5 }), 10);
eq("nested ternary", run("c == \"p\" ? 1 : c == \"n\" ? 2 : 3", { c: "n" }), 2);
eq("logic", run("a > 1 && b < 1 || false", { a: 2, b: 0 }), true);
eq("functions", run("max(n/1200*60, 7) + min(1, 2) + round(3.14159, 2)", { n: 1200 }), 60 + 1 + 3.14);
eq("sigmoid/logit round trip", run("sigmoid(logit(0.8))"), 0.8);
eq("clamp", run("clamp(1.4, 0.01, 0.99)"), 0.99);
eq("string only compares", Number.isNaN(run("\"a\" + 1")), true);
eq("missing value is NaN", Number.isNaN(compile("x", ["x"]).run({})), true);

for (const bad of ["constructor", "x.constructor", "__proto__", "this", "globalThis", "alert(1)", "eval(\"1\")", "Function(\"x\")",
  "a = 1", "[1]", "{}", "x; y", "`x`", "1 +", "(1", "max(", "x[0]", "new Date()", "process", "toString()", "valueOf", "hasOwnProperty(\"x\")"]) {
  try { compile(bad, ["x", "y", "a"]); fails.push(`should reject: ${bad}`); } catch (e) { /* rejected */ }
}
try { compile("1+".repeat(400) + "1"); fails.push("should reject an over-long formula"); } catch (e) {}
try { compile("(".repeat(60) + "1" + ")".repeat(60)); fails.push("should reject deep nesting"); } catch (e) {}
// a name that is a prototype key, allowed by the widget, still only reads the scope
eq("prototype-named variable reads scope", run("constructor + 1", { constructor: 1 }), 2);

eq("fmt money small", fmt(0.0421, "money"), "$0.04");
eq("fmt money", fmt(1234.5, "money"), "$1,235");
eq("fmt count", fmt(1234567, "count"), "1.2 million");
eq("fmt count big", fmt(25000000, "count"), "25 million");
eq("fmt duration", fmt(3000, "duration"), "50 min");
eq("fmt percent", fmt(0.417, "percent"), "42%");
eq("fmt pct1", fmt(0.0417, "pct1"), "4.2%");
eq("fmt NaN", fmt(NaN, "int"), "n/a");
const t = template("Uses **{per | int}** tokens, [chip]{.ok} and {round(per/320)}%.");
eq("template parts", t.length, 5);
eq("template keeps span braces", t[2].text, "** tokens, [chip]{.ok} and ");
eq("template format", t[1].f, "int");

console.log(fails.length ? "FAIL\n  • " + fails.join("\n  • ") : "ok — formulas evaluate correctly; hostile formulas are rejected");
process.exit(fails.length ? 1 : 0);
