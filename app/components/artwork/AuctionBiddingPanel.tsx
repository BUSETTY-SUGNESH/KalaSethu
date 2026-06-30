'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';
import {
  subscribeToAuction,
  subscribeToAuctionBids,
  placeBid,
  validateBid,
  isAuctionAcceptingBids,
} from '@/lib/services/auction-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import type { Auction, Bid } from '@/app/types';
import { formatDistanceToNow, format } from 'date-fns';

interface AuctionBiddingPanelProps {
  initialAuction: Auction;
  initialBids: Bid[];
}

export default function AuctionBiddingPanel({
  initialAuction,
  initialBids,
}: AuctionBiddingPanelProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [bids, setBids] = useState<Bid[]>(initialBids);

  const initialBidAmount = (initialAuction.currentBid + initialAuction.minIncrement).toString();
  const [bidAmount, setBidAmount] = useState<string>(initialBidAmount);
  const isBidInputFocused = useRef<boolean>(false);
  const [staleMinBid, setStaleMinBid] = useState<number | null>(null);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [userHasBid, setUserHasBid] = useState(() =>
    initialBids.some((b) => b.bidderId === user?.id)
  );

  useEffect(() => {
    if (!user?.id) return;
    if (bids.some((b) => b.bidderId === user.id)) {
      setUserHasBid(true);
    }
  }, [bids, user?.id]);

  useEffect(() => {
    const auctionId = initialAuction.id;

    const unsubAuction = subscribeToAuction(auctionId, (updatedAuction) => {
      if (!updatedAuction) return;
      setAuction(updatedAuction);

      const nextMinBid = updatedAuction.currentBid + updatedAuction.minIncrement;
      if (isBidInputFocused.current) {
        setStaleMinBid(nextMinBid);
      } else {
        setBidAmount((prev) => {
          if (!prev || Number(prev) < nextMinBid) return nextMinBid.toString();
          return prev;
        });
        setStaleMinBid(null);
      }
    });

    const unsubBids = subscribeToAuctionBids(auctionId, (newBids) => {
      setBids(newBids);
    });

    return () => {
      unsubAuction();
      unsubBids();
    };
  }, [initialAuction.id]);

  const handleInputFocus = useCallback(() => {
    isBidInputFocused.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    isBidInputFocused.current = false;
    if (auction) {
      const nextMinBid = auction.currentBid + auction.minIncrement;
      setBidAmount((prev) => {
        if (!prev || Number(prev) < nextMinBid) return nextMinBid.toString();
        return prev;
      });
    }
    setStaleMinBid(null);
  }, [auction]);

  const handleUpdateToCurrent = useCallback(() => {
    if (!auction) return;
    const nextMinBid = auction.currentBid + auction.minIncrement;
    setBidAmount(nextMinBid.toString());
    setStaleMinBid(null);
    document.getElementById('bid-amount-input')?.focus();
  }, [auction]);

  const handleDismissBanner = useCallback(() => {
    setStaleMinBid(null);
  }, []);

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'Please log in to place a bid.',
      });
      router.push('/login');
      return;
    }

    const amount = Number(bidAmount);
    if (isNaN(amount) || !bidAmount.trim()) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid number.' });
      return;
    }

    const validationError = validateBid(auction, amount, user.id);
    if (validationError) {
      addToast({ type: 'error', title: 'Action Not Allowed', message: validationError });
      return;
    }

    const liveMinimum = auction.currentBid + auction.minIncrement;
    if (amount < liveMinimum) {
      addToast({
        type: 'error',
        title: 'Bid Too Low',
        message: `The current minimum bid is ₹${liveMinimum.toLocaleString('en-IN')}. Please update your amount.`,
      });
      setBidAmount(liveMinimum.toString());
      setStaleMinBid(null);
      return;
    }

    setIsPlacingBid(true);
    try {
      await placeBid({
        auctionId: auction.id,
        bidderId: user.id,
        bidderName: user.displayName,
        amount,
      });
      addToast({
        type: 'success',
        title: 'Bid Placed!',
        message: `Your bid of ₹${amount.toLocaleString('en-IN')} was successful.`,
      });
      setStaleMinBid(null);
      setUserHasBid(true);
    } catch (error: unknown) {
      console.error('Bid error:', error);
      const err = error as { message?: string; code?: string };
      let errorMessage = err.message || 'Could not place bid. Please try again.';
      let title = 'Bid Failed';
      if (err.code === 'functions/unauthenticated') {
        title = 'Authentication Error';
      } else if (err.code === 'functions/failed-precondition') {
        title = 'Action Not Allowed';
      }
      addToast({ type: 'error', title, message: errorMessage });
    } finally {
      setIsPlacingBid(false);
    }
  }

  const isEnded =
    auction.status === 'ended' || new Date(auction.endsAt).getTime() < Date.now();
  const isNotStarted =
    auction.status === 'scheduled' && new Date(auction.startsAt).getTime() > Date.now();
  const isAcceptingBids = isAuctionAcceptingBids(auction);
  const liveMinimum = auction.currentBid + auction.minIncrement;
  const isFinalizing =
    isEnded && !auction.winnerId && auction.status !== 'ended' && auction.totalBids > 0;
  const reserveMet = !auction.reservePrice || auction.currentBid >= auction.reservePrice;

  const isCustomer =
    !!user && user.role !== 'artist' && user.role !== 'verified_artist';
  const topBid = bids[0] ?? null;
  const leadingBidderId = auction.lastBidderId ?? topBid?.bidderId;
  const isUserLeading =
    isCustomer && !isEnded && !!leadingBidderId && leadingBidderId === user?.id;
  const isUserOutbid =
    isCustomer && !isEnded && !!leadingBidderId && leadingBidderId !== user?.id && userHasBid;
  const isProvisionalWinner =
    isCustomer && isFinalizing && reserveMet && auction.lastBidderId === user?.id;
  const isUserWinner =
    isCustomer &&
    isEnded &&
    ((!!auction.winnerId && auction.winnerId === user?.id) || isProvisionalWinner);

  return (
    <div className="flex flex-col gap-32">
      <div
        className="bg-surface-container-lowest"
        style={{
          padding: 32,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(196, 199, 199, 0.2)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div>
            <span className="text-caption text-on-surface-variant block uppercase mb-4">
              Current Bid
            </span>
            <span className="text-display-sm text-primary">
              ₹{auction.currentBid.toLocaleString('en-IN')}
            </span>
            {auction.totalBids > 0 && (
              <span className="text-label-sm text-on-surface-variant block mt-4">
                {auction.totalBids} Bids
              </span>
            )}

            {(isUserLeading || isUserOutbid || isUserWinner) && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  padding: '4px 10px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  ...(isUserLeading
                    ? {
                        backgroundColor: 'rgba(52, 199, 89, 0.12)',
                        color: 'var(--color-accent-emerald)',
                        border: '1px solid rgba(52, 199, 89, 0.25)',
                      }
                    : isUserWinner
                      ? {
                          backgroundColor: 'rgba(52, 199, 89, 0.15)',
                          color: 'var(--color-accent-emerald)',
                          border: '1px solid rgba(52, 199, 89, 0.3)',
                        }
                      : {
                          backgroundColor: 'rgba(212, 160, 23, 0.10)',
                          color: 'var(--color-accent-gold)',
                          border: '1px solid rgba(212, 160, 23, 0.25)',
                        }),
                }}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: 13, fontVariationSettings: "'wght' 600" }}
                >
                  {isUserLeading || isUserWinner ? 'emoji_events' : 'trending_down'}
                </span>
                {isUserLeading && 'You are the highest bidder'}
                {isUserWinner && 'You won this auction'}
                {isUserOutbid && 'You have been outbid'}
              </div>
            )}
          </div>

          <div>
            <span className="text-caption text-on-surface-variant block uppercase mb-4">
              {isEnded ? 'Ended On' : 'Time Remaining'}
            </span>
            <span
              className={`text-display-sm ${isEnded ? 'text-on-surface-variant' : 'text-status-urgency'}`}
            >
              {isEnded
                ? format(new Date(auction.endsAt), 'MMM d, yyyy')
                : formatDistanceToNow(new Date(auction.endsAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {isAcceptingBids ? (
          <form onSubmit={handlePlaceBid} className="flex flex-col gap-16">
            {staleMinBid !== null && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(212, 160, 23, 0.08)',
                  border: '1px solid rgba(212, 160, 23, 0.25)',
                }}
              >
                <div className="flex items-center gap-8">
                  <span style={{ color: 'var(--color-accent-gold)', flexShrink: 0, display: 'flex' }}>
                    <Icon name="trending_up" size={16} />
                  </span>
                  <span className="text-label-sm" style={{ color: 'var(--color-on-surface)' }}>
                    The bid has increased. New minimum:{' '}
                    <strong>₹{staleMinBid.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-8" style={{ flexShrink: 0 }}>
                  <button type="button" onClick={handleUpdateToCurrent} className="text-label-sm text-primary">
                    Update Bid
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss bid update notice"
                    onClick={handleDismissBanner}
                    style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1, display: 'flex' }}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-on-surface-variant)',
                    fontWeight: 600,
                  }}
                >
                  ₹
                </span>
                <input
                  id="bid-amount-input"
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: 32, fontSize: 18, fontWeight: 600 }}
                  min={liveMinimum}
                  step={auction.minIncrement}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  required
                  disabled={isPlacingBid}
                  aria-label="Your bid amount in rupees"
                  aria-describedby="bid-minimum-hint"
                />
              </div>
              <span id="bid-minimum-hint" className="text-caption text-on-surface-variant mt-4 block">
                Enter ₹{liveMinimum.toLocaleString('en-IN')} or more
              </span>
            </div>
            <Button variant="primary" size="lg" fullWidth type="submit" disabled={isPlacingBid}>
              {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
            </Button>
          </form>
        ) : isNotStarted ? (
          <p className="text-body-md text-on-surface-variant text-center">
            Bidding opens {formatDistanceToNow(new Date(auction.startsAt), { addSuffix: true })}.
          </p>
        ) : null}

        {isFinalizing && (
          <p className="text-body-sm text-on-surface-variant text-center" style={{ marginTop: 16 }}>
            Finalizing results…
          </p>
        )}

        {isEnded && auction.winnerId && (
          <div
            className="bg-surface-container-low p-4 rounded text-center"
            style={{ padding: 16, borderRadius: 8, marginTop: 16 }}
          >
            <span className="text-label-md text-primary font-bold">Auction Won</span>
            <p className="text-body-sm text-on-surface-variant mt-2">
              This item has been sold to the highest bidder.
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>
          Bid History
        </h3>
        {bids.length > 0 ? (
          <div
            className="bg-surface-container-lowest"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(196, 199, 199, 0.2)',
              overflow: 'hidden',
            }}
          >
            <ul className="flex flex-col">
              {bids.map((bid, i) => (
                <li
                  key={bid.id}
                  className="flex justify-between items-center"
                  style={{
                    padding: '16px 24px',
                    borderBottom:
                      i < bids.length - 1 ? '1px solid rgba(196, 199, 199, 0.1)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-12">
                    <div
                      className="avatar avatar-sm"
                      style={{ backgroundColor: 'var(--color-surface-container-high)' }}
                    >
                      <span
                        className="text-caption font-bold"
                        style={{
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        {bid.bidderName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-label-md text-on-surface block">
                        {user?.id === bid.bidderId ? 'You' : `${bid.bidderName.substring(0, 2)}***`}
                      </span>
                      <span className="text-caption text-on-surface-variant">
                        {format(new Date(bid.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                  <span className="text-body-md text-primary font-bold">
                    ₹{bid.amount.toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-body-md text-on-surface-variant italic">
            No bids placed yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );
}
