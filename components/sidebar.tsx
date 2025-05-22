import Link from "next/link"
import { Home, User, Package, Users, Settings, History } from "lucide-react"

export function Sidebar() {
  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold">LOGO XX</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/" className="flex items-center px-4 py-3 text-sm rounded-md bg-blue-50 text-blue-600">
          <Home className="mr-3 h-5 w-5" />
          Home
        </Link>
        <Link href="/agent" className="flex items-center px-4 py-3 text-sm rounded-md text-gray-700 hover:bg-gray-100">
          <User className="mr-3 h-5 w-5" />
          Agent
        </Link>
        <Link
          href="/plugins"
          className="flex items-center px-4 py-3 text-sm rounded-md text-gray-700 hover:bg-gray-100"
        >
          <Package className="mr-3 h-5 w-5" />
          Plugins
        </Link>
        <Link href="/team" className="flex items-center px-4 py-3 text-sm rounded-md text-gray-700 hover:bg-gray-100">
          <Users className="mr-3 h-5 w-5" />
          Team
        </Link>
        <Link
          href="/history"
          className="flex items-center px-4 py-3 text-sm rounded-md text-gray-700 hover:bg-gray-100"
        >
          <History className="mr-3 h-5 w-5" />
          History
        </Link>
        <Link
          href="/settings"
          className="flex items-center px-4 py-3 text-sm rounded-md text-gray-700 hover:bg-gray-100"
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">A</div>
          <div className="ml-3">
            <p className="text-sm font-medium">Account</p>
            <p className="text-xs text-gray-500">Token number 0000</p>
          </div>
        </div>
      </div>
    </div>
  )
}
