# Kafka Client Decision Tree & Quick Reference

**Generated:** February 16, 2026

---

## 🎯 Quick Decision Tree

```
START: "I need a Kafka client for Node.js"
  │
  ├─ Q1: Do you have performance requirements > 50K msg/sec?
  │  │
  │  ├─ YES → Q2: Can you run C++ compiler in build pipeline?
  │  │  │
  │  │  ├─ YES → Use CONFLUENT JS ✅
  │  │  │
  │  │  └─ NO → Check if pre-built binary exists for your platform
  │  │     │
  │  │     ├─ YES → Use CONFLUENT JS ✅
  │  │     └─ NO → Use PLATFORMATIC KAFKA ⚠️ (with scaling strategy)
  │  │
  │  └─ NO → Q3: Want modern async/await syntax?
  │     │
  │     ├─ YES → Use PLATFORMATIC KAFKA ✅
  │     └─ NO → Use CONFLUENT JS (acceptable, more mature)
  │
  ├─ Q2: Do you need enterprise SLA + support?
  │  │
  │  ├─ YES → Use CONFLUENT JS ✅
  │  │
  │  └─ NO → Q3: Budget conscious ( ⏱️ time = $)?
  │     │
  │     ├─ YES (prioritize shipping speed) → Use PLATFORMATIC KAFKA ✅
  │     └─ NO (comfort with complexity) → Use CONFLUENT JS
  │
  └─ Q3: Using KafkaJS currently?
     │
     ├─ YES → Migrate to CONFLUENT JS (KafkaJS-compatible API)
     └─ NO → See Q1

Legend:
✅ = Recommended
⚠️ = Acceptable with caveats
❌ = Not recommended
```

---

## 📊 Feature Comparison Matrix

### Authentication & Security

```
┌─────────────────────┬──────────────┬────────────────┐
│ Feature             │ Confluent JS │ Platformatic   │
├─────────────────────┼──────────────┼────────────────┤
│ SASL/PLAIN          │ ✅ Full      │ ✅ Full        │
│ SASL/SCRAM-SHA-256  │ ✅ Full      │ ✅ Full        │
│ SASL/SCRAM-SHA-512  │ ✅ Full      │ ✅ Full        │
│ SASL/OAUTHBEARER    │ ✅ Full      │ ✅ Full        │
│ OAuth OIDC Support  │ ✅ Built-in  │ ⚠️ Manual      │
│ mTLS / TLS 1.3      │ ✅ Full      │ ✅ Full        │
│ Certificate Pinning │ ❌ No        │ ✅ Yes         │
│ Custom Auth Plugins │ ⚠️ Limited   │ ⚠️ Limited     │
│ FIPS 140-2 Ready    │ ✅ Yes       │ ❌ No          │
│ Kerberos Support    │ ✅ Yes       │ ❌ No          │
└─────────────────────┴──────────────┴────────────────┘
```

### Serialization Formats

```
┌─────────────────────┬──────────────┬────────────────┐
│ Format              │ Confluent JS │ Platformatic   │
├─────────────────────┼──────────────┼────────────────┤
│ Avro (via SR)       │ ✅ Native    │ ⚠️ Manual      │
│ Avro (manual)       │ ✅ Yes       │ ✅ Yes (avsc)  │
│ Protobuf (via SR)   │ ✅ Native    │ ⚠️ Manual      │
│ JSON Schema (via SR)│ ✅ Native    │ ⚠️ Manual      │
│ Plain JSON          │ ✅ Yes       │ ✅ Yes         │
│ Plain Text          │ ✅ Yes       │ ✅ Yes         │
│ Binary/Buffer       │ ✅ Yes       │ ✅ Yes         │
│ CloudEvents spec    │ ⚠️ Manual    │ ⚠️ Manual      │
│ Custom Serde        │ ✅ Yes       │ ✅ Yes         │
└─────────────────────┴──────────────┴────────────────┘
```

### Consumer Patterns

