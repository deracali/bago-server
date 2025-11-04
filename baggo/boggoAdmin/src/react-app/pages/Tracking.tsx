import { useEffect, useState } from 'react';
import { Search, Filter, Package, MapPin, User, Calendar, DollarSign, Truck, UserPlus } from 'lucide-react';

// Request status options (based on API data)
const REQUEST_STATUSES = ['pending', 'accepted', 'picked_up', 'in_transit', 'customs', 'delivered', 'cancelled'];

// Interface for package data from API
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

// Interface for request data from API
interface Request {
  _id: string;
  sender: string;
  traveler: string;
  package: string;
  trip: string;
  status: string;
  insurance: boolean;
  insuranceCost: number;
  createdAt: string;
  updatedAt: string;
}

// Interface for user data (fetched separately for sender/traveler)
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Interface for tracking data
interface TrackingData {
  package: Package;
  requests: Request[];
}

// Interface for API response
interface TrackingResponse {
  data: TrackingData[];
  totalCount: number;
  page: number;
  limit: number;
  success: boolean;
  error: boolean;
  message: string;
}

// Interface for table item (transformed for display)
interface TableItem {
  id: string; // package._id
  title: string; // package.description
  tracking_number: string; // package._id
  pickup_country: string; // package.fromCountry
  delivery_country: string; // package.toCountry
  sender_name: string; // Fetched from Users
  sender_email: string; // Fetched from Users
  traveler_name: string | null; // Fetched from Users
  traveler_email: string | null; // Fetched from Users
  traveler_id: string | null; // request.traveler
  status: string; // request.status
  price: number; // request.insuranceCost
  commission_amount: number; // Calculated (e.g., 10% of price)
  created_at: string; // package.createdAt
  request_id: string; // request._id
}

export default function Tracking() {
  const [items, setItems] = useState<TableItem[]>([]);
  const [users, setUsers] = useState<{ [key: string]: User }>({}); // Cache user data
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchTrackingAndUsers();
  }, [currentPage]);

  const fetchTrackingAndUsers = async () => {
    try {
      setLoading(true);

      // Fetch tracking data
      const trackingResponse = await fetch(
        `https://bago-server.onrender.com/api/Adminbaggo/tracking?page=${currentPage}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!trackingResponse.ok) {
        if (trackingResponse.status === 401) {
          window.location.href = '/';
        }
        throw new Error('Failed to fetch tracking data');
      }

      const trackingData: TrackingResponse = await trackingResponse.json();
      if (!trackingData.success) {
        throw new Error(trackingData.message || 'Failed to fetch tracking data');
      }

      // Fetch user data for senders and travelers
      const userIds = new Set<string>();
      trackingData.data.forEach((item) => {
        item.requests.forEach((req) => {
          userIds.add(req.sender);
          if (req.traveler) userIds.add(req.traveler);
        });
      });

      const usersResponse = await fetch('https://bago-server.onrender.com/api/Adminbaggo/GetAllUsers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersResponse.json();
      const userMap: { [key: string]: User } = {};
      usersData.data.forEach((user: User) => {
        userMap[user._id] = user;
      });

      // Transform tracking data into table items
      const tableItems: TableItem[] = [];
      trackingData.data.forEach((item) => {
        item.requests.forEach((req) => {
          tableItems.push({
            id: item.package._id,
            title: item.package.description || `Package ${item.package._id}`,
            tracking_number: item.package._id,
            pickup_country: item.package.fromCountry,
            delivery_country: item.package.toCountry,
            sender_name: userMap[req.sender]
              ? `${userMap[req.sender].firstName} ${userMap[req.sender].lastName}`
              : 'Unknown',
            sender_email: userMap[req.sender]?.email || 'Unknown',
            traveler_name: req.traveler
              ? userMap[req.traveler]
                ? `${userMap[req.traveler].firstName} ${userMap[req.traveler].lastName}`
                : 'Unknown'
              : null,
            traveler_email: req.traveler ? userMap[req.traveler]?.email || 'Unknown' : null,
            traveler_id: req.traveler || null,
            status: req.status,
            price: req.insuranceCost || 0,
            commission_amount: req.insuranceCost ? req.insuranceCost * 0.1 : 0, // 10% commission
            created_at: item.package.createdAt,
            request_id: req._id,
          });
        });
      });

      setItems(tableItems);
      setUsers(userMap);
      setTotalCount(trackingData.totalCount);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sender_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.traveler_email && item.traveler_email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800';
      case 'in_transit':
        return 'bg-indigo-100 text-indigo-800';
      case 'customs':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Package Tracking</h1>
          <p className="text-gray-600">Monitor shipments and update tracking status</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {REQUEST_STATUSES.map((status) => {
          const count = items.filter((item) => item.status === status).length;
          return (
            <div key={status} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className={`text-2xl font-bold ${getStatusColor(status).split(' ')[1]}`}>
                {count}
              </div>
              <div className="text-gray-600 text-sm capitalize">{status.replace('_', ' ')}</div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by description, tracking number, or user email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors">
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Package</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Route</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Sender</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Traveler</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Price</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={`${item.id}-${item.request_id}`} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-gray-500 text-sm">{item.tracking_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{item.pickup_country || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-900">{item.delivery_country || 'Not specified'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-900 text-sm">{item.sender_name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">{item.sender_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {item.traveler_id ? (
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-900 text-sm">{item.traveler_name || 'Unknown'}</div>
                          <div className="text-gray-500 text-xs">{item.traveler_email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Not assigned</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 font-medium">${item.price.toFixed(2)}</span>
                    </div>
                    {item.commission_amount > 0 && (
                      <div className="text-xs text-gray-500">
                        Commission: ${item.commission_amount.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      {item.traveler_id ? null : (
                        <button
                          onClick={() => {
                            // Placeholder for assign traveler logic
                            alert(`Assign traveler to package ${item.id}`);
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Assign Traveler</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalCount)} of{' '}
            {totalCount} results
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
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
