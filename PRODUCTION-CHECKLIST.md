# Production Deployment & Validation Guide

**For Node.js Kafka Clients** | February 16, 2026

---

## Pre-Production Validation Checklist

Use this **2-week checklist** before deploying Kafka to production.

### Week 1: Choice & Setup

#### Day 1: Requirements Definition

- [ ] Document throughput requirement (msgs/sec)
- [ ] Define latency SLA (p50, p95, p99)
- [ ] List authentication method (SASL/PLAIN, mTLS, etc.)
- [ ] Identify serialization format (JSON, Avro, Protobuf)
- [ ] Determine consumer group strategy
- [ ] Calculate expected message size (bytes)
- [ ] Define deployment environment (Docker, K8s, Lambda, EC2)
- [ ] Set budget constraint ($ per month)

**Questions to Answer:**

- What happens if a message is lost? (acceptable?)
- What happens if a message is duplicated? (acceptable?)
- What's the max acceptable lag? (seconds)

#### Day 2-3: Prototype & Compare

- [ ] Set up Confluent JS example in local environment
- [ ] Set up Platformatic Kafka example in local environment
- [ ] Run both producer/consumer examples
- [ ] Time: npm install → first message flow
  - [ ] Record Confluent JS time: **\_** minutes
  - [ ] Record Platformatic time: **\_** minutes
- [ ] Verify both run without errors
- [ ] Check Docker image size difference
  - [ ] Confluent JS: **\_** MB
  - [ ] Platformatic: **\_** MB

**Decision Point:**

- If Confluent faster by >2x AND budget allows → Continue with Confluent JS
- Otherwise → Consider Platformatic Kafka

#### Day 4-5: Local Performance Bench

- [ ] Run producer benchmark (10K messages)
  - [ ] Confluent JS: **\_** msg/sec, CPU: \_**\_%, Memory: \_\_\_**MB
  - [ ] Platformatic: **\_** msg/sec, CPU: \_**\_%, Memory: \_\_\_**MB
- [ ] Run consumer benchmark (10K messages)
  - [ ] Confluent JS: **\_** msg/sec, CPU: \_**\_%, Memory: \_\_\_**MB
  - [ ] Platformatic: **\_** msg/sec, CPU: \_**\_%, Memory: \_\_\_**MB
- [ ] Verify all data arrives (0 message loss)
- [ ] Check offset management (should auto-commit)

**Acceptance Criteria:**

- Throughput >= 80% of requirement
- Memory < 100MB for both
- CPU < 50% during normal operations
- 0 message loss

#### Day 6-7: Feature Verification

- [ ] Consumer group rebalancing works (add/remove consumer)
- [ ] Offset management (manually commit, verify state)
- [ ] Error scenarios (broker down, network partition)
- [ ] Graceful shutdown (no message loss on kill -TERM)
- [ ] Headers functionality (multipart message headers)
- [ ] Compression (enable & verify bytes saved)

**If using Avro:**

- [ ] Schema registration works
- [ ] Schema evolution handled
- [ ] Versioning strategy documented

---

### Week 2: Integration & Strategy

#### Day 8-9: Environment-Specific Testing

- [ ] Docker build works (no platform issues)
- [ ] Kubernetes deployment test (if applicable)
- [ ] Cloud provider IAM auth test (AWS/GCP/Azure)
- [ ] SSL/TLS certificates verify correctly
- [ ] SASL credentials work in target env

**Platform-Specific Tests:**

**Docker:**

- [ ] Build time: **\_** seconds
- [ ] Image size: **\_** MB
- [ ] First startup: **\_** ms
- [ ] Memory limit sufficient: **\_**MB

**Kubernetes:**

- [ ] Pod startup: **\_** seconds
- [ ] Readiness probe works
- [ ] Graceful termination (30s timeout OK?)
- [ ] Resource requests defined

**Lambda (if applicable, Platformatic only):**

- [ ] Cold start: **\_** ms
- [ ] Memory allocation: **\_** MB
- [ ] Timeout setting: **\_** seconds
- [ ] VPC connectivity: working/not-needed

#### Day 10: Monitoring & Observability

- [ ] Metrics collection setup
  - [ ] DataDog / New Relic / Prometheus agent installed
  - [ ] Kafka client metrics exported
- [ ] Key metrics to monitor identified:
  - [ ] Messages produced per minute
  - [ ] Messages consumed per minute
  - [ ] Consumer lag (target: <30 seconds)
  - [ ] Error rate
  - [ ] GC pause time
