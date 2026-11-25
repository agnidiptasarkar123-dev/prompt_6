# HawaSaathi — Phase 6 Rollback & Incident Recovery Runbook

**Document ID:** `HS-OPS-P6-ROLLBACK-2026`\
**Classification:** Standard Operating Procedure (SOP)\
**Applicability:** Production Deployments, Incident Response, Failed Releases\

---

## 1. Cloud Run Instant Traffic Rollback

Cloud Run retains previous immutable revisions. If an incident or severe regression is detected in a new release:

```bash
# Step 1: List existing revisions to identify the previous known-good revision
gcloud run revisions list \
  --service hawasaathi-app \
  --region asia-south1 \
  --project hawasaathi-5df69 \
  --format="table(name,active,traffic_percent,creationTimestamp)"

# Step 2: Roll back 100% of live traffic immediately to the previous revision
# Replace <PREVIOUS_REVISION_NAME> with the target stable revision (e.g. hawasaathi-app-00004-abc)
gcloud run services update-traffic hawasaathi-app \
  --region asia-south1 \
  --project hawasaathi-5df69 \
  --to-revisions <PREVIOUS_REVISION_NAME>=100

# Step 3: Verify traffic shifting completion
gcloud run services describe hawasaathi-app \
  --region asia-south1 \
  --project hawasaathi-5df69 \
  --format="value(status.traffic)"
```
*Recovery Time Objective (RTO):* $\le 15 \text{ seconds}$.

---

## 2. Emergency Feature Disabling (Feature Flags)

If an external dependency (such as Gemini AI or CPCB upstream feeds) experiences a sustained outage, individual features can be toggled without redeploying code:

1. **Disable Gemini AI Narrative (Enforce Deterministic Recommendations):**
   Set container environment variable `GEMINI_DISABLED=true` or update Secret Manager `gemini-api-key` to trigger fallback to `DeterministicRecommender`.
2. **Force Local In-Memory Rate Limiting (Bypass Redis):**
   Temporarily change runtime to development/fallback mode if Upstash Redis experiences a global partition.
3. **Switch Default AQI Provider to OpenAQ / Open-Meteo:**
   If CPCB national feed (`data.gov.in`) undergoes statutory maintenance, the BFF automatically trips its circuit breaker and serves OpenAQ / CAMS data.

---

## 3. Database & State Recovery

- **Firestore Point-in-Time Recovery (PITR):** Cloud Firestore Standard edition in `asia-south1` maintains continuous 7-day point-in-time recovery for disaster scenarios.
- **Session Eviction:** If session corruption occurs, revoke active user refresh tokens via Firebase Admin SDK script `scripts/verify-firebase-live.ts`.
