// Reads the simulated driver dataset from regenerative-analysis (read-only) and writes the small
// aggregate src/data/insights.json that the landing page imports. Everything in it is SIMULATED.
// Run: node scripts/build-insights.mjs [path/to/simulated_user_data]
import { execFileSync } from "node:child_process";
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
// (energy recovered per trip x tripsPerDay x 365), averaged over the generated dry-road demo trips
// (3 routes x 3 driving styles) in regenerative-analysis/data/trips.
// Conversions mirror regenerative-analysis/src/config/regen.config.ts `savings`.
const SAV = { kwhPerGallon: 33.7, engineEfficiency: 0.3, gasPriceUsd: 3.0, kgCo2PerGallon: 8.9 };
const LB_PER_KG = 2.20462;
const TRIPS_PER_DAY = 2;
const OUT = new URL("../src/data/insights.json", import.meta.url);
const TRIPS = path.join(SRC, "../data/trips");
const readTrip = (id) => JSON.parse(readFileSync(path.join(TRIPS, `${id}.json`), "utf8"));
const toGallons = (kwh) => kwh / (SAV.kwhPerGallon * SAV.engineEfficiency);

// Fail loudly if the trips are missing: a silent fallback would ship stale figures.
const dryIds = readdirSync(TRIPS)
  .filter((f) => /^[a-z]+-(smooth|mixed|aggressive)-dry\.json$/.test(f))
  .map((f) => f.replace(/\.json$/, ""));
if (dryIds.length === 0) throw new Error(`No *-dry.json trips in ${TRIPS}`);
const years = dryIds.map((id) => {
  const kwh = readTrip(id).summary.energyRecoveredKwh * TRIPS_PER_DAY * 365;
  const gallons = toGallons(kwh);
  return { kwh, gallons, dollars: gallons * SAV.gasPriceUsd, co2Lb: gallons * SAV.kgCo2PerGallon * LB_PER_KG };
});
const annual = {
  basis: `${dryIds.length} simulated dry-road commutes, ${TRIPS_PER_DAY} trips a day, 365 days, gas $${SAV.gasPriceUsd.toFixed(2)}/gal`,
  gallons: round(avg(years.map((y) => y.gallons)), 1),
  dollars: round(avg(years.map((y) => y.dollars)), 0),
  co2Lb: round(avg(years.map((y) => y.co2Lb)), 0),
  kwh: round(avg(years.map((y) => y.kwh)), 0),
};

// 5a. Energy recovered per km by driving style, for the savings calculator (same dry-road trips).
const calculator = {
  basis: `${dryIds.length} simulated dry-road trips (3 routes x 3 driving styles)`,
  kwhPerGallon: SAV.kwhPerGallon,
  engineEfficiency: SAV.engineEfficiency,
  kgCo2PerGallon: SAV.kgCo2PerGallon,
  defaultGasPriceUsd: SAV.gasPriceUsd,
  kwhPerKm: Object.fromEntries(
    ["smooth", "mixed", "aggressive"].map((style) => {
      const trips = dryIds.filter((id) => id.split("-")[1] === style).map(readTrip);
      const kwh = trips.reduce((a, t) => a + t.summary.energyRecoveredKwh, 0);
      const km = trips.reduce((a, t) => a + t.header.distanceM / 1000, 0);
      return [style, round(kwh / km, 4)];
    }),
  ),
};

// 5b. The sample trip report on the page, straight from one generated trip and its coaching tip.
const RECEIPT_TRIP = "mixed-mixed-dry";
const rt = readTrip(RECEIPT_TRIP);
const missedByCause = {};
for (const e of rt.summary.missedEvents) missedByCause[e.cause] = (missedByCause[e.cause] ?? 0) + 1;
const receipt = {
  tripId: RECEIPT_TRIP,
  route: rt.header.tripId.split("-")[0],
  driver: rt.header.driver,
  condition: rt.header.condition,
  vehicle: rt.header.vehicle,
  distanceKm: round(rt.header.distanceM / 1000, 1),
  score: round(rt.summary.score, 0),
  recoveredKwh: round(rt.summary.energyRecoveredKwh, 2),
  ceilingKwh: round(rt.summary.energyCeilingKwh, 2),
  heatLossKwh: round(rt.summary.heatLossKwh, 2),
  missed: Object.entries(missedByCause).map(([cause, count]) => ({ cause, count })).sort((a, b) => b.count - a.count),
  gallons: round(rt.summary.gallonsSaved, 3),
  dollars: round(rt.summary.dollarsSaved, 2),
  co2Lb: round(rt.summary.co2Kg * LB_PER_KG, 2),
  tip: JSON.parse(readFileSync(path.join(TRIPS, `${RECEIPT_TRIP}.coach.json`), "utf8")).tip,
};

// Which product commit these numbers came from, so stale data is visible.
let sourceCommit = "unknown";
try {
  sourceCommit = execFileSync("git", ["-C", SRC, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  // Not a git checkout; leave "unknown".
}

// 6. Per-driver rows for the leaderboard (first name only; coached drivers with a regen car)
const leaders = coached.map((r) => ({
  name: r.u.alias.split(" (")[0],
  style: r.u.driver.style,
  baselineScore: round(r.c.baselineScore),
  finalScore: round(r.c.finalScore),
  improvement: round(r.c.improvement),
  missed: r.c.dominantMissedCause,
}));

const out = {
  simulated: true,
  note: "Synthesized drivers from the Regentic simulation. Not real people; all numbers are estimates.",
  generatedFrom: `regenerative-analysis@${sourceCommit}: simulated_user_data (${users.length} drivers), data/trips`,
  drivers: users.length,
  byStyle,
  missedCauses,
  coaching: coachingSummary,
  money,
  annual,
  calculator,
  receipt,
  leaders,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));

// 7. The map demo: the Mount Bonnell descent with its per-second telemetry, trimmed to what the map draws.
const DEMO_TRIP = "hilly-mixed-dry";
const dt = readTrip(DEMO_TRIP);
const r1 = (n, d = 2) => Number(n.toFixed(d));
const demo = {
  simulated: true,
  tripId: DEMO_TRIP,
  name: "Mount Bonnell descent",
  driver: dt.header.driver,
  condition: dt.header.condition,
  vehicle: dt.header.vehicle,
  distanceM: dt.header.distanceM,
  score: round(dt.summary.score, 0),
  generatedFrom: `regenerative-analysis@${sourceCommit}: data/trips/${DEMO_TRIP}.json`,
  // [t s, lon, lat, speed m/s, regen kW, friction kW, missed cause or null]
  samples: dt.samples.map((s) => [s.t, r1(s.lon, 6), r1(s.lat, 6), r1(s.speed, 1), r1(s.regenKw, 1), r1(s.frictionKw, 1), s.missed]),
};
writeFileSync(new URL("../src/data/demo-trip.json", import.meta.url), JSON.stringify(demo) + "\n");
