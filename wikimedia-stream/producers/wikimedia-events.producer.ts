import { KafkaJS } from "@confluentinc/kafka-javascript";

const DEFAULT_BROKERS = ["127.0.0.1:9092", "127.0.0.1:9093"];
const CONFIGURED_BROKERS = (process.env.KAFKA_BROKERS ?? "")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const BROKERS = CONFIGURED_BROKERS.length
  ? CONFIGURED_BROKERS
  : DEFAULT_BROKERS;

const { Kafka } = KafkaJS;
const kafka = new Kafka({
  kafkaJS: {
    clientId: "wikimedia-poc-producer",
    brokers: BROKERS,
  },
});
// kafka client >= 3.0 already have many of these options enabled by default, but we can explicitly set them here for 
// clarity and to ensure optimal producer configuration for our use case
const producer = kafka.producer({
  "enable.idempotence": true,
  acks: -1,
  //   "min.insync.replicas": 2, This config is not allowed at producer level, it must be set on the topic or broker level
  // kafka-configs.sh --bootstrap-server localhost:9092 --alter --entity-type topics --entity-name my_topic_name --add-config min.insync.replicas=2
  "delivery.timeout.ms": 120000, // 2 minutes
  "request.timeout.ms": 30000, // 30 seconds
  retries: 2147483647, // effectively unlimited retries
  "max.in.flight.requests.per.connection": 5, // higher than 1 to allow for better throughput, but still safe with idempotence enabled

  // compression and batching settings for high throughput and reduced bandwidth usage
  // kindly enable it in the production, I measure huge improvement in datastorage vs raw json events
  // 11 K wikimedia events took 13 MB data, where most (70%+) are compresses taking 6 MB data only
  // Also make sure that compression happens at the producer level, and not at broker level. We can enforce at broker level but 
  //  that could drastically  
  "compression.type": "snappy", // compress messages to reduce bandwidth and improve throughput
  "linger.ms": 50,
  "batch.size": 32 * 1024, // 32 KB batch size
});

let isConnected = false;

export async function sendJsonEvent(
  topic: string,
  key: string,
  value: object,
): Promise<void> {
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(value),
        headers: {
          contentType: "text/json",
          producer: "wikimedia-poc-producer",
          timestamp: new Date().toISOString(),
        },
      },
    ],

  });
}

export async function connectProducer(): Promise<void> {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
  }
}

export async function disconnectProducer(): Promise<void> {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
  }
}
