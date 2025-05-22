"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export interface ColorPaletteProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
  label: string
  showInput?: boolean
}

export function ColorPalette({
  value,
  onValueChange,
  className,
  label,
  showInput = true,
  ...props
}: ColorPaletteProps) {
  const colors = [
    "#112937",
    "#3B82FF",
    "#F3F4F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#0EA5E9",
    "#F97316",
    "#14B8A6",
    "#6366F1",
  ]
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>{label}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-3">
          {showInput && (
            <div className="mb-3">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
                    onValueChange(newValue);
                  }
                }}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                className={cn(
                  "h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center",
                  value === color && "ring-2 ring-offset-2 ring-offset-white ring-blue-500"
                )}
                style={{ backgroundColor: color }}
                onClick={() => onValueChange(color)}
              >
                {value === color && (
                  <Check 
                    className="h-4 w-4" 
                    style={{ color: isLightColor(color) ? "#000000" : "#FFFFFF" }} 
                  />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Helper function to determine if a color is light or dark 
// to ensure the check icon is visible
function isLightColor(color: string): boolean {
  // Convert hex to RGB
  let hex = color.replace("#", "")
  let r = parseInt(hex.substr(0, 2), 16)
  let g = parseInt(hex.substr(2, 2), 16)
  let b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return true if light color
  return luminance > 0.5
}
