import { useEffect, useState } from "react";
import { User, Phone, Mail, MessageSquare } from "lucide-react";

// Interface for API user data
interface ApiUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  Address: string;
  dateOfBirth: string;
}

export default function Support() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/analystic', {
        method: 'GET',
        credentials: 'include',
      });

      const apiData = await response.json();

      if (apiData.success && apiData.data) {
        setUsers(apiData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch users:', error);
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {users.map((user) => (
          <div
            key={user._id}
            className="p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-900">{`${user.firstName} ${user.lastName}`}</h3>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  Email: {user.email} | Phone: {user.phone}
                </p>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Mail className="w--icons w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No users found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
