import { useState } from "react";
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
  practiceArea: z.string().min(1, "Industry is required"),
  resultCount: z.string(),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface SearchPanelProps {
  onSearch: (data: SearchFormData) => void;
  disabled: boolean;
}

export default function SearchPanel({ onSearch, disabled }: SearchPanelProps) {
  const [sliderValue, setSliderValue] = useState(50);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      location: "",
      practiceArea: "",
      resultCount: "50",
    }
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSliderValue(val);
    setValue("resultCount", String(val));
  };

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
              <p className="text-xs text-neutral-500 mt-1">City, state, or region to search</p>
            </div>

            <div>
              <Label htmlFor="practiceArea" className="block text-sm font-medium text-neutral-700 mb-1">
                Keyword / Niche
              </Label>
              <Input
                id="practiceArea"
                placeholder="e.g., divorce lawyer, hvac repair, real estate agent"
                {...register("practiceArea")}
                className={errors.practiceArea ? "border-destructive" : ""}
              />
              {errors.practiceArea && (
                <p className="text-xs text-destructive mt-1">{errors.practiceArea.message}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">The full search phrase used to find businesses</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="resultCount" className="block text-sm font-medium text-neutral-700">
                  Result Count
                </Label>
                <span className="text-sm font-semibold text-primary">{sliderValue} results</span>
              </div>
              <input
                id="resultCount"
                type="range"
                min={10}
                max={100}
                step={10}
                value={sliderValue}
                onChange={handleSliderChange}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>10</span>
                <span>100</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={disabled}>
              <Search className="mr-2 h-4 w-4" />
              Run Analysis
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