```
┌─────────────────────────┬──────────────┬────────────────┐
│ Pattern                 │ Confluent JS │ Platformatic   │
├─────────────────────────┼──────────────┼────────────────┤
│ At-least-once delivery  │ ✅ Full      │ ✅ Full        │
│ At-most-once delivery   │ ✅ Full      │ ✅ Full        │
│ Exactly-once semantics  │ ✅ Full (EOS)│ ✅ Yes         │
│ Batch processing        │ ✅ eachBatch │ ✅ eachBatch   │
│ Stream-style consume    │ ✅ Yes       │ ✅ Async iter  │
│ Manual offset mgmt      │ ✅ Full      │ ✅ Full        │
│ Offset reset strategies │ ✅ 4 types   │ ✅ 4 types     │
│ Delayed message retry   │ ⚠️ Manual    │ ⚠️ Manual      │
│ Dead-letter queue ready │ ⚠️ Manual    │ ⚠️ Manual      │
│ Pause/Resume partitions │ ✅ Yes       │ ✅ Yes         │
│ Seek arbitrary offset   │ ✅ Yes       │ ✅ Yes         │
│ Parallel processing     │ ✅ Yes (N)   │ ✅ Yes (N)     │
│ Ordered per partition   │ ✅ Enforced  │ ✅ Enforced    │
└─────────────────────────┴──────────────┴────────────────┘
```

### Producer Patterns

```
┌──────────────────────────┬──────────────┬────────────────┐
│ Pattern                  │ Confluent JS │ Platformatic   │
├──────────────────────────┼──────────────┼────────────────┤
│ Fire-and-forget          │ ✅ Yes       │ ✅ Yes         │
│ Sync send (wait for ack) │ ✅ Yes       │ ✅ Yes         │
│ Async send (callback)    │ ✅ Yes       │ ✅ Promises    │
│ Batch accumulation       │ ✅ linger.ms │ ✅ linger.ms   │
│ Idempotent producer      │ ✅ Full      │ ✅ Yes         │
│ Transactional producer   │ ✅ Full      │ ✅ Yes         │
│ Compression (gzip)       │ ✅ Yes       │ ✅ Yes         │
│ Compression (snappy)     │ ✅ Yes       │ ✅ Yes         │
│ Compression (lz4)        │ ✅ Yes       │ ✅ Yes         │
│ Compression (zstd)       │ ✅ Yes       │ ✅ Yes         │
│ Custom partitioner       │ ✅ Yes       │ ✅ Yes         │
│ Message retention check  │ ⚠️ Admin API  │ ⚠️ Admin API   │
│ Flush on demand          │ ✅ Yes       │ ✅ Yes         │
└──────────────────────────┴──────────────┴────────────────┘
```

### Admin Operations

```
┌──────────────────────────┬──────────────┬────────────────┐
│ Operation                │ Confluent JS │ Platformatic   │
├──────────────────────────┼──────────────┼────────────────┤
│ Create topic             │ ✅ Yes       │ ✅ Yes         │
│ Delete topic             │ ✅ Yes       │ ✅ Yes         │
│ Describe cluster         │ ✅ Yes       │ ✅ Yes         │
│ List topics              │ ✅ Yes       │ ✅ Yes         │
│ Alter configs            │ ✅ Yes       │ ✅ Yes         │
│ Describe configs         │ ✅ Yes       │ ✅ Yes         │
│ Fetch metadata           │ ✅ Yes       │ ✅ Yes         │
│ Create consumer group    │ ✅ Yes       │ ✅ Yes         │
│ Delete consumer group    │ ✅ Yes       │ ✅ Yes         │
│ Describe consumer group  │ ✅ Yes       │ ✅ Yes         │
│ List consumer groups     │ ✅ Yes       │ ✅ Yes         │
│ Reset group offsets      │ ✅ Yes       │ ✅ Yes         │
│ Alter replica count      │ ⚠️ Partial   │ ⚠️ Partial     │
│ Reassign partitions      │ ✅ Yes       │ ✅ Yes         │
└──────────────────────────┴──────────────┴────────────────┘
```

---

## 🚀 Quick Start Comparison

### Time to First Message

**Confluent JS:**

```
Setup:    5 mins (npm install + build native)
Code:     10 mins
Test:     5 mins
Total:    20 mins ⏱️
```

**Platformatic Kafka:**

```
Setup:    2 mins (npm install, no build)
Code:     10 mins
Test:     3 mins
Total:    15 mins ⏱️
```

---

## 📈 Scalability Profile

### Load vs Recommendation

```
Load (msg/sec)    Confluent JS         Platformatic      KafkaJS
─────────────────────────────────────────────────────────────────
< 1K              Both fine            ✅ Better        ⚠️ OK
1K - 10K          ✅ Both good         ✅ Best          ✅ OK
10K - 50K         ✅ Slight edge       ✅ Good          ❌ Struggles
50K - 100K        ✅ Best              ⚠️ Needs tune    ❌ Not viable
> 100K            ✅ Only option       ❌ Not viable    ❌ Not viable
```

