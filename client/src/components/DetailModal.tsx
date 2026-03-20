import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, Bookmark, Gavel, Users, ServerCrash, Briefcase, Scale } from "lucide-react";
import { FirmData } from "@shared/schema";

interface DetailModalProps {
  firm: FirmData;
  onClose: () => void;
}

export default function DetailModal({ firm, onClose }: DetailModalProps) {
  // Mock images as placeholders for law firm buildings and professionals
  const buildingImages = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=500"
  ];
  
  const getIconForPracticeArea = (area: string) => {
    const icons: Record<string, JSX.Element> = {
      "Personal Injury": <Gavel className="text-blue-500 mr-2 h-4 w-4" />,
      "Family Law": <Users className="text-green-500 mr-2 h-4 w-4" />,
      "Auto Accidents": <ServerCrash className="text-yellow-500 mr-2 h-4 w-4" />,
      "Medical Malpractice": <Briefcase className="text-purple-500 mr-2 h-4 w-4" />,
      "Divorce": <Scale className="text-red-500 mr-2 h-4 w-4" />,
    };
    
    return icons[area] || <Gavel className="text-gray-500 mr-2 h-4 w-4" />;
  };
  
  const getBackgroundColorForPracticeArea = (area: string, index: number) => {
    const colors = [
      "bg-blue-50 border border-blue-200",
      "bg-green-50 border border-green-200",
      "bg-yellow-50 border border-yellow-200",
      "bg-purple-50 border border-purple-200",
      "bg-red-50 border border-red-200"
    ];
    
    return colors[index % colors.length];
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const randomImage = buildingImages[Math.floor(Math.random() * buildingImages.length)];
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold">{firm.name}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
          {/* Firm Overview */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h4 className="text-lg font-medium mb-3">Firm Overview</h4>
              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                <p className="text-neutral-700">{firm.overview}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-3">Practice Areas</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {firm.practiceAreas.map((area, index) => (
                  <div key={index} className={`p-3 rounded-lg flex items-center ${getBackgroundColorForPracticeArea(area, index)}`}>
                    {getIconForPracticeArea(area)}
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {firm.keyPersonnel && firm.keyPersonnel.length > 0 && (
              <div>
                <h4 className="text-lg font-medium mb-3">Key Personnel</h4>
                <div className="space-y-3">
                  {firm.keyPersonnel.map((person, index) => (
                    <div key={index} className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex items-start">
                      <div className={`bg-${index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'} text-white rounded-full w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0`}>
                        <span>{getInitials(person.name)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-neutral-500">{person.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Firmographic Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h4 className="text-lg font-medium mb-3">Firm Details</h4>
              <dl className="divide-y divide-neutral-200">
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Firm Size</dt>
                  <dd className="text-sm text-neutral-900">{firm.size} ({firm.attorneyCount})</dd>
                </div>
                {firm.founded && (
                  <div className="py-3 flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500">Founded</dt>
                    <dd className="text-sm text-neutral-900">{firm.founded}</dd>
                  </div>
                )}
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Primary Location</dt>
                  <dd className="text-sm text-neutral-900">{firm.location}</dd>
                </div>
                {firm.additionalOffices && (
                  <div className="py-3 flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500">Additional Offices</dt>
                    <dd className="text-sm text-neutral-900">{firm.additionalOffices.join(", ")}</dd>
                  </div>
                )}
                {firm.clientFocus && (
                  <div className="py-3 flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500">Client Focus</dt>
                    <dd className="text-sm text-neutral-900">{firm.clientFocus.join(", ")}</dd>
                  </div>
                )}
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Website</dt>
                  <dd className="text-sm text-neutral-900 text-primary">
                    <a href={`https://${firm.website}`} target="_blank" rel="noopener noreferrer">
                      {firm.website}
                    </a>
                  </dd>
                </div>
                {firm.emailAddress && (
                  <div className="py-3 flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500">Email</dt>
                    <dd className="text-sm text-neutral-900 text-primary">
                      <a href={`mailto:${firm.emailAddress}`}>
                        {firm.emailAddress}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            
            {/* Law firm building image */}
            <img 
              src={randomImage} 
              alt={`${firm.name} office building`} 
              className="rounded-lg shadow-sm w-full h-auto"
            />
            
            <div>
              <h4 className="text-lg font-medium mb-3">AI Analysis Notes</h4>
              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                <p className="text-sm text-neutral-700">{firm.aiAnalysisNotes}</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6 border-t border-neutral-200 pt-4">
          <Button variant="outline" className="gap-1.5">
            <Bookmark className="h-4 w-4" />
            Save
          </Button>
          <Button className="gap-1.5 bg-secondary hover:bg-secondary-dark">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
