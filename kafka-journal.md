# Kafka Journal — Apache Kafka (Date: 2026-02-11)

## TL;DR

- Apache Kafka is a distributed event streaming platform for building real-time data pipelines and streaming applications
- Combines publish-subscribe messaging, durable storage, and stream processing capabilities
- Designed for high throughput, fault tolerance, and scalability with performance constant regardless of data size
- Since version 3.3.1 (production-ready in 4.0), KRaft mode replaces ZooKeeper for metadata management

## Why this matters

Kafka powers real-time applications across industries: financial transactions in banks, fleet tracking in logistics, IoT sensor monitoring, customer interaction processing in retail, and microservices architectures. It handles high volumes of data with sub-millisecond latency, making it ideal for mission-critical systems requiring continuous data flow.

## Versions & Scope

- **Kafka 3.x.x**: KRaft available early access (3.0+), production-ready from 3.3.1+
- **Kafka 4.0+**: ZooKeeper fully deprecated, KRaft is the default and only metadata management mode
- This entry applies to both versions with focus on KRaft architecture

## Core Concepts

**Event Streaming**: The practice of capturing data in real-time from sources (databases, sensors, applications) as streams of events, storing them durably, processing them real-time or retrospectively, and routing to destinations.

**Events**: Immutable records of "something that happened" containing:

- Key (e.g., "customerId-123")
- Value (e.g., "Order placed for $250")
- Timestamp (e.g., "2026-02-11T14:30:00Z")
- Optional metadata headers

**Distributed Architecture**: Kafka runs as a cluster of servers (brokers) that can span multiple datacenters/cloud regions. Communication happens via TCP network protocol.

**KRaft (Kafka Raft)**: The consensus protocol that consolidated metadata management into Kafka itself using Raft consensus, eliminating external ZooKeeper dependency. The controller quorum manages the metadata log with leader election and replication built into Kafka nodes.

## Configuration Examples

### Minimal KRaft Broker Configuration (server.properties)

```properties
# Unique node identifier
node.id=1

# Define roles: broker, controller, or both
process.roles=broker,controller

# Controller quorum voters (at least 3 for production)
controller.quorum.voters=1@localhost:9093,2@localhost:9094,3@localhost:9095

# Listeners for client and controller communication
listeners=PLAINTEXT://localhost:9092,CONTROLLER://localhost:9093
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT

# Log directory
log.dirs=/var/kafka/data

# Cluster ID (generate using kafka-storage.sh random-uuid)
cluster.id=MkU3OEVBNTcwNTJENDM2Qk
```

### Docker Compose - Single KRaft Node (Development)

```yaml
version: "3.8"
services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: "broker,controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka:9092,CONTROLLER://kafka:9093"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9092"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
      KAFKA_LOG_DIRS: "/tmp/kraft-logs"
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
```

## Real-World Example

**E-commerce Order Processing Pipeline**:

1. Customer places order → Producer writes event to `orders` topic
2. Order event contains key: `customerId`, value: order details (JSON)
3. Multiple consumers process in parallel:
   - Inventory service reads and reserves stock
   - Payment service processes transaction
   - Notification service sends confirmation email
4. Each consumer tracks its position (offset) independently
5. If inventory service fails and restarts, it resumes from last committed offset
6. Events retained for 7 days allowing new analytics services to replay historical orders

Performance: Single Kafka cluster handling 1M+ orders/day with <5ms latency.

## Migration / Legacy Notes

**ZooKeeper to KRaft Migration**:

- Kafka 3.0-3.3.0: ZooKeeper still default, KRaft early access
- Kafka 3.3.1+: KRaft production-ready, migration tool available (`zk-migration.sh`)
- Kafka 4.0+: ZooKeeper fully removed, KRaft only option
- **Key Difference**: ZooKeeper stored metadata externally; KRaft stores metadata log within Kafka using Raft consensus
- **Breaking Changes**: Some admin operations syntax changed, ZooKeeper-based tooling deprecated

## QnA

**Q1: What are the three core capabilities of Kafka?**
A: (1) Publish and subscribe to event streams, (2) Store streams durably and reliably for configurable retention, (3) Process streams in real-time or retrospectively.

**Q2: How does KRaft improve upon ZooKeeper architecture?**
A: KRaft eliminates external dependency by managing metadata within Kafka using Raft consensus. Benefits: faster controller failover (near-instantaneous), supports 2M+ partitions (10x ZooKeeper limit), simpler operations, reduced complexity.

**Q3: What happens to events after consumers read them?**
A: Unlike traditional messaging systems, events are NOT deleted after consumption. They remain in topics until retention period expires (configurable by time or size). This allows multiple consumers and replay capabilities.

**Q4: Can Kafka's performance degrade with large data volumes?**
A: No. Kafka's performance is effectively constant with respect to data size due to its architecture (sequential disk I/O, zero-copy, page cache). Storing TB of data has nominal performance impact.

**Q5: What is the recommended controller quorum size for production?**
A: 3 or 5 controller nodes. A 3-node cluster survives 1 failure, 5-node survives 2 failures. Requires majority (quorum) to operate.

**Q6: What is "combined mode" vs "isolated mode" in KRaft?**
A: Combined mode: single node acts as both broker and controller (good for dev/testing). Isolated mode: separate nodes for brokers and controllers (production recommended). Note: Confluent Platform doesn't support combined mode for production.

## Sources

