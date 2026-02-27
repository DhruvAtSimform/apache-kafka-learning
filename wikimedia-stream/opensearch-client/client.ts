import { Client } from "@opensearch-project/opensearch";

export class OpenSearchClient {
  private client: Client;
  private index: string = "wikimedia";

  constructor(node: string = "https://localhost:9200") {
    const password = process.env.OPENSEARCH_PSWD || "P@ss*ad*4321";
    this.client = new Client({
      node: `https://admin:${password}@localhost:9200`,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Ensure the 'wikimedia' index exists, create if not.
   */
  async ensureIndex() {
    const exists = await this.client.indices.exists({ index: this.index });
    if (!exists.body) {
      await this.client.indices.create({ index: this.index });
      console.log(`Created index '${this.index}'`);
    }
    console.log(`Index '${this.index}' is ready`);
  }

  /**
   * Index a document into 'wikimedia'.
   * @param doc Document to index
   */
  async putDocument(id: string, doc: Record<string, any>) {
    return this.client.index({
      index: this.index,
      body: doc,
      refresh: "wait_for",
      id,
    });
  }

  /**
   * Search the 'wikimedia' index with a simple query.
   * @param query Query object (OpenSearch DSL)
   */
  async search(query: Record<string, any>) {
    return this.client.search({
      index: this.index,
      body: { query },
    });
  }
}
