"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch refunds
  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://bago-server.onrender.com/api/baggo/get-refund");
      const data = await res.json();
      setRefunds(data.data || []);
    } catch (err) {
      console.error("Error fetching refunds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filtered = refunds.filter((item) =>
    item?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "refunded": return "bg-blue-100 text-blue-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      const endpoint = `https://bago-server.onrender.com/api/baggo/${action}/${id}`;
      const res = await fetch(endpoint, { method: "PUT" });
      if (res.ok) fetchRefunds();
    } catch (err) {
      console.error(`Error ${action}ing refund:`, err);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refund Management</h1>
          <p className="text-gray-600">Review and approve or reject refund requests</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by user email or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Payment ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-gray-900">{item.user?.email}</td>
                    <td className="py-4 px-4 text-gray-700">{item.reason}</td>
                    <td className="py-4 px-4 text-gray-700">{item.paymentIntentId}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 flex space-x-2">
                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(item._id, "approve")}
                            className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleAction(item._id, "reject")}
                            className="bg-red-100 text-red-800 px-2 py-1 rounded flex items-center space-x-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No refunds found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