- [ ] Alerts configured:
  - [ ] Consumer lag > 1 minute
  - [ ] Error rate > 1%
  - [ ] Connection failures
  - [ ] Memory pressure
- [ ] Logging level set (DEBUG for first week, INFO after)

#### Day 11: Incident Simulation

- [ ] Test broker failure scenario
  - [ ] Expected recovery time: **\_** seconds
  - [ ] Verify auto-reconnect works
- [ ] Test network partition (drop traffic 30sec)
  - [ ] Messages buffered? Yes / No
  - [ ] Automatic recovery? Yes / No
- [ ] Test consumer crash
  - [ ] Another consumer picks up? Yes / No
  - [ ] Restart restores from offset? Yes / No
- [ ] Test producer crash
  - [ ] Unsent messages lost? Yes / No (if OK for you)
  - [ ] Verify retry logic

**Document results in runbook**

#### Day 12-14: Capacity Planning & Go/No-Go

- [ ] Calculated safe request rate (80% headroom):
  - [ ] Confluent JS can handle: **\_** msg/sec
  - [ ] Platformatic can handle: **\_** msg/sec
  - [ ] Your requirement: **\_** msg/sec
  - [ ] ✅ Safe if requirement <= calculated \* 0.8
- [ ] Memory monitoring 24h
  - [ ] Peak memory usage: **\_**MB
  - [ ] Memory leak detected? Yes / No
- [ ] Cost analysis updated:
  - [ ] Monthly cost estimate: $**\_**
  - [ ] Within budget? Yes / No
- [ ] Team training completed
  - [ ] Developers understand API
  - [ ] DevOps understand deployment
  - [ ] On-call engineer has runbook

**Go/No-Go Decision:**

- [ ] All tests passed
- [ ] Capacity safe
- [ ] Cost acceptable
- [ ] Team ready
- [ ] **APPROVED FOR PRODUCTION: Date **\_****

---

## Architecture Decision Record (ADR)

Document this for future reference:

```markdown
# ADR-001: Kafka Client Technology Selection

**Date:** February 16, 2026
**Status:** Approved
**Authors:** [Your Names]

## Problem

Need to select Kafka client library for Node.js microservices.

## Context

- Throughput: \_\_\_ msg/sec
- Latency SLA: p99 < \_\_\_ ms
- Environment: [Docker / Kubernetes / Lambda / EC2]
- Team: [JavaScript/TypeScript, Node.js experienced]
- Budget: $**\_** per month

## Decision

**Selected:** [Confluent JS / Platformatic Kafka]

## Rationale

1. Performance meets requirements (tested with \_\_\_ msg/sec)
2. Deployment matches our infrastructure (Docker/K8s/etc)
3. Team expertise available (C++ build / Pure JS)
4. Cost acceptable ($\_\_\_ per month)
5. Risk acceptable (monitoring plan in place)

## Alternatives Considered

1. [Other option] - Rejected because...
2. [Other option] - Rejected because...

## Consequences

- Build time impact: **\_** minutes
- Memory overhead: **\_** MB per instance
- Monitoring required: [List metrics]
- Support model: [Internal / Confluent / Community]

## Migration Path

- From: [Previous client]
- Effort: [Low / Medium / High]
- Timeline: [Weeks]
- Rollback plan: [Describe]
```

---

## Deployment Checklist (Per Environment)

### Docker Deployment

```
PRE-BUILD
[ ] Dockerfile specifies Node 18+
[ ] .dockerignore excludes node_modules
[ ] Build command tested locally

BUILD STAGE
[ ] npm ci (not npm install for consistency)
[ ] Build succeeds under 10 minutes
[ ] No build warnings
[ ] No security vulnerabilities (npm audit)

RUNTIME STAGE
[ ] ENTRYPOINT or CMD correctly set
[ ] Environment variables configured:
    - KAFKA_BROKERS
    - KAFKA_GROUP_ID
    - LOG_LEVEL
    - NODE_ENV (production)

TESTING
[ ] Docker image builds: Y/N
[ ] Image size < 300MB: Y/N (with Confluent)
[ ] Image size < 100MB: Y/N (with Platformatic)
[ ] Container starts: Y/N
[ ] Health check responds: Y/N
[ ] Graceful shutdown (SIGTERM) works: Y/N
[ ] Test with docker-compose locally: Y/N

REGISTRY
[ ] Image tagged with version
[ ] Image scanned for vulnerabilities
[ ] Image pushed to registry
[ ] Image verified in registry

STAGING TEST
[ ] Pull image from registry
[ ] Deploy to staging
[ ] Verify connectivity to Kafka
[ ] Verify producer/consumer working
[ ] Monitor for 24 hours
[ ] Check logs for errors: None/Minor/Critical
```

