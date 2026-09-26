function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function mean(nums) { return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0; }
function variance(nums) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return mean(nums.map(n => (n-m)**2));
}
function extractErrorHz(s) {
  if (typeof s.errorHz === "number") return Math.abs(s.errorHz);
  if (s.targetHz > 0 && s.guessHz > 0) return Math.abs(s.guessHz - s.targetHz);
  if (s.accuracy > 0) return clamp(120 * (1 - s.accuracy/100), 4, 200);
  return null;
}
function scorePrecision(samples) {
  if (!samples.length) return { value: 0, confidence: 0 };
  const errors = samples.map(extractErrorHz).filter(n => n != null);
  const acc = mean(samples.map(s => clamp(s.accuracy,0,100)));
  let errorScore = acc;
  if (errors.length >= 3) errorScore = clamp(100 * (1 - mean(errors) / 90), 0, 100);
  return { value: Math.round(errorScore * 0.65 + acc * 0.35), confidence: clamp(20 + samples.length * 4 + (errors.length >= 3 ? 15 : 0), 0, 100) };
}
function scoreConsistency(samples) {
  if (samples.length < 2) return { value: 0, confidence: 0 };
  const accs = samples.map(s => clamp(s.accuracy,0,100));
  return { value: Math.round(clamp(100 - Math.sqrt(variance(accs)) * 2.8, 0, 100)), confidence: clamp(15 + samples.length * 5, 0, 100) };
}
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; }
  else console.log("OK:", msg);
}
assert(scorePrecision([]).value === 0 && scorePrecision([]).confidence === 0, "new user: no fake precision");
{
  const early = Array.from({length: 10}, (_,i) => ({ accuracy: 40, errorHz: 55 + (i%3)*5 }));
  const late = Array.from({length: 10}, (_,i) => ({ accuracy: 85, errorHz: 12 + (i%3)*2 }));
  assert(scorePrecision(late).value > scorePrecision(early).value + 15, "improving precision");
}
{
  const wild = [{accuracy:10},{accuracy:60},{accuracy:20},{accuracy:70},{accuracy:15},{accuracy:65}];
  const steady = [{accuracy:22},{accuracy:25},{accuracy:20},{accuracy:24},{accuracy:21},{accuracy:23}];
  assert(scoreConsistency(steady).value > scoreConsistency(wild).value + 20, "improving consistency");
}
{
  const samples = Array.from({length: 12}, (_,i) => ({ accuracy: 90, errorHz: 8 + (i%2) }));
  assert(scorePrecision(samples).value > 70, "mixed strong precision");
}
console.log(process.exitCode ? "\nValidation finished with failures" : "\nAll simulations passed");
