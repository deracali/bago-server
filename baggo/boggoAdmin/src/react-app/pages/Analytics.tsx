import { useEffect, useState } from "react";
import { Users, MapPin, Calendar, Search } from "lucide-react";

// Define the User interface based on the provided JSON
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  Address: string;
  dateOfBirth: string;
}

export default function Analytics() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://bago-server.onrender.com/api/Adminbaggo/analystic", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      } else {
        console.error("Failed to fetch users:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-sm font-medium">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          User Management
        </h1>
        <p className="mt-2 text-blue-100 text-lg">
          Manage and view details of registered users
        </p>
        <div className="mt-6 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Registered Users</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                  User
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                  Address
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                  Date of Birth
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user, index) => (
                <tr
                  key={user._id}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50 transition-colors duration-200`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-lg">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-gray-500 text-sm truncate max-w-xs">
                          {user._id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-medium text-gray-800">{user.email}</div>
                      <div>{user.phone}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-800">{user.Address}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span>{new Date(user.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                        user.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                      title={`Status: ${user.status}`}
                    >
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No users found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
