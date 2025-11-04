"use client";
import { useEffect, useState } from "react";
import { Search, Edit, CheckCircle, XCircle } from "lucide-react";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);

  // Fetch disputes
  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://bago-server.onrender.com/api/baggo/disputes");
      const data = await res.json();
      setDisputes(data.data || []);
    } catch (err) {
      console.error("Error fetching disputes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const filtered = disputes.filter((item) =>
    item?.sender?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.traveler?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.package?.receiverName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditClick = (dispute: any) => {
    setSelectedDispute({
      id: dispute._id,
      status: dispute.dispute.status,
      resolutionNote: dispute.dispute.resolutionNote || "",
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!selectedDispute) return;

    try {
      const res = await fetch(`https://bago-server.onrender.com/api/baggo/disputes/${selectedDispute.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedDispute.status,
          resolutionNote: selectedDispute.resolutionNote,
        }),
      });

      if (res.ok) {
        await fetchDisputes();
        setShowEditModal(false);
      }
    } catch (err) {
      console.error("Error updating dispute:", err);
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
          <h1 className="text-3xl font-bold text-gray-900">Dispute Management</h1>
          <p className="text-gray-600">Review and resolve shipment disputes</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by sender, traveler, or receiver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Sender</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Traveler</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Package</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-gray-900">{item.sender?.email}</td>
                    <td className="py-4 px-4 text-gray-900">{item.traveler?.email}</td>
                    <td className="py-4 px-4 text-gray-700">{item.dispute?.reason}</td>
                    <td className="py-4 px-4 text-gray-700">
                      {item.package?.description || "N/A"}
                      <div className="text-sm text-gray-500">
                        {item.package?.fromCity} → {item.package?.toCity}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.dispute?.status)}`}>
                        {item.dispute?.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No disputes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedDispute && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Dispute</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedDispute.status}
                  onChange={(e) =>
                    setSelectedDispute({ ...selectedDispute, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Note</label>
                <textarea
                  rows={3}
                  placeholder="Enter resolution note..."
                  value={selectedDispute.resolutionNote}
                  onChange={(e) =>
                    setSelectedDispute({ ...selectedDispute, resolutionNote: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-1"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
