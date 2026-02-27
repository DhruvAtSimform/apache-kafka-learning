import { Client } from "@opensearch-project/opensearch";

export class OpenSearchClient {
  private client: Client;
  private index: string;

  constructor(node: string, password: string, index: string) {
    this.index = index;
    this.client = new Client({
      node: `https://admin:${password}@${new URL(node).host}`,
      ssl: { rejectUnauthorized: false },
    });
  }

  /**
   * Ensure the index exists, create it if not.
   */
  async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.index });
    if (!exists.body) {
      await this.client.indices.create({ index: this.index });
      console.log(`[opensearch] Created index '${this.index}'`);
    }
    console.log(`[opensearch] Index '${this.index}' is ready`);
  }

  /**
   * Bulk-index an array of documents.
   * Uses the OpenSearch _bulk API for high-throughput ingestion.
   *
   * @returns The number of successfully indexed documents and any errors.
   */
  async bulkIndex(
    docs: Array<{ id: string; body: Record<string, unknown> }>,
  ): Promise<{ indexed: number; errors: number }> {
    if (docs.length === 0) return { indexed: 0, errors: 0 };

    // Build NDJSON body: action + doc pairs
    const bulkBody: Array<Record<string, unknown>> = [];
    for (const doc of docs) {
      bulkBody.push({ index: { _index: this.index, _id: doc.id } });
      bulkBody.push(doc.body);
    }

    const response = await this.client.bulk({
      body: bulkBody,
      // Don't wait for refresh — let OpenSearch handle it asynchronously
      // This is a massive perf win over `refresh: "wait_for"` per document
      // refresh: 'wait_for',
    });

    let errors = 0;
    if (response.body.errors) {
      for (const item of response.body.items) {
        const action = item.index ?? item.create;
        if (action?.error) {
          errors++;
          // Log only the first few errors to avoid flooding
          if (errors <= 3) {
            console.error(
              `[opensearch] Bulk index error: ${JSON.stringify(action.error)}`,
            );
          }
        }
      }
    }

    return {
      indexed: docs.length - errors,
      errors,
    };
  }

  /**
   * Index a single document (fallback, prefer bulkIndex).
   */
  async putDocument(
    id: string,
    doc: Record<string, unknown>,
  ): Promise<unknown> {
    return this.client.index({
      index: this.index,
      body: doc,
      id,
    });
  }
}
