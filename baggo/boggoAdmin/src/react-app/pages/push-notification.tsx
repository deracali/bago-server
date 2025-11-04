"use client";
import { useState } from "react";
import { Bell, PlusCircle, Loader2, X } from "lucide-react";

interface NotificationPayload {
  title: string;
  body: string;
}

export default function PushNotificationPage() {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NotificationPayload>({
    title: "",
    body: "",
  });

  // Send push notification
  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      alert("Title and message body are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("https://bago-server.onrender.com/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send notification");

      setNotifications((prev) => [...prev, form]);
      setShowModal(false);
      setForm({ title: "", body: "" });
      alert(`✅ Notification sent to ${data.count || 0} users`);
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Failed to send notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600" /> Push Notifications
          </h1>
          <p className="text-gray-600">
            Send instant notifications to all registered users
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Send Notification
        </button>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Recently Sent
          </h2>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications sent yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {notifications.map((n, idx) => (
                <li key={idx} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{n.title}</h3>
                      <p className="text-gray-600 text-sm">{n.body}</p>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Send New Notification</h2>

            <div className="grid gap-4">
              <input
                type="text"
                placeholder="Notification Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="border border-gray-300 rounded-lg p-2"
              />
              <textarea
                placeholder="Notification Message"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="border border-gray-300 rounded-lg p-2 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSend}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