---

## 💰 Cost Comparison (AWS Lambda / ECS Example)

### Monthly Cost for Processing 1B Messages/Month

**Scenario:** 1B messages/month, avg 1KB, consumed in 1h daily windows

```
                        Confluent JS       Platformatic       Difference
────────────────────────────────────────────────────────────────────
Compute (EC2/ECS)       $150/mo            $120/mo            -20%
Lambda (if applicable)  $800/mo            $600/mo            -25%
Build infrastructure    $200/mo            $0/mo              -100%
CI/CD time              3h/mo × $50        1h/mo × $50        -67%
Support                 $100-1K/mo         $0/mo              varies

Total (small setup)     ~$600-900/mo       ~$300-500/mo       -50%
```

---

## 🔍 Audit Checklist for Feb 2026 Decisions

Print this and fill monthly:

```
[ ] Date: ____________ (recheck quarterly)

CONFLUENT JS
[ ] Latest version released in last 3 months? (Y/N)
[ ] Any open critical CVEs? (Y/N)
[ ] Pre-built binary for my platform? (Y/N)
[ ] C++ build issues reported recently? (Y/N)
Link to check: https://github.com/confluentinc/confluent-kafka-javascript/releases

PLATFORMATIC KAFKA
[ ] Latest version released in last 3 months? (Y/N)
[ ] Any open critical CVEs? (Y/N)
[ ] Works on my target Node.js version? (Y/N)
[ ] Breaking changes in latest release? (Y/N)
Link to check: https://github.com/platformatic/kafka/releases

GENERAL
[ ] KafkaJS still unmaintained? (Y/N) - Should be YES ✅
[ ] New competitors emerged? (Y/N) - Search "kafka node" on npm
[ ] My throughput requirements changed? (Y/N)
[ ] My deployment constraints changed? (Y/N)
```

---

## 🛠️ Migration Paths

### From KafkaJS → Confluent JS (Recommended)

**Effort:** Low (same API)

```
1. Replace: require('@confluentinc/kafka-javascript').KafkaJS
2. Update brokers config: []kafkaJS: { brokers }
3. Test existing test suite (should pass)
4. Performance gains: Immediate (C implementation)
Time: 2-4 hours
```

### From KafkaJS → Platformatic Kafka

**Effort:** High (different API)

```
1. Rewrite producer/consumer setup
2. Update eachMessage to async iterator pattern
3. Rewrite all headers logic (Map vs object)
4. Update all error handling
5. Retest entire flow
Time: 2-3 days per service
```

### Confluent JS → Platformatic Kafka

**Effort:** Very High (different style)

```
1. Complete rewrite (different APIs)
2. Retest all scenarios
Time: 1 week per service
```

---

## 🎓 Recommended Reading Order

For decision makers:

1. Read: **Executive Summary** (5 mins)
2. Skim: **Detailed Comparison Table** (10 mins)
3. Check: **your use case in Real-World Use Cases** (5 mins)
4. Decide: Use **Quick Decision Tree** (2 mins)

For developers:

1. Read: **API & Developer Experience** (10 mins)
2. Code: **Review example code** (15 mins)
3. Test: **With YOUR workload** (2 hours)
4. Choose: **Based on actual benchmark** (10 mins)

For DevOps/SRE:

1. Read: **Operational Concerns** (10 mins)
2. Review: **Deployment scenarios** (10 mins)
3. Calculate: **Cost of Ownership** (15 mins)
4. Plan: **Build pipeline changes** (30 mins)

---

## ⚠️ Risk Matrix

```
Risk Level          Confluent JS    Platformatic    Mitigation
──────────────────────────────────────────────────────────────
Build failures      MEDIUM          LOW             Test in CI
Production issues   LOW             LOW             Monitor closely
Vendor lock-in      MEDIUM          LOW             Pure JS advantage
Upgrade challenges  LOW             LOW             Semver stable
Performance cliff   LOW             MEDIUM          Load test
Documentation      LOW             MEDIUM           Check GH issues
Community support   HIGH            MEDIUM          Forums available
```

---

Last Updated: **February 16, 2026**  
Next Review Recommended: **June 2026** (quarterly)
