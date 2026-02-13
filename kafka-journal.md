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
version: '3.8'
services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka:9092,CONTROLLER://kafka:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT'
      KAFKA_LOG_DIRS: '/tmp/kraft-logs'
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
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

| Deserializer | Purpose | Use Case |
|-------------|---------|----------|
| `StringDeserializer` | Bytes → String (UTF-8) | Text data, JSON strings |
| `IntegerDeserializer` | Bytes → Integer | Numeric IDs |
| `ByteArrayDeserializer` | Bytes → byte[] (no-op) | Raw binary data |
| `AvroDeserializer` | Bytes → Avro object | Structured data with schema |
| `JsonDeserializer` | Bytes → JSON object | Flexible JSON documents |
| `ProtobufDeserializer` | Bytes → Protobuf message | Efficient binary format |

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

| Property | Description | Default | Example |
|----------|-------------|---------|---------|
| `num.partitions` | Number of partitions | 1 | 6 |
| `replication.factor` | Copies of each partition | 1 | 3 |
| `retention.ms` | Time retention | 7 days | 604800000 |
| `retention.bytes` | Size retention per partition | Unlimited | 1GB |
| `min.insync.replicas` | Min ISRs for acks=all | 1 | 2 |
| `compression.type` | Compression algorithm | producer | snappy |
| `cleanup.policy` | delete or compact | delete | delete |
| `segment.ms` | Segment roll time | 7 days | 604800000 |

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
min.insync.replicas=2                  # Minimum ISRs for durability
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
version: '3.8'
services:
  kafka-1:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-1
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka-1:9092,CONTROLLER://kafka-1:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-logs-1'
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

  kafka-2:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-2
    ports:
      - "9093:9092"
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka-2:9092,CONTROLLER://kafka-2:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9093'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-logs-2'
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

  kafka-3:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka-3
    ports:
      - "9094:9092"
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka-3:9092,CONTROLLER://kafka-3:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9094'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-logs-3'
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
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

| Feature | ZooKeeper Mode | KRaft Mode |
|---------|----------------|------------|
| **Metadata Storage** | External ZooKeeper ensemble | Internal Raft quorum |
| **Controller Election** | Via ZooKeeper watches | Via Raft consensus protocol |
| **Metadata Propagation** | Brokers poll ZooKeeper | Event-sourced log with offsets |
| **Controller Failover** | 2-10 seconds | <100ms (near-instantaneous) |
| **Max Partitions** | ~200K practical limit | 2M+ supported |
| **Operational Complexity** | High (two systems) | Lower (one system) |
| **Metadata Consistency** | Eventually consistent | Strongly consistent |
| **Production Ready** | Kafka 0.x-3.x | Kafka 3.3.1+ |
| **Status in Kafka 4.0** | Removed | Default and only option |

**Key Terminology Differences**:

| Concept | ZooKeeper Term | KRaft Term |
|---------|----------------|------------|
| Node Identifier | `broker.id` | `node.id` |
| Cluster Controller | Elected broker | Dedicated controller nodes |
| Metadata Store | ZooKeeper znodes | `__cluster_metadata` log |
| Controller Selection | ZooKeeper watches | Raft leader election |

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
version: '3.8'

services:
  # Controllers
  controller-1:
    image: confluentinc/cp-kafka:7.6.0
    hostname: controller-1
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@controller-1:9093,2@controller-2:9093,3@controller-3:9093'
      KAFKA_LISTENERS: 'CONTROLLER://controller-1:9093'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

  controller-2:
    image: confluentinc/cp-kafka:7.6.0
    hostname: controller-2
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: 'controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@controller-1:9093,2@controller-2:9093,3@controller-3:9093'
      KAFKA_LISTENERS: 'CONTROLLER://controller-2:9093'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

  controller-3:
    image: confluentinc/cp-kafka:7.6.0
    hostname: controller-3
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: 'controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@controller-1:9093,2@controller-2:9093,3@controller-3:9093'
      KAFKA_LISTENERS: 'CONTROLLER://controller-3:9093'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

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
      KAFKA_PROCESS_ROLES: 'broker'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@controller-1:9093,2@controller-2:9093,3@controller-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka-1:9092'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

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
      KAFKA_PROCESS_ROLES: 'broker'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@controller-1:9093,2@controller-2:9093,3@controller-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka-2:9092'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9093'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

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
      KAFKA_PROCESS_ROLES: 'broker'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@controller-1:9093,2@controller-2:9093,3@controller-3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka-3:9092'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9094'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
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
