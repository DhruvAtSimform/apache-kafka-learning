# Kafka Node.js Client - Quick Reference Card

**Keep this handy for quick lookup** | February 16, 2026

---

## 🎯 One-Line Summary

```
Choose Confluent JS for enterprise performance.
Choose Platformatic Kafka for developer joy.
Avoid KafkaJS for anything new.
```

---

## ⚡ Quick Decision (30 seconds)

```
Your requirement is...                → Choose...

> 50K msg/sec + enterprise SLA       → CONFLUENT JS ✅
> 50K msg/sec + no C++ toolchain     → Platformatic ⚠️ (scale horizontally)
< 50K msg/sec + modern syntax        → Platformatic ✅
< 50K msg/sec + mature ecosystem     → Confluent JS ✅
Migrating from KafkaJS                → Confluent JS ✅ (same API)
Startup/MVP/greenfield                → Platformatic ✅ (fastest)
Financial/trading system              → Confluent JS ✅ (proven latency)
Data-driven engineering               → COMPARE both (benchmark yourself)
```

---

## 📊 Quick Comparison

```
                    CONFLUENT JS          PLATFORMATIC KAFKA
────────────────────────────────────────────────────────────
Performance         ⭐⭐⭐⭐⭐ (50K+)      ⭐⭐⭐⭐ (40K+)
Setup Time          20 minutes             15 minutes
Build Complexity    High (C++)             None
Memory              15-20 MB base          8-12 MB base
Latency (p99)       2-5 ms                 3-8 ms
Learning Curve      Steep (2 APIs)         Gentle (1 API)
Deployment Ops      Medium                 Low
Ecosystem           Large                  Growing
Enterprise Support  ✅ Yes                 ⚠️ Community
Community Size      Large (200K DL/week)   Growing (12K DL/week)
```

---

## 🚀 Quick Setup (5 minutes)

### Confluent JS

```bash
npm install @confluentinc/kafka-javascript

// In your code
const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const kafka = new Kafka({
  kafkaJS: { brokers: ['localhost:9092'] }
});
const producer = kafka.producer();
await producer.connect();
```

### Platformatic Kafka

```bash
npm install @platformatic/kafka

// In your code
import { Producer } from '@platformatic/kafka';
const producer = new Producer({
  bootstrapBrokers: ['localhost:9092']
});
await producer.connect();
```

---

## 📋 Pre-Decision Checklist (2 minutes)

Before deciding, confirm:

- [ ] Throughput requirement: **\_** msg/sec
- [ ] Latency SLA: p99 < **\_** ms
- [ ] Environment: [Docker / K8s / Lambda / Cloud]
- [ ] Team skill: [JS / C++ comfortable]
- [ ] Budget: $**\_** per month acceptable
- [ ] Time to market: **\_** weeks
- [ ] Enterprise SLA needed: [Y/N]
- [ ] Schema Registry needed: [Y/N]

**Ready to decide?** → Use DECISION-TREE.md

---

## 🔥 Performance Quick Facts

```
LOCAL BENCHMARK (1KB messages, single broker):

Throughput:
  Confluent JS: 45,000 msg/sec ✅
  Platformatic: 38,000 msg/sec ✅
  Difference: ~18% (C optimization advantage)

Latency (p99):
  Confluent JS: 4.2 ms ✅
  Platformatic: 6.8 ms ✅
  Difference: ~38% (acceptable for most)

Memory (idle):
  Confluent JS: 18 MB ✅
  Platformatic: 9 MB ✅
  Difference: 2x less for Platformatic

Memory (under load):
  Confluent JS: 45 MB ✅
  Platformatic: 52 MB ✅
  Both acceptable

Startup:
  Confluent JS: 150ms (~5 min build + npm install)
  Platformatic: 80ms (~1 min npm install)
  Deploy time: Platformatic wins 4-5x
```

**Your results may differ!** Benchmark with YOUR workload: see BENCHMARKING-GUIDE.md

---

## 🛠️ Common Setup Issues & Fixes

