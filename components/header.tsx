import { Settings, LayoutGrid, Upload, ExternalLink, PanelLeft } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center">
          <button className="p-2 rounded-md hover:bg-gray-100">
            <PanelLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="ml-4 flex items-center">
            <div className="bg-gray-100 rounded-md flex items-center px-4 py-1.5 w-96">
              <span className="text-gray-600">localhost</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-md hover:bg-gray-100">
            <Settings className="h-5 w-5 text-gray-500" />
          </button>
          <button className="p-2 rounded-md hover:bg-gray-100">
            <LayoutGrid className="h-5 w-5 text-gray-500" />
          </button>
          <button className="p-2 rounded-md hover:bg-gray-100">
            <Upload className="h-5 w-5 text-gray-500" />
          </button>
          <button className="p-2 rounded-md hover:bg-gray-100">
            <ExternalLink className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

    </header>
  )
}
