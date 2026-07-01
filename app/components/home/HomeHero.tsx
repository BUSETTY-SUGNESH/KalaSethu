"use client";

import Link from "next/link";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import { HOME_HERO } from "@/lib/constants/home-hero";

export default function HomeHero() {
  return (
    <section className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div className="hero-section">
        <div className="hero-text">
          <div className="flex flex-col gap-16">
            <span className="text-label-md hero-badge">
              <span className="hero-badge-line" />
              {HOME_HERO.badge}
            </span>
            <h1 className="text-display-lg text-primary">{HOME_HERO.title}</h1>
            <p className="text-body-lg text-on-surface-variant hero-description">
              {HOME_HERO.description}
            </p>
          </div>
          <div className="hero-cta-block">
            <Link href={HOME_HERO.ctaHref} className="btn btn-primary btn-lg">
              {HOME_HERO.ctaLabel}
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
            <ul className="hero-trust-bar" aria-label="Platform trust signals">
              {HOME_HERO.trustItems.map((item) => (
                <li key={item.label} className="hero-trust-item">
                  <Icon name={item.icon} size={18} className="hero-trust-icon" />
                  <span className="text-label-sm text-on-surface-variant">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="hero-image-wrap hero-image-wrap--cinematic">
          <div className="hero-image-glow" aria-hidden="true" />
          <div className="hero-image-vignette" aria-hidden="true" />
          <div className="hero-image-overlay" />
          <Image
            src={HOME_HERO.imageSrc}
            alt={HOME_HERO.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
    </section>
  );
}