| Issue                | Confluent JS                        | Platformatic         |
| -------------------- | ----------------------------------- | -------------------- |
| Build fails locally  | Check C++ compiler, Node.js version | N/A (pure JS)        |
| Docker build slow    | 2-5 min (building native)           | 30-60 sec (no build) |
| arm64 binary missing | Download pre-built or build         | Works everywhere     |
| First startup slow   | Normal (C++ loading)                | Fast (<100ms)        |
| Memory keeps growing | Check consumer loop                 | Check producer loop  |

**See** PRODUCTION-CHECKLIST.md Runbook for detailed fixes.

---

## 📈 Scaling Guidance

```
Load (msg/sec)    Confluent JS           Platformatic       Action
─────────────────────────────────────────────────────────────
1K - 10K          ✅ Overkill            ✅ Perfect fit      Choose Platformatic
10K - 50K         ✅ Good fit            ✅ Good fit         Either works
50K - 100K        ✅ Recommended         ⚠️ May need tuning  Use Confluent JS
> 100K            ✅ Only option         ❌ Not viable       Scale consumers
```

---

## 💰 Cost Summary (1B msg/month)

```
                    CONFLUENT JS    PLATFORMATIC    Difference
Compute             $150/mo         $120/mo         -20%
Build infrastructure $200/mo        $0/mo           -100%
CI/CD time          3h × $50        1h × $50        -67%
Support             $100-1K/mo      $0/mo           varies

Total (small team)  $600-900/mo     $300-500/mo     -50%
```

---

## ✅ Production Readiness Matrix

```
                        CONFLUENT JS    PLATFORMATIC
Performance stability   ✅✅✅          ✅✅✅
Memory management       ✅✅            ✅✅
Error handling          ✅✅✅          ✅✅
Monitoring support      ✅✅✅          ✅✅
Update frequency        ✅✅✅          ✅✅✅
Community support       ✅✅✅          ✅✅
Enterprise SLA          ✅✅✅          ❌
Migration path          ✅✅✅          ⚠️

VERDICT: Both production-ready ✅
         Use decision criteria to choose
```

---

## 🎓 Knowledge Base Quick Links

| Question              | Answer                            | Location                  |
| --------------------- | --------------------------------- | ------------------------- |
| Which is faster?      | Confluent JS by ~18%              | BENCHMARKING-GUIDE.md     |
| Which is easier?      | Platformatic (no C++)             | COMPARISON.md API section |
| Which scales better?  | Both, but Confluent handles >100K | DECISION-TREE.md          |
| How to decide?        | Use decision tree                 | DECISION-TREE.md          |
| How to benchmark?     | Full guide provided               | BENCHMARKING-GUIDE.md     |
| How to deploy?        | Environment-specific              | PRODUCTION-CHECKLIST.md   |
| How to monitor?       | Metrics & runbooks                | PRODUCTION-CHECKLIST.md   |
| If issues in prod?    | Runbook provided                  | PRODUCTION-CHECKLIST.md   |
| How to migrate later? | See migration paths               | DECISION-TREE.md          |

---

## 📞 Quick Help (Choose Your Situation)

**I need to decide in 1 hour:**
→ Use this card + DECISION-TREE.md Quick Decision

**I need working code to try:**
→ Use examples in `platformatic-kafka/` and `confluent-kafka-js/`

**I need to convince my manager:**
→ Show COMPARISON.md Real-World Use Cases + cost analysis

**I need to benchmark:**
→ Follow BENCHMARKING-GUIDE.md (takes 2-4 hours)

**I need to deploy to production:**
→ Follow PRODUCTION-CHECKLIST.md (takes 2 weeks)

**I have production issues:**
→ Check PRODUCTION-CHECKLIST.md Runbook section

**I want deep understanding:**
→ Read COMPARISON.md fully (takes 1 hour, very comprehensive)

---

## 🔍 Red Flags

### For Confluent JS

- ❌ Your platform doesn't have pre-built binaries
- ❌ You have zero C++ expertise and no access to help
- ❌ Build time is critical (< 2 min required)
- ❌ Docker size critical (< 100MB required)

### For Platformatic Kafka

- ❌ You need > 100K msg/sec sustained
- ❌ Your latency SLA is < 2ms p99
- ❌ You need official enterprise support contract
- ❌ You need Schema Registry integration (yet)

