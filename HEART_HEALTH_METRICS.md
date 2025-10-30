# Heart Health Metrics: What's Real, What's Missing

## Current Implementation Analysis

### What's Actually Valid

**1. 2-Minute Heart Rate Recovery (HRR)**
- **What it measures**: Drop in heart rate from end of exercise to 2 minutes post-exercise
- **Clinical validity**: STRONG. Well-established cardiovascular health marker
- **Evidence**:
  - Abnormal HRR (< 12 bpm at 1 min, < 22 bpm at 2 min) associated with increased mortality risk
  - Cleveland Clinic studies (Cole et al., 1999, JAMA) showed HRR is independent predictor of death
  - Used clinically to assess autonomic nervous system function
- **Current implementation**: CORRECT
  - Linear interpolation of HR at workout end and +120s is appropriate
  - Using Strava time-series data is valid approach

**2. Heart Rate Variability (HRV) - RMSSD**
- **What it measures**: Root mean square of successive RR interval differences
- **Clinical validity**: STRONG for autonomic function, recovery status
- **Evidence**:
  - Gold standard for parasympathetic (recovery) nervous system activity
  - Lower HRV = worse cardiovascular health, higher stress, poor recovery
  - Validated metric in sports science and cardiology
- **Current implementation**: CORRECT
  - WHOOP provides RMSSD directly (validated hardware)
  - Nightly HRV from WHOOP is research-grade measurement

### What's Missing or Wrong

**1. Critical Missing Metrics**

**Chronic Training Load / Fitness-Fatigue Model**
- **What**: 7-day acute load vs 42-day chronic load ratio
- **Why it matters**: Detects overtraining before injury/illness
- **How to calculate**:
  ```
  Acute Load = SUM(last 7 days of TRIMP or TSS)
  Chronic Load = SUM(last 42 days of TRIMP or TSS) / 6
  ACWR = Acute / Chronic
  ```
- **Risk zones**:
  - < 0.8: Detraining
  - 0.8-1.3: Optimal (sweet spot)
  - > 1.5: High injury risk
- **NOT IMPLEMENTED**: No load tracking at all

**VO2 Max Estimation**
- **What**: Maximum oxygen uptake capacity
- **Why it matters**: Single best predictor of cardiovascular fitness and mortality
- **How to estimate from HR data**:
  ```
  If you have: max HR, resting HR, age, workout pace/power
  Use Firstbeat algorithm or ACSM equations
  ```
- **NOT IMPLEMENTED**: Not calculated

