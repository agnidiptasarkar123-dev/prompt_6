# HawaSaathi — Phase 6 Cloud Run Deployment Specification

**Document ID:** `HS-OPS-P6-CLOUDRUN-2026`\
**Target Platform:** Google Cloud Run (Fully Managed Serverless Container)\
**Target Region:** `asia-south1` (Mumbai, India)\
**Container Base:** Node.js 20 Alpine (`node:20-alpine`)\

---

## 1. Cloud Run Service Configuration (`service.yaml`)

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hawasaathi-app
  namespace: hawasaathi-5df69
  labels:
    cloud.google.com/location: asia-south1
    app.kubernetes.io/name: hawasaathi
    app.kubernetes.io/part-of: environmental-intelligence
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "80"
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/startup-cpu-boost: "true"
    spec:
      serviceAccountName: hawasaathi-cloudrun-sa@hawasaathi-5df69.iam.gserviceaccount.com
      timeoutSeconds: 300
      containerConcurrency: 80
      containers:
        - image: asia-south1-docker.pkg.dev/hawasaathi-5df69/hawasaathi-repo/hawasaathi-app:v1.0.0
          resources:
            limits:
              cpu: "2000m"
              memory: "2048Mi"
            requests:
              cpu: "1000m"
              memory: "512Mi"
          ports:
            - name: http1
              containerPort: 8080
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "8080"
            - name: FIREBASE_PROJECT_ID
              value: "hawasaathi-5df69"
            - name: GEMINI_MODEL
              value: "gemini-3.5-flash-lite"
            - name: NEXT_PUBLIC_FIREBASE_PROJECT_ID
              value: "hawasaathi-5df69"
            - name: DATA_GOV_IN_API_KEY
              valueFrom:
                secretKeyRef:
                  name: data-gov-in-api-key
                  key: latest
            - name: OPENAQ_API_KEY
              valueFrom:
                secretKeyRef:
                  name: openaq-api-key
                  key: latest
            - name: GEMINI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: gemini-api-key
                  key: latest
            - name: UPSTASH_REDIS_REST_URL
              valueFrom:
                secretKeyRef:
                  name: upstash-redis-rest-url
                  key: latest
            - name: UPSTASH_REDIS_REST_TOKEN
              valueFrom:
                secretKeyRef:
                  name: upstash-redis-rest-token
                  key: latest
          startupProbe:
            httpGet:
              path: /api/v1/health
              port: 8080
            initialDelaySeconds: 2
            periodSeconds: 5
            failureThreshold: 6
            timeoutSeconds: 3
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 8080
            periodSeconds: 15
            failureThreshold: 3
            timeoutSeconds: 3
```

---

## 2. Container Build & Release Flow

```bash
# 1. Build and tag production image locally using Cloud Build / Docker
gcloud builds submit --tag asia-south1-docker.pkg.dev/hawasaathi-5df69/hawasaathi-repo/hawasaathi-app:v1.0.0

# 2. Deploy container to Cloud Run with Secret Manager integrations
gcloud run deploy hawasaathi-app \
  --image asia-south1-docker.pkg.dev/hawasaathi-5df69/hawasaathi-repo/hawasaathi-app:v1.0.0 \
  --region asia-south1 \
  --service-account hawasaathi-cloudrun-sa@hawasaathi-5df69.iam.gserviceaccount.com \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80 \
  --memory 2048Mi \
  --cpu 2 \
  --set-env-vars NODE_ENV=production,PORT=8080,FIREBASE_PROJECT_ID=hawasaathi-5df69 \
  --set-secrets DATA_GOV_IN_API_KEY=data-gov-in-api-key:latest \
  --set-secrets OPENAQ_API_KEY=openaq-api-key:latest \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-secrets UPSTASH_REDIS_REST_URL=upstash-redis-rest-url:latest \
  --set-secrets UPSTASH_REDIS_REST_TOKEN=upstash-redis-rest-token:latest \
  --no-allow-unauthenticated # Access gated by Cloud Armor or custom domain proxy
```
