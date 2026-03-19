import { SquareSplitHorizontal } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="bg-primary shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <SquareSplitHorizontal className="text-white h-6 w-6" />
          <h1 className="text-white text-xl font-semibold">SERPScout</h1>
        </div>
        {/* Navigation links removed as requested */}
      </div>
    </header>
  );
}
