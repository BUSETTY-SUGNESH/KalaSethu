"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCheckoutItems = validateCheckoutItems;
exports.computeServerTotalPaise = computeServerTotalPaise;
const ff = __importStar(require("firebase-functions/v1"));
const config_1 = require("../config");
async function validateCheckoutItems(clientItems) {
    if (clientItems.length === 0) {
        throw new ff.https.HttpsError('invalid-argument', 'Order must contain at least one item');
    }
    const artworkIds = [...new Set(clientItems.map((item) => item.artworkId).filter(Boolean))];
    if (artworkIds.length !== clientItems.length) {
        throw new ff.https.HttpsError('invalid-argument', 'Each order item must have a unique artworkId');
    }
    const artworkRefs = artworkIds.map((id) => config_1.db.collection('artworks').doc(id));
    const artworkSnaps = await config_1.db.getAll(...artworkRefs);
    const validatedItems = [];
    for (let i = 0; i < artworkIds.length; i++) {
        const clientItem = clientItems.find((item) => item.artworkId === artworkIds[i]);
        const artworkSnap = artworkSnaps[i];
        if (!clientItem) {
            throw new ff.https.HttpsError('invalid-argument', 'Mismatched order items');
        }
        if (!artworkSnap.exists) {
            throw new ff.https.HttpsError('not-found', `Artwork ${artworkIds[i]} not found`);
        }
        const artwork = artworkSnap.data();
        const serverArtistId = artwork.artistId;
        const clientArtistId = clientItem.artistId;
        if (!serverArtistId) {
            throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} has no artist`);
        }
        if (clientArtistId && clientArtistId !== serverArtistId) {
            throw new ff.https.HttpsError('invalid-argument', `Artist mismatch for artwork ${artworkIds[i]}`);
        }
        if (artwork.status !== 'published') {
            throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} is not available for purchase`);
        }
        if (artwork.listingType !== 'fixed_price') {
            throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} is not listed for fixed-price sale`);
        }
        if (typeof artwork.price !== 'number' || artwork.price <= 0) {
            throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} has an invalid price`);
        }
        const quantity = clientItem.quantity || 1;
        if (quantity !== 1) {
            throw new ff.https.HttpsError('invalid-argument', 'Quantity must be 1 for artwork purchases');
        }
        validatedItems.push({
            artworkId: artworkIds[i],
            artworkTitle: artwork.title || clientItem.artworkTitle || 'Artwork',
            price: artwork.price,
            artistId: serverArtistId,
            artistName: artwork.artistName || clientItem.artistName || 'Unknown Artist',
            artworkImageUrl: artwork.thumbnailUrl || clientItem.artworkImageUrl || '',
            quantity,
        });
    }
    return validatedItems;
}
function computeServerTotalPaise(items) {
    const serverTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.round(serverTotal * 100);
}
//# sourceMappingURL=checkout-validation.js.map