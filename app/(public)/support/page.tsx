"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useUIStore } from "@/lib/stores/ui-store";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: "authenticity",
    question: "How is the authenticity of the artwork verified?",
    answer: "Every artwork on KalaSetu goes through a rigorous authentication process. Our panel of heritage experts, art historians, and master artisans verify the materials, techniques, and provenance of each piece. Successful verification results in a Certificate of Authenticity signed by our experts.",
  },
  {
    category: "shipping",
    question: "How is the artwork shipped securely?",
    answer: "We use specialized art logistics partners who understand how to handle fragile heritage items. Artworks are custom crated, climate-monitored, and fully insured from the artisan's workshop to your doorstep. You will receive real-time tracking updates throughout transit.",
  },
  {
    category: "auctions",
    question: "How do live auctions work?",
    answer: "Live auctions run for a specified period (typically 3 to 7 days). Bidders must register and have a verified payment profile. If a bid is placed in the final 5 minutes, the auction is automatically extended by 5 minutes to prevent sniping. The highest bidder at the closing time wins the piece.",
  },
  {
    category: "refunds",
    question: "What is your return and refund policy?",
    answer: "We offer a 7-day buyer protection period. If the received artwork does not match the described specifications or arrives damaged, you can request a return. Once our verification team inspects the returned item, a full refund will be processed to your original payment method.",
  },
  {
    category: "artisan",
    question: "How can I register as a verified artisan?",
    answer: "Artisans can apply for verification via the Artist Dashboard. You will need to submit portfolio evidence of your art practice, years of experience, and identification proof. Our onboarding team reviews applications within 5-7 business days.",
  },
];

export default function SupportPage() {
  const { addToast } = useUIStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Contact Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFaqs = FAQS.filter(
    (faq) => activeCategory === "all" || faq.category === activeCategory
  );

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    addToast({
      type: "success",
      title: "Message Sent",
      message: "We have received your request and will get back to you within 24 hours.",
    });

    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setIsSubmitting(false);
  }

  return (
    <>
      <div className="bg-surface-container-low border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-8 text-primary" style={{ marginBottom: 12 }}>
              <Icon name="help_center" size={28} />
              <span className="text-label-md uppercase tracking-wider">Help & Support</span>
            </div>
            <h1 className="text-display-lg text-primary">How can we help you?</h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl" style={{ marginTop: 12, maxWidth: 600 }}>
              Find answers to frequently asked questions about authenticity, shipping, and auctions, or get in touch with our support team.
            </p>
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 64 }}>
          {/* FAQ Accordion */}
          <div className="flex flex-col gap-32">
            <h2 className="text-headline-md text-primary">Frequently Asked Questions</h2>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-12" style={{ marginBottom: 16 }}>
              {[
                { id: "all", label: "All Topics" },
                { id: "authenticity", label: "Authenticity" },
                { id: "shipping", label: "Shipping" },
                { id: "auctions", label: "Auctions" },
                { id: "refunds", label: "Returns" },
                { id: "artisan", label: "Artisans" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setOpenFaqIndex(null);
                  }}
                  className={`btn btn-sm ${activeCategory === cat.id ? "btn-primary" : "btn-outline"}`}
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-16">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="bg-surface-container-lowest"
                    style={{
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid rgba(196, 199, 199, 0.2)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      style={{
                        width: "100%",
                        padding: "24px 32px",
                        display: "flex",
                        justifyContent: "between",
                        alignItems: "center",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span className="text-title-md text-primary" style={{ flexGrow: 1, fontWeight: 600 }}>
                        {faq.question}
                      </span>
                      <Icon
                        name={isOpen ? "expand_less" : "expand_more"}
                        className="text-on-surface-variant"
                      />
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: "0 32px 24px",
                          borderTop: "none",
                        }}
                      >
                        <p className="text-body-md text-on-surface-variant" style={{ lineHeight: 1.6 }}>
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Support Form */}
          <div className="flex flex-col gap-32">
            <div
              className="bg-surface-container-lowest"
              style={{
                padding: 32,
                borderRadius: "var(--radius-lg)",
                border: "1px solid rgba(196, 199, 199, 0.2)",
              }}
            >
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 8 }}>
                Contact Support
              </h3>
              <p className="text-body-md text-on-surface-variant" style={{ marginBottom: 24 }}>
                Can't find the answer you are looking for? Send us a message directly.
              </p>

              <form onSubmit={handleContactSubmit} className="flex flex-col gap-20">
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Arjun Dev"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="How can we help?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or question in detail..."
                    rows={5}
                    required
                  />
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  fullWidth
                  style={{ marginTop: 8 }}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
