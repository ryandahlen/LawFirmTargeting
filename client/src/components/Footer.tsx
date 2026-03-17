import { SquareSplitHorizontal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-neutral-800 text-neutral-400 py-8 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <SquareSplitHorizontal className="text-white h-5 w-5 mr-2" />
              <h2 className="text-white text-lg font-semibold">LegalScout</h2>
            </div>
            <p className="text-sm mt-2">Law Firm Intelligence Platform</p>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-neutral-700 flex justify-center items-center">
          <p className="text-xs">© {new Date().getFullYear()} Uptime Legal Systems. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
