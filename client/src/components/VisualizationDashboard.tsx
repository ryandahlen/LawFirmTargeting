import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { FirmData } from "@shared/schema";

interface VisualizationDashboardProps {
  results: FirmData[];
}

export default function VisualizationDashboard({ results }: VisualizationDashboardProps) {
  // Calculate firm size distribution
  const sizeDistribution = useMemo(() => {
    const distribution = {
      Solo: 0,
      Small: 0,
      Mid: 0,
      Large: 0,
    };
    
    results.forEach(firm => {
      if (firm.size === "Solo") distribution.Solo++;
      else if (firm.size === "Small") distribution.Small++;
      else if (firm.size === "Mid-size") distribution.Mid++;
      else if (firm.size === "Large") distribution.Large++;
    });
    
    const total = results.length;
    return {
      Solo: {
        count: distribution.Solo,
        percentage: total ? Math.round((distribution.Solo / total) * 100) : 0,
        height: total ? Math.round((distribution.Solo / total) * 200) : 0,
      },
      Small: {
        count: distribution.Small,
        percentage: total ? Math.round((distribution.Small / total) * 100) : 0,
        height: total ? Math.round((distribution.Small / total) * 200) : 0,
      },
      Mid: {
        count: distribution.Mid,
        percentage: total ? Math.round((distribution.Mid / total) * 100) : 0,
        height: total ? Math.round((distribution.Mid / total) * 200) : 0,
      },
      Large: {
        count: distribution.Large,
        percentage: total ? Math.round((distribution.Large / total) * 100) : 0,
        height: total ? Math.round((distribution.Large / total) * 200) : 0,
      },
    };
  }, [results]);
  
  // Calculate practice area prevalence
  const practiceAreaPrevalence = useMemo(() => {
    const prevalence: Record<string, number> = {};
    
    results.forEach(firm => {
      firm.practiceAreas.forEach(area => {
        if (!prevalence[area]) prevalence[area] = 0;
        prevalence[area]++;
      });
    });
    
    // Convert to array, sort by count, and take top 5
    const sortedAreas = Object.entries(prevalence)
      .map(([area, count]) => ({
        area,
        count,
        percentage: Math.round((count / results.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // Add "Others" category if needed
    const otherAreas = Object.entries(prevalence)
      .map(([area, count]) => ({
        area,
        count,
        percentage: Math.round((count / results.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(3);
    
    if (otherAreas.length > 0) {
      const otherCount = otherAreas.reduce((sum, item) => sum + item.count, 0);
      sortedAreas.push({
        area: "Others",
        count: otherCount,
        percentage: Math.round((otherCount / results.length) * 100)
      });
    }
    
    return sortedAreas;
  }, [results]);
  
  // Calculate average online presence scores
  const onlinePresenceScores = useMemo(() => {
    if (results.length === 0) {
      return {
        websiteQuality: 0,
        socialMedia: 0,
        reviews: 0,
        seoRanking: 0,
        overall: 0
      };
    }
    
    // In a real app, these would come from the analysis data
    // For now, we'll generate some reasonable scores
    return {
      websiteQuality: 78,
      socialMedia: 62,
      reviews: 85,
      seoRanking: 71,
      overall: 74
    };
  }, [results]);
  
  const pieChartSegments = useMemo(() => {
    if (practiceAreaPrevalence.length === 0) return [];
    
    // Calculate segments for pie chart
    let cumulativePercentage = 0;
    return practiceAreaPrevalence.map((item, index) => {
      const startAngle = cumulativePercentage;
      cumulativePercentage += item.percentage;
      const endAngle = cumulativePercentage;
      
      return {
        area: item.area,
        percentage: item.percentage,
        startAngle: (startAngle / 100) * 360,
        endAngle: (endAngle / 100) * 360,
        color: index === 0 ? "primary" : index === 1 ? "secondary" : "accent"
      };
    });
  }, [practiceAreaPrevalence]);

  const handleExportReport = () => {
    // Create a report in HTML format
    const reportContent = `
      <html>
        <head>
          <title>Law Firm Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #2c5282; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background-color: #f7fafc; }
          </style>
        </head>
        <body>
          <h1>Law Firm Analysis Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          
          <h2>Summary</h2>
          <p>Total firms analyzed: ${results.length}</p>
          
          <h2>Firm Size Distribution</h2>
          <table>
            <tr>
              <th>Size</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
            <tr>
              <td>Solo</td>
              <td>${sizeDistribution.Solo.count}</td>
              <td>${sizeDistribution.Solo.percentage}%</td>
            </tr>
            <tr>
              <td>Small</td>
              <td>${sizeDistribution.Small.count}</td>
              <td>${sizeDistribution.Small.percentage}%</td>
            </tr>
            <tr>
              <td>Mid-size</td>
              <td>${sizeDistribution.Mid.count}</td>
              <td>${sizeDistribution.Mid.percentage}%</td>
            </tr>
            <tr>
              <td>Large</td>
              <td>${sizeDistribution.Large.count}</td>
              <td>${sizeDistribution.Large.percentage}%</td>
            </tr>
          </table>
          
          <h2>Practice Area Prevalence</h2>
          <table>
            <tr>
              <th>Practice Area</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
            ${practiceAreaPrevalence.map(item => `
              <tr>
                <td>${item.area}</td>
                <td>${item.count}</td>
                <td>${item.percentage}%</td>
              </tr>
            `).join('')}
          </table>
          
          <h2>Analyzed Firms</h2>
          <table>
            <tr>
              <th>Firm Name</th>
              <th>Website</th>
              <th>Size</th>
              <th>Practice Areas</th>
              <th>Location</th>
            </tr>
            ${results.map(firm => `
              <tr>
                <td>${firm.name}</td>
                <td>${firm.website}</td>
                <td>${firm.size}</td>
                <td>${firm.practiceAreas.join(', ')}</td>
                <td>${firm.location}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;
    
    // Create a download link
    const blob = new Blob([reportContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "law_firm_analysis_report.html");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="mt-8">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>Analysis Dashboard</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="h-9">
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="h-9 bg-secondary hover:bg-secondary-dark"
                onClick={handleExportReport}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Firm Size Distribution */}
            <div className="border border-neutral-200 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Firm Size Distribution</h3>
              <div className="h-64 flex items-end justify-around">
                <div className="w-1/5 flex flex-col items-center">
                  <div 
                    className="bg-primary w-full" 
                    style={{ height: `${sizeDistribution.Solo.height}px` }}
                  ></div>
                  <p className="mt-2 text-sm">Solo</p>
                  <p className="text-xs text-neutral-500">{sizeDistribution.Solo.percentage}%</p>
                </div>
                <div className="w-1/5 flex flex-col items-center">
                  <div 
                    className="bg-primary w-full" 
                    style={{ height: `${sizeDistribution.Small.height}px` }}
                  ></div>
                  <p className="mt-2 text-sm">Small</p>
                  <p className="text-xs text-neutral-500">{sizeDistribution.Small.percentage}%</p>
                </div>
                <div className="w-1/5 flex flex-col items-center">
                  <div 
                    className="bg-primary w-full" 
                    style={{ height: `${sizeDistribution.Mid.height}px` }}
                  ></div>
                  <p className="mt-2 text-sm">Mid</p>
                  <p className="text-xs text-neutral-500">{sizeDistribution.Mid.percentage}%</p>
                </div>
                <div className="w-1/5 flex flex-col items-center">
                  <div 
                    className="bg-primary w-full" 
                    style={{ height: `${sizeDistribution.Large.height}px` }}
                  ></div>
                  <p className="mt-2 text-sm">Large</p>
                  <p className="text-xs text-neutral-500">{sizeDistribution.Large.percentage}%</p>
                </div>
              </div>
            </div>
            
            {/* Practice Area Prevalence */}
            <div className="border border-neutral-200 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Practice Area Prevalence</h3>
              <div className="h-64 flex items-center justify-center">
                {/* Simple pie chart visualization */}
                <div className="w-48 h-48 rounded-full border-8 border-primary relative flex items-center justify-center">
                  {pieChartSegments.map((segment, index) => (
                    <div 
                      key={index}
                      className={`absolute top-0 left-0 w-full h-full border-t-8 border-r-8 border-${segment.color} rounded-full`}
                      style={{ 
                        clipPath: `polygon(50% 50%, ${50 + 45 * Math.cos(segment.startAngle * Math.PI / 180)}% ${50 + 45 * Math.sin(segment.startAngle * Math.PI / 180)}%, ${50 + 45 * Math.cos(segment.endAngle * Math.PI / 180)}% ${50 + 45 * Math.sin(segment.endAngle * Math.PI / 180)}%)` 
                      }}
                    ></div>
                  ))}
                  <div className="text-xs text-neutral-700">Practice Areas</div>
                </div>
                <div className="ml-4 space-y-2">
                  {practiceAreaPrevalence.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`w-3 h-3 bg-${index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'} mr-2`}></div>
                      <span className="text-sm">{item.area} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Geographic Distribution */}
            <div className="border border-neutral-200 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Geographic Distribution</h3>
              <div className="h-64 flex items-center justify-center">
                {/* Boston cityscape as placeholder */}
                <img 
                  src="https://images.unsplash.com/photo-1573521193826-58c7dc2e13e3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400" 
                  alt="Geographic distribution map visualization" 
                  className="h-full object-cover rounded"
                />
              </div>
            </div>
            
            {/* Online Presence Score */}
            <div className="border border-neutral-200 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Online Presence Score</h3>
              <div className="h-64">
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Website Quality</span>
                    <span className="text-sm">{onlinePresenceScores.websiteQuality}/100</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${onlinePresenceScores.websiteQuality}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Social Media</span>
                    <span className="text-sm">{onlinePresenceScores.socialMedia}/100</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${onlinePresenceScores.socialMedia}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Reviews</span>
                    <span className="text-sm">{onlinePresenceScores.reviews}/100</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${onlinePresenceScores.reviews}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">SEO Ranking</span>
                    <span className="text-sm">{onlinePresenceScores.seoRanking}/100</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${onlinePresenceScores.seoRanking}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium">Overall Score</span>
                    <span className="text-lg font-bold text-primary">{onlinePresenceScores.overall}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Above average compared to other firms in the area</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
