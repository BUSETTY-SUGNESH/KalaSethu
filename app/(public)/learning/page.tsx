'use client';

import Link from "next/link";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { ARTWORK_PLACEHOLDER } from "@/lib/constants/placeholders";

export default function LearningPage() {
  return (
    <>
      <div className="bg-surface-container-low border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-8 text-primary" style={{ marginBottom: 12 }}>
                <Icon name="school" size={28} />
                <span className="text-label-md uppercase tracking-wider">Kala Academy</span>
              </div>
              <h1 className="text-display-lg text-primary">Masterclasses & Tutorials</h1>
              <p className="text-body-lg text-on-surface-variant max-w-2xl" style={{ marginTop: 12, maxWidth: 600 }}>
                Learn traditional Indian art forms from verified master artisans. Preserve heritage through education.
              </p>
            </div>
            <div>
              <Button variant="primary" size="lg">
                Browse All Courses
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <h2 className="text-headline-md text-primary mb-32">Featured Workshops</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 32 }}>
          {[
            {
              title: "Introduction to Madhubani Painting",
              instructor: "Sita Devi",
              duration: "4 Weeks",
              level: "Beginner",
              price: "₹2,500",
              img: ARTWORK_PLACEHOLDER
            },
            {
              title: "Advanced Bronze Casting Techniques",
              instructor: "Rajan Sthapati",
              duration: "6 Weeks",
              level: "Advanced",
              price: "₹8,000",
              img: ARTWORK_PLACEHOLDER
            },
            {
              title: "Natural Dyeing for Textiles",
              instructor: "Kiran Weaver",
              duration: "2 Weeks",
              level: "Intermediate",
              price: "₹3,200",
              img: ARTWORK_PLACEHOLDER
            }
          ].map((course, i) => (
            <div key={i} className="card p-0 overflow-hidden">
              <div style={{ height: 200, width: "100%", position: "relative" }}>
                <Image
                  src={course.img}
                  alt={course.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="p-24" style={{ padding: 24 }}>
                <div className="flex justify-between items-start mb-8">
                  <span className="text-caption uppercase bg-surface-container-high text-on-surface px-2 py-1 rounded" style={{ padding: "4px 8px", borderRadius: 4 }}>
                    {course.level}
                  </span>
                  <span className="text-label-md text-primary">{course.price}</span>
                </div>
                <h3 className="text-headline-sm text-primary mb-8" style={{ marginBottom: 8, height: 56 }}>
                  {course.title}
                </h3>
                <p className="text-body-md text-on-surface-variant mb-16">
                  Instructed by <span className="font-bold text-primary">{course.instructor}</span>
                </p>
                <div className="flex justify-between items-center mt-16 pt-16 border-t border-outline-variant" style={{ borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
                  <span className="text-caption text-on-surface-variant flex items-center gap-4">
                    <Icon name="schedule" size={14} /> {course.duration}
                  </span>
                  <Link href="#" className="text-label-sm text-primary hover:text-accent-emerald uppercase">
                    Enroll Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="bg-surface-container-lowest section-gap" style={{ padding: "64px var(--margin-desktop)", marginTop: 64 }}>
        <div className="container text-center max-w-3xl mx-auto" style={{ maxWidth: 800, margin: "0 auto" }}>
          <Icon name="video_camera_front" size={48} className="text-accent-terracotta mb-24 mx-auto block" />
          <h2 className="text-display-sm text-primary mb-16">Are you a Master Artisan?</h2>
          <p className="text-body-lg text-on-surface-variant mb-32">
            Share your knowledge with the next generation. Verified artists can create and monetize masterclasses on Kala Academy.
          </p>
          <Link href="/dashboard/artist/verify">
            <Button variant="outline" size="lg">Apply to Teach</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
