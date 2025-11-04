import { useEffect, useState } from 'react';
import { Search, Filter, Mail, Phone, MapPin, Shield, Calendar, Ban, RotateCcw } from 'lucide-react';

// Interface for the user data from the API
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  Address: string;
  dateOfBirth: string;
  createdAt: string;
  banned: boolean;
  escrowBalance: number; // ✅ New field
}


// Interface for the API response
interface UsersResponse {
  data: User[];
  totalCount: number;
  page: number;
  limit: number;
  success: boolean;
  error: boolean;
  message: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [banningUserId, setBanningUserId] = useState<string | null>(null); // Track banning state
  const limit = 20; // Number of users per page

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://bago-server.onrender.com/api/Adminbaggo/GetAllUsers?page=${currentPage}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include adminToken cookie
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/'; // Redirect to login on unauthorized
        }
        throw new Error('Failed to fetch users');
      }

      const data: UsersResponse = await response.json();
      if (data.success) {
        setUsers(data.data);
        setTotalCount(data.totalCount || data.data.length); // Use totalCount if provided, else fallback
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId: string, currentBanned: boolean) => {
    setBanningUserId(userId);
    try {
      const response = await fetch(`https://bago-server.onrender.com/api/Adminbaggo/banUser/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ banned: !currentBanned }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user ban status');
      }

      // Update local state optimistically
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, banned: !currentBanned } : user
        )
      );
    } catch (error) {
      console.error('Failed to ban/unban user:', error);
      alert('Failed to update ban status');
    } finally {
      setBanningUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerGet()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, travelers, and account verification</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
          <div className="text-gray-600 text-sm">Total Users</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.status === 'verified').length}
          </div>
          <div className="text-gray-600 text-sm">Verified Users</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.status === 'traveler').length}
          </div>
          <div className="text-gray-600 text-sm">Travelers</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">
            {users.filter((u) => u.status === 'active').length}
          </div>
          <div className="text-gray-600 text-sm">Active Users</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Escrow Balance (€)</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {(user.firstName || user.email)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email}
                        </div>
                        <div className="text-gray-500 text-sm">ID: {user._id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
  <div className="text-sm font-medium text-gray-800">
    €{user.escrowBalance?.toFixed(2) || '0.00'}
  </div>
</td>

                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{user.Address || 'Not specified'}</span>
                    </div>
                    {user.dateOfBirth && (
                      <div className="text-xs text-gray-500 mt-1">
                        DOB: {new Date(user.dateOfBirth).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'verified'
                          ? 'bg-blue-100 text-blue-800'
                          : user.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">

                      <button
                        onClick={() => handleBanToggle(user._id, user.banned)}
                        disabled={banningUserId === user._id}
                        className={`text-sm font-medium flex items-center space-x-1 ${
                          user.banned
                            ? 'text-green-600 hover:text-green-800'
                            : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        {user.banned ? (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Unban</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3" />
                            <span>Ban</span>
                          </>
                        )}
                      </button>
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