- [Apache Kafka Documentation - Introduction](https://kafka.apache.org/intro) (Retrieved: 2026-02-11)
- [Apache Kafka Documentation - KRaft](https://kafka.apache.org/documentation/#kraft) (Retrieved: 2026-02-11)
- [Confluent Docs - Introduction to Apache Kafka](https://docs.confluent.io/kafka/introduction.html) (Retrieved: 2026-02-11)
- [Confluent Docs - KRaft Overview](https://docs.confluent.io/platform/current/kafka-metadata/kraft.html) (Retrieved: 2026-02-11)
- [Apache Kafka 4.0 Release Notes](https://kafka.apache.org/documentation/#upgrade) (Retrieved: 2026-02-11)

---

# Kafka Journal — Kafka Software Components (Date: 2026-02-11)

## TL;DR

- Kafka cluster consists of **Brokers** (storage layer), **Controllers** (metadata management in KRaft), **Producers** (write events), and **Consumers** (read events)
- Additional components: **Kafka Connect** (data integration), **Kafka Streams** (stream processing library)
- All components communicate via TCP protocol in a distributed, fault-tolerant architecture
- KRaft consolidated controllers into Kafka brokers, eliminating ZooKeeper

## Why this matters

Understanding components is essential for designing Kafka-based systems. Choosing the right component for each task (e.g., Kafka Connect for database integration vs custom producer) determines system reliability, performance, and maintainability.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Component architecture consistent across versions
- KRaft changes controller role from ZooKeeper-based to Raft-based (3.3.1+ production-ready, 4.0+ default)

## Core Concepts

### Brokers

**Definition**: Servers in the storage layer that store event streams from producers and serve them to consumers.

**Characteristics**:

- Each broker identified by unique `broker.id`
- One broker per node/server
- Every broker is a bootstrap server (connecting to one connects to all)
- Handle client requests (produce/consume operations)
- Store partition replicas on local disk
- Typical production cluster: 3+ brokers for fault tolerance

### Controllers (KRaft Mode)

**Definition**: Nodes that form a Raft quorum managing Kafka's metadata log.

**Roles**:

- **Active Controller**: Elected leader handling all broker RPCs, managing metadata changes
- **Follower Controllers**: Replicate metadata, serve as hot standbys for failover
- Metadata includes: topic definitions, partition assignments, ISR (In-Sync Replicas) lists, configurations

**Key Properties**:

- `process.roles=controller` (isolated mode) or `controller,broker` (combined mode)
- `controller.quorum.voters` defines quorum membership
- Use Raft consensus for consistent metadata without external systems

### Producers

**Definition**: Client applications that publish (write) events to Kafka topics.

**Capabilities**:

- Choose target topic for each event
- Control partition assignment (round-robin, key-based, or custom partitioner)
- Configure acknowledgment levels (`acks=0,1,all`)
- Buffering and batching for throughput optimization
- Idempotent writes and transactional semantics available

**APIs**: Java/Scala Producer API, plus community clients for Python, Go, C/C++, .NET, Node.js, Rust, etc.

### Consumers

**Definition**: Client applications that subscribe to and read events from Kafka topics.

**Capabilities**:

- Subscribe to one or more topics
- Track consumption position via offsets (stored in internal `__consumer_offsets` topic)
- Can replay by resetting offset to earlier position
- Join consumer groups for parallel processing with automatic partition assignment
- Offset commit strategies: auto-commit, manual commit, at-most-once, at-least-once, exactly-once

**Independence**: Consumers come and go without cluster impact; metadata is only the offset position.

### Kafka Connect

**Definition**: Data integration framework for streaming data between Kafka and external systems.

**Types**:

- **Source Connectors**: Import data into Kafka (e.g., MySQL CDC, MongoDB, S3)
- **Sink Connectors**: Export data from Kafka (e.g., Elasticsearch, PostgreSQL, HDFS)

**Benefits**:

- No custom code needed (use pre-built connectors)
- Distributed, scalable execution
- Automatic offset management and fault tolerance
- 100+ connectors available in community

### Kafka Streams

**Definition**: Java/Scala client library for building stream processing applications.

**Capabilities**:

- Stateless transformations (filter, map, flatMap)
- Stateful operations (aggregations, joins, windowing)
- Event-time processing with out-of-order handling
- Interactive queries on state stores
- Exactly-once processing semantics

**Architecture**: Runs as lightweight library within your application (not separate cluster).

## Configuration Examples

### Broker Configuration with KRaft

```properties
# server.properties
node.id=1
process.roles=broker
controller.quorum.voters=1@controller1:9093,2@controller2:9093,3@controller3:9093
listeners=PLAINTEXT://:9092
advertised.listeners=PLAINTEXT://broker1.example.com:9092
log.dirs=/data/kafka-logs
num.partitions=3
default.replication.factor=3
min.insync.replicas=2
```

### Dedicated Controller Configuration

```properties
# controller.properties
node.id=1
process.roles=controller
controller.quorum.voters=1@controller1:9093,2@controller2:9093,3@controller3:9093
controller.listener.names=CONTROLLER
listeners=CONTROLLER://:9093
log.dirs=/data/kafka-metadata
```

### Producer Client Configuration (Java)

```properties
bootstrap.servers=broker1:9092,broker2:9092,broker3:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer
acks=all
retries=3
enable.idempotence=true
compression.type=snappy
```

### Consumer Client Configuration (Java)

```properties
bootstrap.servers=broker1:9092,broker2:9092,broker3:9092
key.deserializer=org.apache.kafka.common.serialization.StringDeserializer
value.deserializer=org.apache.kafka.common.serialization.StringDeserializer
group.id=my-consumer-group
auto.offset.reset=earliest
enable.auto.commit=false
max.poll.records=500
```

## Real-World Example

**IoT Sensor Data Pipeline**:

**Components in Action**:

1. **Kafka Connect Source Connector**: Pulls sensor readings from MQTT broker every 100ms → writes to `sensor-readings` topic
2. **Brokers** (5 nodes): Store `sensor-readings` topic with 30 partitions, replication factor 3, retaining 30 days of data
3. **Controllers** (3 dedicated nodes): Manage metadata, handle broker failures, coordinate partition reassignments
4. **Kafka Streams App**: Processes sensor readings → filters anomalies → aggregates metrics per 5-min windows → writes to `sensor-alerts` topic
5. **Consumer Group 1** (3 instances): Reads `sensor-alerts` → sends notifications via PagerDuty
6. **Kafka Connect Sink Connector**: Reads `sensor-readings` → bulk writes to TimescaleDB for historical analysis

**Scale**: 50,000 sensors × 10 readings/sec = 500K events/sec, cluster handles with <10ms p99 latency.

## Migration / Legacy Notes

**ZooKeeper vs KRaft Controllers**:

- **ZooKeeper Mode**: Separate ZooKeeper ensemble (3-5 nodes) stored metadata; Kafka controllers were brokers elected via ZooKeeper
- **KRaft Mode**: Controllers are Kafka nodes forming Raft quorum; metadata stored in internal `__cluster_metadata` log topic
- **Migration**: Use `zookeeper-to-kraft.sh` migration tool (Kafka 3.4+), requires cluster rolling restart
- **Benefit**: Simpler ops (one system instead of two), faster metadata propagation, better scalability

## QnA

**Q1: What is the minimum number of brokers needed for production?**
A: Minimum 3 brokers for fault tolerance with replication factor 3. Some setups use more (5-10+) for higher throughput and partition distribution.

**Q2: Can a single Kafka node act as both broker and controller?**
A: Yes, in "combined mode" (`process.roles=broker,controller`). Good for development/testing. Production should use "isolated mode" with dedicated controller nodes.

**Q3: How do producers know which broker to send data to?**
A: Producers connect to any broker (bootstrap server) to fetch cluster metadata, which includes topic partition leaders. Then they send directly to the appropriate partition leader broker.

**Q4: What happens when the active controller fails?**
A: In KRaft, follower controllers detect failure (via missed heartbeats), initiate new leader election using Raft protocol. New active controller elected within milliseconds (near-instantaneous failover).

**Q5: Do consumers need to connect to specific brokers?**
A: No. Consumers connect to any broker(s) listed in `bootstrap.servers`, fetch metadata about partition leaders, then fetch data directly from appropriate partition leader brokers.

**Q6: When should I use Kafka Streams vs Kafka Connect?**
A: Use Kafka Connect for data integration (getting data in/out of Kafka from external systems). Use Kafka Streams for transforming and processing data already in Kafka (filtering, aggregations, joins).

## Sources

- [Confluent Docs - Kafka Components](https://docs.confluent.io/kafka/introduction.html#components) (Retrieved: 2026-02-11)
- [Apache Kafka Architecture](https://kafka.apache.org/documentation/#design) (Retrieved: 2026-02-11)
- [Kafka Connect Documentation](https://kafka.apache.org/documentation/#connect) (Retrieved: 2026-02-11)
- [Kafka Streams Documentation](https://kafka.apache.org/documentation/streams/) (Retrieved: 2026-02-11)
- [Confluent KRaft Controller Architecture](https://docs.confluent.io/platform/current/kafka-metadata/kraft.html#the-controller-quorum) (Retrieved: 2026-02-11)

---

# Kafka Journal — Topics, Partitions, and Offsets (Date: 2026-02-11)

## TL;DR

- **Topics** are categories/folders where events are organized and stored durably
- **Partitions** are the fundamental unit of parallelism; topics split into multiple partitions distributed across brokers
- **Offsets** are sequential IDs (0, 1, 2...) assigned to each event within a partition, used to track read position
- Events with the same key always go to the same partition, guaranteeing order for that key

## Why this matters

Understanding topics, partitions, and offsets is critical for:

- Scaling throughput (more partitions = more parallelism)
- Guaranteeing message ordering (same-key events in same partition)
- Consumer progress tracking (offset management)
- Designing partition strategies for balanced load distribution

## Versions & Scope

- Core concepts consistent across Kafka 3.x.x and 4.x.x
- Partition and offset mechanics unchanged
- KRaft mode improves metadata propagation but doesn't change topic/partition/offset behavior

## Core Concepts

### Topics

**Definition**: Named categories where events are organized, similar to folders in a filesystem.

**Characteristics**:

- Append-only log structure (new events added to end)
- Events are immutable after written
- Multi-producer: multiple producers can write to same topic simultaneously
- Multi-subscriber: multiple consumer groups can read same topic independently
- Retention configurable by time (e.g., 7 days) or size (e.g., 100GB)
- Performance constant regardless of data size (due to sequential I/O and page cache)

**Example Topics**: `user-signups`, `payment-transactions`, `sensor-readings`, `audit-logs`

### Partitions

**Definition**: Subdivisions of a topic; each partition is an ordered, immutable sequence of events stored on disk.

**Why Partitions Exist**:

1. **Scalability**: Distributed across multiple brokers, enabling parallel reads/writes
2. **Throughput**: More partitions = more concurrent producers/consumers
3. **Fault Tolerance**: Each partition replicated to multiple brokers

**Key Properties**:

- Each partition has an ordered sequence of events (event 0, 1, 2, 3...)
- Events within a partition maintain strict order
- No ordering guarantee across different partitions
- Partition count set at topic creation (can be increased later, but not decreased)
- Each partition has one leader broker and N-1 follower brokers (where N = replication factor)

**Partition Assignment**:

- Round-robin if no key specified
- Hash of key if key provided: `partition = hash(key) % num_partitions`
- Custom partitioner logic possible

### Offsets

**Definition**: Sequential integer IDs (0, 1, 2, 3...) assigned to each event within a partition.

**Purpose**:

- Uniquely identify each event position within partition
- Track consumer progress (consumer offset)
- Enable replay by resetting to earlier offset
- Stored in special `__consumer_offsets` internal topic

**Offset Semantics**:

- **Current Offset**: Last committed read position
- **High Water Mark**: Offset of last committed event in partition (available for consumption)
- **Log End Offset**: Offset of newest event written (may not be committed if replication pending)

**Visual Representation**:

```
Partition 0: [Event0:off0] [Event1:off1] [Event2:off2] [Event3:off3] ...
                                                    ↑
                                            Consumer-A offset = 2
```

### Replication

**Definition**: Each partition replicated across multiple brokers for fault tolerance.

**Replication Components**:

- **Leader Replica**: Handles all reads/writes for the partition
- **Follower Replicas**: Replicate data from leader, serve as backups
- **In-Sync Replicas (ISR)**: Followers that have caught up with leader
- **Replication Factor**: Number of copies (typically 3 in production)

**Behavior**:

- Only leader serves client requests
- If leader fails, one ISR follower promoted to leader automatically
- `min.insync.replicas` controls durability (how many replicas must acknowledge writes)

## Configuration Examples

### Topic Creation with Specific Partitions

```bash
# Create topic with 6 partitions, replication factor 3
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config min.insync.replicas=2
```

### Topic Configuration (server.properties)

```properties
# Default partitions for auto-created topics
num.partitions=3

# Default replication factor
default.replication.factor=3

# Minimum replicas that must acknowledge writes
min.insync.replicas=2

# Retention: 7 days
log.retention.hours=168

# Or retention by size: 100GB per partition
log.retention.bytes=107374182400

# Segment file size (default 1GB)
log.segment.bytes=1073741824

# Compression type
compression.type=producer
```

### Producer - Key-Based Partitioning (Java)

```java
// Events with same key go to same partition
ProducerRecord<String, String> record = new ProducerRecord<>(
    "orders",                    // topic
    "customer-123",              // key (determines partition)
    "{\"orderId\":\"abc\",\"amount\":99.99}"  // value
);
producer.send(record);
```

### Consumer - Offset Management (Java)

```java
// Manual offset commit for control
consumer.subscribe(Arrays.asList("orders"));
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        System.out.printf("Partition=%d, Offset=%d, Key=%s, Value=%s%n",
            record.partition(), record.offset(), record.key(), record.value());
        // Process record...
    }
    consumer.commitSync();  // Commit offsets after processing
}
```

### View Partition Details

```bash
# Describe topic to see partition distribution
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic orders

# Output shows:
# Topic: orders  PartitionCount: 6  ReplicationFactor: 3
# Partition: 0  Leader: 1  Replicas: 1,2,3  ISR: 1,2,3
# Partition: 1  Leader: 2  Replicas: 2,3,1  ISR: 2,3,1
# ...
```

## Real-World Example

**Ride-Sharing Order Processing**:

**Setup**:

- Topic: `ride-requests`
- Partitions: 12 (distributed across 4 brokers: 3 partitions per broker)
- Replication Factor: 3
- Key: `customerId`

**Workflow**:

1. Customer "Alice" requests ride → Producer writes event with key=`alice-uuid`
2. Key hashed: `hash(alice-uuid) % 12 = 7` → Event goes to partition 7
3. All Alice's future ride requests route to partition 7 (order preserved)
4. Partition 7 leader = Broker-3; followers = Broker-1, Broker-2
5. Consumer Group "driver-matcher" with 12 instances (1 per partition)
6. Consumer assigned to partition 7 reads Alice's events in order
7. Consumer commits offset after successfully matching driver
8. If consumer crashes, new consumer resumes from last committed offset

**Scale**: 10,000 requests/sec distributed across 12 partitions = ~833 req/sec per partition.

**Fault Tolerance**: If Broker-3 fails, partition 7 leadership automatically transfers to Broker-1 or Broker-2 with zero data loss.

## Migration / Legacy Notes

**ZooKeeper vs KRaft - Metadata Propagation**:

- **ZooKeeper Mode**: Topic/partition metadata stored in ZooKeeper; brokers poll for updates (slower)
- **KRaft Mode**: Metadata stored in internal `__cluster_metadata` log; brokers track offsets in metadata log (faster, more efficient)
- **Benefit**: Faster topic creation, partition reassignment, and controller failover in KRaft

**Partition Increase Consideration**:

- Can increase partition count but CANNOT decrease
- Increasing changes key → partition mapping for new events (breaks ordering guarantees across all events)
- Plan partition count upfront based on expected throughput

## QnA

**Q1: Can I change the number of partitions after topic creation?**
A: Yes, you can increase partitions (`kafka-topics.sh --alter --partitions 10`), but you CANNOT decrease. Increasing changes key-to-partition mapping going forward.

**Q2: How does partition assignment work when using message keys?**
A: Hash of key modulo number of partitions: `hash(key) % num_partitions`. Same key always routes to same partition, ensuring ordering for that key.

**Q3: What happens if no message key is provided?**
A: Producer uses round-robin (or sticky partitioner in newer versions) to distribute events across partitions for load balancing. No ordering guarantee.

**Q4: How many partitions should I create for a topic?**
A: Rule of thumb: `partitions >= parallelism_needed`. Consider: (1) Target throughput ÷ partition throughput, (2) Number of consumers for parallelism, (3) Max ~4000 partitions per broker. Typical: 6-12 partitions for moderate topics.

**Q5: Can different consumer groups have different offsets for the same partition?**
A: Yes! Each consumer group tracks its own offsets independently. Group A might be at offset 1000 while Group B is at offset 5000 in the same partition.

**Q6: What is the difference between offset and partition number?**
A: Partition number identifies which partition (0, 1, 2...). Offset identifies position within that partition (0, 1, 2...). Both needed to uniquely identify an event: `(partition=3, offset=42)`.

## Sources

- [Apache Kafka - Topics and Logs](https://kafka.apache.org/intro#intro_topics) (Retrieved: 2026-02-11)
- [Confluent Docs - Topics and Partitions](https://docs.confluent.io/kafka/introduction.html#topics) (Retrieved: 2026-02-11)
- [Confluent Docs - Partitions](https://docs.confluent.io/kafka/introduction.html#partitions) (Retrieved: 2026-02-11)
- [Apache Kafka Design - Replication](https://kafka.apache.org/documentation/#replication) (Retrieved: 2026-02-11)
- [Kafka Partitioning Best Practices](https://docs.confluent.io/kafka/design/partitions.html) (Retrieved: 2026-02-11)

---

# Kafka Journal — Producers and Message Keys (Date: 2026-02-11)

## TL;DR

- **Producers** are client applications that publish (write) events to Kafka topics
- **Message Keys** determine partition assignment and enable ordering guarantees for related events
- Events with same key always route to same partition (via `hash(key) % num_partitions`)
- Producers control acknowledgment semantics (`acks=0,1,all`), batching, compression, and idempotency

## Why this matters

Proper producer configuration and key design are critical for:

- **Data Ordering**: Ensuring related events (e.g., user actions) are processed in order
- **Performance**: Batching and compression can improve throughput 10-100x
- **Reliability**: Idempotent producers and transactions prevent duplicates
- **Load Balancing**: Key distribution affects partition utilization and consumer parallelism

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Producer API consistent across versions
- Kafka 3.0+ includes improved sticky partitioner for null-key events
- Transactional and idempotent producers stable since Kafka 2.5, refined in 3.x+

## Core Concepts

### Producers

**Definition**: Client applications that write events to Kafka topics using the Producer API.

**Core Responsibilities**:

1. **Serialize**: Convert key/value objects to byte arrays
2. **Partition**: Determine target partition for each event
3. **Batch**: Group events for efficient network transmission
4. **Compress**: Optionally compress batches (snappy, gzip, lz4, zstd)
5. **Send**: Transmit to partition leader broker
6. **Acknowledge**: Wait for broker confirmation based on `acks` setting

**Producer Workflow**:

```
Application → Producer.send(record)
            → Serializer (key, value)
            → Partitioner (determine partition)
            → RecordAccumulator (batch)
            → Sender (network I/O)
            → Broker (partition leader)
            → Acknowledgment
```

### Message Keys

**Definition**: Optional identifier for an event that determines partition assignment and enables ordering.

**Key Characteristics**:

- Can be any serializable object (String, Integer, custom object)
- Hashed to determine partition: `partition = hash(key) % num_partitions`
- Same key → same partition → ordering guaranteed for that key
- Null key → round-robin or sticky partitioning (no ordering guarantee)

**When to Use Keys**:

- **Use Key**: When events are related and order matters (e.g., user actions, device telemetry, account transactions)
- **Null Key**: When events are independent and load balancing is priority (e.g., log messages, metrics)

**Key Design Patterns**:

1. **Entity ID**: `customerId`, `orderId`, `deviceId`
2. **Composite Key**: `customerId:sessionId` for hierarchical grouping
3. **Extracted Field**: `timestamp % 1000` for time-based bucketing
4. **Tenant ID**: For multi-tenant systems to control data locality

### Partitioning Strategies

**Default Partitioner** (when key is NOT null):

```java
partition = hash(keyBytes) % numPartitions
// Uses murmur2 hash algorithm (consistent across producer instances)
```

**Sticky Partitioner** (when key IS null, Kafka 2.4+):

- Fills up batches for single partition before switching
- Reduces latency and increases throughput vs round-robin
- Automatically switches to another partition when batch full

**Custom Partitioner**:

```java
public class CustomPartitioner implements Partitioner {
    public int partition(String topic, Object key, byte[] keyBytes,
                         Object value, byte[] valueBytes, Cluster cluster) {
        // Custom logic: route premium customers to partition 0
        if (key.toString().startsWith("premium-")) {
            return 0;
        }
        return hash(keyBytes) % cluster.partitionCountForTopic(topic);
    }
}
```

### Acknowledgment Semantics

**acks=0** (Fire-and-forget):

- Producer doesn't wait for broker acknowledgment
- Highest throughput, lowest latency
- Risk: Data loss if broker fails immediately after receive
- Use case: High-volume metrics where occasional loss acceptable

**acks=1** (Leader acknowledgment):

- Producer waits for leader replica to write to disk
- Balanced throughput/latency
- Risk: Data loss if leader fails before followers replicate
- Use case: Log aggregation, moderate durability needs

**acks=all** (All in-sync replicas):

- Producer waits for leader and all ISR followers to acknowledge
- Highest durability, lower throughput
- Risk: Minimal (only if all replicas fail simultaneously)
- Use case: Financial transactions, critical business events

### Producer Durability Features

**Idempotent Producer** (`enable.idempotence=true`):

- Guarantees exactly-once per partition even with retries
- Assigns sequence numbers to detect duplicates broker-side
- No performance penalty, recommended for all producers

**Transactional Producer**:

- Atomic writes across multiple partitions/topics
- Either all succeed or all fail
- Enables exactly-once semantics end-to-end with consumers
- Requires `transactional.id` configuration

## Configuration Examples

### Producer Configuration - High Throughput

```properties
# Producer connection
bootstrap.servers=kafka1:9092,kafka2:9092,kafka3:9092

# Serializers
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# Batching for throughput
batch.size=16384                # 16KB batches
linger.ms=10                    # Wait 10ms to fill batch
buffer.memory=33554432          # 32MB buffer

# Compression
compression.type=snappy         # Fast compression (or lz4, zstd)

# Acknowledgment
acks=1                          # Leader ack only

# Retries
retries=3
retry.backoff.ms=100
```

### Producer Configuration - High Reliability

```properties
bootstrap.servers=kafka1:9092,kafka2:9092,kafka3:9092
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer

# Idempotence for exactly-once per partition
enable.idempotence=true

# Durability
acks=all                        # Wait for all ISR
min.insync.replicas=2           # At least 2 replicas must ack (topic config)

# Retries
retries=Integer.MAX_VALUE       # Unlimited retries
max.in.flight.requests.per.connection=5

# Timeout
request.timeout.ms=30000
delivery.timeout.ms=120000
```

### Producer with Key - Java Example

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class OrderProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("acks", "all");
        props.put("enable.idempotence", "true");

        Producer<String, String> producer = new KafkaProducer<>(props);

        String customerId = "customer-12345";
        String orderData = "{\"orderId\":\"abc\",\"amount\":99.99,\"timestamp\":1707667200}";

        // Key ensures all orders for customer-12345 go to same partition
        ProducerRecord<String, String> record = new ProducerRecord<>(
            "orders",         // topic
            customerId,       // key (determines partition)
            orderData         // value
        );

        // Asynchronous send with callback
        producer.send(record, new Callback() {
            public void onCompletion(RecordMetadata metadata, Exception exception) {
                if (exception == null) {
                    System.out.printf("Sent to partition %d at offset %d%n",
                        metadata.partition(), metadata.offset());
                } else {
                    exception.printStackTrace();
                }
            }
        });

        producer.close();
    }
}
```

### Producer without Key - Python Example

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    compression_type='gzip',
    acks='all'
)

# Null key = sticky partitioner distributes load
log_entry = {
    'level': 'INFO',
    'message': 'Application started successfully',
    'timestamp': 1707667200
}

# Send without key (key=None)
producer.send('application-logs', value=log_entry)
producer.flush()
producer.close()
```

### Transactional Producer - Java Example

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("transactional.id", "order-processor-txn-1");  // Unique per producer instance
props.put("enable.idempotence", "true");
props.put("acks", "all");

Producer<String, String> producer = new KafkaProducer<>(props);
producer.initTransactions();

try {
    producer.beginTransaction();

    // Write multiple records atomically
    producer.send(new ProducerRecord<>("orders", "customer-1", "order-data-1"));
    producer.send(new ProducerRecord<>("inventory", "product-1", "reserve-stock"));
    producer.send(new ProducerRecord<>("notifications", "customer-1", "order-confirmation"));

    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

## Real-World Example

**Stock Trading Platform**:

**Scenario**: Process stock trades with strict ordering per stock symbol.

**Requirements**:

- Trades for same stock must be processed in order
- No duplicate trades (exactly-once)
- High throughput (100K trades/sec)
- Partitioned by stock symbol for parallelism

**Implementation**:

```java
// Producer: Stock trading service
Properties props = new Properties();
props.put("bootstrap.servers", "kafka1:9092,kafka2:9092");
props.put("key.serializer", "StringSerializer");
props.put("value.serializer", "AvroSerializer");
props.put("enable.idempotence", "true");  // No duplicates
props.put("acks", "all");                 // Durability
props.put("compression.type", "lz4");     // Fast compression
props.put("batch.size", 32768);           // 32KB batches
props.put("linger.ms", 5);                // Low latency

Producer<String, Trade> producer = new KafkaProducer<>(props);

// Trade event
Trade trade = new Trade("AAPL", 1000, 175.50, "BUY", System.currentTimeMillis());

// Key = stock symbol → ensures all AAPL trades go to same partition
ProducerRecord<String, Trade> record = new ProducerRecord<>(
    "stock-trades",
    "AAPL",        // key
    trade          // value
);

producer.send(record, (metadata, exception) -> {
    if (exception == null) {
        System.out.printf("Trade for %s sent to partition %d, offset %d%n",
            "AAPL", metadata.partition(), metadata.offset());
    }
});
```

**Result**:

- All "AAPL" trades → partition 7 (based on `hash("AAPL") % 50 = 7`)
- All "GOOG" trades → partition 23
- Consumer assigned partition 7 processes AAPL trades in exact order received
- Idempotent producer prevents duplicate trades on network retries
- Compression reduces bandwidth by ~60%
- Batching increases throughput from 10K to 100K trades/sec

## Migration / Legacy Notes

**Legacy Round-Robin Partitioner (Kafka <2.4)**:

- Null-key events round-robined across partitions per event
- Created many small batches, poor throughput

**Modern Sticky Partitioner (Kafka 2.4+)**:

- Null-key events stick to partition until batch full
- Dramatically improved throughput (20-50% gain)
- Default in Kafka 3.x+

**Key Takeaway**: Upgrade to Kafka 3.x+ for automatic sticky partitioner benefits with null-key events.

## QnA

**Q1: What happens if I change the number of partitions after producing with keys?**
A: Key-to-partition mapping changes for NEW events. Old events remain in original partitions. This breaks ordering across all time. Plan partition count upfront.

**Q2: Should I always use message keys?**
A: No. Use keys when ordering matters for related events. Omit keys for independent events to maximize load balancing (logs, metrics). Null keys leverage sticky partitioner.

**Q3: Can I use the same key for events in different topics?**
A: Yes. Key-to-partition mapping computed per topic independently. Same key might map to partition 3 in topic A and partition 7 in topic B.

**Q4: What happens if my key distribution is skewed (hot keys)?**
A: Hot keys cause uneven partition load. Example: 90% events have same key → 90% load on one partition → bottleneck. Solution: Use composite keys, shard hot keys, or implement custom partitioner.

**Q5: How does `enable.idempotence=true` prevent duplicates?**
A: Producer assigns sequence numbers per partition. Broker detects and discards duplicates based on sequence numbers, even across retries. No application changes needed.

**Q6: What is the performance impact of `acks=all` vs `acks=1`?**
A: Typically 10-30% higher latency with `acks=all` (waits for follower replication). However, with `min.insync.replicas=2` and proper tuning, impact often <5ms. Trade-off for durability.

## Sources

- [Apache Kafka - Producer API](https://kafka.apache.org/documentation/#producerapi) (Retrieved: 2026-02-11)
- [Confluent Docs - Kafka Producers](https://docs.confluent.io/kafka/introduction.html#producers) (Retrieved: 2026-02-11)
- [Kafka Producer Design](https://docs.confluent.io/kafka/design/producer-design.html) (Retrieved: 2026-02-11)
- [Apache Kafka - Idempotent Producer](https://kafka.apache.org/documentation/#producerconfigs_enable.idempotence) (Retrieved: 2026-02-11)
- [Kafka Sticky Partitioner - KIP-480](https://cwiki.apache.org/confluence/display/KAFKA/KIP-480%3A+Sticky+Partitioner) (Retrieved: 2026-02-11)

---

# Kafka Journal — Kafka Consumers and Deserialization (Date: 2026-02-11)

## TL;DR

- **Consumers** are client applications that read events from Kafka topics by pulling data from brokers
- **Deserialization** converts byte arrays from Kafka back into objects using deserializers (inverse of serialization)
- Consumers control their read position via offsets and can replay data by resetting to earlier positions
- Pull-based design allows consumers to control consumption rate and enables aggressive batching

## Why this matters

Consumers are the data readers in Kafka ecosystems. Understanding consumer behavior and deserialization is critical for:

- Building reliable data processing pipelines
- Handling schema evolution without breaking consumers
- Optimizing throughput with proper fetch settings
- Implementing error handling and data validation after deserialization

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Consumer API consistent across versions
- Kafka 4.0 introduces new consumer rebalance protocol (GA) with server-side assignment, but classic protocol still supported
- Deserialization patterns unchanged

## Core Concepts

### Consumer Fundamentals

**Definition**: A Kafka consumer is a client application that reads and processes events from brokers by subscribing to one or more topics.

**Pull-Based Architecture**:

- Consumers **pull** data from brokers (not pushed by brokers)
- Consumers issue fetch requests specifying log offset
- Broker returns chunk of log starting from requested offset
- Advantages:
  - Consumer controls consumption rate (no overwhelming slow consumers)
  - Aggressive batching without latency concerns
  - Consumers can catch up if they fall behind

**Consumer Workflow**:

```
Consumer subscribes to topic(s)
  → Poll for events (fetch from broker)
  → Deserialize key/value bytes → objects
  → Process events
  → Commit offset (mark as consumed)
  → Repeat
```

**Fetch Behavior**:

- Consumer specifies offset in fetch request
- Receives batch of events starting from that offset
- Can only read up to **high water mark** (last committed event replicated to all ISRs)
- Cannot read unreplicated data (prevents reading potentially lost data)

### Deserialization

**Definition**: Process of converting byte arrays from Kafka into typed objects.

**Deserializer Components**:

- **Key Deserializer**: Converts key bytes → key object
- **Value Deserializer**: Converts value bytes → value object
- Must match serializers used by producers

**Common Deserializers**:

| Deserializer            | Purpose                  | Use Case                    |
| ----------------------- | ------------------------ | --------------------------- |
| `StringDeserializer`    | Bytes → String (UTF-8)   | Text data, JSON strings     |
| `IntegerDeserializer`   | Bytes → Integer          | Numeric IDs                 |
| `ByteArrayDeserializer` | Bytes → byte[] (no-op)   | Raw binary data             |
| `AvroDeserializer`      | Bytes → Avro object      | Structured data with schema |
| `JsonDeserializer`      | Bytes → JSON object      | Flexible JSON documents     |
| `ProtobufDeserializer`  | Bytes → Protobuf message | Efficient binary format     |

**Schema Evolution**:

- Forward Compatibility: New producer schema works with old consumer
- Backward Compatibility: Old producer schema works with new consumer
- Full Compatibility: Both directions work
- Use Schema Registry (Confluent) to manage schema versions

**Deserialization Errors**:

- Malformed data → DeserializationException
- Schema mismatch → parsing errors
- Handle via error handlers, dead letter queues, or skip/log

### Consumer Configuration Key Properties

**Fetch Settings**:

- `fetch.min.bytes`: Minimum data broker should return (default: 1 byte)
- `fetch.max.wait.ms`: Max time broker waits to fulfill fetch.min.bytes (default: 500ms)
- `max.partition.fetch.bytes`: Max bytes per partition per fetch (default: 1MB)

**Offset Management**:

- `auto.offset.reset`: What to do if no offset exists (`earliest`, `latest`, `none`)
- `enable.auto.commit`: Auto-commit offsets periodically (default: true)
- `auto.commit.interval.ms`: Auto-commit interval (default: 5000ms)

**Performance**:

- `max.poll.records`: Max records returned in single poll() (default: 500)
- `session.timeout.ms`: Consumer heartbeat timeout (default: 45s Kafka 4.0)
- `max.poll.interval.ms`: Max time between polls before considered dead (default: 300s)

## Configuration Examples

### Consumer Configuration - JSON Deserialization

```properties
# Consumer connection
bootstrap.servers=kafka1:9092,kafka2:9092
group.id=order-processing-group

# Deserializers
key.deserializer=org.apache.kafka.common.serialization.StringDeserializer
value.deserializer=org.apache.kafka.common.serialization.StringDeserializer

# Offset management
auto.offset.reset=earliest          # Start from beginning if no offset
enable.auto.commit=false            # Manual offset commit for control

# Fetch settings
fetch.min.bytes=1024                # Wait for 1KB of data
fetch.max.wait.ms=500               # Or wait max 500ms
max.partition.fetch.bytes=1048576   # 1MB per partition fetch

# Processing
max.poll.records=500                # Fetch 500 records per poll
session.timeout.ms=45000            # 45s heartbeat timeout
max.poll.interval.ms=300000         # 5min max processing time
```

### Java Consumer - Manual Offset Commit

```java
import org.apache.kafka.clients.consumer.*;
import java.time.Duration;
import java.util.*;

public class OrderConsumer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "order-processor");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("enable.auto.commit", "false");  // Manual commit
        props.put("auto.offset.reset", "earliest");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Arrays.asList("orders"));

        try {
            while (true) {
                // Poll for events (10 second timeout)
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(10000));

                for (ConsumerRecord<String, String> record : records) {
                    // Deserializers already converted bytes to String
                    System.out.printf(
                        "Topic=%s, Partition=%d, Offset=%d, Key=%s, Value=%s%n",
                        record.topic(), record.partition(), record.offset(),
                        record.key(), record.value()
                    );

                    // Process order (deserialize JSON string manually if needed)
                    processOrder(record.value());
                }

                // Commit offsets after successful processing
                consumer.commitSync();
            }
        } finally {
            consumer.close();
        }
    }

    static void processOrder(String orderJson) {
        // Custom JSON parsing and business logic
        System.out.println("Processing: " + orderJson);
    }
}
```

### Python Consumer - Avro Deserialization

```python
from confluent_kafka import Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField

# Schema Registry for Avro schemas
schema_registry_conf = {'url': 'http://localhost:8081'}
schema_registry_client = SchemaRegistryClient(schema_registry_conf)

# Avro deserializer with schema from registry
avro_deserializer = AvroDeserializer(
    schema_registry_client,
    schema_str=None  # Fetched from registry automatically
)

consumer_conf = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'avro-consumer-group',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False
}

consumer = Consumer(consumer_conf)
consumer.subscribe(['user-events'])

try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"Error: {msg.error()}")
            continue

        # Deserialize Avro bytes to Python dictionary
        user_event = avro_deserializer(
            msg.value(),
            SerializationContext(msg.topic(), MessageField.VALUE)
        )

        print(f"Received: {user_event}")
        # user_event is now a Python dict: {'userId': 123, 'action': 'login', ...}

        consumer.commit(msg)
except KeyboardInterrupt:
    pass
finally:
    consumer.close()
```

### Consumer - Error Handling with Deserialization

```java
import org.apache.kafka.common.errors.SerializationException;

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(5000));

    for (ConsumerRecord<String, String> record : records) {
        try {
            // Custom deserialization (e.g., JSON to POJO)
            Order order = deserializeOrder(record.value());
            processOrder(order);

            // Commit this specific record offset
            Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
            offsets.put(
                new TopicPartition(record.topic(), record.partition()),
                new OffsetAndMetadata(record.offset() + 1)
            );
            consumer.commitSync(offsets);

        } catch (DeserializationException e) {
            // Handle deserialization failure
            System.err.printf("Deserialization failed at offset %d: %s%n",
                record.offset(), e.getMessage());

            // Option 1: Send to dead letter queue
            sendToDeadLetterQueue(record);

            // Option 2: Skip and continue (commit offset to move past bad message)
            // Option 3: Stop processing and alert
        }
    }
}
```

## Real-World Example

**E-commerce Order Processing with Schema Evolution**:

**Scenario**: Order service produces events with evolving schemas. Consumers must handle both old and new schema versions without breaking.

**Setup**:

- Topic: `ecommerce-orders`
- Producer: Uses Avro serialization with Schema Registry
- Consumer: Order fulfillment service
- Schema V1: `{orderId, customerId, amount}`
- Schema V2: `{orderId, customerId, amount, shippingAddress}` ← added field

**Consumer Implementation**:

```java
// Avro consumer with Schema Registry
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "fulfillment-service");
props.put("key.deserializer", StringDeserializer.class);
props.put("value.deserializer", KafkaAvroDeserializer.class);
props.put("schema.registry.url", "http://localhost:8081");
props.put("specific.avro.reader", "true");  // Use generated Avro classes

KafkaConsumer<String, Order> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("ecommerce-orders"));

while (true) {
    ConsumerRecords<String, Order> records = consumer.poll(Duration.ofSeconds(1));

    for (ConsumerRecord<String, Order> record : records) {
        Order order = record.value();  // Automatically deserialized by KafkaAvroDeserializer

        // Handle schema evolution gracefully
        if (order.getShippingAddress() != null) {
            // V2 schema with shipping address
            shipToAddress(order);
        } else {
            // V1 schema without shipping address (backward compatibility)
            shipToDefaultAddress(order);
        }

        System.out.printf("Processed order %s, amount $%.2f%n",
            order.getOrderId(), order.getAmount());
    }

    consumer.commitAsync();  // Async commit for better throughput
}
```

**Result**:

- Consumers handle both V1 and V2 schemas seamlessly
- No downtime during schema updates
- Schema Registry validates compatibility on producer registration
- Deserialization handles field defaults automatically

## Migration / Legacy Notes

**Consumer Rebalance Protocol Changes (Kafka 4.0)**:

- **Classic Protocol** (pre-4.0 default): Client-side group leader performs partition assignment
- **New Protocol** (Kafka 4.0 GA): Server-side broker coordinator performs assignment
- Enable new protocol: `group.protocol=consumer` (client must support)
- Benefits: Faster rebalances, less disruption, incremental reassignment
- Classic protocol still supported for backward compatibility

**Deserialization Best Practices**:

- Always use Schema Registry for production (Avro, Protobuf, JSON Schema)
- Implement schema evolution rules (forward/backward compatibility)
- Handle deserialization errors gracefully (don't crash consumer)
- Consider dead letter topics for malformed messages

## QnA

**Q1: Why does Kafka use a pull-based model for consumers instead of push?**
A: Pull-based allows consumers to control consumption rate, prevents overwhelming slow consumers, enables aggressive batching without latency concerns, and allows consumers to catch up at their own pace if they fall behind.

**Q2: What happens if key and value deserializers don't match producer serializers?**
A: DeserializationException will be thrown. For example, if producer uses StringSerializer but consumer uses IntegerDeserializer, deserialization fails. Always ensure deserializers match serializers.

**Q3: Can a consumer read unreplicated data from the leader?**
A: No. Consumers can only read up to the "high water mark" — the offset of the last message replicated to all ISRs. This prevents reading data that could be lost if the leader fails.

**Q4: What does `auto.offset.reset=earliest` vs `latest` do?**
A: When no committed offset exists for consumer group: `earliest` starts from beginning of partition (offset 0), `latest` starts from newest messages (current end). `none` throws exception if no offset found.

**Q5: Should I use auto-commit or manual commit for offsets?**
A: Auto-commit is simpler but risks duplicate processing after crashes (processes message but crashes before auto-commit interval). Manual commit (`enable.auto.commit=false` + `commitSync()`) gives control for at-least-once or exactly-once semantics.

**Q6: How does Avro deserialization handle schema evolution?**
A: Avro uses reader schema (consumer) and writer schema (producer). Schema Registry validates compatibility. Avro automatically handles missing fields (uses defaults), renamed fields, and type promotions based on compatibility rules.

## Sources

- [Apache Kafka Consumer API](https://kafka.apache.org/documentation/#consumerapi) (Retrieved: 2026-02-11)
- [Confluent Docs - Kafka Consumer Design](https://docs.confluent.io/kafka/design/consumer-design.html) (Retrieved: 2026-02-11)
- [Kafka Consumer Configuration](https://kafka.apache.org/documentation/#consumerconfigs) (Retrieved: 2026-02-11)
- [Confluent Schema Registry Documentation](https://docs.confluent.io/platform/current/schema-registry/index.html) (Retrieved: 2026-02-11)

---

# Kafka Journal — Kafka Connect Source and Sink (Date: 2026-02-26)

## TL;DR

- Kafka Connect moves data **into Kafka** using Source connectors and **out of Kafka** using Sink connectors.
- It scales using connector tasks and workers, with standalone mode for dev and distributed mode for production.
- Connect is best for integration plumbing (databases, object stores, search systems), while business logic should stay in apps/Streams.
- In Node.js, `@confluentinc/kafka-javascript` typically produces/consumes topics that Connect also reads/writes.

## Why this matters

Without Connect, teams often write and maintain many custom ingestion/export services. Connect reduces this operational burden and gives standardized, restartable, scalable data movement.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x clusters in KRaft mode.
- Connect remains an external runtime component (workers) and still stores its internal state in Kafka topics.
- ZooKeeper is not required for modern Kafka clusters; legacy ZooKeeper-era deployments mainly affect older operational playbooks.

## Core Concepts

- **Source Connector**: Pulls data from external systems (for example DB/CDC, logs, metrics) and writes to Kafka topics.
- **Sink Connector**: Reads Kafka topics and writes to external systems (for example Elasticsearch, S3, warehouses).
- **Connector vs Task**: Connector is the logical job; tasks are parallel workers doing actual copy work.
- **Workers**:
  - Standalone: one process, simple dev use.
  - Distributed: multiple processes with shared `group.id`, automatic rebalance/failover.
- **Converters**: Handle serialization boundaries (`AvroConverter`, `JsonConverter`, etc.); critical for schema consistency.
- **SMT (Single Message Transforms)**: Lightweight per-record transforms; for heavy multi-record logic use Streams/ksqlDB.

## Configuration Examples

### 1) Distributed Connect Worker (minimal)

```properties
bootstrap.servers=localhost:9092
group.id=connect-cluster
key.converter=ogr.apache.kafka.connect.storage.StringConverter
value.converter=org.apache.kafka.connect.json.JsonConverter
value.converter.schemas.enable=false

config.storage.topic=_connect-configs
offset.storage.topic=_connect-offsets
status.storage.topic=_connect-status

config.storage.replication.factor=3
offset.storage.replication.factor=3
status.storage.replication.factor=3
```

Why: these internal topics store connector configs, offsets, and status for fault tolerance.

### 2) Source connector (example shape)

```json
{
  "name": "inventory-source",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "tasks.max": "2",
    "connection.url": "jdbc:postgresql://db:5432/app",
    "connection.user": "app",
    "connection.password": "secret",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "topic.prefix": "src.inventory."
  }
}
```

Why: demonstrates a source job that incrementally ingests DB rows to Kafka topics.

### 3) Sink connector with DLQ basics

```json
{
  "name": "orders-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "3",
    "topics": "orders.events",
    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "orders.events.dlq",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

Why: DLQ for sink connectors helps keep pipelines running while capturing bad records.

## Real-World Example

**Retail pipeline**:

1. PostgreSQL order changes → JDBC Source Connector → `orders.raw` topic.
2. Node.js service (`@confluentinc/kafka-javascript`) consumes `orders.raw`, enriches with pricing service, produces `orders.enriched`.
3. Elasticsearch Sink Connector indexes `orders.enriched` for customer support search.
4. Bad sink records go to `orders.enriched.dlq` for remediation.

This keeps integration concerns in Connect and business logic in application code.

### Node.js integration sketch (`@confluentinc/kafka-javascript`)

```ts
import { Kafka } from "@confluentinc/kafka-javascript";

const kafka = new Kafka({ "bootstrap.servers": "localhost:9092" });
const consumer = kafka.consumer({
  "group.id": "enrichment-service",
  "enable.auto.commit": false,
});
const producer = kafka.producer({ "bootstrap.servers": "localhost:9092" });

await producer.connect();
await consumer.connect();
await consumer.subscribe({ topics: ["orders.raw"] });

consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const enriched = enrichOrder(JSON.parse(message.value.toString()));

    await producer.send({
      topic: "orders.enriched",
      messages: [{ key: message.key, value: JSON.stringify(enriched) }],
    });

    await consumer.commitOffsets([
      { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
    ]);
  },
});
```

## Migration / Legacy Notes (if applicable)

- Connect architecture (workers/connectors/tasks) is consistent across Kafka 3.x and 4.x.
- Legacy ZooKeeper-based clusters primarily differ in cluster metadata mode, not in Source/Sink connector fundamentals.

## QnA

**Q1: Source vs Sink in one line?**  
A: Source pulls external data into Kafka; Sink pushes Kafka data outward.

**Q2: When to increase `tasks.max`?**  
A: When connector/plugin and source/sink system support parallelism and you need higher throughput.

**Q3: Are SMTs enough for heavy enrichment?**  
A: Usually no; SMTs are lightweight per-record transforms, not complex business workflows.

**Q4: Does Connect replace Node services?**  
A: It replaces boilerplate integration code, but your Node services still handle custom logic and APIs.

## Sources

- [Confluent Platform Docs — Kafka Connect Overview](https://docs.confluent.io/platform/current/connect/index.html) (Retrieved: 2026-02-26)
- [Confluent Platform Docs — Kafka Connect Concepts](https://docs.confluent.io/platform/current/connect/concepts.html) (Retrieved: 2026-02-26)
- [Apache Kafka Docs — Connect API](https://kafka.apache.org/documentation/#connectapi) (Retrieved: 2026-02-26)
- [Confluent JavaScript Client Overview](https://docs.confluent.io/kafka-clients/javascript/current/overview.html) (Retrieved: 2026-02-26)

---

# Kafka Journal — Kafka Streams and Real-Time Processing with Constraints (Date: 2026-02-26)

## TL;DR

- Kafka Streams is a Java library for real-time stream processing (stateless + stateful) on Kafka topics.
- It supports at-least-once and exactly-once (`exactly_once_v2`) processing guarantees.
- Major constraints are partition-driven parallelism, event-time/late-event handling trade-offs, and state-store resource costs.
- Node.js services typically integrate **around** Streams apps by producing input topics and consuming output topics.

## Why this matters

Real-time features like fraud checks, rolling metrics, and live dashboards need low-latency processing with correct handling of out-of-order events.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x, KRaft clusters.
- Kafka Streams client model remains the same conceptually; KRaft affects broker metadata management, not Streams DSL fundamentals.
- ZooKeeper note: only legacy cluster operation difference; Streams app design patterns remain essentially unchanged.

## Core Concepts

- **Topology**: Directed graph of processors (source processors, operators, sink processors).
- **Partition-bound parallelism**: Max effective parallelism is bounded by input topic partitions.
- **Stateful ops**: Joins, aggregations, windows use local state stores (often RocksDB) + changelog topics.
- **Time model**: Event time, processing time, ingestion time; windows often depend on event-time timestamps.
- **Late/out-of-order data**: Configure grace periods; records arriving after window close + grace are dropped for that window.
- **Guarantees**:
  - Default `at_least_once`.
  - `exactly_once_v2` for stronger correctness with transactional semantics.

## Configuration Examples

### 1) Streams reliability profile

```properties
application.id=fraud-detection-v1
bootstrap.servers=localhost:9092
processing.guarantee=exactly_once_v2
num.stream.threads=2
commit.interval.ms=100
```

Why: balanced baseline for production-grade correctness and parallelism.

### 2) Windowing with grace period (conceptual)

```java
stream
  .groupByKey()
  .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
  .count();
```

Why: strict no-late-event behavior for cases where correctness requires hard cutoffs.

⚠️ Unverified: exact API combinations for grace/no-grace differ slightly by Kafka Streams version and should be checked against your project’s Streams Javadocs.

## Real-World Example

**Card fraud pipeline**:

1. Node.js API (`@confluentinc/kafka-javascript`) writes card swipes to `payments.raw`.
2. Kafka Streams app computes per-card velocity in 1-minute windows and joins with risk profile table.
3. Streams writes risk-scored events to `payments.scored`.
4. Node.js alerting service consumes `payments.scored` and triggers user notifications.

This splits responsibilities cleanly: Node for APIs/notifications, Streams for high-throughput stateful analytics.

### Node.js integration sketch (`@confluentinc/kafka-javascript`)

```ts
import { Kafka } from "@confluentinc/kafka-javascript";

const producer = new Kafka({ "bootstrap.servers": "localhost:9092" }).producer(
  {},
);
const consumer = new Kafka({ "bootstrap.servers": "localhost:9092" }).consumer({
  "group.id": "alerts-service",
});

await producer.connect();
await producer.send({
  topic: "payments.raw",
  messages: [
    { key: "card-42", value: JSON.stringify({ amount: 120, ts: Date.now() }) },
  ],
});

await consumer.connect();
await consumer.subscribe({ topics: ["payments.scored"] });
consumer.run({
  eachMessage: async ({ message }) =>
    handleAlert(JSON.parse(message.value.toString())),
});
```

## Migration / Legacy Notes (if applicable)

- Kafka Streams remains a JVM library; there is no official Node.js Kafka Streams equivalent from Apache Kafka.
- For Node-centric teams, common pattern is: Node services + Kafka Streams microservice (Java) + shared topics/contracts.

## QnA

**Q1: Can Kafka Streams run inside the broker?**  
A: No, it runs as a separate client application instance.

**Q2: What is the biggest scaling limit?**  
A: Input topic partition count bounds practical parallelism.

**Q3: Why do late events matter?**  
A: They can change aggregates/join outcomes; grace periods trade latency for correctness.

**Q4: When should I choose EOS?**  
A: For stateful critical pipelines where duplicates or missing outputs are unacceptable.

## Sources

- [Confluent Platform Docs — Kafka Streams Concepts](https://docs.confluent.io/platform/current/streams/concepts.html) (Retrieved: 2026-02-26)
- [Confluent Platform Docs — Kafka Streams Architecture](https://docs.confluent.io/platform/current/streams/architecture.html) (Retrieved: 2026-02-26)
- [Apache Kafka 4.0 Javadocs — org.apache.kafka.streams](https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/package-summary.html) (Retrieved: 2026-02-26)
- [Confluent JavaScript Client Overview](https://docs.confluent.io/kafka-clients/javascript/current/overview.html) (Retrieved: 2026-02-26)

---

# Kafka Journal — Kafka Schema Registry and Avro (Date: 2026-02-26)

## TL;DR

- Schema Registry centralizes schemas (Avro/Protobuf/JSON Schema), compatibility checks, and schema versioning.
- With Avro, producers/consumers share a strict data contract and evolve safely over time.
- Kafka Connect and many client ecosystems integrate via converters/serdes with Schema Registry.
- In Node.js, `@confluentinc/kafka-javascript` is used for Kafka IO, while schema operations are typically handled via Schema Registry APIs/tooling.

## Why this matters

As teams scale, schema drift becomes a major source of outages. Schema Registry prevents accidental contract breaks before bad events spread across services.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x ecosystems (KRaft clusters).
- Schema Registry is a separate service (Confluent Platform/Cloud feature set), not a broker-internal KRaft component.
- ZooKeeper relevance is legacy-only at cluster level; schema contract workflows stay the same.

## Core Concepts

- **Subject**: Logical name under which schema versions are registered (often topic-value/topic-key strategy).
- **Schema ID**: Numeric ID used on the wire to avoid sending full schema every message.
- **Compatibility**: Rules such as backward/forward/full to enforce safe evolution.
- **Avro basics**: Typed fields, optional defaults, schema evolution support.
- **Connect integration**: `AvroConverter` works with Schema Registry for source/sink pipelines.

## Configuration Examples

### 1) Kafka Connect Avro converter + Schema Registry

```properties
key.converter=io.confluent.connect.avro.AvroConverter
key.converter.schema.registry.url=http://schema-registry:8081
value.converter=io.confluent.connect.avro.AvroConverter
value.converter.schema.registry.url=http://schema-registry:8081
```

Why: enforces contracts and uses schema IDs instead of embedding full schema each record.

### 2) Example Avro schema (order event)

```json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.acme.orders",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "customerId", "type": "string" },
    { "name": "amount", "type": "double" },
    { "name": "currency", "type": "string", "default": "USD" }
  ]
}
```

Why: adding fields with defaults is a common backward-compatible evolution pattern.

### 3) Node.js producer shape with Avro-encoded payload bytes

```ts
import { Kafka } from "@confluentinc/kafka-javascript";

const producer = new Kafka({ "bootstrap.servers": "localhost:9092" }).producer(
  {},
);
await producer.connect();

const payload: Buffer = await encodeWithSchemaRegistry("orders-value", {
  orderId: "o-1001",
  customerId: "c-77",
  amount: 499.0,
  currency: "USD",
});

await producer.send({
  topic: "orders.avro",
  messages: [{ key: "o-1001", value: payload }],
});
```

`encodeWithSchemaRegistry` represents your schema-registry serialization path (library or REST-based wrapper).

⚠️ Unverified: a first-party official Node.js Schema Registry serializer package name from Confluent is not confirmed in these retrieved docs; verify your preferred package and compatibility mode before implementation.

## Real-World Example

**Order platform with multiple teams**:

1. Checkout service publishes `OrderCreated` events in Avro.
2. Registry enforces compatibility when schema evolves (for example adding `promoCode` with default).
3. Billing team consumes older and newer versions without immediate coordinated deploy.
4. Connect sink writes validated Avro data into analytics storage.

Result: safer independent releases and fewer contract-breaking incidents.

## Migration / Legacy Notes (if applicable)

- Teams moving from plain JSON often adopt Schema Registry + Avro first for high-value domains (orders/payments) before expanding globally.
- Legacy consumers that parse schemaless JSON usually need migration adapters when switching to registry-backed Avro topics.

## QnA

**Q1: Why not just keep JSON everywhere?**  
A: JSON is flexible but weak for strict contracts/evolution; Registry adds enforcement and compatibility checks.

**Q2: What does schema ID buy me?**  
A: Smaller wire payloads and fast schema lookup/validation.

**Q3: Is Schema Registry only for Avro?**  
A: No, it also supports Protobuf and JSON Schema.

**Q4: Does KRaft replace Schema Registry?**  
A: No, KRaft handles Kafka metadata; Schema Registry manages data contracts.

## Sources

- [Confluent Platform Docs — Schema Registry Overview](https://docs.confluent.io/platform/current/schema-registry/index.html) (Retrieved: 2026-02-26)
- [Confluent Platform Docs — Schema Evolution & Compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) (Retrieved: 2026-02-26)
- [Confluent Platform Docs — Formats, Serializers, and Deserializers](https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html) (Retrieved: 2026-02-26)
- [Confluent JavaScript Client Overview](https://docs.confluent.io/kafka-clients/javascript/current/overview.html) (Retrieved: 2026-02-26)

- [Kafka 4.0 Consumer Rebalance Protocol](https://docs.confluent.io/kafka/design/consumer-design.html#consumer-rebalance-protocols-and-partition-assignments) (Retrieved: 2026-02-11)

---

# Kafka Journal — Consumer Groups and Consumer Offsets (Date: 2026-02-11)

## TL;DR

- **Consumer Groups** enable parallel processing by distributing partitions among multiple consumers with same `group.id`
- Each partition consumed by exactly one consumer within a group at any time
- **Consumer Offsets** track read position (next offset to consume) per consumer group, stored in `__consumer_offsets` internal topic
- Offsets enable fault tolerance, resumption after failures, and replay capabilities

## Why this matters

Consumer groups are fundamental for:

- **Horizontal Scaling**: Add consumers to increase processing throughput
- **Fault Tolerance**: Another consumer takes over if one fails
- **Load Balancing**: Automatic partition distribution across consumers
- **Independent Processing**: Multiple applications (groups) consume same topic independently at different speeds

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Kafka 4.0 introduces new consumer rebalance protocol with server-side assignment (opt-in, requires `group.protocol=consumer`)
- Classic rebalance protocol default in 3.x and still supported in 4.x
- Consumer offset management consistent across versions

## Core Concepts

### Consumer Groups

**Definition**: A set of consumers from the same application that work together to consume and process messages from topics, sharing a common `group.id`.

**Key Principles**:

- Each consumer in group has same `group.id`
- Each partition assigned to exactly one consumer within group at any time
- If consumers > partitions, some consumers idle
- If partitions > consumers, some consumers handle multiple partitions
- Multiple groups can consume same topic independently

**Example Topology**:

```
Topic: orders (6 partitions)
Consumer Group: order-processors (3 consumers)

Partition 0,1 → Consumer-A
Partition 2,3 → Consumer-B
Partition 4,5 → Consumer-C

(Automatic load balancing)
```

**Consumer Group Coordinator**:

- Broker-side component managing group membership
- Determined by `group.id` hash
- Assigns partitions to consumers
- Detects consumer failures via heartbeats
- Triggers rebalances on membership changes
- Uses `__consumer_offsets` topic to track group metadata

### Consumer Rebalancing

**Definition**: Process of redistributing partition assignments when consumer group membership or topic metadata changes.

**Rebalance Triggers**:

1. Consumer joins group (new instance starts)
2. Consumer leaves group (graceful shutdown or crash)
3. Consumer considered dead (missed heartbeats beyond `session.timeout.ms`)
4. Topic partitions added/removed
5. Consumer subscription changes

**Rebalance Protocols**:

**Classic Protocol** (pre-Kafka 4.0 default):

- One consumer elected as **group leader**
- Leader collects metadata, performs client-side assignment
- Submits assignment plan to coordinator
- Coordinator distributes assignments
- **Eager Rebalance**: All consumers revoke partitions, pause, then reassign (higher disruption)
- **Cooperative Rebalance**: Only affected partitions reassigned (lower disruption)

**New Consumer Rebalance Protocol** (Kafka 4.0 GA):

- No group leader election needed
- Broker coordinator performs server-side assignment
- Incremental reassignment with minimal disruption
- Enabled with `group.protocol=consumer` (client must support)
- Reduces rebalance time and pauses

**Rebalance Impact**:

- Classic eager: ~seconds downtime for entire group
- Classic cooperative: ~1s for affected consumers
- New protocol: <100ms incremental, unaffected consumers continue

### Consumer Offsets

**Definition**: Integer marking the **next** record that should be read by a consumer in a partition. Stored in `__consumer_offsets` internal topic.

**Offset Semantics**:

- **Current Position**: Offset consumer will read next
- **Last Committed Offset**: Offset consumer has marked as successfully processed (stored in `__consumer_offsets`)
- **Uncommitted Range**: Gap between current position and last committed offset

**Visual Representation**:

```
Partition 0:
[0][1][2][3][4][5][6][7][8][9][10][11][12][13][14]...
       ↑              ↑                 ↑         ↑
    Committed     Current           High      Log End
    (offset=1)    (offset=6)      Water      (offset=14)
                                  (offset=10)

If consumer crashes, restart from committed offset 1 → reprocess 1-5
```

**Offset Management Strategies**:

1. **Auto-Commit** (`enable.auto.commit=true`):
   - Offsets committed automatically every `auto.commit.interval.ms` (default: 5000ms)
   - Simple but risk of duplicate processing on crash

2. **Manual Synchronous Commit** (`commitSync()`):
   - Blocks until broker acknowledges
   - At-least-once guarantee (may reprocess on failure)

3. **Manual Asynchronous Commit** (`commitAsync()`):
   - Non-blocking, higher throughput
   - Fire-and-forget (no retry on failure)

4. **Commit Specific Offsets**:
   - Fine-grained control per partition
   - Useful for batch processing

**Offset Storage**:

- `__consumer_offsets` is compacted topic (50 partitions by default)
- Key: `(group.id, topic, partition)`
- Value: `(offset, metadata, timestamp)`
- Retention controlled by `offsets.retention.minutes` (default: 7 days)

### Partition Assignment Strategies

**Range Assignor** (default for classic protocol):

- Assigns consecutive partitions per topic
- Example: Topic has 6 partitions, 2 consumers → C1 gets 0-2, C2 gets 3-5
- Can cause imbalance with multiple topics

**Round-Robin Assignor**:

- Distributes partitions cyclically across consumers
- Better balance across topics

**Sticky Assignor**:

- Minimizes partition movement during rebalance
- Consumers keep existing assignments where possible

**Cooperative Sticky Assignor** (recommended):

- Sticky + cooperative rebalancing
- Least disruption during rebalances

## Configuration Examples

### Consumer Group Configuration

```properties
# Consumer group settings
bootstrap.servers=kafka1:9092,kafka2:9092
group.id=payment-processors              # Group identifier

# Deserializers
key.deserializer=org.apache.kafka.common.serialization.StringDeserializer
value.deserializer=org.apache.kafka.common.serialization.StringDeserializer

# Partition assignment
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor

# Offset management
enable.auto.commit=true                  # Auto-commit enabled
auto.commit.interval.ms=5000             # Commit every 5 seconds
auto.offset.reset=earliest               # Start from beginning if no offset

# Session management
session.timeout.ms=45000                 # 45s heartbeat timeout (Kafka 4.0 default)
heartbeat.interval.ms=3000               # Send heartbeat every 3s
max.poll.interval.ms=300000              # 5min max processing time between polls
```

### Consumer Group - Manual Offset Commit (Java)

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;

public class OrderProcessor {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "order-processing-group");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("enable.auto.commit", "false");  // Manual commit

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Arrays.asList("orders"));

        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

                // Process all records in batch
                for (ConsumerRecord<String, String> record : records) {
                    processOrder(record);
                }

                // Commit after successful batch processing
                try {
                    consumer.commitSync();  // Blocks until commit succeeds
                    System.out.println("Offsets committed successfully");
                } catch (CommitFailedException e) {
                    System.err.println("Commit failed: " + e.getMessage());
                }
            }
        } finally {
            consumer.close();
        }
    }

    static void processOrder(ConsumerRecord<String, String> record) {
        System.out.printf("Processing: partition=%d, offset=%d, key=%s%n",
            record.partition(), record.offset(), record.key());
        // Business logic here...
    }
}
```

### Consumer Group - Async Commit with Callback

```java
consumer.commitAsync(new OffsetCommitCallback() {
    public void onComplete(Map<TopicPartition, OffsetAndMetadata> offsets, Exception exception) {
        if (exception != null) {
            System.err.printf("Commit failed for offsets %s: %s%n",
                offsets, exception.getMessage());
            // Consider retry or alert
        } else {
            System.out.println("Async commit succeeded");
        }
    }
});
```

### View Consumer Group Status (CLI)

```bash
# List all consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe specific group (shows partition assignments, offsets, lag)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group order-processing-group \
  --describe

# Output:
# GROUP                    TOPIC      PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG    CONSUMER-ID
# order-processing-group   orders     0          12450           12450           0      consumer-1-abc
# order-processing-group   orders     1          12389           12400           11     consumer-2-def
# order-processing-group   orders     2          12500           12500           0      consumer-3-ghi

# Reset offsets to beginning
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group order-processing-group \
  --topic orders \
  --reset-offsets --to-earliest \
  --execute
```

### Multiple Consumer Groups (Python Example)

```python
from kafka import KafkaConsumer

# Group 1: Real-time order processing
consumer1 = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='realtime-processors',    # Unique group
    auto_offset_reset='latest'         # Process new orders only
)

# Group 2: Analytics (reads independently)
consumer2 = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='analytics-pipeline',     # Different group
    auto_offset_reset='earliest'       # Process all historical orders
)

# Both groups consume same topic independently with separate offsets
```

## Real-World Example

**Payment Processing Service - Horizontal Scaling**:

**Scenario**: Payment service must process 10,000 transactions/sec from `payment-events` topic (30 partitions).

**Initial Setup** (Insufficient Capacity):

```
Consumer Group: payment-processors
Consumers: 3 instances

Partition Distribution:
- Consumer-1: Partitions 0-9   (10 partitions) → 3,333 txn/sec
- Consumer-2: Partitions 10-19 (10 partitions) → 3,333 txn/sec
- Consumer-3: Partitions 20-29 (10 partitions) → 3,333 txn/sec

Result: Each consumer overloaded, 30% lag building up
```

**Scale Up** (Add Consumers):

```
Consumer Group: payment-processors
Consumers: 6 instances (scale from 3 to 6)

Automatic Rebalance Triggers:
1. Consumer-4, 5, 6 start and join group
2. Coordinator detects membership change
3. Rebalance triggered
4. New partition distribution:

- Consumer-1: Partitions 0-4   (5 partitions) → 1,667 txn/sec ✓
- Consumer-2: Partitions 5-9   (5 partitions) → 1,667 txn/sec ✓
- Consumer-3: Partitions 10-14 (5 partitions) → 1,667 txn/sec ✓
- Consumer-4: Partitions 15-19 (5 partitions) → 1,667 txn/sec ✓
- Consumer-5: Partitions 20-24 (5 partitions) → 1,667 txn/sec ✓
- Consumer-6: Partitions 25-29 (5 partitions) → 1,667 txn/sec ✓

Result: Load distributed evenly, lag cleared within 5 minutes
```

**Offset Management**:

- Manual commit after successful payment processing
- If Consumer-3 crashes at offset 15000, Consumer-4 takes over from last committed offset 14995
- Potential duplicates 14995-15000 handled via idempotency (payment ID deduplication)

**Multiple Groups**:

- **Group 1**: `payment-processors` (processes payments)
- **Group 2**: `fraud-detection` (analyzes same events independently)
- **Group 3**: `audit-logger` (archives to data warehouse)
- All three groups consume `payment-events` with independent offsets at different rates

## Migration / Legacy Notes

**Consumer Rebalance Protocol Evolution**:

- **Kafka 0.9-2.3**: Only eager rebalancing (all consumers stop)
- **Kafka 2.4+**: Cooperative rebalancing available (incremental)
- **Kafka 4.0**: New server-side rebalance protocol GA (opt-in via `group.protocol=consumer`)
- Classic protocol remains default for backward compatibility

**Offset Storage Migration**:

- **Pre-0.9**: Offsets stored in ZooKeeper
- **0.9+**: Offsets stored in `__consumer_offsets` Kafka topic
- **Migration**: Automatic, no action needed

**Best Practice**: Use cooperative sticky assignor for minimal rebalance disruption in 3.x/4.x.

## QnA

**Q1: What happens if number of consumers exceeds number of partitions?**
A: Extra consumers remain idle. For example, 10 consumers for 6 partitions → 6 consumers active, 4 idle. They serve as hot standbys in case active consumers fail.

**Q2: Can consumers from different groups read the same partition simultaneously?**
A: Yes! Different consumer groups track independent offsets. Group A at offset 1000, Group B at offset 5000 of same partition is common (e.g., realtime vs batch processing).

**Q3: What is "consumer lag" and why does it matter?**
A: Lag = log-end-offset - current-offset. Indicates how far behind consumer is from latest messages. High lag means consumer can't keep up with production rate. Monitor lag to trigger scaling.

**Q4: What happens to uncommitted offsets if consumer crashes?**
A: Lost. On restart (or reassignment to another consumer), consumption resumes from last committed offset, causing reprocessing of uncommitted messages. Use manual commit for control.

**Q5: How does Kafka detect a "dead" consumer to trigger rebalance?**
A: Consumer must send heartbeats to coordinator within `session.timeout.ms` (default 45s in Kafka 4.0). If heartbeat missed, coordinator marks consumer dead and triggers rebalance. Also, `max.poll.interval.ms` detects processing hangs.

**Q6: Can I manually assign partitions instead of using automatic group assignment?**
A: Yes, use `consumer.assign(List<TopicPartition>)` instead of `consumer.subscribe()`. Manual assignment skips group coordination and rebalancing. Useful for specific partition ownership, but loses automatic failover.

## Sources

- [Confluent Docs - Consumer Groups and Group IDs](https://docs.confluent.io/kafka/design/consumer-design.html#consumer-groups-and-group-ids) (Retrieved: 2026-02-11)
- [Confluent Docs - Consumer Offsets](https://docs.confluent.io/kafka/design/consumer-design.html#consumer-offsets) (Retrieved: 2026-02-11)
- [Kafka Consumer Rebalance Protocols](https://docs.confluent.io/kafka/design/consumer-design.html#consumer-rebalance-protocols-and-partition-assignments) (Retrieved: 2026-02-11)
- [Apache Kafka Consumer Configuration](https://kafka.apache.org/documentation/#consumerconfigs) (Retrieved: 2026-02-11)
- [Kafka Consumer Group Management](https://docs.confluent.io/kafka/operations-tools/manage-consumer-groups.html) (Retrieved: 2026-02-11)

---

# Kafka Journal — Brokers and Topics (Date: 2026-02-11)

## TL;DR

- **Brokers** are Kafka servers that form the storage layer, storing partition replicas and serving client requests
- **Topics** are logical categories where events are organized, divided into partitions distributed across brokers
- Each broker stores subset of partitions, enabling horizontal scaling and fault tolerance
- Brokers communicate with controllers (KRaft) for metadata management and coordination

## Why this matters

Understanding broker-topic relationship is essential for:

- **Capacity Planning**: How many brokers needed for storage/throughput requirements
- **Data Distribution**: How topics are spread across cluster for load balancing
- **Fault Tolerance**: How partition replicas protect against broker failures
- **Performance Optimization**: Partition placement affects I/O, network, and processing

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Broker fundamentals consistent across versions
- KRaft mode (3.3.1+ production, 4.0+ default) changes metadata management but not core broker-topic mechanics
- Topic configuration and management standardized

## Core Concepts

### Kafka Brokers

**Definition**: Servers in Kafka cluster that form the storage layer, storing event streams and serving client produce/consume requests.

**Broker Responsibilities**:

1. **Storage**: Persist partition replicas to disk (`log.dirs`)
2. **Serving**: Handle produce requests (writes) and fetch requests (reads)
3. **Replication**: Replicate data between leader and follower replicas
4. **Coordination**: Communicate with controllers for metadata updates
5. **Leadership**: Act as leader for subset of partitions

**Broker Identification**:

- Each broker has unique `broker.id` (or `node.id` in KRaft)
- Every broker is a "bootstrap server" (connect to one, discover all)
- Clients receive cluster metadata from any broker

**Broker Storage Architecture**:

```
Broker Disk Layout:
/data/kafka-logs/
  ├── topic-A-partition-0/
  │   ├── 00000000000000000000.log  (segment file)
  │   ├── 00000000000000000000.index
  │   └── 00000000000000000000.timeindex
  ├── topic-A-partition-3/
  ├── topic-B-partition-1/
  └── topic-B-partition-2/

Each partition = directory with log segments
```

**Broker Capacity Factors**:

- **Disk I/O**: Sequential writes/reads (Kafka optimized for disk)
- **Network**: Replication and client traffic
- **CPU**: Compression/decompression (if enabled)
- **Memory**: Page cache for performance (OS manages)

**Typical Production Cluster**:

- Minimum: 3 brokers (for replication factor 3)
- Moderate: 5-10 brokers
- Large: 50-100+ brokers
- Rule of thumb: ~4,000 partitions per broker max (including replicas)

### Topics

**Definition**: Named categories that organize events, logically independent but physically distributed across broker partitions.

**Topic Characteristics**:

- Append-only log (immutable events)
- Multi-producer, multi-subscriber
- Retention by time or size
- Divided into partitions for parallelism

**Topic Configuration** (Key Properties):

| Property              | Description                  | Default   | Example   |
| --------------------- | ---------------------------- | --------- | --------- |
| `num.partitions`      | Number of partitions         | 1         | 6         |
| `replication.factor`  | Copies of each partition     | 1         | 3         |
| `retention.ms`        | Time retention               | 7 days    | 604800000 |
| `retention.bytes`     | Size retention per partition | Unlimited | 1GB       |
| `min.insync.replicas` | Min ISRs for acks=all        | 1         | 2         |
| `compression.type`    | Compression algorithm        | producer  | snappy    |
| `cleanup.policy`      | delete or compact            | delete    | delete    |
| `segment.ms`          | Segment roll time            | 7 days    | 604800000 |

**Topic Naming Conventions**:

- Use descriptive names: `user-registrations`, `payment-events`, `order-updates`
- Avoid special characters (stick to alphanumeric, dash, underscore, dot)
- Consider namespacing: `prod.orders.created`, `staging.orders.created`

### Broker-Topic Relationship

**Partition Distribution**:

- When topic created, partitions distributed across brokers
- Kafka attempts even distribution (round-robin)
- Example: 6 partitions, 3 brokers → 2 partitions per broker

**Visual Representation**:

```
Topic: user-events (6 partitions, replication factor 3)

Broker-1:
  ├── user-events-0 (leader)
  ├── user-events-1 (follower)
  └── user-events-2 (follower)

Broker-2:
  ├── user-events-0 (follower)
  ├── user-events-2 (leader)
  └── user-events-4 (follower)

Broker-3:
  ├── user-events-1 (leader)
  ├── user-events-3 (leader)
  └── user-events-5 (leader)

Each partition has 1 leader + 2 followers across different brokers
```

**Partition Leader**:

- One broker elected leader for each partition
- All reads/writes go through leader
- Leader coordinates replication to followers
- Leadership distributed across brokers for load balancing

**Broker Failure Impact**:

- If Broker-1 fails, partitions 0 (leader), 1 (follower), 2 (follower) affected
- Followers on Broker-2/3 promoted to leaders for partition 0
- Cluster continues operating with reduced redundancy
- When Broker-1 recovers, resyncs and becomes follower

### Topic Management Operations

**Create Topic**:

```bash
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config min.insync.replicas=2
```

**List Topics**:

```bash
kafka-topics.sh --list --bootstrap-server localhost:9092
```

**Describe Topic** (shows partition-broker mapping):

```bash
kafka-topics.sh --describe --bootstrap-server localhost:9092 --topic orders

# Output:
# Topic: orders  PartitionCount: 6  ReplicationFactor: 3  Configs: retention.ms=604800000
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  ISR: 1,2,3
# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  ISR: 2,3,1
# Topic: orders  Partition: 2  Leader: 3  Replicas: 3,1,2  ISR: 3,1,2
# ...
```

**Alter Topic** (increase partitions):

```bash
kafka-topics.sh --alter \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 12  # Can only increase, not decrease
```

**Delete Topic**:

```bash
kafka-topics.sh --delete \
  --bootstrap-server localhost:9092 \
  --topic old-topic
```

## Configuration Examples

### Broker Configuration (server.properties)

```properties
# Broker identification
broker.id=1                            # Unique ID (or use node.id in KRaft)

# Listeners
listeners=PLAINTEXT://0.0.0.0:9092
advertised.listeners=PLAINTEXT://broker1.example.com:9092

# Storage
log.dirs=/data/kafka-logs              # Data directory
num.recovery.threads.per.data.dir=1    # Threads for log recovery

# Topic defaults (if not specified at topic creation)
num.partitions=3                       # Default partitions for new topics
default.replication.factor=3           # Default replication factor
min.insync.replicas=2                  # Minimum ISRs must be in sync for durability (works with acks config, specially acks  = all)
auto.create.topics.enable=false        # Disable auto topic creation (recommend)

# Retention
log.retention.hours=168                # 7 days
log.retention.bytes=-1                 # Unlimited size (per partition)
log.segment.bytes=1073741824           # 1GB segment files
log.retention.check.interval.ms=300000 # Check every 5 min

# Replication
replica.lag.time.max.ms=30000          # 30s max lag for ISR
num.replica.fetchers=4                 # Fetcher threads for replication

# Performance
num.network.threads=8                  # Network threads
num.io.threads=16                      # I/O threads
socket.send.buffer.bytes=102400        # 100KB
socket.receive.buffer.bytes=102400     # 100KB
```

### Topic Creation with Retention and Compaction

```bash
# Regular topic with time-based retention
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic app-logs \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=259200000 \     # 3 days
  --config compression.type=lz4

# Compacted topic (keeps latest value per key, e.g., user profiles)
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic user-profiles \
  --partitions 6 \
  --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.compaction.lag.ms=3600000  # Compact after 1hr
```

### Docker Compose - Multi-Broker Cluster (KRaft)

```yaml
version: "3.8"
services:
  kafka-1:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-1
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: "broker,controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka-1:9092,CONTROLLER://kafka-1:9093"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9092"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: "/tmp/kraft-logs-1"
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  kafka-2:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-2
    ports:
      - "9093:9092"
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: "broker,controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka-2:9092,CONTROLLER://kafka-2:9093"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9093"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: "/tmp/kraft-logs-2"
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  kafka-3:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-3
    ports:
      - "9094:9092"
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: "broker,controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka-3:9092,CONTROLLER://kafka-3:9093"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9094"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: "/tmp/kraft-logs-3"
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
```

## Real-World Example

**E-commerce Platform - Multi-Broker Cluster**:

**Requirements**:

- 3 applications producing events: order-service, inventory-service, notification-service
- 100K events/sec throughput
- 30-day retention
- High availability (tolerate 1 broker failure)

**Cluster Design**:

```
Brokers: 5 nodes (AWS m5.xlarge: 4 vCPU, 16GB RAM, 500GB SSD each)
Total Capacity: 2.5TB storage, 20 vCPU, 80GB RAM

Topics:
1. orders: 15 partitions, RF=3, retention=30d
2. inventory-updates: 10 partitions, RF=3, retention=7d
3. notifications: 20 partitions, RF=3, retention=3d
4. user-events: 30 partitions, RF=3, retention=30d

Total Partitions: 75 partitions × 3 replicas = 225 partition replicas
Per Broker: 225 ÷ 5 = 45 partition replicas each
```

**Partition Distribution** (orders topic):

```
Broker-1: orders-0(L), orders-5(F), orders-10(F)
Broker-2: orders-1(L), orders-6(F), orders-11(F)
Broker-3: orders-2(L), orders-7(F), orders-12(F)
Broker-4: orders-3(L), orders-8(F), orders-13(F)
Broker-5: orders-4(L), orders-9(F), orders-14(F)

L=Leader, F=Follower
Leadership evenly distributed
```

**Failure Scenario**:

- Broker-3 fails (hardware issue)
- Impact: Partitions 2, 7, 12 lose leader
- Recovery: Followers on Broker-1/2/4/5 promoted to leaders within seconds
- Cluster continues with 4 brokers, reduced redundancy (RF effectively 2)
- When Broker-3 restored, resyncs and resumes as follower

**Monitoring**:

```bash
# Check broker disk usage
df -h /data/kafka-logs

# Check underreplicated partitions (indicates issues)
kafka-topics.sh --describe --bootstrap-server localhost:9092 --under-replicated-partitions

# Monitor broker metrics
# - UnderReplicatedPartitions: should be 0
# - BytesInPerSec: incoming throughput
# - BytesOutPerSec: outgoing throughput
# - TotalTimeMs: request processing time
```

## Migration / Legacy Notes

**ZooKeeper vs KRaft Broker Management**:

- **ZooKeeper Mode**: Broker IDs registered in ZooKeeper, controller elected via ZooKeeper
- **KRaft Mode**: Brokers register with controller quorum, controller elected via Raft
- **Migration**: Use `zookeeper-to-kraft.sh` (Kafka 3.4+)
- **Benefit**: Simpler operations, faster metadata updates, higher partition limits

**Topic Auto-Creation**:

- Older versions: `auto.create.topics.enable=true` by default
- Best practice: Set to `false` in production (prevent accidental topic creation from typos)
- Explicitly create topics with desired partitions/replication

## QnA

**Q1: How many brokers do I need for production?**
A: Minimum 3 for replication factor 3 (tolerate 1 failure). Consider: storage needs, throughput, partition count (~4K max per broker), and desired redundancy. Typical clusters: 5-10 brokers for moderate scale.

**Q2: Can I add brokers to existing cluster to increase capacity?**
A: Yes. New broker joins cluster, but partitions don't auto-rebalance. Use `kafka-reassign-partitions.sh` to redistribute existing partitions to new broker for load balancing.

**Q3: What happens if I create a topic with more partitions than brokers?**
A: Works fine. Each broker stores multiple partitions. Example: 30 partitions, 5 brokers → 6 partitions per broker. Partition leaders distributed evenly.

**Q4: Can a single broker be leader for all partitions?**
A: Technically possible (if other brokers failed), but Kafka automatically distributes leadership evenly across available brokers for load balancing. Use `kafka-preferred-replica-election.sh` to rebalance if needed.

**Q5: How much disk space does a topic consume?**
A: Depends on: (partitions × retention.bytes) or (partitions × message rate × retention.ms). Example: 10 partitions, 1KB msgs, 1000 msg/sec/partition, 7d retention = 10 × 1KB × 1000 × 604800s = ~6TB.

**Q6: Should I use one large topic or multiple smaller topics?**
A: Depends on use case. Large topic with many partitions good for high throughput, unified data model. Separate topics better for different data types, retention needs, or access controls. Balance: total partition count across cluster.

## Sources

- [Apache Kafka - Brokers](https://kafka.apache.org/documentation/#brokerconfigs) (Retrieved: 2026-02-11)
- [Confluent Docs - Kafka Brokers](https://docs.confluent.io/kafka/introduction.html#brokers) (Retrieved: 2026-02-11)
- [Confluent Docs - Topics](https://docs.confluent.io/kafka/introduction.html#topics) (Retrieved: 2026-02-11)
- [Kafka Topic Management](https://kafka.apache.org/documentation/#topicconfigs) (Retrieved: 2026-02-11)
- [Kafka Operations - Manage Topics](https://docs.confluent.io/platform/current/kafka/manage-topics.html) (Retrieved: 2026-02-11)

---

# Kafka Journal — Topic Replication and Leaders (Date: 2026-02-11)

## TL;DR

- **Replication** creates multiple copies of each partition across brokers for fault tolerance (typically replication factor 3)
- Each partition has one **leader** (handles all reads/writes) and N-1 **followers** (replicate data from leader)
- **In-Sync Replicas (ISR)** are followers caught up with leader; only ISRs eligible for leader election
- **Committed messages** are replicated to all ISRs, guaranteeing durability and no data loss on failures

## Why this matters

Replication is critical for:

- **High Availability**: Cluster continues operating when brokers fail
- **Durability**: Messages not lost even with hardware failures
- **Zero Downtime**: Automatic failover to new leaders within seconds
- **Data Integrity**: Consumers only read committed (fully replicated) messages

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Replication mechanics consistent across versions
- KRaft mode improves controller failover speed but replication behavior unchanged
- ISR management and leader election standardized

## Core Concepts

### Replication Basics

**Definition**: Process of maintaining multiple copies (replicas) of each partition across different brokers.

**Replication Factor (RF)**:

- Number of total replicas (leader + followers)
- Configured per topic at creation
- Cannot be changed after creation (workaround: create new topic, migrate)
- Production standard: **RF=3** (tolerates 2 broker failures)

**Formula**:

```
Fault Tolerance = Replication Factor - 1

RF=1: No fault tolerance (0 failures)
RF=2: Tolerates 1 failure
RF=3: Tolerates 2 failures
RF=5: Tolerates 4 failures (rare, high overhead)
```

**Storage Cost**:

- RF=3 means 3× storage required
- Example: 1TB topic with RF=3 = 3TB total storage across cluster

### Partition Leaders

**Definition**: One broker elected as leader for each partition, handling all client read/write operations.

**Leader Responsibilities**:

1. **Accept Writes**: Receive produce requests from producers
2. **Serve Reads**: Respond to fetch requests from consumers
3. **Coordinate Replication**: Send data to follower replicas
4. **Maintain ISR**: Track which followers are in sync
5. **Report to Controller**: Notify about ISR changes

**Leader Distribution**:

- Kafka distributes leadership evenly across brokers
- Avoids hot spots (one broker handling all traffic)
- Each broker is leader for subset of partitions

**Example**:

```
Topic: payments (9 partitions, RF=3)
Cluster: 3 brokers

Ideal Leadership Distribution:
Broker-1: Leader for partitions 0, 3, 6  (3 leaders)
Broker-2: Leader for partitions 1, 4, 7  (3 leaders)
Broker-3: Leader for partitions 2, 5, 8  (3 leaders)

Balanced: Each broker handles 33% of read/write traffic
```

### Follower Replicas

**Definition**: Non-leader replicas that replicate data from the leader by fetching new messages.

**Follower Behavior**:

- Act like Kafka consumers: fetch messages from leader
- Apply messages to their own log in same order
- Send fetch requests continuously (like heartbeats)
- Do NOT serve client read/write requests (all go to leader)

**Replication Protocol**:

```
1. Producer writes message to leader
2. Leader appends to its log
3. Leader includes message in next fetch response to followers
4. Followers append to their logs
5. Followers acknowledge to leader
6. Leader advances "high water mark"
7. Message now "committed" (consumers can read it)
```

**Why Followers Don't Serve Reads**:

- Simplifies consistency (no stale reads)
- Easier to guarantee ordering
- All clients get same view of data
- Note: Kafka 2.4+ supports "follower fetching" for read-only replicas in different datacenters (not standard ISRs)

### In-Sync Replicas (ISR)

**Definition**: Set of replicas (leader + followers) that are "caught up" with the leader, eligible for leader election.

**ISR Criteria**:

- Follower must fetch within `replica.lag.time.max.ms` (default: 30s in Kafka 3.x/4.x)
- Previously based on message count lag, now time-based
- If follower falls behind, leader removes it from ISR

**ISR States**:

```
Healthy: ISR = [Broker-1(L), Broker-2(F), Broker-3(F)]  (all in sync)

Follower Lagging: ISR = [Broker-1(L), Broker-2(F)]  (Broker-3 removed, falling behind)

Leader Failed: ISR = [Broker-2(new-L), Broker-3(F)]  (Broker-2 promoted to leader)
```

**ISR Importance**:

- Only ISRs can become leader (ensures no data loss)
- `min.insync.replicas` setting requires minimum ISRs for writes
- Low ISR count = risk (less redundancy)

**Committed Messages**:

- Message "committed" when replicated to **all ISRs**
- Consumers only read committed messages (up to "high water mark")
- Guarantees: committed message not lost as long as 1 ISR alive

### Leader Election

**Definition**: Process of promoting a follower to leader when current leader fails.

**Election Process** (KRaft Mode):

1. Controller detects leader failure (missed heartbeats)
2. Controller selects new leader from ISR list
3. Preference: replica with most up-to-date log (highest offset)
4. Controller updates metadata and notifies brokers
5. New leader starts accepting requests
6. Failed broker rejoins as follower when recovered

**Election Time**:

- Typically seconds (2-5s in Kafka 3.x/4.x)
- KRaft mode faster than ZooKeeper mode (near-instantaneous metadata updates)

**Unclean Leader Election**:

- If all ISRs offline, two options:
  1. **Wait for ISR** (default): Remain offline until ISR recovers (prioritize consistency)
  2. **Elect non-ISR** (`unclean.leader.election.enable=true`): Elect first available replica (prioritize availability, risk data loss)
- Default: unclean election **disabled** (favor consistency)

### Producer Acknowledgments (acks) and Replication

**acks=0** (No acknowledgment):

- Producer fire-and-forget
- No replication guarantee
- Highest throughput, risk data loss

**acks=1** (Leader acknowledgment):

- Leader writes to its log, acks immediately
- No guarantee followers replicated
- Balanced throughput/durability

**acks=all** (All ISRs acknowledgment):

- Leader waits for all ISRs to acknowledge
- Combined with `min.insync.replicas=2` ensures durability
- Highest durability, slightly lower throughput

**Recommended Production**:

```properties
# Producer
acks=all

# Topic
min.insync.replicas=2

# Ensures: message committed to leader + at least 1 follower before ack
# Tolerates 1 broker failure (with RF=3)
```

## Configuration Examples

### Topic Creation with Replication

```bash
# Production topic: RF=3, min.insync.replicas=2
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic critical-orders \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config unclean.leader.election.enable=false
```

### Broker Configuration for Replication

```properties
# server.properties

# Default for auto-created topics (avoid auto-create in production)
default.replication.factor=3

# ISR management
replica.lag.time.max.ms=30000          # 30s max lag before removing from ISR
num.replica.fetchers=4                 # Threads for fetching from leaders

# Leader election
unclean.leader.election.enable=false   # Don't elect non-ISR (prevent data loss)
auto.leader.rebalance.enable=true      # Rebalance leadership periodically

# Replication quota (throttle during reassignment to avoid overwhelming)
leader.replication.throttled.rate=10485760    # 10MB/s
follower.replication.throttled.rate=10485760  # 10MB/s
```

### Producer Configuration for Durability

```properties
# Producer with maximum durability
bootstrap.servers=kafka1:9092,kafka2:9092,kafka3:9092
acks=all                               # Wait for all ISRs
retries=Integer.MAX_VALUE              # Retry on transient failures
max.in.flight.requests.per.connection=5
enable.idempotence=true                # Prevent duplicates on retry

# Combine with topic: min.insync.replicas=2
# Ensures: Leader + 1 follower must ack before producer receives success
```

### View Replication Status

```bash
# Describe topic to see leader and ISR for each partition
kafka-topics.sh --describe --bootstrap-server localhost:9092 --topic orders

# Output:
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  ISR: 1,2,3
# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  ISR: 2,3,1
# Topic: orders  Partition: 2  Leader: 3  Replicas: 3,1,2  ISR: 3,1,2

# Leader: Current partition leader broker ID
# Replicas: All replicas (leader + followers)
# ISR: In-sync replicas (caught up)

# Check under-replicated partitions (ISR < Replicas)
kafka-topics.sh --describe --bootstrap-server localhost:9092 --under-replicated-partitions

# Check offline partitions (no leader)
kafka-topics.sh --describe --bootstrap-server localhost:9092 --unavailable-partitions
```

### Preferred Leader Election (Rebalance Leadership)

```bash
# Rebalance leadership to preferred replicas (first in replica list)
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred \
  --all-topic-partitions

# Or for specific topic
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred \
  --topic orders
```

## Real-World Example

**Financial Trading Platform - High Durability**:

**Requirements**:

- Zero data loss (regulatory compliance)
- Survive 2 simultaneous broker failures
- High availability (sub-second failover)

**Configuration**:

```
Cluster: 5 brokers
Topic: trade-executions
  - Partitions: 20
  - Replication Factor: 5 (tolerate 4 failures, but costly)
  - min.insync.replicas: 3 (require 3 replicas for writes)

Producer:
  - acks=all
  - enable.idempotence=true
  - retries=unlimited

Storage: 5 brokers × 2TB = 10TB raw, 2TB usable (5× replication overhead)
```

**Partition 0 Replication**:

```
Leader: Broker-1    (active writes/reads)
ISR: [Broker-1, Broker-2, Broker-3, Broker-4, Broker-5]

Producer writes trade:
1. Trade sent to Broker-1 (leader)
2. Broker-1 writes to log
3. Broker-2, 3, 4, 5 fetch and replicate
4. Broker-1 waits for Broker-2, 3, 4 to ack (min.insync.replicas=3)
5. (Broker-5 can be slower, not blocking)
6. Once 3 acks received, ack to producer
7. Message committed, consumers can read
```

**Failure Scenario 1** (Leader Failure):

```
Time 0: Broker-1 fails (hardware crash)
Time 1s: Controller detects via missed heartbeats
Time 2s: Controller elects Broker-2 as new leader (highest offset in ISR)
Time 3s: Metadata updated, clients routing to Broker-2
ISR: [Broker-2, Broker-3, Broker-4, Broker-5]  (4 replicas, still healthy)

Result: ~3s downtime for partition 0, zero data loss
```

**Failure Scenario 2** (Multiple Broker Failures):

```
Time 0: Broker-1 and Broker-2 fail simultaneously
ISR: [Broker-3, Broker-4, Broker-5]  (3 replicas remain)
Controller elects Broker-3 as new leader

Writes still succeed (min.insync.replicas=3 satisfied)
Reads continue from new leader
Redundancy reduced: Can only tolerate 2 more failures before offline

When Broker-1, 2 recover: Rejoin as followers, resync from Broker-3
```

**Monitoring**:

- Alert on `UnderReplicatedPartitions > 0` (ISR < Replicas)
- Alert on `OfflinePartitionsCount > 0` (no leader available)
- Monitor replication lag (should be <1s)

## Migration / Legacy Notes

**ZooKeeper vs KRaft Replication**:

- Replication mechanics identical in both modes
- Difference: Controller election and metadata propagation
- **ZooKeeper**: Controller election via ZooKeeper, milliseconds to seconds
- **KRaft**: Controller election via Raft consensus, near-instantaneous
- **Benefit**: Faster leader election and partition failover in KRaft

**Historical Changes**:

- Pre-0.9: `replica.lag.max.messages` (message count lag) → removed
- 0.9+: `replica.lag.time.max.ms` (time-based) → current standard
- Kafka 2.4+: Follower fetching for read replicas (geo-replication) → advanced feature

## QnA

**Q1: What is the difference between replication factor and min.insync.replicas?**
A: **Replication factor** is total replicas (e.g., 3 means 1 leader + 2 followers). **min.insync.replicas** is minimum ISRs required for writes when `acks=all` (e.g., 2 means leader + 1 follower must ack). Typical: RF=3, min.insync.replicas=2.

**Q2: Can I read from follower replicas to reduce leader load?**
A: Generally no (followers don't serve client requests). Exception: Kafka 2.4+ "follower fetching" for read-only replicas in remote datacenters (not part of standard ISR). Standard design: all reads go to leader.

**Q3: What happens if all replicas of a partition go offline?**
A: Partition becomes unavailable. If `unclean.leader.election.enable=false` (default), partition stays offline until ISR replica recovers (no data loss). If set to `true`, first available replica elected leader (potential data loss).

**Q4: How does Kafka ensure no data loss with replication?**
A: Committed messages replicated to all ISRs before consumers can read. If leader fails, new leader elected from ISR (has all committed messages). Guarantee: at least 1 ISR must remain alive.

**Q5: Does higher replication factor improve read performance?**
A: No. Only leader serves reads, followers replicate only. Higher RF improves **durability** and **availability** (fault tolerance), not read performance. To scale reads, increase partitions (more leaders) or use consumer parallelism.

**Q6: What causes partitions to become under-replicated?**
A: ISR < Replicas, usually due to: slow follower (network issues, disk I/O bottleneck), broker overloaded, broker temporarily down for maintenance. Monitor and investigate if persistent.

## Sources

- [Confluent Docs - Kafka Replication](https://docs.confluent.io/kafka/design/replication.html) (Retrieved: 2026-02-11)
- [Apache Kafka Replication Design](https://kafka.apache.org/documentation/#replication) (Retrieved: 2026-02-11)
- [Kafka Leader Election](https://kafka.apache.org/documentation/#design_replicatedlog) (Retrieved: 2026-02-11)
- [In-Sync Replicas (ISR) Documentation](https://docs.confluent.io/kafka/design/replication.html#in-sync-replicas-and-producer-acks) (Retrieved: 2026-02-11)
- [Kafka Broker Configuration - Replication](https://kafka.apache.org/documentation/#brokerconfigs_replica) (Retrieved: 2026-02-11)

---

# Kafka Journal — Producer Acknowledgment and Topic Durability (Date: 2026-02-11)

## TL;DR

- **Producer acks** control durability guarantees: `acks=0` (no wait), `acks=1` (leader only), `acks=all` (all ISRs)
- **min.insync.replicas** sets minimum ISRs required for writes with `acks=all` (typically 2 with RF=3)
- **Delivery semantics**: at-most-once (acks=0), at-least-once (acks=1/all + retries), exactly-once (idempotence + transactions)
- Proper configuration balance ensures both durability (no data loss) and performance (acceptable latency)

## Why this matters

Understanding acknowledgment and durability is critical for:

- **Data Integrity**: Preventing message loss in production systems
- **Performance Tuning**: Balancing durability vs latency tradeoffs
- **Compliance**: Meeting regulatory requirements for financial, healthcare, and critical systems
- **Exactly-Once Processing**: Implementing transactional guarantees across Kafka pipelines

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x
- Idempotent producers stable since 0.11.0 (2017), refined in 3.x+
- Transactional producers mature in 3.x/4.x
- Configuration semantics consistent across versions

## Core Concepts

### Producer Acknowledgment Levels (acks)

**acks=0** (Fire-and-Forget):

- **Behavior**: Producer doesn't wait for any broker acknowledgment
- **Latency**: Lowest (~sub-millisecond)
- **Throughput**: Highest
- **Durability**: None (messages may be lost)
- **Use Case**: High-volume metrics, logs where occasional loss acceptable

**acks=1** (Leader Acknowledgment):

- **Behavior**: Producer waits for leader to write to its log
- **Latency**: Moderate (~1-5ms)
- **Throughput**: Balanced
- **Durability**: Moderate (lost if leader fails before replication)
- **Use Case**: Application logs, moderate importance data

**acks=all** (All In-Sync Replicas):

- **Behavior**: Producer waits for leader + all ISRs to acknowledge
- **Latency**: Highest (~5-20ms depending on cluster)
- **Throughput**: Lower (but still high with tuning)
- **Durability**: Maximum (no data loss if ISR remains)
- **Use Case**: Financial transactions, critical business events, regulatory data

### Acknowledgment Flow Diagram

```
Producer: acks=0 (Fire-and-Forget)
┌─────────┐                    ┌────────────┐
│Producer │───send message────▶│Broker (L)  │
│         │                    │            │
│acks=0   │◀──return immediately│           │
└─────────┘   (no wait)        └────────────┘
                               (message may be lost)

═══════════════════════════════════════════════════

Producer: acks=1 (Leader Only)
┌─────────┐                    ┌────────────┐
│Producer │───send message────▶│Broker (L)  │
│         │                    │   ↓ write  │
│acks=1   │                    │  [log]     │
│         │◀───ack from leader─│            │
└─────────┘                    └────────────┘
                               ┌────────────┐
                               │Broker (F1) │
                               │ (async     │
                               │ replication│
                               │ continues) │
                               └────────────┘

═══════════════════════════════════════════════════

Producer: acks=all (All ISRs)
┌─────────┐                    ┌────────────┐
│Producer │───send message────▶│Broker L(L) │
│         │                    │   ↓ write  │
│acks=all │                    │  [log]     │
│         │                    │     ↓      │
│         │                    │  replicate │
│         │                    └─────┬──────┘
│         │                          │
│         │                    ┌─────▼──────┐  ┌────────────┐
│         │                    │Broker (F1) │  │Broker (F2) │
│         │                    │   ↓ write  │  │   ↓ write  │
│         │                    │  [log]     │  │  [log]     │
│         │                    │     ↓      │  │     ↓      │
│         │                    │   ack ─────┼──┼──▶ ack     │
│         │                    └────────────┘  └────────────┘
│         │                          │               │
│         │◀───ack after all ISRs────┴───────────────┘
└─────────┘    (all 3 replicas confirmed)
```

### Topic Durability Configuration

**min.insync.replicas**:

- Minimum number of ISRs that must acknowledge write for `acks=all`
- Topic-level configuration (overrides broker default)
- Common: `min.insync.replicas=2` with `replication.factor=3`

**Durability Formula**:

```
Strong Durability = acks=all + min.insync.replicas ≥ 2 + replication.factor ≥ 3

Example Configuration:
- replication.factor=3        (3 copies total)
- min.insync.replicas=2       (leader + 1 follower must ack)
- acks=all                    (producer waits for ISRs)

Result: Tolerates 1 broker failure without data loss
```

### Delivery Semantics

**At-Most-Once** (may lose messages):

```
Configuration:
- acks=0 or acks=1
- retries=0
- No idempotence

Behavior: Message sent once, no retry on failure
Risk: Data loss
```

**At-Least-Once** (may duplicate messages):

```
Configuration:
- acks=all
- retries > 0 (or infinite)
- enable.idempotence=false

Behavior: Retries on failure, may send duplicates
Risk: Duplicate processing (handle with deduplication)
```

**Exactly-Once** (no loss, no duplicates):

```
Configuration:
- acks=all
- enable.idempotence=true       (prevents duplicates)
- retries=Integer.MAX_VALUE
- transactional.id=<unique>     (for transactions)

Behavior: Guarantees each message processed exactly once
Cost: Higher latency, more complexity
```

### Idempotent Producers

**Definition**: Producers that guarantee exactly-once delivery per partition even with retries.

**Mechanism**:

- Broker assigns each producer a unique Producer ID (PID)
- Producer attaches sequence number to each message
- Broker deduplicates based on PID + sequence number
- Automatic, no application code changes needed

**Configuration**:

```properties
enable.idempotence=true   # Enable idempotent producer
acks=all                  # Required for idempotence
retries=Integer.MAX_VALUE # Unlimited retries
max.in.flight.requests.per.connection=5  # Max concurrent requests
```

**Visual Flow**:

```
Producer (PID=1234, Seq=0,1,2...)
     │
     ├──▶ Message 0 (PID=1234, Seq=0) ──▶ Broker ─▶ Written
     ├──▶ Message 1 (PID=1234, Seq=1) ──▶ Broker ─▶ Written
     ├──▶ Message 2 (PID=1234, Seq=2) ──▶ Broker ─▶ Written
     │         (network timeout, retry)
     └──▶ Message 2 (PID=1234, Seq=2) ──▶ Broker ─▶ Duplicate Detected, Ack (not rewritten)
```

### Transactional Producers

**Definition**: Enables atomic writes across multiple partitions/topics with exactly-once semantics.

**Use Cases**:

- Kafka Streams processing (read from topic A, write to topic B atomically)
- Multi-partition writes that must all succeed or all fail
- Consumer-Producer pipelines requiring exactly-once end-to-end

**Configuration**:

```properties
transactional.id=my-app-txn-1   # Unique per producer instance
enable.idempotence=true         # Required for transactions
acks=all                        # Required
```

**Transaction Flow**:

```
Producer API:
  producer.initTransactions()
  producer.beginTransaction()
  ├─ producer.send(topic-A, record1)
  ├─ producer.send(topic-B, record2)
  ├─ producer.send(topic-C, record3)
  └─ producer.commitTransaction()   // All succeed or all fail

Consumer API (consuming transactional data):
  isolation.level=read_committed   // Only read committed transactions
```

## Configuration Examples

### Maximum Durability Configuration

**Topic Configuration**:

```bash
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic financial-transactions \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config unclean.leader.election.enable=false
```

**Producer Configuration (Java)**:

```properties
# Maximum durability
bootstrap.servers=kafka1:9092,kafka2:9092,kafka3:9092
acks=all                                # Wait for all ISRs
enable.idempotence=true                 # Exactly-once per partition
retries=Integer.MAX_VALUE               # Unlimited retries
max.in.flight.requests.per.connection=5
delivery.timeout.ms=120000              # 2 min total timeout

# Batching (maintain throughput even with acks=all)
batch.size=16384                        # 16KB batches
linger.ms=10                            # Wait 10ms to fill batch
compression.type=lz4                    # Fast compression

# Serialization
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=org.apache.kafka.common.serialization.StringSerializer
```

### High Throughput Configuration

**Producer Configuration**:

```properties
# Optimized for throughput (acceptable durability)
bootstrap.servers=kafka1:9092,kafka2:9092
acks=1                                  # Leader only
retries=3                               # Limited retries
batch.size=32768                        # 32KB batches
linger.ms=10                            # Batch aggregation
buffer.memory=67108864                  # 64MB buffer
compression.type=snappy                 # Good compression/speed
```

### Idempotent Producer (Java)

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class IdempotentProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        // Idempotent producer (exactly-once per partition)
        props.put("enable.idempotence", "true");
        props.put("acks", "all");
        props.put("retries", Integer.MAX_VALUE);
        props.put("max.in.flight.requests.per.connection", "5");

        Producer<String, String> producer = new KafkaProducer<>(props);

        try {
            for (int i = 0; i < 100; i++) {
                ProducerRecord<String, String> record =
                    new ProducerRecord<>("orders", "order-" + i, "order-data-" + i);

                producer.send(record, (metadata, exception) -> {
                    if (exception == null) {
                        System.out.printf("Sent: partition=%d, offset=%d%n",
                            metadata.partition(), metadata.offset());
                    } else {
                        exception.printStackTrace();
                    }
                });
            }
        } finally {
            producer.close();
        }
    }
}
```

### Transactional Producer (Java)

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class TransactionalProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        // Transactional configuration
        props.put("transactional.id", "my-transactional-producer-1");
        props.put("enable.idempotence", "true");
        props.put("acks", "all");

        Producer<String, String> producer = new KafkaProducer<>(props);

        // Initialize transactions
        producer.initTransactions();

        try {
            // Begin transaction
            producer.beginTransaction();

            // Send multiple records atomically
            producer.send(new ProducerRecord<>("orders", "order-1", "data-1"));
            producer.send(new ProducerRecord<>("inventory", "product-1", "stock-update"));
            producer.send(new ProducerRecord<>("notifications", "user-1", "order-confirmation"));

            // Commit transaction (all succeed or all fail)
            producer.commitTransaction();
            System.out.println("Transaction committed successfully");

        } catch (Exception e) {
            // Abort transaction on error
            producer.abortTransaction();
            System.err.println("Transaction aborted: " + e.getMessage());
        } finally {
            producer.close();
        }
    }
}
```

### Consumer Reading Transactional Data

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "transactional-consumer-group");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

// Only read committed transactions
props.put("isolation.level", "read_committed");  // or "read_uncommitted" (default)

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("orders"));

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    // Only receives committed messages (aborted transactions not visible)
    for (ConsumerRecord<String, String> record : records) {
        System.out.printf("Received: %s%n", record.value());
    }
}
```

## Real-World Example

**Banking Payment Processing System**:

**Requirements**:

- Zero data loss (regulatory compliance)
- Exactly-once processing (no duplicate payments)
- Audit trail (all transactions recorded)
- Tolerate 1 broker failure

**Configuration**:

**Topic: payment-transactions**

```properties
partitions=20
replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false
retention.ms=2592000000  # 30 days
```

**Producer: Payment Service**

```properties
acks=all
enable.idempotence=true
transactional.id=payment-service-instance-{id}
retries=Integer.MAX_VALUE
delivery.timeout.ms=120000
compression.type=lz4
```

**Flow**:

```
1. Payment Service receives payment request
2. Begin Kafka transaction
3. Write to payment-transactions topic (amount, account, timestamp)
4. Write to audit-log topic (transaction ID, metadata)
5. Commit transaction
6. On success: Both messages committed atomically
   On failure: Both messages aborted, retry entire transaction
7. Payment Processor consumes with isolation.level=read_committed
8. Process payment exactly once (debit source, credit destination)
```

**Durability Guarantee Flow**:

```
Producer (acks=all, idempotent)
    │
    ├──▶ Payment Event ──▶ Broker-1 (Leader, Partition 7)
    │                         │
    │                         ├──▶ Replicate ──▶ Broker-2 (Follower)
    │                         │                      │
    │                         │                      ├──▶ Ack
    │                         │                      │
    │                         └──▶ Replicate ──▶ Broker-3 (Follower)
    │                                                │
    │                                                └──▶ Ack
    │
    └◀── Ack after min.insync.replicas=2 confirmed
         (Leader + 1 follower = 2 ISRs)

Result: Payment committed, 1 broker can fail, data safe
```

**Metrics**:

- Throughput: 5,000 payments/sec
- Latency p99: 15ms (with acks=all)
- Data Loss: 0 (over 2 years)
- Duplicates: 0 (idempotent producer)

## Migration / Legacy Notes

**Pre-0.11 (No Idempotence)**:

- Manual deduplication required (track message IDs in database)
- Risk of duplicates on retries

**0.11+ (Idempotence Available)**:

- `enable.idempotence=true` prevents duplicates automatically
- No application code changes needed

**Transactional Producer Evolution**:

- 0.11.0: Introduced (experimental)
- 1.0+: Stable for Kafka Streams
- 2.5+: General production ready
- 3.x/4.x: Mature, widely adopted

**Best Practice**: Always use idempotent producers (`enable.idempotence=true`) in modern Kafka (3.x/4.x) for any production system.

## QnA

**Q1: What is the difference between acks=all and min.insync.replicas?**
A: `acks=all` tells producer to wait for all ISRs. `min.insync.replicas=N` sets minimum ISRs required for write to succeed. With RF=3, min.insync.replicas=2, acks=all: producer waits for leader + 1 follower (2 total), allowing 1 broker failure.

**Q2: Does acks=all guarantee no data loss?**
A: Almost. Guarantees no loss as long as at least 1 ISR remains alive. If all ISRs fail simultaneously before replication completes, data lost. With RF=3, min.insync.replicas=2, very unlikely (requires 2+ brokers fail instantly).

**Q3: What is the performance impact of enable.idempotence=true?**
A: Minimal (<5% latency overhead). Idempotent producers still use batching and pipelining. Production systems should always enable it for data integrity without significant performance loss.

**Q4: Can I use acks=1 with retries for at-least-once?**
A: Yes, but risky. If leader fails after ack but before replication, message lost despite retry. Use `acks=all` for true at-least-once guarantee (with retries enabled).

**Q5: What happens if min.insync.replicas requirement cannot be met?**
A: Producer receives `NotEnoughReplicasException`. Example: RF=3, min.insync.replicas=2, but only 1 broker (leader) available. Write fails, producer retries until ISR count recovers or timeout.

**Q6: Are transactions required for exactly-once semantics?**
A: Not always. Idempotent producer gives exactly-once per partition. Transactions needed for: (1) atomic writes across multiple partitions/topics, (2) exactly-once in Kafka Streams, (3) consumer-producer exactly-once pipelines.

## Sources

- [Confluent Docs - Message Delivery Guarantees](https://docs.confluent.io/kafka/design/delivery-semantics.html) (Retrieved: 2026-02-11)
- [Apache Kafka Producer acks Configuration](https://kafka.apache.org/documentation/#producerconfigs_acks) (Retrieved: 2026-02-11)
- [Kafka Idempotent Producer](https://kafka.apache.org/documentation/#producerconfigs_enable.idempotence) (Retrieved: 2026-02-11)
- [Kafka Transactions Documentation](https://kafka.apache.org/documentation/#semantics) (Retrieved: 2026-02-11)
- [Exactly Once Semantics in Kafka](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/) (Retrieved: 2026-02-11)

---

# Kafka Journal — KRaft: Kafka's Metadata Management (Date: 2026-02-11)

## TL;DR

- **KRaft** (Kafka Raft) replaces ZooKeeper for metadata management using Raft consensus protocol
- Controllers form a Raft quorum managing a metadata log (`__cluster_metadata`) with leader election built-in
- **Production ready**: Kafka 3.3.1+ (early access 3.0+), **default in Kafka 4.0+** (ZooKeeper removed)
- Key benefits: Simpler operations, faster metadata updates, supports 2M+ partitions (10x ZooKeeper limit)

## Why this matters

KRaft transformation is critical for:

- **Operational Simplicity**: One system instead of two (no separate ZooKeeper cluster)
- **Scalability**: Supports massive partition counts (millions vs thousands)
- **Performance**: Near-instantaneous controller failover (<100ms vs seconds)
- **Future-Proofing**: ZooKeeper fully deprecated in Kafka 4.0+, migration essential

## Versions & Scope

- **Kafka 3.0-3.3.0**: KRaft early access (experimental)
- **Kafka 3.3.1+**: KRaft production ready
- **Kafka 4.0+**: KRaft default and only mode (ZooKeeper removed)
- This entry covers KRaft architecture and ZooKeeper comparison

## Core Concepts

### KRaft (Kafka Raft)

**Definition**: Consensus protocol that consolidates metadata management into Kafka itself, eliminating external ZooKeeper dependency.

**Core Principle**: Controllers form a Raft quorum managing cluster metadata (topics, partitions, ISRs, configs) in a replicated log.

**Key Components**:

1. **Controller Quorum**: 3-5 dedicated controller nodes using Raft consensus
2. **Metadata Log** (`__cluster_metadata`): Replicated log storing all metadata changes
3. **Active Controller**: Raft leader handling all metadata RPCs
4. **Follower Controllers**: Replicate metadata, hot standbys for failover

### KRaft Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    KRaft Cluster Architecture                    │
└─────────────────────────────────────────────────────────────────┘

Controllers (Raft Quorum):
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│   Controller-1     │  │   Controller-2     │  │   Controller-3     │
│  (Active/Leader)   │  │    (Follower)      │  │    (Follower)      │
│                    │  │                    │  │                    │
│ __cluster_metadata │◀─┤ __cluster_metadata │◀─┤ __cluster_metadata │
│  Offset: 10500     │  │  Offset: 10500     │  │  Offset: 10500     │
│                    │  │                    │  │                    │
│  Handles RPCs:     │  │  Replicates from   │  │  Replicates from   │
│  - CreateTopic     │  │  active controller │  │  active controller │
│  - AlterPartitions │  │                    │  │                    │
│  - Heartbeats      │  │  Hot standby       │  │  Hot standby       │
└─────────┬──────────┘  └────────────────────┘  └────────────────────┘
          │
          │ Metadata Updates (RPCs)
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                              Brokers                              │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Broker-1    │      │  Broker-2    │      │  Broker-3    │
│              │      │              │      │              │
│ Metadata     │      │ Metadata     │      │ Metadata     │
│ Offset: 10500│      │ Offset: 10500│      │ Offset: 10500│
│              │      │              │      │              │
│ Partitions:  │      │ Partitions:  │      │ Partitions:  │
│ - orders-0(L)│      │ - orders-1(L)│      │ - orders-2(L)│
│ - orders-3(F)│      │ - orders-0(F)│      │ - orders-1(F)│
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                 Producers & Consumers
```

### Controller Quorum

**Definition**: Group of controllers forming a Raft quorum for metadata management.

**Quorum Requirements**:

- Majority required for operation: `(N/2) + 1`
- 3 controllers: Survive 1 failure (need 2/3)
- 5 controllers: Survive 2 failures (need 3/5)
- Production: **3 or 5 controllers recommended**

**Active Controller** (Raft Leader):

- Handles all broker RPCs (topic creation, partition updates, etc.)
- Writes metadata changes to log
- Replicates to follower controllers

**Follower Controllers**:

- Replicate metadata from active controller
- Hot standbys (promote to active on failure)
- Participate in leader election via Raft

**Metadata Log** (`__cluster_metadata`):

- Internal topic storing all metadata changes
- Replicated across controller quorum
- Brokers track offset to stay synchronized
- Periodically snapshotted for efficient recovery

### KRaft Key Terminology

**node.id**:

- Unique identifier for each Kafka node (broker or controller)
- Replaces separate `broker.id` in ZooKeeper mode
- Must be unique across entire cluster

**process.roles**:

- Defines node role: `broker`, `controller`, or `broker,controller` (combined)
- `controller`: Dedicated controller (isolated mode, production recommended)
- `broker`: Data broker only
- `broker,controller`: Combined mode (testing/dev only in Confluent)

**controller.quorum.voters**:

- List of controller nodes forming Raft quorum
- Format: `id@hostname:port`
- Example: `1@controller1:9093,2@controller2:9093,3@controller3:9093`

**cluster.id**:

- Unique identifier for Kafka cluster
- Generated once using `kafka-storage.sh random-uuid`
- Must be same across all nodes

**Listeners**:

- `CONTROLLER`: Listener for controller-to-controller communication (Raft)
- `PLAINTEXT/SSL`: Client traffic (producers/consumers)
- Controllers use separate listener for Raft protocol

### ZooKeeper vs KRaft Comparison

#### Architecture Comparison Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              ZooKeeper Mode (Legacy, Kafka <4.0)                 │
└─────────────────────────────────────────────────────────────────┘

ZooKeeper Ensemble:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ZooKeeper-1  │  │ ZooKeeper-2  │  │ ZooKeeper-3  │
│   (Leader)   │◀─│  (Follower)  │◀─│  (Follower)  │
└──────┬───────┘  └──────────────┘  └──────────────┘
       │
       │ Metadata Storage (znodes):
       │ /brokers, /topics, /config, /controller
       │
       ▼
┌──────────────────────────────────────────────────────┐
│           Kafka Brokers (poll ZooKeeper)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Broker-1 │  │ Broker-2 │  │ Broker-3 │          │
│  │Controller│  │          │  │          │          │
│  │ Elected  │  │          │  │          │          │
│  │via ZK    │  │          │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────────────────────────────┘

Issues:
- Two separate systems to operate
- Metadata polling → stale views
- Controller election via ZooKeeper → slower failover
- Partition limits (~200K practical max)

═════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                KRaft Mode (Modern, Kafka 3.3.1+/4.0+)            │
└─────────────────────────────────────────────────────────────────┘

KRaft Controllers (Raft Quorum):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Controller-1  │  │Controller-2  │  │Controller-3  │
│(Active/Raft  │◀─│ (Follower)   │◀─│ (Follower)   │
│  Leader)     │  │              │  │              │
│              │  │              │  │              │
│__cluster_    │  │__cluster_    │  │__cluster_    │
│  metadata    │  │  metadata    │  │  metadata    │
└──────┬───────┘  └──────────────┘  └──────────────┘
       │
       │ Metadata Log (event-sourced)
       │
       ▼
┌──────────────────────────────────────────────────────┐
│      Kafka Brokers (track metadata offset)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Broker-1 │  │ Broker-2 │  │ Broker-3 │          │
│  │ Offset:  │  │ Offset:  │  │ Offset:  │          │
│  │  10500   │  │  10500   │  │  10500   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────────────────────────────┘

Benefits:
✓ Single system (no ZooKeeper)
✓ Event-sourced metadata → consistent view
✓ Raft consensus → fast controller failover
✓ Supports 2M+ partitions
```

#### Feature Comparison Table

| Feature                    | ZooKeeper Mode              | KRaft Mode                     |
| -------------------------- | --------------------------- | ------------------------------ |
| **Metadata Storage**       | External ZooKeeper ensemble | Internal Raft quorum           |
| **Controller Election**    | Via ZooKeeper watches       | Via Raft consensus protocol    |
| **Metadata Propagation**   | Brokers poll ZooKeeper      | Event-sourced log with offsets |
| **Controller Failover**    | 2-10 seconds                | <100ms (near-instantaneous)    |
| **Max Partitions**         | ~200K practical limit       | 2M+ supported                  |
| **Operational Complexity** | High (two systems)          | Lower (one system)             |
| **Metadata Consistency**   | Eventually consistent       | Strongly consistent            |
| **Production Ready**       | Kafka 0.x-3.x               | Kafka 3.3.1+                   |
| **Status in Kafka 4.0**    | Removed                     | Default and only option        |

**Key Terminology Differences**:

| Concept              | ZooKeeper Term    | KRaft Term                 |
| -------------------- | ----------------- | -------------------------- |
| Node Identifier      | `broker.id`       | `node.id`                  |
| Cluster Controller   | Elected broker    | Dedicated controller nodes |
| Metadata Store       | ZooKeeper znodes  | `__cluster_metadata` log   |
| Controller Selection | ZooKeeper watches | Raft leader election       |

## Configuration Examples

### KRaft Controller Configuration

**Controller Node (controller.properties)**:

```properties
# Node identification
node.id=1                              # Unique ID for this controller

# Process role (dedicated controller)
process.roles=controller

# Controller quorum (3 controllers for production)
controller.quorum.voters=1@controller1:9093,2@controller2:9093,3@controller3:9093

# Listeners
listeners=CONTROLLER://controller1:9093
controller.listener.names=CONTROLLER

# Security protocol mapping
listener.security.protocol.map=CONTROLLER:PLAINTEXT

# Metadata log directory
log.dirs=/data/kafka-metadata

# Cluster ID (same across all nodes, generate with: kafka-storage.sh random-uuid)
cluster.id=MkU3OEVBNTcwNTJENDM2Qk
```

### KRaft Broker Configuration

**Broker Node (server.properties)**:

```properties
# Node identification
node.id=101                            # Unique ID (different from controllers)

# Process role (broker only in isolated mode)
process.roles=broker

# Controller quorum (same as controller config)
controller.quorum.voters=1@controller1:9093,2@controller2:9093,3@controller3:9093

# Listeners
listeners=PLAINTEXT://broker1:9092
advertised.listeners=PLAINTEXT://broker1:9092

# Cluster ID (must match controllers)
cluster.id=MkU3OEVBNTcwNTJENDM2Qk

# Data log directory
log.dirs=/data/kafka-logs

# Topic defaults
num.partitions=6
default.replication.factor=3
min.insync.replicas=2
```

### Combined Mode (Dev/Test Only)

**Single Node Combined Mode**:

```properties
# Single node acting as both broker and controller (testing only)
node.id=1
process.roles=broker,controller

# Self-contained quorum (single node)
controller.quorum.voters=1@localhost:9093

# Listeners
listeners=PLAINTEXT://localhost:9092,CONTROLLER://localhost:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT

log.dirs=/tmp/kraft-combined-logs
cluster.id=MkU3OEVBNTcwNTJENDM2Qk

# Note: Combined mode not recommended for production
```

### Docker Compose - KRaft Cluster (3 Controllers + 3 Brokers)

```yaml
version: "3.8"

services:
  # Controllers
  controller-1:
    image: confluentinc/cp-kafka:7.6.0
    hostname: controller-1
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: "controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@controller-1:9093,2@controller-2:9093,3@controller-3:9093"
      KAFKA_LISTENERS: "CONTROLLER://controller-1:9093"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: "/var/lib/kafka/data"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  controller-2:
    image: confluentinc/cp-kafka:7.6.0
    hostname: controller-2
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: "controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@controller-1:9093,2@controller-2:9093,3@controller-3:9093"
      KAFKA_LISTENERS: "CONTROLLER://controller-2:9093"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: "/var/lib/kafka/data"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  controller-3:
    image: confluentinc/cp-kafka:7.6.0
    hostname: controller-3
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: "controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@controller-1:9093,2@controller-2:9093,3@controller-3:9093"
      KAFKA_LISTENERS: "CONTROLLER://controller-3:9093"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_LOG_DIRS: "/var/lib/kafka/data"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  # Brokers
  kafka-1:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-1
    ports:
      - "9092:9092"
    depends_on:
      - controller-1
      - controller-2
      - controller-3
    environment:
      KAFKA_NODE_ID: 101
      KAFKA_PROCESS_ROLES: "broker"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@controller-1:9093,2@controller-2:9093,3@controller-3:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka-1:9092"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9092"
      KAFKA_LOG_DIRS: "/var/lib/kafka/data"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  kafka-2:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-2
    ports:
      - "9093:9092"
    depends_on:
      - controller-1
      - controller-2
      - controller-3
    environment:
      KAFKA_NODE_ID: 102
      KAFKA_PROCESS_ROLES: "broker"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@controller-1:9093,2@controller-2:9093,3@controller-3:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka-2:9092"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9093"
      KAFKA_LOG_DIRS: "/var/lib/kafka/data"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"

  kafka-3:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-3
    ports:
      - "9094:9092"
    depends_on:
      - controller-1
      - controller-2
      - controller-3
    environment:
      KAFKA_NODE_ID: 103
      KAFKA_PROCESS_ROLES: "broker"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@controller-1:9093,2@controller-2:9093,3@controller-3:9093"
      KAFKA_LISTENERS: "PLAINTEXT://kafka-3:9092"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9094"
      KAFKA_LOG_DIRS: "/var/lib/kafka/data"
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
```

### Initialize Storage Format

**Before Starting KRaft Cluster**:

```bash
# Generate cluster ID
CLUSTER_ID=$(kafka-storage.sh random-uuid)
echo $CLUSTER_ID  # Example: MkU3OEVBNTcwNTJENDM2Qk

# Format storage directory on each node
kafka-storage.sh format \
  --config /path/to/server.properties \
  --cluster-id $CLUSTER_ID

# Output: Formatting /data/kafka-logs with metadata.version 3.7-IV4

# Start Kafka nodes
kafka-server-start.sh /path/to/server.properties
```

## Real-World Example

**E-commerce Platform Migration: ZooKeeper → KRaft**:

**Before (ZooKeeper Mode)**:

```
Infrastructure:
- 3 ZooKeeper nodes (3 servers, 2GB RAM each)
- 10 Kafka brokers (c5.2xlarge: 8 vCPU, 16GB RAM, 200GB SSD each)
- Topics: 500, Partitions: 15,000 (replicated = 45,000 partition replicas)
- Controller election time: 5-8 seconds on failure

Issues:
- Separate ZooKeeper cluster to manage
- Broker-3 occasionally shows stale metadata (eventual consistency)
- Controller failover causes 5-8s unavailability
- Approaching partition limits (slow metadata operations)
```

**After (KRaft Mode)**:

```
Infrastructure:
- 3 Dedicated KRaft controllers (c5.large: 2 vCPU, 4GB RAM, 50GB SSD each)
- 10 Kafka brokers (same: c5.2xlarge)
- Topics: 500, Partitions: 15,000
- Controller election time: <100ms on failure

Benefits:
✓ Eliminated 3 ZooKeeper servers (cost savings ~$200/month)
✓ Single system to monitor and operate
✓ Controller failover: 8s → <100ms (98% improvement)
✓ Consistent metadata view (no stale client errors)
✓ Partition capacity: Can scale to 100K+ partitions (room for growth)
```

**Migration Process**:

```
Week 1: Testing KRaft in staging
  - Deploy 3 KRaft controllers + 5 brokers
  - Migrate test workloads
  - Performance benchmarking

Week 2-3: Production migration preparation
  - Set up 3 KRaft controllers in production network
  - Run kafka-zk-migrator.sh (dual-write mode)
  - Validate metadata consistency

Week 4: Cutover
  - Stop ZooKeeper writes
  - Brokers switch to KRaft controllers
  - Monitor for 48 hours
  - Decommission ZooKeeper ensemble

Result: Zero downtime migration, 100% metadata consistency
```

## Migration / Legacy Notes

**ZooKeeper Deprecation Timeline**:

- **Kafka 3.0**: KRaft early access (experimental)
- **Kafka 3.3.1**: KRaft production ready
- **Kafka 3.5+**: Migration tool available (`kafka-zk-migrator.sh`)
- **Kafka 4.0**: ZooKeeper fully removed, KRaft only option

**Migration Paths**:

1. **New Clusters**: Start with KRaft directly (Kafka 3.3.1+)
2. **Existing Clusters**: Migrate using `kafka-zk-migrator.sh` (online, zero downtime)

**Migration Tool** (Kafka 3.5+):

```bash
# Dual-write migration (ZooKeeper + KRaft both active)
kafka-zk-migrator.sh migrate \
  --type metadata \
  --zookeeper.connect localhost:2181 \
  --bootstrap.controllers localhost:9093

# Validate migration
kafka-zk-migrator.sh status

# Complete migration (remove ZooKeeper)
kafka-zk-migrator.sh finalize
```

**Breaking Changes**:

- Configuration properties changed: `broker.id` → `node.id`, added `process.roles`
- Admin tools updated: Use `--bootstrap-controller` instead of `--zookeeper`
- Monitoring: New JMX metrics for KRaft quorum

## QnA

**Q1: What is the difference between controller and broker in KRaft?**
A: **Controllers** manage cluster metadata (form Raft quorum, handle topic creation, partition assignment). **Brokers** store data and serve client requests. Isolated mode (production): separate nodes. Combined mode (dev): single node does both.

**Q2: How many controllers should I run in production?**
A: **3 or 5 controllers**. 3 controllers survive 1 failure (need 2/3 quorum). 5 controllers survive 2 failures (need 3/5). Odd numbers required for Raft quorum. More than 5 rarely needed (higher latency).

**Q3: Can I run KRaft in combined mode for production?**
A: Not recommended by Confluent (security/feature gaps). Combined mode (`process.roles=broker,controller`) suitable for dev/testing only. Production should use **isolated mode** with dedicated controller nodes.

**Q4: Is KRaft faster than ZooKeeper mode?**
A: Yes. Controller failover: ZooKeeper ~5-10s, KRaft <100ms (50-100x faster). Metadata propagation: ZooKeeper (polling) vs KRaft (event-sourced log with offsets) = more efficient. Partition scaling: ZooKeeper ~200K practical max, KRaft 2M+ supported.

**Q5: Do clients need configuration changes when using KRaft?**
A: **No**. Producers and consumers connect to brokers identically. Only admin operations change (use `--bootstrap-controller` or `--bootstrap-server` instead of `--zookeeper` in CLI tools).

**Q6: What happens if KRaft quorum loses majority?**
A: Metadata operations stop (can't create topics, rebalance, elect leaders). Data plane continues (existing produce/consume works). Example: 3 controllers, 2 down → cluster "read-only" until quorum restored. Critical to maintain quorum in production.

## Sources

- [Confluent KRaft Overview](https://docs.confluent.io/platform/current/kafka-metadata/kraft.html) (Retrieved: 2026-02-11)
- [Apache Kafka KRaft Documentation](https://kafka.apache.org/documentation/#kraft) (Retrieved: 2026-02-11)
- [KIP-500: Replace ZooKeeper with Self-Managed Metadata Quorum](https://cwiki.apache.org/confluence/display/KAFKA/KIP-500%3A+Replace+ZooKeeper+with+a+Self-Managed+Metadata+Quorum) (Retrieved: 2026-02-11)
- [Kafka 4.0 Release Notes - ZooKeeper Removal](https://kafka.apache.org/documentation/#upgrade) (Retrieved: 2026-02-11)
- [Migrating from ZooKeeper to KRaft](https://docs.confluent.io/platform/current/installation/migrate-zk-kraft.html) (Retrieved: 2026-02-11)

---

# Kafka Journal — Consumer Group Rebalancing (Date: 2026-02-17)

## TL;DR

- **Rebalancing** is the automatic process of redistributing partition assignments when consumer group membership changes (consumer joins/leaves/crashes or subscription updates).
- Triggered when: consumer joins group, consumer crashes/leaves, heartbeat timeout, or subscription changes detected.
- **Partition assignment strategies** (Range, RoundRobin, Sticky, CooperativeSticky) control _how_ partitions are redistributed; **CooperativeSticky** is recommended (90% faster rebalancing).
- Critical configs: `session.timeout.ms` (heartbeat deadline), `heartbeat.interval.ms` (ping frequency), `max.poll.interval.ms` (processing deadline), and `partition.assignment.strategy` (assign algo).
- In Node.js: **@platformatic/kafka** and **KafkaJS** (@confluentinc/kafka-javascript) handle rebalancing automatically; custom rebalance listeners enable graceful shutdown/resource cleanup.

## Why this matters

Rebalancing ensures load is evenly distributed across consumers—critical for horizontal scaling in production. However, **stop-the-world rebalancing** pauses ALL consumers during recalculation. Misconfigured timeouts cause cascading failures (frequent rebalances = throughput drop). CooperativeSticky algorithm reduces downtime by 90%+, making it essential for low-latency applications. For Node.js microservices, rebalance listeners prevent message loss during graceful shutdown.

## Versions & Scope

- **Kafka 3.x.x**: Uses Classic Protocol (Eager/Cooperative variants); CooperativeSticky available from 3.0+
- **Kafka 4.x.x**: Classic Protocol standard; KIP-848 (New Protocol) in development (future versions)
- **KRaft vs ZooKeeper**: Rebalancing logic **identical** in both modes; KRaft slightly faster (controller faster) but no semantic differences
- **Node.js**: @platformatic/kafka (Kafka 3.5+, modern), KafkaJS (broad compatibility, Kafka 0.10+)

## Core Concepts

### Consumer Group & Partition Assignment

A **consumer group** is a set of consumers that coordinate to consume a topic cooperatively. Each partition is assigned to **exactly one** consumer in the group. If group has 3 consumers and topic has 9 partitions, each consumer owns 3 partitions (typical balanced scenario).

### Rebalancing Triggers

1. **Membership change**: Consumer joins group (subscribed after connection) or leaves (graceful close or crash)
2. **Heartbeat timeout**: Consumer fails to send heartbeat; broker removes it after `session.timeout.ms`
3. **Poll timeout**: Consumer doesn't call `poll()` (or `consume()` for async consumers) within `max.poll.interval.ms`
4. **Subscription change**: Consumer modifies topic subscriptions via `subscribe(newTopics)` or assignment via `assign(newPartitions)`

### Rebalancing State Machine (Classic Protocol)

Three phases—all consumers pause message processing:

```
[Stable]
   ↓ (trigger: consumer joins/leaves/heartbeat fails)
[Finding Coordinator] → Consumers locate group coordinator (broker)
   ↓
[Joining]               → Consumers send join request; heartbeat stops; group waits for GenerationID
   ↓
[Syncing]               → Leader consumer computes partition assignments (via strategy); all consumers sync
   ↓
[Stable]                → Resume message consumption; participants heartbeat to remain in group
```

**GenerationID**: Incremented each rebalance; ensures stale clients (network partitions) can't accidentally join after they were removed.

### Partition Assignment Strategies

Four built-in strategies determine _which consumer gets which partition(s)_.

#### 1. **RangeAssignor** (Default in Kafka <3.0)

**Algorithm**: Sort partitions `[0, 1, 2, ..., N-1]` and consumers alphabetically, divide partitions into ranges.

```
Example: Topic "logs" with 6 partitions, consumers [consumer-1, consumer-2, consumer-3]
Step 1: Partitions [0, 1, 2, 3, 4, 5], Consumers [consumer-1, consumer-2, consumer-3]
Step 2: Range size = 6 / 3 = 2
Step 3: consumer-1 → [0, 1], consumer-2 → [2, 3], consumer-3 → [4, 5]
```

**Problem**: Causes partition imbalance across topics (if multiple topics subscribed, range gaps compound).

#### 2. **CircularRoundRobinAssignor** (Round-Robin)

**Algorithm**: Assign partitions in circular order across consumers (all subscribed topics intermixed).

```
Example: Topics ["logs", "events"] (3 partitions each), consumers [consumer-1, consumer-2]
Step 1: All partitions = [logs-0, events-0, logs-1, events-1, logs-2, events-2]
Step 2: Rotate assignment: consumer-1 → [logs-0, logs-2, events-1]
                            consumer-2 → [events-0, logs-1, events-2]
```

**Benefit**: More balanced than Range.

#### 3. **StickyAssignor** (Recommended, non-cooperative)

**Algorithm**: Minimize partition movement and balance-aware. Consumer retains as many partitions as possible from previous assignment.

```
Example: Consumer-2 crashes; StickyAssignor redistributes only its partitions
         Reassignments minimal; existing consumers keep their original partitions
```

**Benefit**: Reduces rebalance time (fewer state transfers), improves cache locality.

**Tradeoff**: All consumers still stop during rebalance (stop-the-world).

#### 4. **CooperativeStickyAssignor** (Recommended, cooperative)

**Algorithm**: Like StickyAssignor but allows **cooperative rebalancing**—consumers don't need to stop; they gradually hand off partitions.

```
Phase 1 (Revoke Offset): Consumer-1 revokes ["partition-A", "partition-B"] only
Phase 2 (Assign New): Consumer-2 takes ["partition-A", "partition-B"]
Result: Only affected partitions stop briefly; others continue consuming uninterruptedly
```

**Benefit**: **~90% reduction** in rebalance time for producer/consumer; minimal throughput drop.

**When to use**:

- Production always (if broker >= 3.0)
- Development/local: Range fine.

### Session & Processing Timeouts

Three independent heartbeat/processing deadlines:

| Config                  | Default         | Purpose                                                                          | Trigger                             |
| ----------------------- | --------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| `session.timeout.ms`    | 10,000 (10s)    | Heartbeat deadline; broker removes consumer if no heartbeat in this time         | Consumer crash / network partition  |
| `heartbeat.interval.ms` | 3,000 (3s)      | How often consumer sends heartbeat to broker                                     | Every N seconds (background thread) |
| `max.poll.interval.ms`  | 300,000 (5 min) | Max time between `poll()`/`consume()` calls; broker removes consumer if exceeded | Consumer hangs / slow processing    |

**Constraint**: `heartbeat.interval.ms < session.timeout.ms < max.poll.interval.ms`

**Typical settings**:

```
heartbeat.interval.ms = 3,000
session.timeout.ms = 10,000  (3.33x heartbeat interval)
max.poll.interval.ms = 300,000
```

If consumer takes 2 minutes per batch → increase `max.poll.interval.ms` to >= 120,000.

## Configuration Examples

### Confluent-Kafka-JS (KafkaJS wrapper)

```typescript
import { KafkaJS } from "@confluentinc/kafka-javascript";

const kafka = new KafkaJS({
  kafkaJS: {
    clientId: "my-app",
    brokers: ["localhost:9092"],
  },
});

const consumer = kafka.consumer({
  kafkaJS: {
    groupId: "my-group",
    allowAutoTopicCreation: false,

    // ===== REBALANCING CONFIG =====
    // Partition assignment strategy
    partitionAssignmentStrategy: "CooperativeSticky", // Options: "Range" | "RoundRobin" | "Sticky" | "CooperativeSticky"

    // Session & processing timeouts (milliseconds)
    sessionTimeout: 10_000, // Heartbeat deadline (default: 30,000 in KafkaJS, 10,000 in Kafka)
    rebalanceTimeout: 60_000, // Max time for entire rebalance to complete
    heartbeatInterval: 3_000, // Heartbeat send frequency
    maxBytesPerPartition: 1_048_576, // Fetch bytes per partition

    // Rebalance listener: handle revocation/assignment gracefully
    onRevoked: async (partitions) => {
      console.log(
        "Partitions revoked (about to lose these):",
        partitions.map((p) => `${p.topic}-${p.partition}`),
      );
      // Commit offsets, close resources, drain in-flight messages
    },
    onAssigned: async (partitions) => {
      console.log(
        "Partitions assigned (now consuming from these):",
        partitions.map((p) => `${p.topic}-${p.partition}`),
      );
      // Initialize resources, reset state if needed
    },
  },
});

await consumer.connect();
await consumer.subscribe({ topics: ["my-topic"] });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log(
      `Processing: topic=${topic} partition=${partition} offset=${message.offset}`,
    );
    // Process message
    await doSomething(message);
  },
});
```

### Platformatic-Kafka

```typescript
import { Consumer } from "@platformatic/kafka";

const consumer = new Consumer({
  clientId: "my-app",
  bootstrapBrokers: ["localhost:9092"],
  groupId: "my-group",

  // ===== REBALANCING CONFIG =====
  groupProtocol: "classic", // Supports "classic" only (no new protocol in 3.x)
  partitionAssignmentStrategy: "CooperativeSticky", // Options: "range" | "roundrobin" | "sticky" | "cooperativeSticky"
  sessionTimeout: 10_000,
  rebalanceTimeout: 60_000,
  heartbeatInterval: 3_000,

  // Rebalance listeners
  onPartitionsRevoked: async (partitions) => {
    console.log("Partitions revoked:", partitions);
    // Commit offsets, cleanup
  },
  onPartitionsAssigned: async (partitions) => {
    console.log("Partitions assigned:", partitions);
    // Initialize
  },

  // Deserializers
  deserializers: {
    key: stringDeserializers.key,
    value: jsonDeserializer,
    headerKey: stringDeserializers.headerKey,
    headerValue: stringDeserializers.headerValue,
  },
});

// Consume with stream API
const stream = await consumer.consume({
  topics: ["my-topic"],
});

for await (const message of stream) {
  console.log(
    `Processing: offset=${message.offset} partition=${message.partition}`,
  );
  await doSomething(message);
}
```

### Producer Config (Affects Rebalance Indirectly)

Slow producers can trigger `max.poll.interval.ms` timeout if processing takes long:

```typescript
// KafkaJS
const producer = kafka.producer({
  kafkaJS: {
    clientId: "my-producer",
    brokers: ["localhost:9092"],

    // Don't impact consumer directly, but good practice:
    timeout: 30_000,
    compression: 1, // Gzip (can slow down if CPU-bound)
  },
});

// Platformatic
const producer = new Producer({
  clientId: "my-producer",
  bootstrapBrokers: ["localhost:9092"],
  compression: "gzip",
});
```

## Real-World Example

### Scenario: 3-Consumer Group Processing Order Events

**Setup**:

- Topic: `orders` with 6 partitions
- Consumers: `order-processor-1`, `order-processor-2`, `order-processor-3`
- Strategy: `CooperativeSticky`
- Config: `session.timeout.ms=10s`, `heartbeat.interval.ms=3s`, `max.poll.interval.ms=300s`

**Timeline**:

```
T=0s: All running, steady-state
      order-processor-1 → partitions [0, 1]
      order-processor-2 → partitions [2, 3]
      order-processor-3 → partitions [4, 5]
      Heartbeats: Each sends heartbeat every 3s

T=45s: order-processor-2 CRASHES (network failure)
       Last heartbeat: T=42s

T=52s: Broker detects heartbeat timeout (T=42s + 10s buffer)
       Removes order-processor-2 from group
       → Rebalance triggered

T=53s: REBALANCE PHASE 1 (Revoke):
       order-processor-1, order-processor-3 get onRevoked callback
       BUT: They continue consuming existing partitions

T=54s: Leader (order-processor-1) computes new assignment:
       order-processor-1 → partitions [0, 1, 2] (now owns 3)
       order-processor-3 → partitions [3, 4, 5] (now owns 3)

T=55s: REBALANCE PHASE 2 (Assign):
       order-processor-1 gets onAssigned([0, 1, 2])
       order-processor-3 gets onAssigned([3, 4, 5])

       Partitions [2, 3] transferred from order-processor-2
       to new owners (order-processor-1, order-processor-3)

T=56s: Both consumers resume—offset seek to last committed offset
       Resume continuous consumption

✅ Downtime: ~5-7s (only rebalance phase silent)
📊 Impact: Throughput drop ~10-15% during rebalance (cooperative = minimal)
```

**Code example (detection):**

```typescript
// Platformatic-Kafka
const consumer = new Consumer({
  groupId: "order-processors",
  partitionAssignmentStrategy: "CooperativeSticky",
  sessionTimeout: 10_000,
  heartbeatInterval: 3_000,
  maxBytesPerPartition: 10_485_760,

  onPartitionsRevoked: async (partitions) => {
    console.log(
      `[REVOKE] Returning partitions: ${partitions.map((p) => p.partition).join(", ")}`,
    );
    // Commit last processed offset
    await consumer.commitSync();
  },

  onPartitionsAssigned: async (partitions) => {
    console.log(
      `[ASSIGN] Assigned partitions: ${partitions.map((p) => p.partition).join(", ")}`,
    );
    // Warm up caches, initialize state
  },
});

const stream = await consumer.consume({ topics: ["orders"] });

for await (const message of stream) {
  const order = JSON.parse(message.value?.toString() || "{}");
  console.log(
    `Processing order-id=${order.id} from partition=${message.partition}`,
  );

  // Simulate work
  await processOrder(order);

  // Periodic commits (avoid re-processing if rebalance occurs)
  if (message.offset % 100 === 0) {
    await consumer.commitSync();
  }
}
```

## Migration / Legacy Notes

### ZooKeeper vs KRaft (Rebalancing)

**Identical Logic** — Consumer rebalancing code and config **unchanged** between ZooKeeper and KRaft. Both use same Classic Protocol (Eager/Cooperative). Differences are internal:

| Aspect              | ZooKeeper                        | KRaft                            |
| ------------------- | -------------------------------- | -------------------------------- |
| Metadata updates    | Polling (slow, up to 6s latency) | Event-sourced log (fast, <100ms) |
| Controller failover | 5-10s (ZK elects new controller) | <100ms (Raft instant)            |
| Rebalance latency   | 100-500ms (metadata refresh)     | 50-200ms (KRaft faster)          |
| **Client impact**   | ✅ Same config                   | ✅ Same config                   |

**Migration note**: When upgrading from ZK to KRaft, rebalancing may become **slightly faster** (partitions resume quicker), but no change to strategy/timeouts needed.

### KIP-848 (New Group Protocol) — Future

Kafka 4.1+ will introduce KIP-848 (new protocol with incremental cooperative rebalancing = even faster). When available:

- `groupProtocol: "new"` option in consumer config
- Backward compatible (brokers support both classic + new)
- Expected: 95%+ reduction in rebalance time (vs eager)
- ⚠️ Unverified (not yet stable in production Kafka as of 4.0)

## QnA

**Q1: What happens if all consumers in a group crash?**
A: If all consumers disappear, group enters "Empty" state (offsets retained). When new consumer joins with same `groupId`, it either starts from last committed offset (if `auto.offset.reset=earliest`) or latest (if `auto.offset.reset=latest`). Coordinator doesn't rebalance; single consumer simply subscribes and consumes alone.

**Q2: How do I gracefully shutdown a consumer without causing rebalance pause?**
A: Call `consumer.disconnect()` (KafkaJS) or `consumer.close()` (Platformatic). This sends `LeaveGroup` request before closing—broker knows consumer is intentionally leaving (not crashed), so rebalance is optimized (less wait). Crashes = rebalance delay while heartbeat times out.

```typescript
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await consumer.disconnect(); // Signals intentional departure
  process.exit(0);
});
```

**Q3: Can I manually trigger a rebalance?**
A: Not directly, but yes via:

1. Change subscription: `consumer.subscribe(newTopics)` → rebalance triggered
2. Manually leave group: `await consumer.leaveGroup()` → rebalance triggered when current consumer steps out
3. Join with different `groupId` → new independent consumer group (not rebalance, new group)

**Q4: What's the difference between session timeout and max poll interval?**
A: **Session timeout** = heartbeat missed → broker assumes crash (< 1s detection). **Max poll interval** = consumer hangs on processing (no `poll()` call) → broker assumes deadlock (slower, ~5min default). Example: Consumer processes batch for 2 minutes → must increase `max.poll.interval.ms` to >= 120,000 to prevent false timeout eviction.

**Q5: I'm getting frequent rebalances. What should I check?**
A: Causes ranked by likelihood:

1. **Consumer processing too slow** → `max.poll.interval.ms` too short. Increase to 2x average batch processing time.
2. **Network instability** → heartbeats lost. Monitor broker-to-consumer RTT; increase `session.timeout.ms` if network flaky (but trade-off: slower crash detection).
3. **Broker under load** → rebalance queued. Check broker CPU/GC logs.
4. **Consumer restarts** → normal on deployment. Minimize by using CooperativeSticky.

**Q6: How is the partition leader (group leader) elected?**
A: In rebalance (join phase), all group members send join request. **First to respond** becomes group leader. Leader computes assignments (runs assignment strategy). Other members become "followers" (follow leader's assignment). Leader role is **per-rebalance**; can rotate (no sticky leader). Used only during rebalance (not for data consumption).

## Sources

- [Apache Kafka Consumer Configuration](https://kafka.apache.org/documentation/#consumerconfigs) (Retrieved: 2026-02-17)
- [Confluent Consumer Rebalancing Guide](https://docs.confluent.io/kafka/design/rebalancing.html) (Retrieved: 2026-02-17)
- [KIP-54: Sticky Partition Assignment Strategy](https://cwiki.apache.org/confluence/display/KAFKA/KIP-54%3A+Sticky+Partition+Assignment+Strategy+for+Kafka+Consumer) (Retrieved: 2026-02-17)
- [KIP-429: Cooperative Rebalancing Protocol](https://cwiki.apache.org/confluence/display/KAFKA/KIP-429%3A+Cooperative+Rebalancing) (Retrieved: 2026-02-17)
- [@platformatic/kafka Documentation](https://docs.platformatic.dev/docs/packages/db/package-reference/pkg-kafka) (Retrieved: 2026-02-17)

---

# Kafka Journal — Node.js Implementation: @platformatic/kafka & KafkaJS (Date: 2026-02-17)

## TL;DR

- **@platformatic/kafka**: Modern, fully-typed TypeScript library (Kafka 3.5+), high performance, built-in rebalance listeners
- **KafkaJS**: Most popular, broad compatibility (all Kafka versions), excellent documentation, larger community
- Both libraries handle rebalancing automatically; use rebalance listeners for graceful shutdown and resource cleanup
- Critical configs apply to both: **partition assignment strategy** (CooperativeSticky recommended), **session/heartbeat timeouts**, **offset commit strategy**
- Node.js apps should implement proper error handling, graceful shutdown (LeaveGroup), and lag monitoring

## Why this matters

Choosing right library and implementing patterns correctly ensures:

- **Production stability**: Proper timeout configs prevent frequent rebalances
- **Zero message loss**: Graceful shutdown signals through LeaveGroup + explicit offset commits
- **Horizontal scaling**: Rebalance listeners handle resource cleanup as partitions are reassigned
- **Observability**: Lag monitoring catches consumer falling behind early

## Versions & Scope

- **@platformatic/kafka**: Kafka 3.5-4.0+, Node.js 18+, TypeScript first
- **KafkaJS**: Kafka 0.10+, Node.js 12+, JavaScript/TypeScript
- Both support: CooperativeSticky (Kafka 2.4+), idempotent producers, exactly-once semantics (partial)
- Production-ready for both

## Quick Comparison

| Feature                 | @platformatic/kafka | KafkaJS            |
| ----------------------- | ------------------- | ------------------ |
| **Type Safety**         | Full TypeScript     | Partial support    |
| **Performance**         | High (native-like)  | Good (pure JS)     |
| **Setup Complexity**    | Low                 | Low                |
| **Rebalance Listeners** | Built-in events     | Supported          |
| **Community Size**      | Growing             | Large              |
| **Documentation**       | Good                | Excellent          |
| **Kafka Versions**      | 3.5+                | All                |
| **Use Kafka 3.5+?**     | ✅ Choose this      | If you prefer docs |
| **Use Older Kafka?**    | ❌ Not supported    | ✅ Choose this     |

## @platformatic/kafka - Production Patterns

### Setup & Configuration

```typescript
import {
  Consumer,
  stringDeserializers,
  jsonDeserializer,
} from "@platformatic/kafka";

const consumer = new Consumer({
  // Connection
  clientId: "order-processor-v1",
  bootstrapBrokers: ["kafka1:9092", "kafka2:9092", "kafka3:9092"],

  // Consumer Group
  groupId: "order-processors",

  // Rebalancing Strategy
  groupProtocol: "classic",
  partitionAssignmentStrategy: "cooperativeSticky", // 90% faster rebalancing

  // Timeouts (critical for stability)
  sessionTimeout: 10000, // Heartbeat detection: 10s
  rebalanceTimeout: 120000, // Max time for rebalance: 2 min
  heartbeatInterval: 3000, // Heartbeat sent every 3s

  // Fetching
  maxBytes: 10485760, // 10MB per fetch
  maxWaitTime: 5000, // Wait 5s for max data

  // Offset Management
  autocommit: false, // Manual control (safer)

  // Deserializers
  deserializers: {
    key: stringDeserializers.key,
    value: jsonDeserializer,
    headerKey: stringDeserializers.headerKey,
    headerValue: stringDeserializers.headerValue,
  },
});

// Rebalance listeners (critical for graceful shutdown)
consumer.on("consumer:group:join", ({ memberId, generationId }) => {
  console.log(`Joined group with member ID: ${memberId}, gen: ${generationId}`);
});

consumer.on("consumer:group:rejoin", () => {
  console.log("Rebalance starting - pausing consumption");
  // Stop in-flight work if needed
});

consumer.on("consumer:group:rebalance", ({ partitions }) => {
  console.log(`Rebalance complete - assigned: ${JSON.stringify(partitions)}`);
  // Re-initialize resources
});

consumer.on("consumer:heartbeat:error", ({ error }) => {
  console.error("Heartbeat failed:", error);
  // May trigger rejoin
});
```

### Consumer Pattern: Decoupled Processing

```typescript
const stream = await consumer.consume({ topics: ["orders"] });

// Fetch and process independently to avoid poll timeout
const messageQueue = [];
const BATCH_SIZE = 100;

// Consumer thread: fetch messages
const consumeTask = async () => {
  for await (const message of stream) {
    messageQueue.push(message);
    // Triggers rebalance event if needed, but doesn't block processing
  }
};

// Processor thread: process at own pace
const processTask = async () => {
  while (true) {
    if (messageQueue.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const batch = messageQueue.splice(0, BATCH_SIZE);

    try {
      await Promise.all(batch.map((msg) => processOrder(msg)));

      // Commit after successful batch
      await consumer.commitSync();
    } catch (error) {
      console.error("Batch processing failed:", error);
      // Don't commit - will retry from last offset on restart
    }
  }
};

await Promise.all([consumeTask(), processTask()]);
```

### Graceful Shutdown

```typescript
let stream: any;

async function startConsumer() {
  stream = await consumer.consume({ topics: ["orders"] });

  for await (const message of stream) {
    await processOrder(message);
  }
}

process.on("SIGTERM", async () => {
  console.log("Graceful shutdown initiated...");

  // Close stream (stops new messages)
  await stream?.close();

  // Leave group explicitly (fast, doesn't wait for timeout)
  await consumer.leaveGroup();

  // Close consumer
  await consumer.close();

  process.exit(0);
});

process.on("SIGINT", () => process.exit(0));

startConsumer().catch((err) => {
  console.error("Fatal consumer error:", err);
  process.exit(1);
});
```

### Error Handling & Retry

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function processOrderWithRetry(message) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const order = JSON.parse(message.value?.toString() || "{}");

      // Business logic
      await createOrder(order);
      return true;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `Order processing failed after ${MAX_RETRIES} retries:`,
          error,
        );
        // Send to dead-letter queue
        await deadLetterQueue.send({
          value: message.value,
          error: error.message,
        });
        return false;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
}

// In consume loop
for await (const message of stream) {
  const success = await processOrderWithRetry(message);
  if (success) {
    await consumer.commitSync();
  }
}
```

### Lag Monitoring

```typescript
consumer.startLagMonitoring({ topics: ["orders"] }, 60000); // Every 60s

consumer.on("consumer:lag", (lagOffsets) => {
  let totalLag = 0;
  for (const lags of Object.values(lagOffsets)) {
    totalLag += lags.reduce((a: number, b: number) => a + b, 0);
  }

  console.log(`Consumer lag: ${totalLag} messages`);

  if (totalLag > 10000) {
    console.warn("ALERT: Consumer falling behind (lag > 10K)");
    // Trigger scaling, alert ops
  }
});

consumer.on("consumer:lag:error", (error) => {
  console.error("Lag calculation failed:", error);
});
```

## KafkaJS - Production Patterns

### Setup & Configuration

```typescript
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "order-processor-v1",
  brokers: ["kafka1:9092", "kafka2:9092", "kafka3:9092"],
});

const consumer = kafka.consumer({
  groupId: "order-processors",

  // Rebalancing
  protocol: ["cooperative-sticky"], // Try this first, fallback to others if unsupported
  sessionTimeout: 10000,
  heartbeatInterval: 3000,
  rebalanceTimeout: 60000,

  // Performance
  maxBytesPerPartition: 1048576,

  // Retry
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
    randomizationFactor: 0.2,
  },
});
```

### Consumer Pattern with Rebalance Awareness

```typescript
await consumer.subscribe({
  topic: "orders",
  fromBeginning: false,
});

await consumer.run({
  eachBatch: async ({
    batch,
    resolveOffset,
    heartbeat,
    isRunning,
    isStale,
  }) => {
    const messages = batch.messages;

    for (let i = 0; i < messages.length; i += 50) {
      // Stop if rebalance signaled or partition revoked
      if (!isRunning() || isStale()) {
        console.log("Rebalance signal detected, stopping batch");
        break;
      }

      const chunk = messages.slice(i, i + 50);

      try {
        // Process chunk with concurrency control
        await Promise.all(chunk.map((msg) => processOrder(msg)));

        // Update offset
        if (messages[i + 49]) {
          resolveOffset(messages[i + 49].offset);
        }

        // Keep heartbeat alive during processing
        await heartbeat();
      } catch (error) {
        console.error("Batch processing error:", error);
        // Don't resolve offset - will retry from last committed
        // Heartbeat to stay alive in group
        await heartbeat();
      }
    }
  },
});
```

### Graceful Shutdown with Manual Offset Commit

```typescript
let isShuttingDown = false;

const consumer = kafka.consumer({ groupId: "order-processors" });

await consumer.subscribe({ topic: "orders" });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    if (isShuttingDown) {
      console.log("Shutdown in progress, stopping");
      return;
    }

    try {
      const order = JSON.parse(message.value?.toString() || "{}");
      await createOrder(order);

      // Manual commit after success
      await consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (Number(message.offset) + 1).toString(),
        },
      ]);
    } catch (error) {
      console.error("Order processing failed:", error);
      // Don't commit - will retry on restart
    }
  },
});

process.on("SIGTERM", async () => {
  console.log("Shutdown: stopping consumption");
  isShuttingDown = true;

  // Disconnect (sends LeaveGroup), doesn't wait for long timeouts
  await consumer.disconnect();

  process.exit(0);
});
```

### Error Handling with Topic Routing

```typescript
const deadLetterTopic = "orders-dlq";

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const order = JSON.parse(message.value?.toString() || "{}");

      // Validation
      if (!order.id || !order.customerId) {
        throw new Error("Invalid order: missing id or customerId");
      }

      await createOrder(order);
    } catch (error) {
      console.error(
        `Error processing message from partition ${partition}:`,
        error,
      );

      // Send to dead-letter queue for manual inspection
      await producer.send({
        topic: deadLetterTopic,
        messages: [
          {
            key: message.key,
            value: JSON.stringify({
              originalTopic: topic,
              originalOffset: message.offset,
              originalMessage: message.value?.toString(),
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
    }
  },
});
```

## Common Mistakes & Solutions

### Mistake 1: Slow Processing Causing Poll Timeout

```typescript
// ❌ WRONG: Process inside poll loop - risks max.poll.interval.ms timeout
await consumer.run({
  eachMessage: async ({ message }) => {
    await slowDatabaseWrite(message); // 5 minutes → TIMEOUT!
  },
});

// ✅ CORRECT: Decouple fetching from processing
const messageQueue = [];

// Fetch quickly
for await (const message of stream) {
  messageQueue.push(message);
}

// Process at own pace
for (const message of messageQueue) {
  await slowDatabaseWrite(message);
}
```

### Mistake 2: Not Handling Rebalance Events

```typescript
// ❌ WRONG: No rebalance handling - may lose offsets on shutdown
const stream = await consumer.consume({ topics: ["orders"] });
for await (const message of stream) {
  await processOrder(message);
  // If rebalance happens, uncommitted offsets lost
}

// ✅ CORRECT: Handle rebalance events
consumer.on("consumer:group:rejoin", () => {
  console.log("Rebalance starting - finalizing current batch");
  // Stop accepting new messages, wait for in-flight to complete
});

for await (const message of stream) {
  await processOrder(message);
  await consumer.commitSync(); // Explicit commit
}
```

### Mistake 3: Ignoring Lag Growth

```typescript
// ❌ WRONG: No lag monitoring - miss scaling needs
const consumer = new Consumer({ groupId: "orders" });
// ... consuming, but no idea if consumer falling behind

// ✅ CORRECT: Monitor lag continuously
consumer.startLagMonitoring({ topics: ["orders"] }, 60000);

consumer.on("consumer:lag", (allLags) => {
  let totalLag = 0;
  for (const lags of Object.values(allLags)) {
    totalLag += lags.reduce((a: number, b: number) => a + b, 0);
  }

  if (totalLag > THRESHOLD) {
    // Scale: deploy more consumer instances
    logger.warn("Consumer lag critical, scaling needed");
  }
});
```

## Configuration Tuning for Your Workload

### High-Volume, Low-Latency (Real-time)

```typescript
// @platformatic/kafka
{
  partitionAssignmentStrategy: 'cooperativeSticky',
  sessionTimeout: 10000,
  heartbeatInterval: 3000,
  maxWaitTime: 500,             // Don't wait long for data
}

// KafkaJS
{
  protocol: ['cooperative-sticky'],
  sessionTimeout: 10000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 10485760,
}
```

### Batch Processing (Minutes Scale)

```typescript
// @platformatic/kafka
{
  maxWaitTime: 30000,           // Wait longer to batch
  autocommit: false,            // Commit after batch
}

// KafkaJS: use eachBatch for efficiency
{
  eachBatch: async ({ batch, resolveOffset }) => {
    await processBatch(batch.messages)
    resolveOffset(batch.messages[batch.messages.length - 1].offset)
  }
}
```

### Heavy Processing (Database Writes)

```typescript
// Increase max.poll.interval.ms to accommodate slow processing
// Use separate queue for processing (don't block fetch)
// Set higher max.in.flight to buffer messages

// @platformatic/kafka: decouples automatically with streams

// KafkaJS: use eachBatch with heartbeat() calls
{
  eachBatch: async ({ batch, heartbeat }) => {
    for (const message of batch.messages) {
      await heavyProcessing(message);
      await heartbeat(); // Keep alive during processing
    }
  };
}
```

## Production Checklist

- [ ] Configured `partitionAssignmentStrategy: 'cooperativeSticky'` (or equivalent)
- [ ] Set `sessionTimeout: 10000`, `heartbeatInterval: 3000`
- [ ] Set `max.poll.interval.ms` >= 2x your max processing time
- [ ] Implement rebalance listeners (onPartitionsRevoked, onPartitionsAssigned)
- [ ] Call `commitSync()` or `resolveOffset()` after successful processing
- [ ] Implement graceful shutdown (LeaveGroup on SIGTERM)
- [ ] Monitor consumer lag (alert if > threshold)
- [ ] Handle DeserializationException and route to DLQ
- [ ] Set resource limits (memory, CPU) on consumer containers
- [ ] Test rebalancing scenarios (rolling restart, scale up/down)

## Sources

- [@platformatic/kafka Documentation](https://docs.platformatic.dev/docs/packages/db/package-reference/pkg-kafka) (Retrieved: 2026-02-17)
- [KafkaJS Documentation](https://kafka.js.org/) (Retrieved: 2026-02-17)
- [Apache Kafka Consumer Configuration](https://kafka.apache.org/documentation/#consumerconfigs) (Retrieved: 2026-02-17)
- [Confluent Docs - Kafka Consumer Design](https://docs.confluent.io/kafka/design/consumer-design.html) (Retrieved: 2026-02-17)

---

# Kafka Journal — Topic Configuration (Date: 2026-02-27)

## TL;DR

- Topic-level configs override broker defaults for individual topics, enabling fine-grained control.
- The most critical configs are retention (`retention.ms`, `retention.bytes`), replication (`replication.factor`, `min.insync.replicas`), segment size (`segment.bytes`), and cleanup policy (`cleanup.policy`).
- Topic configs can be set at creation time or altered dynamically without restarting the cluster.
- In KRaft mode, topic metadata (including configs) is managed via the controller quorum in the `__cluster_metadata` log.

## Why this matters

One-size-fits-all broker defaults are rarely optimal. A high-volume audit log topic needs different retention than a real-time events topic used for stream processing. Topic configs let you tune each topic independently without cluster-wide changes.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x (KRaft mode).
- Dynamic config alteration (`kafka-configs.sh --alter`) works the same in both.
- KRaft stores topic configs in the metadata log; propagation is faster than ZooKeeper-based clusters.

## Core Concepts

### Retention Configs

Control how long or how much data Kafka keeps per partition:

| Config                            | Default              | Description                                    |
| --------------------------------- | -------------------- | ---------------------------------------------- |
| `retention.ms`                    | `604800000` (7 days) | Retain events for this duration                |
| `retention.bytes`                 | `-1` (unlimited)     | Max bytes retained per partition               |
| `log.retention.check.interval.ms` | `300000` (5 min)     | How often broker checks for segments to delete |

Both can be combined: whichever limit is hit first triggers deletion.

### Segment Configs

Each partition log is divided into segment files. Older segments are candidates for cleanup:

| Config                | Default              | Description                                         |
| --------------------- | -------------------- | --------------------------------------------------- |
| `segment.bytes`       | `1073741824` (1 GB)  | Max size per segment file before rolling            |
| `segment.ms`          | `604800000` (7 days) | Roll a new segment after this time even if not full |
| `segment.index.bytes` | `10485760` (10 MB)   | Max size of offset index per segment                |

### Replication and Durability Configs

| Config                           | Default                             | Description                                              |
| -------------------------------- | ----------------------------------- | -------------------------------------------------------- |
| `replication.factor`             | Broker `default.replication.factor` | How many copies of each partition                        |
| `min.insync.replicas`            | `1`                                 | Min replicas that must ack writes (used with `acks=all`) |
| `unclean.leader.election.enable` | `false`                             | Allow out-of-sync replica to become leader               |

### Other Important Configs

| Config                   | Default           | Description                                                                   |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------- |
| `cleanup.policy`         | `delete`          | `delete`, `compact`, or `delete,compact`                                      |
| `max.message.bytes`      | `1048588` (~1 MB) | Max size of a single message for this topic                                   |
| `compression.type`       | `producer`        | Broker-side compression (`none`, `gzip`, `snappy`, `lz4`, `zstd`, `producer`) |
| `message.timestamp.type` | `CreateTime`      | Use producer timestamp or broker log-append time                              |

## Configuration Examples

### Create Topic with Custom Configs

```bash
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic payments \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=86400000 \
  --config min.insync.replicas=2 \
  --config max.message.bytes=2097152
```

### Alter Topic Config Dynamically (no restart needed)

```bash
# Change retention to 3 days for an existing topic
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name payments \
  --alter \
  --add-config retention.ms=259200000,min.insync.replicas=2
```

### Describe Current Topic Configs

```bash
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name payments \
  --describe
```

### Topic Config in Properties (for IaC tools / AdminClient)

```properties
# Topic-level overrides (applied via AdminClient or kafka-configs.sh)
retention.ms=86400000          # 1 day
retention.bytes=5368709120     # 5 GB per partition cap
segment.bytes=536870912        # 512 MB segments
min.insync.replicas=2
cleanup.policy=delete
compression.type=lz4
```

## Real-World Example

**Multi-topic pipeline with different retention needs**:

| Topic             | Config           | Why                                                   |
| ----------------- | ---------------- | ----------------------------------------------------- |
| `clickstream-raw` | 1 day, 10 GB cap | High volume, short-lived, feeds downstream processing |
| `payment-events`  | 90 days          | Compliance / audit requirement                        |
| `user-profiles`   | `compact` only   | Latest state per user, no time limit                  |
| `dead-letter`     | 7 days           | Manual inspection window before discard               |

Each topic created with its own config overrides while sharing the same cluster.

## Migration / Legacy Notes

- **ZooKeeper mode**: Topic configs stored in ZooKeeper znodes; altered via `kafka-configs.sh` which wrote directly to ZooKeeper.
- **KRaft mode**: Topic configs stored in `__cluster_metadata` internal log; `kafka-configs.sh` sends a request to the active controller which appends to the log. Faster propagation to all brokers.
- `kafka-topics.sh --alter` (to change partition count) is separate from `kafka-configs.sh --alter` (to change topic properties).

## QnA

**Q1: What happens when both `retention.ms` and `retention.bytes` are set?**
A: Each condition is checked independently. If either threshold is met, the oldest closed segments are eligible for deletion.

**Q2: Can I set `min.insync.replicas` higher than `replication.factor`?**
A: No. Producers would get `NotEnoughReplicasException` on every write. `min.insync.replicas` must always be ≤ `replication.factor`. Recommended: `min.insync.replicas = replication.factor - 1`.

**Q3: Does changing topic config require a rolling restart?**
A: No. Topic configs (retention, segment size, etc.) are dynamic and take effect within the next log cleanup check interval without any restart.

**Q4: What does `compression.type=producer` mean at the topic level?**
A: The broker preserves whatever compression the producer used. Setting it explicitly (e.g., `gzip`) would re-compress server-side, which is CPU-intensive. `producer` is usually best for throughput.

**Q5: How do I reset a topic config override back to the broker default?**
A: Use `--delete-config`: `kafka-configs.sh --alter --delete-config retention.ms --entity-name my-topic`. The broker default then applies.

## Sources

- [Apache Kafka Docs — Topic Configuration](https://kafka.apache.org/documentation/#topicconfigs) (Retrieved: 2026-02-27)
- [Confluent Docs — Topic Configuration Overview](https://docs.confluent.io/kafka/operations-tools/topic-operations.html) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Broker Configuration](https://kafka.apache.org/documentation/#brokerconfigs) (Retrieved: 2026-02-27)

---

# Kafka Journal — Topic Segments and Indexes (Date: 2026-02-27)

## TL;DR

- Each partition is physically stored as a series of **segment files** on disk, not a single giant file.
- Every segment has companion **index files** (offset index and time index) enabling near-constant-time lookups without scanning the full log.
- Kafka only writes to the **active segment** (the newest); older segments are immutable and eligible for cleanup.
- Understanding segments is key to tuning disk usage, cleanup efficiency, and read latency.

## Why this matters

Segments and indexes are the reason Kafka can serve specific offsets (e.g., replay from offset 5000) and time-based seeks (e.g., "give me events from the last 30 minutes") efficiently — even across terabytes of data.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x (KRaft mode).
- Segment and index file mechanics unchanged across versions.
- KRaft does not change the on-disk format of topic partition logs.

## Core Concepts

### Segment Files

Each partition on a broker is stored as a directory containing multiple segment files:

```
/var/kafka/data/orders-0/
  00000000000000000000.log         ← segment: events 0–999 (closed)
  00000000000000000000.index       ← offset index for above segment
  00000000000000000000.timeindex   ← time index for above segment
  00000000000000001000.log         ← segment: events 1000–1999 (closed)
  00000000000000001000.index
  00000000000000001000.timeindex
  00000000000000002000.log         ← active segment (being written to)
  00000000000000002000.index
  00000000000000002000.timeindex
  leader-epoch-checkpoint
```

**Naming**: Segment files are named by the **base offset** — the first offset stored in that segment. This lets Kafka binary-search to the right segment for any given offset.

**Active Segment**: The newest segment is the only one being appended to. It is never eligible for deletion or compaction until it is rolled (closed).

**Segment Roll**: A new segment is created when:

- Current segment exceeds `segment.bytes` (default: 1 GB).
- Current segment has been open longer than `segment.ms` (default: 7 days).
- The index file exceeds `segment.index.bytes` (default: 10 MB).

### Offset Index (`.index` file)

A sparse index mapping **message offset → physical byte position** in the `.log` file.

```
offset 0   → byte 0
offset 50  → byte 4832
offset 100 → byte 9920
```

- **Sparse**: One entry per `log.index.interval.bytes` (default: 4096 bytes of log data).
- **Lookup**: To find offset 73, Kafka binary-searches the index, finds the closest entry ≤ 73 (e.g., offset 50 at byte 4832), then scans the `.log` file forward from that byte.
- **Memory-mapped**: Index files are memory-mapped for fast access without system calls.

### Time Index (`.timeindex` file)

A sparse index mapping **timestamp → offset**, enabling time-based consumer seeks via `offsetsForTimes()`.

```
timestamp 1707667200000 → offset 50
timestamp 1707667260000 → offset 130
```

Used when consumers call `consumer.offsetsForTimes(Map<TopicPartition, Long>)` to replay from a specific point in time.

### Transaction Index (`.txnindex` file)

Present only when transactional producers are used. Records aborted transaction ranges so consumers using `isolation.level=read_committed` can efficiently skip aborted messages.

### Temporary Compaction Files

During log compaction, Kafka creates `.cleaned` and `.swap` intermediate files in the partition directory. These are replaced atomically once compaction completes.

## Configuration Examples

### Segment Size and Roll Configs

```properties
# Topic-level (override broker defaults)
segment.bytes=536870912        # Roll at 512 MB instead of 1 GB
segment.ms=3600000             # Roll at least every 1 hour
segment.index.bytes=10485760   # 10 MB index per segment (default)

# Broker-level: index density
log.index.interval.bytes=4096  # Index every 4 KB of log data (default)
```

### List Segment Files for a Partition

```bash
# View segment files for partition 0 of 'orders' topic
ls -lh /var/kafka/data/orders-0/

# Decode readable log content (development only)
kafka-dump-log.sh \
  --files /var/kafka/data/orders-0/00000000000000000000.log \
  --print-data-log
```

### Consumer Time-Based Seek

```java
// Seek all partitions to events from 2 hours ago
long targetTimestamp = System.currentTimeMillis() - (2 * 60 * 60 * 1000);
Map<TopicPartition, Long> timestampsToSearch = new HashMap<>();
for (TopicPartition tp : consumer.assignment()) {
    timestampsToSearch.put(tp, targetTimestamp);
}
Map<TopicPartition, OffsetAndTimestamp> offsets = consumer.offsetsForTimes(timestampsToSearch);
offsets.forEach((tp, offsetAndTimestamp) -> {
    if (offsetAndTimestamp != null) {
        consumer.seek(tp, offsetAndTimestamp.offset());
    }
});
```

## Real-World Example

**Seeking to replay payments from 2 hours ago**:

1. Consumer calls `consumer.offsetsForTimes({"payments", now - 2h})`.
2. Broker binary-searches the `.timeindex` to find the closest timestamp ≤ target → returns offset (e.g., 48320).
3. Broker binary-searches the `.index` for offset 48320 → byte position in `.log`.
4. Reads sequentially from that byte forward.

Result: O(log N) on tiny memory-mapped index files + at most one `log.index.interval.bytes` (~4 KB) of sequential scan. Effectively constant time regardless of total partition size.

## Migration / Legacy Notes

- Segment and index file format is stable across Kafka 2.x, 3.x, and 4.x. No migration of log data is needed when upgrading Kafka versions.
- The `log.message.format.version` broker config (ZooKeeper-era cross-version compatibility) was removed in Kafka 4.0.

## QnA

**Q1: Why does Kafka use multiple segment files instead of one big file per partition?**
A: Segments allow efficient O(1) deletion (remove an entire file), parallel compaction (compact old segments while appending to the active one), and binary-search navigation via base-offset named files. A single file would make deletion O(N).

**Q2: Why can't the active segment be deleted by retention policy?**
A: The active segment is being actively appended to. Retention only considers fully closed (rolled) segments. An active segment becomes eligible only after it rolls and a new active segment begins.

**Q3: Is the offset index exact or approximate?**
A: Approximate (sparse). Kafka finds the nearest index entry ≤ target offset, then scans the `.log` file linearly. Scan distance is bounded by `log.index.interval.bytes` (default 4096 bytes).

**Q4: How does `segment.ms` interact with `retention.ms`?**
A: If `retention.ms=3600000` (1 hour) but `segment.ms=86400000` (1 day), segments won't roll for a full day — nothing gets deleted despite the 1-hour retention. Always set `segment.ms ≤ retention.ms` for time-based retention to work correctly.

**Q5: What tool can inspect segment files?**
A: `kafka-dump-log.sh` (bundled with Kafka) decodes `.log` files and prints readable records. Use in development only — avoid on large production files.

## Sources

- [Apache Kafka Docs — Log Storage Design](https://kafka.apache.org/documentation/#log) (Retrieved: 2026-02-27)
- [Confluent Docs — Kafka and the File System](https://docs.confluent.io/kafka/design/file-system-constant-time.html) (Retrieved: 2026-02-27)
- [Confluent Docs — Kafka Log Compaction](https://docs.confluent.io/kafka/design/log_compaction.html) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Topic Config: segment.bytes](https://kafka.apache.org/documentation/#topicconfigs_segment.bytes) (Retrieved: 2026-02-27)

---

# Kafka Journal — Log Cleanup Policies: Delete and Compaction (Date: 2026-02-27)

## TL;DR

- `cleanup.policy=delete` removes old segments based on time (`retention.ms`) or size (`retention.bytes`) — the default policy.
- `cleanup.policy=compact` retains only the **latest value per key**, removing older duplicate-key records ("log compaction").
- Both can be combined: `cleanup.policy=delete,compact` — compact first, then delete segments beyond the retention window.
- Compaction is ideal for changelog/state topics; delete is ideal for event stream topics.

## Why this matters

Using the wrong cleanup policy wastes disk (delete on a state topic forces replaying all history) or loses data (compact on an event stream drops intermediate events). Getting this right is fundamental to Kafka data architecture.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x (KRaft mode).
- Log compaction behavior unchanged across versions; the compaction thread operates identically.
- `delete,compact` combination stable since Kafka 2.x.

## Core Concepts

### cleanup.policy=delete (Default)

Segments are deleted when they breach either limit:

- **Time limit**: Segment's last-modified time is older than `retention.ms` (default: 7 days).
- **Size limit**: Total partition log size exceeds `retention.bytes` (default: -1 = unlimited).

The **active segment is never deleted** — only fully closed (rolled) segments are candidates.

```
Partition log (retention.ms = 1 day):

[Seg 0: 3 days old] [Seg 1: 2 days old] [Seg 2: 12 hrs old] [Seg 3: active]
         ↑                    ↑
       DELETED             DELETED              kept (within 1 day)
```

Key broker config: `log.retention.check.interval.ms` (default: 300s) — how often the broker scans for segments to delete.

### cleanup.policy=compact (Log Compaction)

Kafka retains only the **latest record per key** in compacted segments. Older records with the same key are removed by a background log cleaner thread.

```
Before compaction:
key=alice → val=v1
key=bob   → val=v1
key=alice → val=v2   ← newer
key=carol → val=v1
key=bob   → val=v2   ← newer
key=alice → val=v3   ← newest

After compaction:
key=alice → val=v3
key=bob   → val=v2
key=carol → val=v1
```

**Tombstone Records**: A record with `key=X, value=null` signals deletion. After compaction, the tombstone remains for `delete.retention.ms` (default: 24 hrs) so consumers can observe the deletion, then it is permanently removed.

**Log Head vs Tail**:

- **Head**: Active (recent) portion — new writes land here. May have multiple records per key. NOT compacted.
- **Tail**: Previously compacted segments — each key appears at most once here.

**Requirements for compaction**:

- Records must have non-null keys (null-key records cannot be compacted).
- `log.cleaner.enable=true` at the broker (default: true).

**Common use cases**:

- Kafka Streams changelog topics (state store snapshots for crash recovery).
- CDC (Change Data Capture) topics where only current row state matters.
- Application config / feature flag topics.

### cleanup.policy=delete,compact (Combined)

- The log cleaner deduplicates by key (compaction) on tail segments.
- Time/size retention then deletes entire old segments that exceed the retention window.
- Useful for latest-state semantics **and** eventual cleanup after a retention window.

**Example**: User profile topic with `compact,delete` + `retention.ms=7776000000` (90 days) → keeps latest value per user indefinitely while active, but removes profiles of users who haven't updated in 90 days.

### Log Cleaner Configuration

```properties
# Broker-level (controls the compaction background thread)
log.cleaner.enable=true                  # Must be true for compaction (default: true)
log.cleaner.threads=1                    # Compaction threads (increase for busy clusters)
log.cleaner.min.cleanable.ratio=0.5      # Run compaction when dirty/total ratio > 50%
log.cleaner.min.compaction.lag.ms=0      # Min age before a record is eligible for compaction
delete.retention.ms=86400000             # How long tombstones are retained (default: 24 hrs)
```

## Configuration Examples

### Delete Policy (Event Stream Topic)

```bash
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic clickstream \
  --partitions 12 \
  --replication-factor 3 \
  --config cleanup.policy=delete \
  --config retention.ms=86400000 \
  --config retention.bytes=10737418240
```

### Compact Policy (State / CDC Topic)

```bash
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic user-profiles \
  --partitions 6 \
  --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.1 \
  --config delete.retention.ms=86400000
```

### Combined Policy

```bash
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic inventory-snapshots \
  --partitions 6 \
  --replication-factor 3 \
  --config "cleanup.policy=compact,delete" \
  --config retention.ms=2592000000 \
  --config delete.retention.ms=86400000
```

### Produce a Tombstone (Delete a Key from Compacted Topic)

```java
// Send null value to signal deletion of a key
ProducerRecord<String, String> tombstone = new ProducerRecord<>(
    "user-profiles",    // topic
    "user-alice-uuid",  // key
    null                // null value = tombstone
);
producer.send(tombstone);
// After delete.retention.ms + next compaction run, alice's record is gone
```

## Real-World Example

**E-commerce product catalog**:

- Topic: `product-catalog`
- Policy: `cleanup.policy=compact`
- Key: `productId`

When a product is updated 10 times over a month, Kafka keeps only the latest record per `productId`. A new search indexer consumer group spun up months later replays the topic and gets the current state of all products — not 10x the data. When a product is discontinued, a tombstone (`productId → null`) is produced; after compaction + `delete.retention.ms`, its record is cleanly removed.

## Migration / Legacy Notes

- Compaction behavior is unchanged from Kafka 2.x → 3.x → 4.x.
- `log.cleaner.enable=false` at broker level disables all compaction globally. Never disable in production if any topics use `compact` policy.
- Combined `cleanup.policy=delete,compact` was introduced in Kafka 0.10.1 and is fully stable in modern versions.

## QnA

**Q1: Does log compaction guarantee all keys are present in the compacted log?**
A: Yes — every key ever written will have its latest value present in the tail, unless a tombstone was sent AND `delete.retention.ms` has expired.

**Q2: Can I use log compaction on a topic with null-key records?**
A: No. Records with null keys have no key to deduplicate on and are not compacted. They persist unless `delete` policy is also applied.

**Q3: Is the head of the log (active region) compacted?**
A: No. Only the tail (closed segments) is compacted. Consumers reading the head may see multiple records with the same key.

**Q4: What does `min.cleanable.dirty.ratio=0.5` mean?**
A: The cleaner runs compaction on a partition when dirty (uncompacted) bytes / total bytes > 50%. Lower values = more frequent compaction = cleaner log + more CPU overhead.

**Q5: How long does a tombstone survive after compaction?**
A: At least `delete.retention.ms` (default: 24 hours) after the compaction run that processed it. This window lets lagging consumers observe the deletion before the tombstone disappears permanently.

**Q6: Can I change `cleanup.policy` on an existing topic?**
A: Yes, dynamically: `kafka-configs.sh --alter --add-config cleanup.policy=compact`. The cleaner applies the new policy on the next compaction run. Changing from `compact` to `delete` does not recover already-compacted (deduplicated) records.

## Sources

- [Apache Kafka Docs — Log Retention](https://kafka.apache.org/documentation/#log_retention) (Retrieved: 2026-02-27)
- [Confluent Docs — Kafka Log Compaction](https://docs.confluent.io/kafka/design/log_compaction.html) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Topic Config: cleanup.policy](https://kafka.apache.org/documentation/#topicconfigs_cleanup.policy) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Topic Config: delete.retention.ms](https://kafka.apache.org/documentation/#topicconfigs_delete.retention.ms) (Retrieved: 2026-02-27)

---

# Kafka Journal — Unclean Leader Election and Large Messages (Date: 2026-02-27)

## TL;DR

- **Unclean leader election** allows an out-of-sync replica to become leader when all ISR replicas are unavailable — trading **data loss** for **availability**. Disabled by default (`false`) since Kafka 0.11.
- **Large messages** require coordinated config changes across producer (`max.request.size`), broker/topic (`message.max.bytes` / `max.message.bytes`), replica (`replica.fetch.max.bytes`), and consumer (`max.partition.fetch.bytes`) — all must accommodate the message size.
- Both are edge-case configs with significant trade-offs: enable or increase them only with full awareness of consequences.

## Why this matters

Unclean leader election and large message sizing are among the most common sources of unexpected data loss or pipeline failures in production. Getting them wrong leads to either silent data loss or `RecordTooLargeException` across producers, brokers, or consumers.

## Versions & Scope

- Applies to Kafka 3.x.x and 4.x.x (KRaft mode).
- `unclean.leader.election.enable` has defaulted to `false` since Kafka 0.11; unchanged in 3.x and 4.x.
- Large message limits and defaults are consistent across 3.x and 4.x.

## Core Concepts — Unclean Leader Election

### Normal Leader Election (Clean)

When a partition leader fails, Kafka elects a new leader **only from the ISR (In-Sync Replicas)** — replicas fully caught up with the leader. This guarantees no data loss.

```
Leader (Broker 1) FAILS
ISR: [Broker 2, Broker 3]   ← both in-sync
New leader → Broker 2        ← safe, zero data loss
```

### Unclean Leader Election

If all ISR replicas are unavailable simultaneously, Kafka must choose:

1. **Wait** for an ISR replica to come back → partition stays offline.
2. **Elect an out-of-sync replica** → potential **permanent data loss**.

Option 2 is "unclean" leader election:

```
Leader (Broker 1) FAILS
ISR replica (Broker 2) also DOWN
Out-of-sync replica (Broker 3): lagging by 500 messages

unclean.leader.election.enable=true:
→ Broker 3 becomes leader
→ 500 messages that existed on Broker 1 and not replicated to Broker 3 are LOST forever
```

### Configuration

```properties
# Broker-level default (all topics)
unclean.leader.election.enable=false   # Default (safe) — partition goes offline if all ISR unavailable
```

```bash
# Per-topic override — enable only for low-value topics
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name system-metrics \
  --alter \
  --add-config unclean.leader.election.enable=true
```

**Enable only when**: availability trumps durability — e.g., real-time dashboards, low-value telemetry, monitoring metrics where losing a few data points is tolerable but downtime is not.

**Never enable for**: financial transactions, audit logs, order events, or any topic where every message must be preserved.

### Preventing All-ISR-Down Scenarios

- Use `replication.factor=3` + `min.insync.replicas=2`.
- Tune `replica.lag.time.max.ms` (default: 30s) — replicas not keeping up are ejected from ISR.
- Monitor JMX: `kafka.controller:type=ControllerStats,name=UncleanLeaderElectionsPerSec` — any value > 0 means data was lost.

---

## Core Concepts — Large Messages

Kafka is optimized for messages in the **1 KB–1 MB** range. Default max is ~1 MB. Sending larger messages requires coordinating configs at every layer.

### The Three-Layer Size Chain

```
Producer ──────────────→ Broker ──────────────→ Consumer

max.request.size      message.max.bytes      max.partition.fetch.bytes
(producer config)  ≤  (broker/topic config) ≤  (consumer config)
```

If any layer's limit is smaller than the message, the pipeline breaks at that point.

### Config Reference

| Layer               | Config                      | Default            | Description                                |
| ------------------- | --------------------------- | ------------------ | ------------------------------------------ |
| **Producer**        | `max.request.size`          | `1048576` (1 MB)   | Max total size of a single produce request |
| **Broker** (global) | `message.max.bytes`         | `1000012` (~1 MB)  | Max message size for all topics            |
| **Topic**           | `max.message.bytes`         | Inherits broker    | Per-topic override (preferred)             |
| **Consumer**        | `fetch.max.bytes`           | `52428800` (50 MB) | Total bytes fetched per consumer request   |
| **Consumer**        | `max.partition.fetch.bytes` | `1048576` (1 MB)   | Max bytes per partition per fetch          |
| **Replica**         | `replica.fetch.max.bytes`   | `1048576` (1 MB)   | Max bytes in broker-to-broker replication  |

⚠️ **`replica.fetch.max.bytes` is frequently overlooked**: if smaller than `max.message.bytes`, broker-to-broker replication silently fails and partitions become under-replicated.

### Error Symptoms by Layer

| Error                                   | Cause                                               |
| --------------------------------------- | --------------------------------------------------- |
| Producer: `RecordTooLargeException`     | `max.request.size` too small                        |
| Broker rejects with `MESSAGE_TOO_LARGE` | `message.max.bytes` / `max.message.bytes` too small |
| Consumer gets empty/truncated batches   | `max.partition.fetch.bytes` too small               |
| Partition becomes under-replicated      | `replica.fetch.max.bytes` too small                 |

## Configuration Examples

### Large Messages — Coordinated Config (10 MB example)

**Broker (`server.properties`)**:

```properties
message.max.bytes=10485760         # Allow up to 10 MB messages
replica.fetch.max.bytes=10485760   # Replication must match
```

**Topic-level override (preferred over broker-global change)**:

```bash
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name media-events \
  --alter \
  --add-config max.message.bytes=10485760
```

**Producer**:

```properties
max.request.size=10485760
```

**Consumer**:

```properties
max.partition.fetch.bytes=10485760
fetch.max.bytes=52428800           # Keep >= max.partition.fetch.bytes
```

### Claim-Check Pattern (Recommended for Payloads > 1 MB)

Store large payload externally and send only a reference through Kafka:

```typescript
// Producer: upload payload to S3, send reference in Kafka
const uploadResult = await s3.upload(
  largePayload,
  "s3://bucket/payloads/evt-001",
);

await producer.send({
  topic: "media-events",
  messages: [
    {
      key: "evt-001",
      value: JSON.stringify({
        eventId: "evt-001",
        payloadRef: uploadResult.Location, // S3 URL
        payloadSizeBytes: largePayload.length,
      }),
    },
  ],
});

// Consumer: fetch actual payload from S3
const event = JSON.parse(message.value.toString());
const payload = await s3.getObject(event.payloadRef);
```

This keeps Kafka messages small (~hundreds of bytes) and is the recommended pattern for payloads consistently > 1 MB.

## Real-World Example

**Video processing platform**:

| Topic              | Config Applied                                                  | Reason                                                                       |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `video-metadata`   | Default (1 MB)                                                  | Small ~2 KB metadata — no changes needed                                     |
| `video-thumbnails` | `max.message.bytes=6291456` + matching replica/consumer configs | Compressed thumbnails up to 5 MB                                             |
| `ingest-health`    | `unclean.leader.election.enable=true`                           | Dashboard stays up during broker failure; losing a few metrics is acceptable |

For `video-thumbnails`, also set `replica.fetch.max.bytes=6291456` at broker level and monitor replication lag closely after deployment.

## Migration / Legacy Notes

- **Kafka <0.11**: `unclean.leader.election.enable` defaulted to `true`. Clusters upgrading from very old Kafka must explicitly verify and set this to `false`.
- **Kafka 4.0**: No behavioral changes to either feature. Defaults unchanged.
- `replica.fetch.max.bytes` has never been increased in defaults alongside `message.max.bytes` — always set both explicitly together when raising message size limits.

## QnA

**Q1: If `unclean.leader.election.enable=false` and all ISR replicas are down, what happens?**
A: The partition goes **offline**. Producers get `NotLeaderOrFollowerException` and consumers cannot read. The partition stays offline until at least one ISR replica comes back and is elected leader.

**Q2: Can I enable unclean election cluster-wide but disable it for specific critical topics?**
A: Yes. Set `unclean.leader.election.enable=true` at the broker level, then override: `kafka-configs.sh --alter --add-config unclean.leader.election.enable=false --entity-name payments`. Topic-level config takes precedence.

**Q3: Why do I get `RecordTooLargeException` even after increasing `message.max.bytes` on the broker?**
A: You likely forgot to also increase `max.request.size` on the producer client. Check all three layers: producer, broker (or topic), and consumer.

**Q4: Does sending large messages degrade Kafka performance?**
A: Yes. Large messages increase memory pressure on producers, brokers, and consumers, and inflate replication traffic. For payloads consistently > 1 MB, the claim-check pattern is preferred.

**Q5: What is `replica.lag.time.max.ms` and how does it relate to unclean election?**
A: `replica.lag.time.max.ms` (default: 30s) is the max time a follower can lag before being removed from ISR. If all replicas lag simultaneously (e.g., during a network partition), ISR goes empty — triggering the unclean election decision.

**Q6: How do I detect when unclean leader election has occurred?**
A: Monitor JMX metric `kafka.controller:type=ControllerStats,name=UncleanLeaderElectionsPerSec`. Any value > 0 indicates data loss. Set production alerts on this metric.

## Sources

- [Apache Kafka Docs — Replication Design](https://kafka.apache.org/documentation/#replication) (Retrieved: 2026-02-27)
- [Confluent Docs — Kafka Replication and Committed Messages](https://docs.confluent.io/kafka/design/replication.html) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Broker Config: unclean.leader.election.enable](https://kafka.apache.org/documentation/#brokerconfigs_unclean.leader.election.enable) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Topic Config: max.message.bytes](https://kafka.apache.org/documentation/#topicconfigs_max.message.bytes) (Retrieved: 2026-02-27)
- [Apache Kafka Docs — Producer Config: max.request.size](https://kafka.apache.org/documentation/#producerconfigs_max.request.size) (Retrieved: 2026-02-27)
