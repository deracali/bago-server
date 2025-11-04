import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown,  Package , ArrowUpRight, Phone } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// Interface for stats from API
interface DashboardStats {
  totalUsers: number;
  totalPackages: number;
  totalRequests: number;
  totalIncome: number;
  totalCommission: number;
}

// Interface for package data
interface Package {
  _id: string;
  userId: string;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  packageWeight: number;
  receiverName: string;
  receiverPhone: string;
  description: string;
  createdAt: string;
}

// Interface for request data
interface Request {
  _id: string;
  sender: string;
  traveler: string;
  package: string;
  trip?: string;
  status: string;
  insurance: boolean;
  insuranceCost: number;
  createdAt: string;
  updatedAt: string;
}

// Interface for tracking data
interface TrackingData {
  package: Package;
  requests: Request[];
}

// Interface for status distribution (pie chart)
interface StatusDistribution {
  name: string;
  value: number;
}

// Interface for monthly trends (line chart)
interface MonthlyTrend {
  name: string;
  thisYear: number;
  lastYear: number;
}

// Interface for API response
interface DashboardResponse {
  success: boolean;
  error: boolean;
  message: string;
  data: {
    stats: DashboardStats;
    trackingData: TrackingData[];
    statusDistribution: StatusDistribution[];
    monthlyTrends: MonthlyTrend[];
    pagination: {
      totalCount: number;
      page: number;
      limit: number;
    };
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchDashboard();
  }, [currentPage]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://bago-server.onrender.com/api/Adminbaggo/dashboard?page=${currentPage}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/';
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data: DashboardResponse = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch dashboard data');
      }

      setStats(data.data.stats);
      setStatusDistribution(
        data.data.statusDistribution.map((item, index) => ({
          ...item,
          color: ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6B7280'][index % 7],
        }))
      );
      setMonthlyTrends(data.data.monthlyTrends);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to fetch dashboard data');
      setStats(null);
      setStatusDistribution([]);
      setMonthlyTrends([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Income</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${(stats?.totalIncome || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Packages Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Packages</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {(stats?.totalPackages || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Users Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {(stats?.totalUsers || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Commission Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Commission</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${(stats?.totalCommission || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <ArrowUpRight className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Status Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Request Status Distribution</h2>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {statusDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700 font-medium capitalize">{item.name}</span>
                </div>
                <span className="font-semibold" style={{ color: item.color }}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Package Trends */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Package Trends</h2>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">This Year</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-gray-600">Last Year</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
                domain={[0, 'auto']}
              />
              <Line
                type="monotone"
                dataKey="thisYear"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="lastYear"
                stroke="#EF4444"
                strokeWidth={3}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Optional Tracking Data Table (Commented Out) */}
      {/*
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Packages</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Package</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Route</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trackingData.map((item) => (
                <tr key={item.package._id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">
                      {item.package.description || `Package ${item.package._id}`}
                    </div>
                    <div className="text-gray-500 text-sm">{item.package._id}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="text-sm">{item.package.fromCountry}</div>
                      <div className="text-sm">→ {item.package.toCountry}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-500 text-sm">
                      {item.requests.length > 0 ? item.requests[0].status : 'No requests'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600">
                      {new Date(item.package.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / limit), currentPage + 1))}
              disabled={currentPage === Math.ceil(totalCount / limit)}
              className="px-3 py-1 rounded bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      */}
    </div>
  );
}
