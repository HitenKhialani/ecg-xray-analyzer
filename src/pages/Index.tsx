import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import UploadSection from '@/components/UploadSection';
import ComparisonSection from '@/components/ComparisonSection';
import ProfileSection from '@/components/ProfileSection';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <UploadSection />
        <ComparisonSection />
        <ProfileSection />
      </main>
      
      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 MediScan AI. HIPAA Compliant Medical Analysis Platform.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
