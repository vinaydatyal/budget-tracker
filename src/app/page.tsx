import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { DataSecuritySection } from '@/components/landing/DataSecuritySection';
import { TestimonialSection } from '@/components/landing/TestimonialSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { BottomCTA } from '@/components/landing/BottomCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Home() {
  return (
    <div style={{ 
      background: 'var(--bg-main)', 
      color: 'var(--text-main)', 
      minHeight: '100vh',
      fontFamily: 'var(--font-outfit), sans-serif',
      overflowX: 'hidden'
    }}>
      <LandingNavbar />
      
      <main>
        <HeroSection />
        <HowItWorks />
        <FeatureShowcase />
        <DataSecuritySection />
        <TestimonialSection />
        <PricingSection />
        <BottomCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
