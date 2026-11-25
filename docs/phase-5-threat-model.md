# Phase 5 — STRIDE Threat Model & Risk Assessment
## Comprehensive Threat Modeling Across All Architectural Boundaries

> **Document ID:** `HS-P5-THRT-001`\
> **Timestamp:** `2026-11-24T14:57:00+05:30`\
> **Platform:** HawaSaathi (हवासाथी / হাওয়াসাথী)\
> **Author:** Application Security Architect & Principal Software Engineer\
> **Framework:** Microsoft STRIDE Threat Modeling Methodology\
> **Status:** REVIEWED & MITIGATED\

---

## 1. Threat Modeling Scope & Boundaries

The HawaSaathi system boundaries evaluated under the STRIDE methodology encompass:
1. **Client Boundary:** Browser execution environment, guest storage (`sessionStorage`), authenticated Firebase client SDK.
2. **Network Boundary:** HTTPS ingress, Next.js BFF API routes (`/api/v1/*`), CSRF tokens, session cookies.
3. **Application & Service Boundary:** CPCB Sub-Index Engine, Source Orchestrator, Gemini Multi-Model AI Explainer.
4. **Data Persistence Boundary:** Firebase Admin SDK, Cloud Firestore, Upstash Redis caching tier.
5. **External Provider Boundary:** Open-Meteo API, CPCB CAAQMS (`data.gov.in`), OpenAQ v3 API, Google Gemini API.

---

## 2. STRIDE Threat Assessment & Mitigation Matrix

### 2.1 Spoofing (Identity Threats)
| Threat ID | Threat Scenario | Impact | Severity | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **TR-SP-01** | Attacker crafts forged JWT or modifies `uid` claim | Unauthorized access to user profiles | **CRITICAL** | Server-side validation via `firebaseAdmin.auth().verifyIdToken(token, true)` with revocation check. | `P5-SEC-012` |
| **TR-SP-02** | Attacker sends malicious `x-mock-auth-uid` header in production | Arbitrary account impersonation | **CRITICAL** | `x-mock-auth-uid` is disabled when `NODE_ENV === "production"`. | `P5-SEC-018` |
| **TR-SP-03** | Attacker spoofs Origin / Referer header | CSRF and unauthorized cross-origin calls | **MEDIUM** | Strict origin validation checking allowed application origins. | `P5-SEC-025` |

### 2.2 Tampering (Data Integrity Threats)
| Threat ID | Threat Scenario | Impact | Severity | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **TR-TM-01** | Attacker manipulates AQI readings sent to client | Misleading public health advice | **CRITICAL** | Mathematical AQI computation is strictly server-side; client never computes or overrides AQI. | `P3-DOM-001` |
| **TR-TM-02** | Attacker attempts prompt injection via household profile names | AI generates dangerous health guidance | **HIGH** | Strict sanitization of dynamic context; strict Zod schema validation on all inputs. | `P3-GEM-015` |
| **TR-TM-03** | Malicious injection in i18n interpolation tokens | Client-side XSS via `{aqi}` or `{city}` | **HIGH** | React automatic JSX escaping; pure string substitution without `dangerouslySetInnerHTML`. | `P5-RTL-040` |

### 2.3 Repudiation (Audit & Traceability Threats)
| Threat ID | Threat Scenario | Impact | Severity | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **TR-RP-01** | User disputes account deletion or data modification | Regulatory compliance dispute (DPDP Act) | **MEDIUM** | Timestamped audit records for consent updates, data export, and deletion operations. | `P5-PRIV-050` |
| **TR-RP-02** | Dispute over published air quality readings | Inability to defend historical health advisories | **HIGH** | Every reading preserves strict 4-way data typology, station ID, and observation timestamp. | `P3-CPCB-022` |

### 2.4 Information Disclosure (Privacy & Confidentiality Threats)
| Threat ID | Threat Scenario | Impact | Severity | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **TR-ID-01** | Accidental leakage of Firebase service account key | Full compromise of Cloud Firestore | **CRITICAL** | Private key accessible solely via server environment variables; gitignore filters. | `P5-PROD-010` |
| **TR-ID-02** | Leakage of sensitive health conditions in profile API | DPDP / GDPR regulatory violation | **HIGH** | Health inputs restricted strictly to optional non-diagnostic sensitivities; zero clinical profiling. | `P5-PRIV-080` |
| **TR-ID-03** | Server stack trace disclosure on 500 error | Attacker learns internal paths and dependencies | **LOW** | Structured error handlers return sanitized codes (`AIR_QUALITY_FETCH_ERROR`). | `P5-COV-044` |

### 2.5 Denial of Service (Availability Threats)
| Threat ID | Threat Scenario | Impact | Severity | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **TR-DS-01** | Request flooding on expensive Gemini AI endpoints | Gemini API quota exhaustion & high costs | **HIGH** | Sliding-window rate limiting (60 req/min); aggressive caching of environmental summaries. | `P5-PERF-020` |
| **TR-DS-02** | Upstream CPCB / OpenAQ server downtime | Application service disruption | **HIGH** | Multi-tier failover: CPCB $\to$ OpenAQ $\to$ Open-Meteo CAMS forecast with cached fallback. | `P3-ORCH-010` |
| **TR-DS-03** | ReDoS attacks via complex regex matching in i18n | Node.js event loop blocking | **MEDIUM** | Regex patterns in `locale-registry.ts` are linear time, non-backtracking character classes. | `P5-CAT-120` |

### 2.6 Elevation of Privilege (Authorization Threats)
| Threat ID | Threat Scenario | Impact | Severity | Implemented Mitigation | Verification |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **TR-EP-01** | IDOR attack on `/api/v1/profile` querying arbitrary UID | Viewing / modifying other users' profiles | **CRITICAL** | Server ignores request body `uid`; derives authenticated UID strictly from verified token. | `P5-SEC-080` |
| **TR-EP-02** | Direct client SDK connection to Firestore bypassing BFF | Bypassing BFF validation rules | **CRITICAL** | Firestore security rules enforce `allow read, write: if false;` for all client callers. | `P5-SEC-095` |

---

## 3. Residual Risk Summary

All identified STRIDE threats have been mitigated through structural engineering controls and verified via automated test suites. Residual risk is classified as **LOW** and acceptable for production deployment.
