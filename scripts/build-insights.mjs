// Reads the simulated driver dataset from regenerative-analysis (read-only) and writes the small
// aggregate src/data/insights.json that the landing page imports. Everything in it is SIMULATED.
// Run: node scripts/build-insights.mjs [path/to/simulated_user_data]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.argv[2] ?? "../regenerative-analysis/simulated_user_data");
const read = (rel) => JSON.parse(readFileSync(path.join(SRC, rel), "utf8"));
const list = (dir, re) => readdirSync(path.join(SRC, dir)).filter((f) => re.test(f));
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n, d = 1) => Number(n.toFixed(d));

const users = list("users", /^user_\d+\.json$/).map((f) => read(`users/${f}`));
const coaching = new Map(list("coaching", /_coaching\.json$/).map((f) => { const c = read(`coaching/${f}`); return [c.userId, c]; }));
const whatIf = new Map(read("what_if/what_if_matrix.json").users.map((u) => [u.userId, u]));
const truth = new Map(read("ground_truth/best_car.json").labels.map((l) => [l.userId, l]));

const rows = users.map((u) => {
  const c = coaching.get(u.userId);
  const w = whatIf.get(u.userId);
  const cur = w?.options.find((o) => o.vehicleId === w.currentVehicleId);
  return { u, c, cur, t: truth.get(u.userId) };
});

// 1. Cohorts by driving style
const styles = [...new Set(users.map((u) => u.driver.style))];
const byStyle = styles.map((style) => {
  const g = rows.filter((r) => r.u.driver.style === style);
  const cg = g.filter((r) => r.c);
  return {
    style,
    drivers: g.length,
    withRegenCar: cg.length,
    baselineScore: round(avg(cg.map((r) => r.c.baselineScore))),
    finalScore: round(avg(cg.map((r) => r.c.finalScore))),
    improvement: round(avg(cg.map((r) => r.c.improvement))),
    coachability: round(avg(cg.map((r) => r.c.coachability)), 2),
  };
});

// 2. What drivers miss, and what they were told
const causes = {};
const tips = {};
for (const r of rows) {
  if (!r.c) continue;
  causes[r.c.dominantMissedCause] = (causes[r.c.dominantMissedCause] ?? 0) + 1;
  for (const w of r.c.weeks) if (w.tip) {
    tips[w.tip.cause] ??= { text: w.tip.text, count: 0 };
    tips[w.tip.cause].count++;
  }
}
const missedCauses = Object.entries(causes).map(([cause, drivers]) => ({ cause, drivers, tip: tips[cause]?.text ?? null })).sort((a, b) => b.drivers - a.drivers);

// 3. Does coaching work?
const coached = rows.filter((r) => r.c);
const improved = coached.filter((r) => r.c.improvement > 0);
const coachingSummary = {
  drivers: coached.length,
  improved: improved.length,
  avgImprovement: round(avg(coached.map((r) => r.c.improvement))),
  bestImprovement: round(Math.max(...coached.map((r) => r.c.improvement))),
  highCoachabilityAvgGain: round(avg(coached.filter((r) => r.c.coachability >= 0.7).map((r) => r.c.improvement))),
  lowCoachabilityAvgGain: round(avg(coached.filter((r) => r.c.coachability < 0.7).map((r) => r.c.improvement))),
};

// 4. Money on the table
const money = {
  avgAnnualBrakeWearUsd: round(avg(rows.filter((r) => r.cur).map((r) => r.cur.annualBrakeWearUsd)), 0),
  avgAnnualGasUsd: round(avg(rows.filter((r) => r.cur).map((r) => r.cur.annualGasCostUsd)), 0),
  avgAnnualCo2Kg: round(avg(rows.filter((r) => r.cur).map((r) => r.cur.annualCo2Kg)), 0),
  switchRecommended: rows.filter((r) => r.t?.recommendSwitch).length,
  keepRecommended: rows.filter((r) => r.t && !r.t.recommendSwitch).length,
  underwater: rows.filter((r) => (r.t?.negativeEquityUsd ?? 0) > 0).length,
  avgSavingsWhenSwitching5yUsd: round(avg(rows.filter((r) => r.t?.recommendSwitch).map((r) => r.t.savingsVsKeep5Usd)), 0),
};

// 5. A year of regen for a typical simulated commuter: the app's own annualProjection
// (energy recovered per trip x tripsPerDay x 365), averaged over the demo personas' trips.
// Conversions mirror regenerative-analysis/src/config/regen.config.ts `savings`.
const SAV = { kwhPerGallon: 33.7, engineEfficiency: 0.3, gasPriceUsd: 3.0, kgCo2PerGallon: 8.9 };
const LB_PER_KG = 2.20462;
const personas = JSON.parse(readFileSync(path.join(SRC, "../src/data/personas.overlay.json"), "utf8")).personas;
const years = personas.map((p) => {
  const trip = JSON.parse(readFileSync(path.join(SRC, `../data/trips/${p.tripId}.json`), "utf8"));
  const perYear = p.commute.tripsPerDay * 365;
  const kwh = trip.summary.energyRecoveredKwh * perYear;
  const gallons = kwh / (SAV.kwhPerGallon * SAV.engineEfficiency);
  return { kwh, gallons, dollars: gallons * SAV.gasPriceUsd, co2Lb: gallons * SAV.kgCo2PerGallon * LB_PER_KG };
});
const annual = {
  basis: `${personas.length} demo commuters, 2 trips a day, 365 days, gas $${SAV.gasPriceUsd.toFixed(2)}/gal`,
  gallons: round(avg(years.map((y) => y.gallons)), 1),
  dollars: round(avg(years.map((y) => y.dollars)), 0),
  co2Lb: round(avg(years.map((y) => y.co2Lb)), 0),
  kwh: round(avg(years.map((y) => y.kwh)), 0),
};

const out = {
  simulated: true,
  note: "Synthesized drivers from the Regen Coach simulation. Not real people; all numbers are estimates.",
  generatedFrom: `simulated_user_data (${users.length} drivers)`,
  drivers: users.length,
  byStyle,
  missedCauses,
  coaching: coachingSummary,
  money,
  annual,
};
writeFileSync(new URL("../src/data/insights.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