**HR Zone Time Distribution**
- **What**: % time in Zone 2 (aerobic base) vs Zone 4/5 (threshold/VO2max)
- **Why it matters**:
  - Endurance requires 80% Zone 2, 20% high intensity (Seiler's 80/20 rule)
  - Too much Zone 3 ("junk miles") = poor adaptation
- **Current issue**: No zone tracking, no time-in-zone analysis
- **Fix needed**: Parse HR time series into 5-zone model based on max HR

**Resting Heart Rate Trend**
- **What**: 7-day rolling average of morning RHR
- **Why it matters**:
  - Elevated RHR = overtraining, illness, poor recovery
  - Decreasing RHR over weeks = improved fitness
- **Current**: WHOOP provides RHR but no trending/alerting

**2. Orangetheory-Specific Issues**

**"Splat Points" are Marketing, Not Science**
- OTF's 12+ splat point goal is arbitrary
- Based on flawed "afterburn/EPOC" claims
- No peer-reviewed evidence for their specific thresholds

**What Actually Matters for OTF Workouts**:
1. **Total time > 84% max HR**: Valid HIIT stimulus threshold
2. **Recovery between intervals**: Should return to < 70% max HR
3. **Progressive overload**: Increase total work over 4-6 weeks, then deload

**3. Critical Calculation Errors**

**HRR Timing Issue**:
- Current implementation uses workout END timestamp
- Problem: OTF classes have cooldown period
- **Fix**: Should use HR at "last hard effort" not "class end"
- Strava data should identify last high-intensity segment, not elapsed_time

**No Heart Rate Reserve Adjustment**:
- Current zones likely using % of max HR
- **Better**: Use Karvonen formula (Heart Rate Reserve)
  ```
  Target HR = ((max HR - resting HR) × intensity%) + resting HR
  ```
- More accurate for individuals with high/low resting HR

**4. What's Made Up / Questionable**

**"Nightly HRV"**:
- WHOOP's specific HRV measurement is proprietary
- While RMSSD is valid, their processing/smoothing algorithms are not published
- **Verdict**: Likely valid but treat as relative metric, not absolute

**"Recovery Score"**:
- WHOOP's recovery percentage is weighted combination of HRV, RHR, sleep
- Weights are proprietary, not peer-reviewed
- **Verdict**: Useful trend indicator but not a clinical metric

## Robust Metrics to Add

### Priority 1: Implement These Immediately

**1. Training Load (TRIMP)**
Calculate Training Impulse for each workout:
```typescript
function calculateTRIMP(hrTimeSeries: {hr: number, seconds: number}[], restingHR: number, maxHR: number, sex: 'M' | 'F'): number {
  let trimp = 0;
  const k = sex === 'M' ? 1.92 : 1.67;

  for (const point of hrTimeSeries) {
    const hrr = (point.hr - restingHR) / (maxHR - restingHR); // HR Reserve %
    const duration = point.seconds / 60; // minutes
    trimp += duration * hrr * 0.64 * Math.exp(k * hrr);
  }
  return Math.round(trimp);
}
```

**2. 7-Day Rolling HRV Average**
```typescript
function calculateHRVTrend(last7Days: number[]): { avg: number, trend: 'improving' | 'declining' | 'stable' } {
  const avg = last7Days.reduce((a, b) => a + b) / last7Days.length;
  const first3 = last7Days.slice(0, 3).reduce((a, b) => a + b) / 3;
  const last3 = last7Days.slice(-3).reduce((a, b) => a + b) / 3;
  const change = ((last3 - first3) / first3) * 100;

  if (change > 5) return { avg, trend: 'improving' };
  if (change < -5) return { avg, trend: 'declining' };
  return { avg, trend: 'stable' };
}
```

**3. Workout Intensity Distribution**
```typescript
function analyzeIntensityDistribution(hrTimeSeries: {hr: number, seconds: number}[], maxHR: number): {
  z1: number, z2: number, z3: number, z4: number, z5: number
} {
  const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

  for (const point of hrTimeSeries) {
    const pct = (point.hr / maxHR) * 100;
    if (pct < 60) zones.z1 += point.seconds;
    else if (pct < 70) zones.z2 += point.seconds;
    else if (pct < 80) zones.z3 += point.seconds;
    else if (pct < 90) zones.z4 += point.seconds;
    else zones.z5 += point.seconds;
  }

  const total = Object.values(zones).reduce((a, b) => a + b);
  return {
    z1: Math.round((zones.z1 / total) * 100),
    z2: Math.round((zones.z2 / total) * 100),
    z3: Math.round((zones.z3 / total) * 100),
    z4: Math.round((zones.z4 / total) * 100),
    z5: Math.round((zones.z5 / total) * 100),
  };
}
```

### Priority 2: Actionable Insights

**Per-Workout Analysis**:
```typescript
interface WorkoutInsights {
  hrr2min: number;
  hrr2minStatus: 'excellent' | 'good' | 'fair' | 'poor';
  trimp: number;
  trimpCategory: 'easy' | 'moderate' | 'hard' | 'very_hard';
  zones: { z1: number, z2: number, z3: number, z4: number, z5: number };
  recommendation: string;
}

function generateWorkoutInsights(workout: Workout, hrTimeSeries: any, userProfile: { maxHR: number, restingHR: number }): WorkoutInsights {
  const hrr2min = workout.hrr2min || 0;
  const trimp = calculateTRIMP(hrTimeSeries, userProfile.restingHR, userProfile.maxHR, 'M');
  const zones = analyzeIntensityDistribution(hrTimeSeries, userProfile.maxHR);

  let hrr2minStatus: 'excellent' | 'good' | 'fair' | 'poor';
  if (hrr2min >= 50) hrr2minStatus = 'excellent';
  else if (hrr2min >= 35) hrr2minStatus = 'good';
  else if (hrr2min >= 22) hrr2minStatus = 'fair';
  else hrr2minStatus = 'poor';

  let trimpCategory: 'easy' | 'moderate' | 'hard' | 'very_hard';
  if (trimp < 100) trimpCategory = 'easy';
  else if (trimp < 200) trimpCategory = 'moderate';
  else if (trimp < 300) trimpCategory = 'hard';
  else trimpCategory = 'very_hard';

  // Generate recommendation
  let recommendation = '';
  if (hrr2min < 22) {
    recommendation = 'HRR below clinical threshold. Consider recovery day or reduce intensity.';
  } else if (zones.z3 > 30) {
    recommendation = 'High Zone 3 time. Try more polarized training: easier easy days, harder hard days.';
  } else if (trimp > 250 && hrr2min < 35) {
    recommendation = 'High load with moderate recovery. Monitor fatigue and consider extra rest.';
  } else {
    recommendation = 'Good workout balance. Continue current training approach.';
  }

  return { hrr2min, hrr2minStatus, trimp, trimpCategory, zones, recommendation };
}
```

**Weekly Readiness Score**:
```typescript
interface ReadinessScore {
  score: number; // 0-100
  status: 'ready' | 'caution' | 'rest';
  factors: {
    hrvTrend: 'positive' | 'neutral' | 'negative';
    rhrTrend: 'positive' | 'neutral' | 'negative';
    loadRatio: number; // ACWR
    recommendation: string;
  };
}

function calculateReadiness(
  hrvLast7Days: number[],
  rhrLast7Days: number[],
  trimpLast7Days: number[],
  trimpLast42Days: number[]
): ReadinessScore {
  const hrvAvg = hrvLast7Days.reduce((a, b) => a + b) / 7;
  const hrvBaseline = hrvLast7Days; // Should be user's 30-day baseline
  const hrvChange = ((hrvAvg - 50) / 50) * 100; // Placeholder baseline

  const rhrAvg = rhrLast7Days.reduce((a, b) => a + b) / 7;
  const rhrChange = ((55 - rhrAvg) / 55) * 100; // Placeholder baseline, lower is better

  const acuteLoad = trimpLast7Days.reduce((a, b) => a + b);
  const chronicLoad = trimpLast42Days.reduce((a, b) => a + b) / 6;
  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  let score = 50;
  score += Math.min(Math.max(hrvChange, -25), 25);
  score += Math.min(Math.max(rhrChange, -15), 15);
  if (acwr < 0.8) score -= 10;
  else if (acwr > 1.5) score -= 20;
  else if (acwr >= 0.8 && acwr <= 1.3) score += 10;

  let status: 'ready' | 'caution' | 'rest';
  if (score >= 70) status = 'ready';
  else if (score >= 50) status = 'caution';
  else status = 'rest';

  const recommendation =
    status === 'ready'
      ? 'Your body is recovered and ready for hard training.'
      : status === 'caution'
      ? 'Consider a moderate day or active recovery. Avoid high-intensity work.'
      : 'Your body needs rest. Take a recovery day or very light activity only.';

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    factors: {
      hrvTrend: hrvChange > 5 ? 'positive' : hrvChange < -5 ? 'negative' : 'neutral',
      rhrTrend: rhrChange > 3 ? 'positive' : rhrChange < -3 ? 'negative' : 'neutral',
      loadRatio: Math.round(acwr * 100) / 100,
      recommendation,
    },
  };
}
```

## Database Schema Updates Needed

```prisma
model Workout {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  whoopId       Int      @unique
  start         DateTime
  end           DateTime
  avgHr         Int?
  maxHr         Int?
  hrr2min       Int?
  trimp         Int?     // ADD THIS
  zones         Json?    // ADD THIS: {z1: 20, z2: 45, z3: 20, z4: 10, z5: 5}
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model UserProfile {  // ADD THIS TABLE
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  maxHr         Int
  restingHr     Int
  age           Int?
  sex           String?  // M or F for TRIMP calculation
  updatedAt     DateTime @updatedAt
}
```

## References

1. Cole CR, et al. "Heart-Rate Recovery Immediately after Exercise as a Predictor of Mortality." NEJM 1999; 341:1351-1357
2. Buchheit M. "Monitoring training status with HR measures: do all roads lead to Rome?" Front Physiol 2014; 5:73
3. Gabbett TJ. "The training-injury prevention paradox." Br J Sports Med 2016; 50:273-280
4. Seiler S. "What is best practice for training intensity and duration distribution in endurance athletes?" Int J Sports Physiol Perform 2010; 5:276-291

## Summary

**What to fix immediately**:
1. Add TRIMP calculation to all workouts
2. Add zone distribution analysis
3. Track Acute:Chronic Workload Ratio
4. Add 7-day HRV and RHR trending
5. Generate per-workout recommendations
6. Add weekly readiness score

**What's already correct**:
- 2-min HRR calculation and clinical interpretation
- HRV (RMSSD) tracking from WHOOP
- Linear interpolation of HR time series

**What to ignore**:
- OTF "splat points" marketing
- WHOOP "recovery %" as absolute metric (use as relative trend only)
