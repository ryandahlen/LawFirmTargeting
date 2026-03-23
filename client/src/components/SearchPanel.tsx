import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const searchSchema = z.object({
  location: z.string().min(1, "Location is required"),
  practiceArea: z.string().min(1, "Practice area is required"),
  resultCount: z.string(),
  // analysisDepth is now hardcoded to "deep" and removed from the form
});

type SearchFormData = z.infer<typeof searchSchema>;

interface SearchPanelProps {
  onSearch: (data: SearchFormData) => void;
  disabled: boolean;
}

export default function SearchPanel({ onSearch, disabled }: SearchPanelProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      location: "",
      practiceArea: "",
      resultCount: "20",
      // analysisDepth removed as it's now hardcoded to "deep"
    }
  });

  // Recent searches removed as per client request

  return (
    <section className="lg:col-span-4 space-y-6">
      <Card className="h-full">
        <CardContent className="pt-6 h-full flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Search Parameters</h2>
          <form onSubmit={handleSubmit(onSearch)} className="space-y-5">
            <div>
              <Label htmlFor="location" className="block text-sm font-medium text-neutral-700 mb-1">
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., New York, NY"
                {...register("location")}
                className={errors.location ? "border-destructive" : ""}
              />
              {errors.location && (
                <p className="text-xs text-destructive mt-1">{errors.location.message}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">City, state, or region to search for law firms</p>
            </div>
            
            <div>
              <Label htmlFor="practiceArea" className="block text-sm font-medium text-neutral-700 mb-1">
                Practice Area
              </Label>
              <Input
                id="practiceArea"
                placeholder="e.g., Criminal Defense, Personal Injury, Family Law"
                {...register("practiceArea")}
                className={errors.practiceArea ? "border-destructive" : ""}
              />
              {errors.practiceArea && (
                <p className="text-xs text-destructive mt-1">{errors.practiceArea.message}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">Enter any legal practice area you want to search for</p>
            </div>
            
            
            {/* Analysis Depth selector removed and set to always use "deep" */}
            
            <Button type="submit" className="w-full" disabled={disabled}>
              <Search className="mr-2 h-4 w-4" />
              Start Analysis
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
