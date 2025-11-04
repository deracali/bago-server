"use client";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  PlusCircle,
  Edit,
  Trash2,
  Scale,
  MapPin,
  Loader2,
  X
} from "lucide-react";

interface PricePerKg {
  _id?: string;
  from: string;
  to: string;
  category: string;
  pricePerKg: number;
  currency: string;
  minWeightKg: number;
  discountRate: number;
  createdAt?: string;
}

export default function PricePerKgPage() {
  const [prices, setPrices] = useState<PricePerKg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PricePerKg | null>(null);
  const [form, setForm] = useState<PricePerKg>({
    from: "",
    to: "",
    category: "",
    pricePerKg: 0,
    currency: "NGN",
    minWeightKg: 0,
    discountRate: 0,
  });

  // Fetch all prices
  const fetchPrices = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://bago-server.onrender.com/api/prices/get");
      const data = await res.json();
      setPrices(data || []);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  // Create or update price
  const handleSave = async () => {
    try {
      const method = editingPrice ? "PUT" : "POST";
      const url = editingPrice
        ? `https://bago-server.onrender.com/api/prices/update/${editingPrice._id}`
        : "https://bago-server.onrender.com/api/prices/create";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save price");

      await fetchPrices();
      setShowModal(false);
      setEditingPrice(null);
      setForm({
        from: "",
        to: "",
        category: "",
        pricePerKg: 0,
        currency: "NGN",
        minWeightKg: 0,
        discountRate: 0,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save price");
    }
  };

  // Delete price
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`https://bago-server.onrender.com/api/prices/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchPrices();
    } catch (err) {
      console.error(err);
      alert("Failed to delete price");
    }
  };

  const filteredPrices = prices.filter(
    (item) =>
      item.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-7 h-7 text-blue-600" /> Price Per Kg
          </h1>
          <p className="text-gray-600">Manage route-based price per kilogram rates</p>
        </div>
        <button
          onClick={() => {
            setEditingPrice(null);
            setForm({
              from: "",
              to: "",
              category: "",
              pricePerKg: 0,
              currency: "NGN",
              minWeightKg: 0,
              discountRate: 0,
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Add Price
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by route or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="bg-gray-100 px-4 py-2 rounded-lg text-gray-700 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Route</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Price/kg</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Min Weight</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Discount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPrices.map((price) => (
                  <tr key={price._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {price.from} → {price.to}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-800">{price.category}</td>
                    <td className="py-3 px-4 text-gray-800">
                      ₦{price.pricePerKg.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-800">{price.minWeightKg} kg</td>
                    <td className="py-3 px-4 text-gray-800">{price.discountRate * 100}%</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setEditingPrice(price);
                            setForm(price);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(price._id!)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPrices.length === 0 && (
              <div className="text-center py-10 text-gray-500">No price records found.</div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingPrice(null);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingPrice ? "Edit Price" : "Add New Price"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="From"
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                className="border border-gray-300 rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="To"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="border border-gray-300 rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border border-gray-300 rounded-lg p-2 col-span-2"
              />
              <input
                type="number"
                placeholder="Price per kg"
                value={form.pricePerKg}
                onChange={(e) =>
                  setForm({ ...form, pricePerKg: parseFloat(e.target.value) })
                }
                className="border border-gray-300 rounded-lg p-2"
              />
              <input
                type="number"
                placeholder="Min Weight (kg)"
                value={form.minWeightKg}
                onChange={(e) =>
                  setForm({ ...form, minWeightKg: parseFloat(e.target.value) })
                }
                className="border border-gray-300 rounded-lg p-2"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Discount Rate (0.05 = 5%)"
                value={form.discountRate}
                onChange={(e) =>
                  setForm({ ...form, discountRate: parseFloat(e.target.value) })
                }
                className="border border-gray-300 rounded-lg p-2"
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="border border-gray-300 rounded-lg p-2"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingPrice ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