### Kubernetes Deployment

```
MANIFEST PREP
[ ] Namespace created
[ ] ConfigMap for non-sensitive config
[ ] Secret for credentials (Kafka auth)
[ ] ServiceAccount created (if needed)

DEPLOYMENT SPEC
[ ] Container image specified with tag
[ ] Resource requests set:
    - CPU: _____ m
    - Memory: _____ Mi
[ ] Resource limits set:
    - CPU: _____ m
    - Memory: _____ Mi
[ ] Environment variables injected:
    - From ConfigMap: Y/N
    - From Secret: Y/N
[ ] Liveness probe configured (port & interval)
[ ] Readiness probe configured (port & interval)
[ ] Startup probe configured (if slow to start)

VOLUMES (if needed)
[ ] PersistentVolumeClaim defined
[ ] Mount path correct
[ ] Access mode: ReadWriteOnce/ReadOnlyMany

SERVICE
[ ] Service type: ClusterIP/LoadBalancer/NodePort
[ ] Ports exposed correctly
[ ] Selector matches pod labels

RBAC
[ ] ClusterRoleBinding created (if needed)
[ ] ServiceAccount permissions verified

TESTING
[ ] Apply manifest to staging: Y/N
[ ] Pods create successfully: Y/N
[ ] Readiness probes pass: Y/N
[ ] Can connect to broker: Y/N
[ ] Producer/consumer work: Y/N
[ ] Logs contain no errors: Y/N
[ ] Simulate pod deletion → auto-recreate: Y/N
[ ] Scale to 3 replicas → all work: Y/N
[ ] Roll update to new image → smooth: Y/N
[ ] Graceful shutdown on pod delete: Y/N

MONITORING
[ ] Prometheus scrape configured
[ ] Grafana dashboard created
[ ] Alerts set up (lag, errors, latency)
[ ] Ready for production canary: Y/N
```

---

## Runbook: Common Issues

### Issue 1: Consumer Lag Growing

**Diagnosis:**

```bash
# Check lag via admin API
consumer_lag=$(AdminClient.describeGroup('my-group'))
# If lag > 1 min and growing, investigate:
```

**Root Causes:**

- [ ] Consumer crashed? Check logs
- [ ] Processing too slow? Increase concurrency
- [ ] Network latency? Check broker connectivity
- [ ] Too few consumers? Add replicas

**Fix:**

```typescript
// Increase parallelism
consumer.run({
  partitionsConsumedConcurrently: 4, // was 1
  eachMessage: async ({ topic, message }) => {
    // Your processing
  },
});
```

### Issue 2: Messages Not Produced

**Diagnosis:**

```typescript
const result = await producer.send({
  /* ...config */
});
if (!result) console.log("Undelivered");
```

**Root Causes:**

- [ ] Broker unreachable? Check network
- [ ] Topic doesn't exist? Create it
- [ ] Producer not connected? Call .connect()
- [ ] Serialization error? Check schema

**Fix:**

```typescript
// Add retry logic
const producer = kafka.producer({
  retry: {
    initialRetryTime: 100,
    retries: 8,
    multiplier: 2,
  },
});
```

### Issue 3: High Memory Usage

**Diagnosis:**

```bash
# Record heap size over time
setInterval(() => {
  const used = process.memoryUsage().heapUsed;
  console.log('Heap used:', used / 1024 / 1024, 'MB');
}, 5000);
```

**Root Causes:**

- [ ] Message batching too large? Reduce batch.size
- [ ] Memory leak in consumer loop? Check eachMessage
- [ ] Too many concurrent partitions? Reduce concurrency
- [ ] Long message queue? Check broker lag

**Fix:**

```typescript
const producer = new Kafka().producer({
  "batch.size": 32000, // was 1MB, reduce to 32KB
  "queue.buffering.max.messages": 100000, // limit queue
});
```

### Issue 4: Graceful Shutdown Not Working

**Symptoms:**