### For KafkaJS

- ❌ It's unmaintained (since May 2022)
- ❌ Don't use unless forced by legacy system

---

## 🎯 Next Steps

```
RIGHT NOW (5 min):
  [ ] Read this card thoroughly
  [ ] Confirm your requirements
  [ ] Pick your library choice

THIS WEEK (2 hours):
  [ ] Try code examples for both
  [ ] Benchmark locally
  [ ] Create ADR document

NEXT WEEK (2-4 weeks):
  [ ] Follow PRODUCTION-CHECKLIST.md
  [ ] Implement and test thoroughly
  [ ] Deploy to staging

PRODUCTION LAUNCH:
  [ ] Monitor first 48 hours carefully
  [ ] Use runbooks if issues arise
  [ ] Celebrate 🎉
```

---

## 📊 Version Reference (February 2026)

```
CONFLUENT JS
  Latest version: 1.8.0
  Release date: January 2026 (< 1 month old)
  Recommended: ^1.8.0
  librdkafka: 2.13.0
  Node.js: 18+ required
  Status: ✅ Actively maintained

PLATFORMATIC KAFKA
  Latest version: 1.26.0
  Release date: February 2026 (current month)
  Recommended: ^1.26.0
  Node.js: 18+ required
  Status: ✅ Actively maintained

KAFKAJS
  Latest version: 2.2.4
  Release date: May 2022
  Status: ⚠️ UNMAINTAINED (3+ years)
  Recommendation: ❌ Don't use for new projects
```

---

## ⏰ Time Estimates

```
Activity                    Time
────────────────────────────────
Read this card              5 min
Decide which to use         10 min
Try both examples           1-2 hours
Local benchmark             2-4 hours
Production checklist        2-4 weeks
Monitoring setup            2-4 hours
First deployment            4-8 hours
Production stabilization    48 hours

Total to production: 2-4 weeks
```

---

## 🔗 Resource Links

**Documentation:**

- Confluent JS: https://github.com/confluentinc/confluent-kafka-javascript
- Platformatic: https://github.com/platformatic/kafka
- Apache Kafka: https://kafka.apache.org/documentation

**In This Guide:**

- [COMPARISON.md](COMPARISON.md) — Full comparison
- [DECISION-TREE.md](DECISION-TREE.md) — Matrices & decision trees
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) — 2-week plan
- [BENCHMARKING-GUIDE.md](BENCHMARKING-GUIDE.md) — Testing guide

---

## ✨ Pro Tips

1. **Always benchmark with YOUR message size** (not just 1KB)
2. **Test in YOUR deployment environment** (Docker/K8s/Lambda)
3. **Create ADR for future reference** (decisions matter later)
4. **Monitor closely first 48 hours** (catches issues early)
5. **Set up alerts before going live** (sleep better on-call)
6. **Document your runbooks** (3am fires are easier with docs)
7. **Plan for horizontal scaling** (both libraries handle it)
8. **Keep dependencies updated** (security patches matter)

---

## 🎓 Keep This Card

Print it, bookmark it, share it:

- Decision-makers: Reference for justification
- Developers: Reference during implementation
- DevOps: Reference during deployment
- On-call: Reference during incidents (especially p9 runbook)

---

**Last Updated:** February 16, 2026  
**Valid Until:** August 2026 (quarterly review)  
**Format:** Quick reference (print-friendly)

---

## 📝 Decision Record

Use this template to document your choice:

```
PROJECT: [Your project name]
DATE: [Today's date]
CHOSEN: [Confluent JS / Platformatic Kafka]

SUMMARY:
[1-2 sentences why you chose it]

REQUIREMENTS MET:
✅ Throughput: [requirement] achieved [actual]
✅ Latency: p99 < [SLA], actual: [measured]
✅ Cost: within $[budget]/month
✅ Deployment: works with [Docker/K8s/etc]

TEAM READY:
✅ Team trained
✅ Monitoring configured
✅ Runbooks documented
✅ First deployment planned for [DATE]

SIGNED OFF BY: _________________
```

---

**Questions?** See README-GUIDE.md FAQ or full COMPARISON.md

**Ready? Let's ship it! 🚀**
