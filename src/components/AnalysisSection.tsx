import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Heart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  FileText,
  BarChart3
} from 'lucide-react';

const AnalysisSection = () => {
  // Mock analysis data
  const analysisResults = {
    ecg: {
      overallScore: 85,
      status: 'normal',
      findings: [
        { type: 'Heart Rate', value: '72 BPM', status: 'normal', description: 'Within normal range (60-100 BPM)' },
        { type: 'Rhythm', value: 'Sinus Rhythm', status: 'normal', description: 'Regular sinus rhythm detected' },
        { type: 'PR Interval', value: '160 ms', status: 'normal', description: 'Normal conduction (120-200 ms)' },
        { type: 'QT Interval', value: '420 ms', status: 'caution', description: 'Slightly prolonged, monitor closely' }
      ]
    },
    xray: {
      overallScore: 92,
      status: 'normal',
      findings: [
        { type: 'Lung Fields', value: 'Clear', status: 'normal', description: 'No signs of consolidation or effusion' },
        { type: 'Heart Size', value: 'Normal', status: 'normal', description: 'Cardiothoracic ratio within limits' },
        { type: 'Bone Structure', value: 'Intact', status: 'normal', description: 'No fractures or abnormalities detected' }
      ]
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-success';
      case 'caution': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal': return <Badge className="bg-success/10 text-success">Normal</Badge>;
      case 'caution': return <Badge className="bg-warning/10 text-warning">Caution</Badge>;
      case 'critical': return <Badge className="bg-destructive/10 text-destructive">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <section id="analysis" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">AI Analysis Results</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive analysis of your medical reports with detailed findings and recommendations
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="ecg" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="ecg" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                ECG Analysis
              </TabsTrigger>
              <TabsTrigger value="xray" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                X-Ray Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ecg" className="space-y-6">
              {/* ECG Overview */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Heart className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {analysisResults.ecg.overallScore}%
                  </h3>
                  <p className="text-muted-foreground">Overall Health Score</p>
                  <Progress value={analysisResults.ecg.overallScore} className="mt-3" />
                </Card>

                <Card className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Normal Rhythm</h3>
                  <p className="text-muted-foreground">No irregular patterns detected</p>
                </Card>

                <Card className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="h-8 w-8 text-warning" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">1 Advisory</h3>
                  <p className="text-muted-foreground">Minor observation noted</p>
                </Card>
              </div>

              {/* Detailed Findings */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">Detailed ECG Findings</h3>
                <div className="space-y-4">
                  {analysisResults.ecg.findings.map((finding, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-foreground">{finding.type}</h4>
                          {getStatusBadge(finding.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getStatusColor(finding.status)}`}>
                          {finding.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="xray" className="space-y-6">
              {/* X-Ray Overview */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                      <Activity className="h-8 w-8 text-accent" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {analysisResults.xray.overallScore}%
                  </h3>
                  <p className="text-muted-foreground">Overall Health Score</p>
                  <Progress value={analysisResults.xray.overallScore} className="mt-3" />
                </Card>

                <Card className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Clear Lungs</h3>
                  <p className="text-muted-foreground">No abnormalities detected</p>
                </Card>

                <Card className="p-6 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Excellent</h3>
                  <p className="text-muted-foreground">Above average health</p>
                </Card>
              </div>

              {/* Detailed Findings */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">Detailed X-Ray Findings</h3>
                <div className="space-y-4">
                  {analysisResults.xray.findings.map((finding, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-foreground">{finding.type}</h4>
                          {getStatusBadge(finding.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getStatusColor(finding.status)}`}>
                          {finding.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button size="lg" className="bg-primary hover:bg-primary-hover">
              <FileText className="mr-2 h-5 w-5" />
              Generate Full Report
            </Button>
            <Button size="lg" variant="outline">
              <Download className="mr-2 h-5 w-5" />
              Export PDF
            </Button>
            <Button size="lg" variant="outline">
              <BarChart3 className="mr-2 h-5 w-5" />
              Compare Reports
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalysisSection;