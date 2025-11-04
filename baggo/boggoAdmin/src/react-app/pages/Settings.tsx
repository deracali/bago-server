import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function SettingsPage() {
 const [autoVerification, setAutoVerification] = useState(false);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

 useEffect(() => {
 fetchAutoVerification();
 }, []);

 const fetchAutoVerification = async () => {
 try {
 setLoading(true);
 const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/getCurrentSetting', {
 method: 'GET',
 credentials: 'include', // Include cookies/credentials
 });
 if (response.ok) {
 const result = await response.json();
 if (result.success && result.data && result.data.length > 0) {
 setAutoVerification(result.data[0].autoVerification || false);
 } else {
 setAutoVerification(false);
 }
 } else {
 console.error('Failed to fetch setting:', response.status);
 }
 } catch (error) {
 console.error('Failed to fetch auto verification setting:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleToggle = async () => {
 const newValue = !autoVerification;
 try {
 setSaving(true);
 const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/toggleAutoVerification', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ autoVerification: newValue }),
 credentials: 'include', // Important: sends cookies/auth
 });

 if (response.ok) {
 setAutoVerification(newValue);
 setMessage({ type: 'success', text: `Auto-verification turned ${newValue ? 'ON' : 'OFF'}` });
 setTimeout(() => setMessage(null), 3000);
 } else {
 setMessage({ type: 'error', text: 'Failed to update setting' });
 }
 } catch (error) {
 console.error('Failed to toggle auto verification:', error);
 setMessage({ type: 'error', text: 'Failed to update setting' });
 } finally {
 setSaving(false);
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
 <h1 className="text-3xl font-bold text-gray-900">KYC Auto-Verification Setting</h1>
 <p className="text-gray-600">Toggle automatic user verification on KYC submission</p>
 </div>
 <div className="flex items-center space-x-4">
 {message && (
 <div className={`px-4 py-2 rounded-lg text-sm ${
 message.type === 'success'
 ? 'bg-green-100 text-green-800'
 : 'bg-red-100 text-red-800'
 }`}>
 {message.text}
 </div>
 )}
 </div>
 </div>

 {/* Toggle Card */}
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
 <div className="flex items-center space-x-3 mb-6">
 <div className="bg-blue-100 p-2 rounded-lg">
 <SettingsIcon className="w-5 h-5 text-blue-600" />
 </div>
 <h2 className="text-xl font-semibold text-gray-900">Auto-Verification Control</h2>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <div className="font-medium text-gray-900">Enable Auto-Verification</div>
 <div className="text-sm text-gray-500">
 {autoVerification
 ? 'Currently ON: Users are verified automatically upon KYC submission.'
 : 'Currently OFF: Manual verification required after KYC submission.'
 }
 </div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={autoVerification}
 onChange={handleToggle}
 disabled={saving}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>

 <button
 onClick={handleToggle}
 disabled={saving}
 className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
 >
 <Save className="w-4 h-4" />
 <span>{saving ? 'Saving...' : 'Save Change'}</span>
 </button>
 </div>
 </div>
 </div>
 );
}
