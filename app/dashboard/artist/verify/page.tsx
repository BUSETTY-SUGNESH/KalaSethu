'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

export default function ArtistVerificationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    experience: "",
    specialization: "",
    portfolioLink: "",
    bio: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    // Simulate API call to submit verification request
    setTimeout(() => {
      setIsSubmitting(false);
      addToast({ 
        type: 'success', 
        title: 'Application Submitted', 
        message: 'Your verification request has been sent to our expert panel for review.' 
      });
      router.push('/dashboard/artist');
    }, 1500);
  }

  if (user?.role === 'verified_artist') {
    return (
      <div className="container section-gap flex flex-col items-center py-64">
        <Icon name="verified" size={64} className="text-accent-emerald mb-24" />
        <h1 className="text-display-sm text-primary">You are already verified</h1>
        <p className="text-body-lg text-on-surface-variant mb-32 text-center max-w-2xl">
          You have full access to KalaSetu's premium features, including direct sales, creating auctions, and hosting masterclasses.
        </p>
        <Button variant="primary" onClick={() => router.push('/dashboard/artist')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container section-gap" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="text-center mb-48">
        <Icon name="workspace_premium" size={48} className="text-primary mb-16 mx-auto block" />
        <h1 className="text-display-sm text-primary mb-16">Apply for Verification</h1>
        <p className="text-body-lg text-on-surface-variant">
          Verified artisans get a badge of authenticity, can host auctions, sell internationally, and create masterclasses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-32 rounded-lg border border-outline-variant" style={{ padding: 40, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="flex flex-col gap-24">
          <div className="form-group">
            <label className="form-label">Years of Experience</label>
            <select 
              className="form-select"
              value={formData.experience}
              onChange={e => setFormData({...formData, experience: e.target.value})}
              required
            >
              <option value="" disabled>Select experience level</option>
              <option value="1-5">1-5 Years</option>
              <option value="5-10">5-10 Years</option>
              <option value="10-20">10-20 Years</option>
              <option value="20+">20+ Years</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Primary Specialization</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Madhubani Painting, Bronze Sculpture"
              value={formData.specialization}
              onChange={e => setFormData({...formData, specialization: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Portfolio / Existing Online Presence</label>
            <input 
              type="url" 
              className="form-input" 
              placeholder="https://instagram.com/yourhandle or personal website"
              value={formData.portfolioLink}
              onChange={e => setFormData({...formData, portfolioLink: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Artisan Bio & Heritage</label>
            <textarea 
              className="form-textarea" 
              placeholder="Tell us about your background, training (Guru-Shishya parampara), and what makes your art authentic..."
              style={{ minHeight: 150 }}
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              required
            />
          </div>

          <div className="bg-surface-container-low p-16 rounded" style={{ padding: 16, borderRadius: 8, marginTop: 16 }}>
            <h4 className="text-label-md text-primary flex items-center gap-8 mb-8">
              <Icon name="info" size={16} /> Verification Process
            </h4>
            <p className="text-body-sm text-on-surface-variant">
              Our expert panel reviews all applications within 5-7 business days. We may contact you for additional documentation or a brief video interview to confirm provenance and skill.
            </p>
          </div>

          <Button variant="primary" size="lg" type="submit" disabled={isSubmitting} style={{ marginTop: 16 }}>
            {isSubmitting ? "Submitting Application..." : "Submit for Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
