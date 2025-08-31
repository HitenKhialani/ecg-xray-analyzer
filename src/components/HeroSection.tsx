import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import heroImage from '@/assets/medical-hero.jpg';

const HeroSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-background to-primary-soft">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="bg-accent-soft text-accent border-accent/20">
                AI-Powered Medical Analysis
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Intelligent ECG & X-Ray{' '}
                <span className="text-primary">Diagnostic Platform</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Advanced AI technology for accurate medical report analysis. Upload your ECG and X-Ray reports 
                for instant, professional diagnostic insights with comparison capabilities.
              </p>
            </div>

            {/* Actions and badges removed per request */}
          </div>

          {/* Image */}
          <div className="relative">
            <Card className="overflow-hidden shadow-xl">
              <img 
                src={heroImage} 
                alt="Medical diagnostic technology showing ECG monitors and X-ray analysis"
                className="w-full h-auto object-cover"
              />
            </Card>
            
            {/* Floating Stats */}
            <Card className="absolute -bottom-6 -left-6 p-4 shadow-lg bg-card border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">99.2%</div>
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
            </Card>
            
            <Card className="absolute -top-6 -right-6 p-4 shadow-lg bg-card border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">10K+</div>
                <div className="text-sm text-muted-foreground">Reports Analyzed</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;