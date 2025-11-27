import { ReactNode, useState } from "react";
import { useAuth } from "@/react-app/hooks/useAuth";
import { useNavigate, useLocation } from "react-router";
import {
  Home,
  CreditCard,
  RefreshCw,
  MessageCircle,
  User,
  Settings,
  BarChart,
  Menu,
  X,
  IdCard,
  Scale,
  Bell,
  Swords,
  ChevronDown,
  RefreshCcw,
  LogOut,  // Added for logout
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: typeof Home;
  label: string;
  path?: string;  // Made optional for actions like logout
  action?: () => void;  // For custom actions
  expandable?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: User, label: "Users", path: "/users" },
  { icon: RefreshCw, label: "Tracking", path: "/tracking"},
  { icon: Scale, label: "PricePerKg", path: "/priceperkg" },
    { icon: Bell , label: "push Notification", path: "/push-notification" },
    { icon: IdCard, label: "Kyc", path: "/kyc" },
  { icon: MessageCircle, label: "Support", path: "/support" },
    { icon: Swords, label: "disputes", path: "/disputes" },
      { icon: RefreshCcw, label: "refund", path: "/refund" },
  { icon: CreditCard, label: "Withdrawals", path: "/withdrawals" },
  { icon: BarChart, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();  // Assuming useAuth has a logout function; if not, we'll implement inline
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Logout handler with API call
  const handleLogout = async () => {
    try {
      const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/Adminlogout', {
        method: 'GET',
        credentials: 'include',  // Sends cookies/credentials for auth
      });

      if (response.ok) {
        // Clear auth context/client-side state
        if (logout) {
          logout();  // Use your auth hook's logout if available
        }
        // Redirect to login
        navigate('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#1e2749] transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center h-20 px-6">
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg p-2">
              <span className="text-[#1e2749] font-bold text-lg">BZ</span>
            </div>
            <span className="text-white text-xl font-bold">Bago</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white ml-auto"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path && location.pathname === item.path;

            return (
              <div key={item.label}>
                <button
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    }
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-white/10 text-white border-r-2 border-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.expandable && (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
          {/* Logout Item - Placed under main nav */}
          <div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <div className="flex items-center">
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Logout</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-600 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-300" />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">
                Welcome
              </div>
              <div className="text-gray-400 text-xs">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username || 'Administrator'
                }
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white h-20 flex items-center justify-between px-6 border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* User profile with dropdown for logout (optional duplicate) */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome</span>
            <div className="relative group">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium text-gray-900">
                    {user?.first_name && user?.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user?.username || 'Administrator'
                    }
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-100">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
