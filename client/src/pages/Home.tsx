import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import SearchPanel from "@/components/SearchPanel";
import ResultsPanel from "@/components/ResultsPanel";
import DetailModal from "@/components/DetailModal";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Landmark, Ban } from "lucide-react";
import { FirmData } from "@shared/schema";

export default function Home() {
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FirmData[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<FirmData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    lawFirms: 0,
    nonLawFirms: 0,
  });

  const handleStartSearch = async (formData: {
    location: string;
    practiceArea: string;
    resultCount: string;
  }) => {
    setSearchInProgress(true);
    setProgress(0);
    setResults([]);
    
    try {
      // Set up a timer to simulate progress for long-running requests
      // Large result counts might take minutes to complete
      const totalExpectedTime = parseInt(formData.resultCount) * 1000; // Rough estimate: ~1 second per result
      const startTime = Date.now();
      
      const progressInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progressPercentage = Math.min((elapsedTime / totalExpectedTime) * 90, 95);
        setProgress(progressPercentage);
      }, 1000);

      // Add the analysisDepth parameter set to "deep"
      const searchData = {
        ...formData,
        analysisDepth: "deep" 
      };

      // Call API to start search
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const data = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Small delay to show 100% before completing
      setTimeout(() => {
        setSearchInProgress(false);
        setResults(data.results);
        setStats({
          totalAnalyzed: data.stats.totalAnalyzed,
          lawFirms: data.stats.lawFirms,
          nonLawFirms: data.stats.nonLawFirms,
        });
      }, 500);
      
    } catch (error) {
      console.error("Search error:", error);
      setSearchInProgress(false);
    }
  };

  const handleViewFirm = (firm: FirmData) => {
    setSelectedFirm(firm);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedFirm(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Top row with search parameters and stats side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="h-full flex">
            <div className="flex-1">
              <SearchPanel 
                onSearch={handleStartSearch}
                disabled={searchInProgress}
              />
            </div>
          </div>
          
          <div className="h-full flex">
            <Card className="w-full">
              <CardContent className="p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Analysis Statistics</h3>
                <div className="flex flex-col space-y-4 flex-1 justify-center">
                  <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-neutral-600">Total Analyzed</h4>
                      <Search className="text-primary h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.totalAnalyzed}</p>
                  </div>
                  
                  <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-neutral-600">Target Businesses</h4>
                      <Landmark className="text-green-600 h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.lawFirms}</p>
                  </div>

                  <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-neutral-600">Excluded Results</h4>
                      <Ban className="text-red-600 h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.nonLawFirms}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Bottom row with results full width */}
        <div className="w-full">
          <ResultsPanel
            results={results}
            stats={stats}
            searchInProgress={searchInProgress}
            progress={progress}
            onViewFirm={handleViewFirm}
          />
        </div>
      </main>
      
      <Footer />
      
      {showDetailModal && selectedFirm && (
        <DetailModal firm={selectedFirm} onClose={handleCloseModal} />
      )}
    </div>
  );
}
