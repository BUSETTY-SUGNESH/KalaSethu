import * as admin from 'firebase-admin';
import { db } from '../config';

const MAX_OPS_PER_BATCH = 450;

/** Tracks Firestore batch writes and auto-commits before the 500-op limit. */
export class ChunkedBatchWriter {
  private batch: admin.firestore.WriteBatch;
  private opCount = 0;

  constructor() {
    this.batch = db.batch();
  }

  write(op: (batch: admin.firestore.WriteBatch) => void): void {
    op(this.batch);
    this.opCount++;
  }

  async flushIfNeeded(): Promise<void> {
    if (this.opCount >= MAX_OPS_PER_BATCH) {
      await this.commit();
    }
  }

  async commit(): Promise<void> {
    if (this.opCount === 0) return;
    await this.batch.commit();
    this.batch = db.batch();
    this.opCount = 0;
  }
}
