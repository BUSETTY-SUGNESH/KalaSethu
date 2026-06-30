import Icon from '@/app/components/ui/Icon';

export default function ArtworkTrustBadges() {
  return (
    <div className="trust-grid" style={{ marginTop: 16 }}>
      <div className="trust-item">
        <div className="trust-icon-wrap">
          <Icon name="verified_user" size={32} />
        </div>
        <div>
          <h4 className="text-label-md text-primary">Authenticity Guaranteed</h4>
          <p className="text-caption text-on-surface-variant">
            Verified provenance by KalaSetu experts
          </p>
        </div>
      </div>
      <div className="trust-item">
        <div className="trust-icon-wrap">
          <Icon name="local_shipping" size={32} />
        </div>
        <div>
          <h4 className="text-label-md text-primary">Secure Shipping</h4>
          <p className="text-caption text-on-surface-variant">
            Fully insured specialized art transport
          </p>
        </div>
      </div>
    </div>
  );
}
