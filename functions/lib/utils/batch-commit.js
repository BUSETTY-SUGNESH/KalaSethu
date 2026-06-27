"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkedBatchWriter = void 0;
const config_1 = require("../config");
const MAX_OPS_PER_BATCH = 450;
/** Tracks Firestore batch writes and auto-commits before the 500-op limit. */
class ChunkedBatchWriter {
    batch;
    opCount = 0;
    constructor() {
        this.batch = config_1.db.batch();
    }
    write(op) {
        op(this.batch);
        this.opCount++;
    }
    async flushIfNeeded() {
        if (this.opCount >= MAX_OPS_PER_BATCH) {
            await this.commit();
        }
    }
    async commit() {
        if (this.opCount === 0)
            return;
        await this.batch.commit();
        this.batch = config_1.db.batch();
        this.opCount = 0;
    }
}
exports.ChunkedBatchWriter = ChunkedBatchWriter;
//# sourceMappingURL=batch-commit.js.map