```
// Process takes > 30 seconds to exit
// Messages lost during shutdown
```

**Fix:**

```typescript
// Add proper shutdown handlers
async function gracefulShutdown() {
  console.log("Graceful shutdown starting");
  consumer?.disconnect?.();
  producer?.disconnect?.();
  // Wait for pending operations
  await new Promise((r) => setTimeout(r, 2000));
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Set Kubernetes terminationGracePeriodSeconds: 30
```

---

## Performance Tuning Guide

### For Confluent JS

Production config example:

```typescript
const producer = new Kafka().producer({
  "bootstrap.servers": process.env.KAFKA_BROKERS,
  "compression.type": "snappy",
  "batch.size": 102400, // 100KB, good balance
  "linger.ms": 10, // Wait up to 10ms for batches
  acks: 1, // Fast, producer waits for leader
  retries: 3,
  "retry.backoff.ms": 100,
});

const consumer = new Kafka().consumer({
  "bootstrap.servers": process.env.KAFKA_BROKERS,
  "group.id": process.env.KAFKA_GROUP_ID,
  "auto.offset.reset": "latest",
  "session.timeout.ms": 30000,
  "heartbeat.interval.ms": 3000,
  "max.poll.records": 500,
});
```

### For Platformatic Kafka

Production config example:

```typescript
const producer = new Producer({
  clientId: "producer",
  bootstrapBrokers: process.env.KAFKA_BROKERS.split(","),
  retry: {
    initialRetryTime: 100,
    retries: 8,
    multiplier: 2,
  },
  compression: CompressionTypes.Snappy,
});

const consumer = new Consumer({
  clientId: "consumer",
  bootstrapBrokers: process.env.KAFKA_BROKERS.split(","),
  groupId: process.env.KAFKA_GROUP_ID,
  allowAutoTopicCreation: false,
});
```

---

## Post-Launch Monitoring (First 48 Hours)

Checklist for first 2 days in production:

```
HOUR 0-1 (Immediate)
[ ] All pods/services started successfully
[ ] No errors in logs
[ ] Metrics flowing to monitoring system
[ ] Initial alert test passed

HOUR 1-4 (Early traffic)
[ ] Message throughput nominal (compare to test)
[ ] Consumer lag stable
[ ] No memory runaway
[ ] Error rate < 0.1%
[ ] Latencies p99 < SLA

HOUR 4-12 (Peak hours)
[ ] Sustained throughput OK
[ ] No performance degradation over time
[ ] CPU/Memory stable
[ ] Rebalances completing normally
[ ] Graceful shutdown tested (drain traffic)

HOUR 12-24 (Extended stability)
[ ] 24h uptime reached
[ ] Total message count correct
[ ] No duplicate message issues
[ ] Consumer group state consistent
[ ] Monitoring alert accuracy tested

HOUR 24-48 (Confidence check)
[ ] Compare metrics to pre-launch projections
[ ] Verify all features working
[ ] Run incident simulation test
[ ] Team signed off on production readiness
[ ] Switch from "warning mode" to "normal mode"
```

---

## Success Criteria: You're Ready!

✅ **Production is ready when:**

1. **Functional:**
   - Producer sends messages consistently
   - Consumer receives all messages
   - Offsets managed correctly
   - No data loss in normal operation

2. **Performance:**
   - Throughput >= 90% of requirement
   - Latency p99 < SLA
   - Memory < 200MB base per instance
   - CPU < 40% under normal load

3. **Reliability:**
   - No unhandled exceptions in 24h
   - Graceful shutdown working
   - Auto-recover from broker restarts
   - Alert system validated

4. **Operational:**
   - Team trained (2 people per shift)
   - Runbook documented
   - Monitoring configured
   - On-call escalation clear

5. **Compliance:**
   - Security review passed
   - Data retention policy understood
   - Backup strategy (if needed) defined
   - Audit logging configured

---

## Post-Deployment Support

### First 2 Weeks

- [ ] Daily standup to review metrics
- [ ] Weekly code review of Kafka integration
- [ ] Monitor GitHub issues (both libraries)
- [ ] Be ready to scale if needed

### Ongoing

- [ ] Monthly security updates check
- [ ] Quarterly dependency updates
- [ ] Bi-annually re-assess package choice
- [ ] Maintain runbooks as you learn

---

**Document created:** February 16, 2026  
**Review frequency:** Every 6 months or after major incidents  
**Last reviewed:** ****\_****
