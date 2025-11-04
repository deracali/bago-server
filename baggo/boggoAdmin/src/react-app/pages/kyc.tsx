import { useEffect, useState } from "react";
import { Upload, File, Image, User, Eye, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

interface UserData {
  isVerified: boolean;
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  Address: string;
  dateOfBirth: string;
}

interface KYCData {
  _id: string;
  userid: string;
  identityDocument: string;
  proofOfAddress: string;
  verificationSelfie: string;
}

interface KYCItem {
  user: UserData;
  kyc: KYCData;
}

export default function KYCVerificationManager() {
  const [kycItems, setKycItems] = useState<KYCItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewKYC, setPreviewKYC] = useState<KYCItem | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string>("");

  useEffect(() => {
    fetchKYCData();
  }, []);

  const fetchKYCData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/getAllkyc', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Combine user and kyc data
          const combined = result.data.finduser.map((user: UserData) => {
            const userKyc = result.data.kyc.find((k: KYCData) => k.userid === user._id);
            return {
              user,
              kyc: userKyc
            };
          });
          setKycItems(combined);
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (userId: string, status: 'verify' | 'auto') => {
    if (!confirm(`Are you sure you want to ${status === 'verify' ? 'verify' : 'reject'} this KYC?`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/Verifykyc', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId, status })
      });

      if (response.ok) {
        await fetchKYCData();
        setPreviewKYC(null);
      } else {
        alert('Failed to update verification status');
      }
    } catch (error) {
      console.error('Failed to verify KYC:', error);
      alert('An error occurred while updating verification status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      verified: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700'
    };

    const statusIcons = {
      verified: <CheckCircle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>
        {statusIcons[status as keyof typeof statusIcons]}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <h1 className="text-3xl font-bold text-gray-900">KYC Verification Manager</h1>
          <p className="text-gray-600">Review and verify user identity documents</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{kycItems.length}</div>
          <div className="text-gray-600 text-sm">Total Submissions</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {kycItems.filter(item => item.user.status === 'verified').length}
          </div>
          <div className="text-gray-600 text-sm">Verified</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {kycItems.filter(item => item.user.status === 'pending').length}
          </div>
          <div className="text-gray-600 text-sm">Pending</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {kycItems.filter(item => item.user.status === 'rejected').length}
          </div>
          <div className="text-gray-600 text-sm">Rejected</div>
        </div>
      </div>

      {/* KYC Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC Submissions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kycItems.map((item) => (
            <div key={item.user._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="aspect-w-16 aspect-h-12 mb-3">
                {item.kyc?.verificationSelfie ? (
                  <img
                    src={item.kyc.verificationSelfie}
                    alt={`${item.user.firstName} ${item.user.lastName}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate" title={`${item.user.firstName} ${item.user.lastName}`}>
                    {item.user.firstName} {item.user.lastName}
                  </h3>
                  {getStatusBadge(item.user.status)}
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <div className="truncate">{item.user.email}</div>
                  <div>{item.user.phone}</div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3 h-3" />
                    <span>DOB: {formatDate(item.user.dateOfBirth)}</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setPreviewKYC(item)}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Review</span>
                  </button>

                  {item.user.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleVerification(item.user._id, 'verify')}
                        disabled={processing}
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleVerification(item.user._id, 'auto')}
                        disabled={processing}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {kycItems.length === 0 && (
          <div className="text-center py-12">
            <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No KYC submissions yet.</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewKYC && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {previewKYC.user.firstName} {previewKYC.user.lastName}
                  </h2>
                  <p className="text-gray-600">{previewKYC.user.email}</p>
                  <div className="mt-2">
                    {getStatusBadge(previewKYC.user.status)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPreviewKYC(null);
                    setSelectedDocument("");
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* User Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 text-gray-900">{previewKYC.user.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="ml-2 text-gray-900">{formatDate(previewKYC.user.dateOfBirth)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Address:</span>
                    <span className="ml-2 text-gray-900">{previewKYC.user.Address}</span>
                  </div>
                </div>
              </div>

              {/* Document Selection */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">KYC Documents</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedDocument(previewKYC.kyc?.identityDocument || "")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedDocument === previewKYC.kyc?.identityDocument
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Identity Document
                  </button>
                  <button
                    onClick={() => setSelectedDocument(previewKYC.kyc?.proofOfAddress || "")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedDocument === previewKYC.kyc?.proofOfAddress
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Proof of Address
                  </button>
                  <button
                    onClick={() => setSelectedDocument(previewKYC.kyc?.verificationSelfie || "")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedDocument === previewKYC.kyc?.verificationSelfie
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Verification Selfie
                  </button>
                </div>
              </div>

              {/* Document Preview */}
              <div className="mb-6">
                {selectedDocument ? (
                  <img
                    src={selectedDocument}
                    alt="KYC Document"
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <span className="text-gray-600">Select a document to preview</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {previewKYC.user.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleVerification(previewKYC.user._id, 'verify')}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{processing ? 'Processing...' : 'Verify KYC'}</span>
                    </button>
                    <button
                      onClick={() => handleVerification(previewKYC.user._id, 'auto')}
                      disabled={processing}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{processing ? 'Processing...' : 'Reject KYC'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setPreviewKYC(null);
                    setSelectedDocument("");
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
