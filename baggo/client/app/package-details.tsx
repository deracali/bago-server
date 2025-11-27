import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { MapPin, MessageCircle, Phone, Package as PackageIcon } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { backendomain } from '@/utils/backendDomain';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';



const API_BASE_URL = `${backendomain.backendomain}/api/baggo`;

export default function PackageDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = String(params.requestId); // Ensure requestId is a string
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);



  const fetchRequestDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!requestId || typeof requestId !== 'string' || requestId === 'undefined') {
        throw new Error('Invalid or missing request ID');
      }
      const response = await axios.get(`${API_BASE_URL}/GetDetails/${requestId}`, {
        withCredentials: true,
      });

      // log the entire payload so you can inspect structure in Metro / console
      // console.log('GetDetails response (full):', JSON.stringify(response.data, null, 2));

      if (response.data.success && response.data.data) {
        setRequest(response.data.data);
      } else {
        setError('No request details found');
      }
    } catch (err) {
      console.error('Error fetching request details:', err.message, err.response?.data);
      setError(err.response?.data?.message || err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // console.log('Received params in PackageDetailsScreen:', params);
    // console.log('Using requestId:', requestId);
    fetchRequestDetails();
  }, [requestId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Lagos',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error || 'No request data available'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRequestDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // destructure what you expect
  const {
    package: pkg,
    sender,
    traveler,
    trip,
    status,
    insurance,
    insuranceCost,
    estimatedDeparture,
    estimatedArrival,
    movementTracking,
    createdAt,
  } = request;
  const travelMeans = trip?.travelMeans || 'Not available';
  const departureDate = trip?.departureDate || 'Not available';
  const arrivalDate = trip?.arrivalDate || 'Not available';


  // Debug print so you can inspect in logs
  console.debug('Resolved request object:', {
    pkg,
    trip,
    sender,
    traveler,
    status,
    movementTracking,
  });

  const packageName = pkg?.description || 'Unknown Package';
  const orderId = request._id || 'Unknown Order ID';

  // Try multiple places where origin/destination might be provided
  const routeFrom =
    // trip object likely from Trip model
    trip?.fromLocation ||
    trip?.fromCity ||
    // package payload
    pkg?.fromLocation ||
    pkg?.fromCity ||
    // sometimes backend returns flattened fields
    request.fromLocation ||
    request.fromCity ||
    // last fallback
    'Unknown';

  const routeTo =
    trip?.toLocation ||
    trip?.toCity ||
    pkg?.toLocation ||
    pkg?.toCity ||
    request.toLocation ||
    request.toCity ||
    'Unknown';

  const senderName = sender?.firstName || sender?.email || 'Unknown';
  const travelerName = traveler?.firstName || traveler?.email || 'Unknown';
  const packageWeight = pkg?.packageWeight || 'Unknown';
  const receiverName = pkg?.receiverName || 'Unknown';
  const receiverPhone = pkg?.receiverPhone || 'Unknown';

  // Build timeline (unchanged)
  const timeline = [
    {
      title: 'Request Created',
      time: createdAt ? formatDate(createdAt) : 'Pending',
      active: !!createdAt,
    },
    {
      title: 'Request Accepted',
      time:
        status === 'pending'
          ? 'Pending'
          : formatDate(movementTracking?.find((t) => t.status === 'accepted')?.timestamp || createdAt),
      active: status !== 'pending' && status !== 'rejected' && status !== 'cancelled',
    },
    {
      title: 'Parcel Picked',
      time: movementTracking?.find((t) => t.status === 'intransit')?.timestamp
        ? formatDate(movementTracking.find((t) => t.status === 'intransit').timestamp)
        : ['intransit', 'delivering', 'completed'].includes(status)
        ? 'In Progress'
        : 'Pending',
      active: ['intransit', 'delivering', 'completed'].includes(status),
    },
    {
      title: 'On The Way',
      time: movementTracking?.find((t) => t.status === 'delivering')?.timestamp
        ? formatDate(movementTracking.find((t) => t.status === 'delivering').timestamp)
        : ['delivering', 'completed'].includes(status)
        ? 'In Progress'
        : 'Pending',
      active: ['delivering', 'completed'].includes(status),
    },
    {
      title: 'Delivered',
      time: movementTracking?.find((t) => t.status === 'completed')?.timestamp
        ? formatDate(movementTracking.find((t) => t.status === 'completed').timestamp)
        : status === 'completed'
        ? 'Completed'
        : 'Pending',
      active: status === 'completed',
    },
  ];


  if (!request) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading request details...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Status</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroSection}>
          <View style={styles.packageIcon}>
            <PackageIcon size={32} color={Colors.gold} strokeWidth={1.5} />
          </View>
          <Text style={styles.packageName}>{packageName}</Text>
          <Text style={styles.orderId}>Order ID: {orderId ? orderId.toUpperCase().slice(0, 6) : '------'}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Status Order</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {status === 'pending'
                ? 'Pending'
                : status === 'accepted'
                ? 'Accepted'
                : status === 'rejected'
                ? 'Rejected'
                : status === 'intransit'
                ? 'In Transit'
                : status === 'delivering'
                ? 'Delivering'
                : status === 'completed'
                ? 'Completed'
                : 'Cancelled'}
            </Text>
          </View>

          <View style={styles.timeline}>
            {timeline.map((item, index) => (
              <View key={index}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, item.active && styles.timelineDotActive]} />
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, !item.active && styles.timelineTitleInactive]}>
                      {item.title}
                    </Text>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                  </View>
                </View>
                {index < timeline.length - 1 && <View style={styles.timelineLine} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <MapPin size={18} color={Colors.primary} />
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>From</Text>
              <Text style={styles.locationText}>{routeFrom}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.locationRow}>
            <MapPin size={18} color={Colors.secondary} />
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Shipping to</Text>
              <Text style={styles.locationText}>{routeTo}</Text>
            </View>
          </View>
        </View>

        {/* rest of UI unchanged... */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Package Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sender</Text>
            <Text style={styles.detailValue}>{senderName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receiver</Text>
            <Text style={styles.detailValue}>{receiverName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receiver Phone</Text>
            <Text style={styles.detailValue}>{receiverPhone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package Weight</Text>
            <Text style={styles.detailValue}>{packageWeight} KG</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Travel Mode</Text>
            <Text style={styles.detailValue}>{travelMeans}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Insurance</Text>
            <Text style={styles.detailValue}>{insurance ? `Yes (€${insuranceCost})` : 'No'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Est. Departure</Text>
            <Text style={styles.detailValue}>{formatDate(departureDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Est. Arrival</Text>
            <Text style={styles.detailValue}>{formatDate(arrivalDate)}</Text>
          </View>
        </View>

        {movementTracking?.length > 0 && (
          <View style={styles.trackingCard}>
            <Text style={styles.cardTitle}>Movement History</Text>
            {movementTracking.map((track, index) => (
              <View key={index} style={styles.trackingItem}>
                <MapPin size={16} color={Colors.textLight} />
                <View style={styles.trackingContent}>
                  <Text style={styles.trackingText}>
                    {track.status.charAt(0).toUpperCase() + track.status.slice(1)}
                    {track.location ? ` at ${track.location}` : ''} - {formatDate(track.timestamp)}
                  </Text>
                  {track.notes && <Text style={styles.trackingNotes}>Notes: {track.notes}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}



        {request?.senderProof && (
    <View style={styles.imageCard}>
      <Text style={styles.cardTitle}>Sender Proof</Text>
      <Image
        source={{ uri: request.senderProof }}
        style={styles.packageImage}
        resizeMode="cover"
      />
    </View>
  )}



  <View style={styles.receivedCard}>
<Text style={styles.receivedInfo}>
  Once you have received your package safely, please tap the button below to confirm delivery.
</Text>

<TouchableOpacity
  style={[
    styles.receivedButton,
    request?.senderReceived && { backgroundColor: '#ccc' }, // gray out when received
  ]}
  disabled={request?.senderReceived} // disable when already received
  onPress={async () => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/request/${requestId}/confirm-received`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        alert('✅ Package marked as received! Escrow funds released to traveler.');
        fetchRequestDetails(); // refresh to reflect senderReceived = true
      } else {
        alert(response.data.message || JSON.stringify(response.data));
      }
    } catch (err) {
      console.error('Error marking received:', err);
      const serverData = err.response?.data;
      if (serverData) {
        console.error('Server response data:', serverData);
        alert(`Server error: ${serverData.message || 'See console for details'}`);
        if (serverData.errors) {
          console.log('Validation errors:', serverData.errors);
        }
      } else {
        alert('Failed to update status. Check console for details.');
      }
    }
  }}
>
  <Text style={styles.receivedButtonText}>
    {request?.senderReceived ? 'Received' : 'Mark as Received'}
  </Text>
  </TouchableOpacity>



  {/* Display Dispute Info */}
  {request?.dispute && (
    <View style={styles.disputeInfoContainer}>
      <Text style={styles.disputeInfoTitle}>⚖️ Dispute Details</Text>

      <View style={styles.disputeInfoBox}>
        <View style={styles.statusRow}>
          <Text style={styles.disputeLabel}>Status:</Text>
          <Text
            style={[
              styles.disputeStatus,
              request.dispute.status === 'open'
                ? styles.disputeStatusOpen
                : request.dispute.status === 'resolved'
                ? styles.disputeStatusResolved
                : styles.disputeStatusRejected,
            ]}
          >
            {request.dispute.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.disputeReasonLabel}>Reason</Text>
        <Text style={styles.disputeReasonText}>
          {request.dispute.reason || 'No reason provided'}
        </Text>
      </View>

      {request.dispute.resolutionNote && (
        <View style={styles.section}>
          <Text style={styles.disputeReasonLabel}>Resolution Note</Text>
          <Text style={styles.disputeReasonText}>
            {request.dispute.resolutionNote}
          </Text>
        </View>
      )}

      <View style={styles.datesContainer}>
        <Text style={styles.disputeDate}>
          📅 Raised on: {new Date(request.dispute.createdAt).toLocaleString()}
        </Text>
        {request.dispute.resolvedAt && (
          <Text style={styles.disputeDate}>
            ✅ Resolved on: {new Date(request.dispute.resolvedAt).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  )}




  {/* If cancelled → hide dispute button & show refund button */}
  {status === "cancelled" ? (
    <View style={styles.cancelledBox}>
      <Text style={styles.cancelledText}>
        Traveller cancelled this order.
      </Text>

      <TouchableOpacity
    style={styles.refundButton}
    onPress={async () => {
      try {
        const userId = request?.sender?._id || request?.sender?.id; // or whatever your DB field is
        const stripePaymentIntentId = request?.payment?.stripePaymentIntentId;
        const paystackReference = request?.payment?.paystackReference;

        if (!userId || (!stripePaymentIntentId && !paystackReference)) {
          return alert('User or payment info missing.');
        }

        const reason = "Order cancelled by traveler"; // or let user input

        const payload: any = { userId, reason };
        if (stripePaymentIntentId) payload.paymentIntentId = stripePaymentIntentId;
        if (paystackReference) payload.paystackReference = paystackReference;

        const response = await axios.post(
          `${API_BASE_URL}/request`,
          payload,
          { withCredentials: true }
        );

        if (response.data.success) {
          alert('✅ Refund request submitted successfully!');
        } else {
          alert('❌ Failed to submit refund: ' + (response.data.message || 'Unknown error'));
        }

      } catch (err) {
        console.error('Refund request error:', err.response?.data || err.message);
        alert('❌ Error submitting refund. Check console for details.');
      }
    }}
  >
    <Text style={styles.refundButtonText}>Request Refund</Text>
  </TouchableOpacity>


    </View>
  ) : (
    /* If NOT cancelled → show dispute button (only if dispute doesn't already exist) */
    !request?.dispute && (
      <TouchableOpacity
        style={[styles.disputeButton]}
        onPress={() => setDisputeModalVisible(true)}
      >
        <Text style={styles.disputeButtonText}>Raise a Dispute</Text>
      </TouchableOpacity>
    )
  )}




  {/* Dispute Modal */}
  <Modal
    visible={disputeModalVisible}
    animationType="slide"
    transparent
    onRequestClose={() => setDisputeModalVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Raise a Dispute</Text>
        <Text style={styles.modalInfo}>Request ID: {orderId ? orderId.toUpperCase().slice(0, 6) : '------'}</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe your reason for dispute..."
          placeholderTextColor="#888"
          multiline
          value={disputeReason}
          onChangeText={setDisputeReason}
        />
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setDisputeModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            disabled={submittingDispute}
            onPress={async () => {
              if (!disputeReason.trim()) return alert('Please enter your reason.');

              try {
                setSubmittingDispute(true);
                const res = await axios.post(
                  `${API_BASE_URL}/request/${requestId}/raise-dispute`,
                  {
                    raisedBy: sender?._id,
                    reason: disputeReason,
                  },
                  { withCredentials: true }
                );

                if (res.data.success) {
                  alert('✅ Dispute raised successfully!');
                  setDisputeReason('');
                  setDisputeModalVisible(false);
                  fetchRequestDetails(); // refresh
                } else {
                  alert(res.data.message || 'Failed to raise dispute.');
                }
              } catch (err) {
                console.error(err);
                alert('Error submitting dispute.');
              } finally {
                setSubmittingDispute(false);
              }
            }}
          >
            <Text style={styles.modalButtonText}>
              {submittingDispute ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
  </View>




        <View style={styles.courierCard}>
          <Text style={styles.cardTitle}>Courier - Express</Text>
          <View style={styles.courierInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{travelerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.courierDetails}>
              <Text style={styles.courierName}>{travelerName}</Text>
              <Text style={styles.courierRole}>Courier - Express</Text>
            </View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                if (traveler?._id) {
                  router.push(`/messages`);
                } else {
                  alert('Traveler ID not available');
                }
              }}
            >
              <MessageCircle size={20} color={Colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                if (receiverPhone) {
                  Linking.openURL(`tel:${receiverPhone}`);
                } else {
                  alert('Phone number not available');
                }
              }}
            >
              <Phone size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.packageMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status Order</Text>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  {status?.charAt(0)?.toUpperCase() + status?.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Trip Route</Text>
              <Text style={styles.metaValue}>
                {routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : 'Trip route not available'}
              </Text>
            </View>
          </View>
        </View>


        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// (styles unchanged — keep your existing styles)
const styles = StyleSheet.create({
  /* ... paste your styles here, unchanged ... */
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 10, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 24, color: Colors.white },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.white },
  heroSection: { alignItems: 'center', paddingHorizontal: 20 },
  packageIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  packageName: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  orderId: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  content: { flex: 1, marginTop: -20 },
  statusCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 16, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: Colors.successLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 24 },
  statusText: { fontSize: 13, fontWeight: '600', color: Colors.white },
  timeline: { paddingLeft: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border, marginTop: 4, marginRight: 16 },
  timelineDotActive: { backgroundColor: Colors.primary },
  timelineContent: { flex: 1, paddingBottom: 4 },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  timelineTitleInactive: { color: Colors.textLight },
  timelineTime: { fontSize: 13, color: Colors.textLight },
  timelineLine: { width: 2, height: 24, backgroundColor: Colors.border, marginLeft: 5, marginVertical: 4 },
  locationCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 16, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  locationContent: { flex: 1 },
  locationLabel: { fontSize: 13, color: Colors.textLight, marginBottom: 4 },
  locationText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  detailsCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 16, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: Colors.textLight, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '500', color: Colors.text, flex: 1, textAlign: 'right' },
  trackingCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 16, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  trackingItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  trackingContent: { flex: 1 },
  trackingText: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  trackingNotes: { fontSize: 12, color: Colors.textLight },
  courierCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginHorizontal: 20, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  courierInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  courierDetails: { flex: 1 },
  courierName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  courierRole: { fontSize: 13, color: Colors.textLight },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  packageMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 13, color: Colors.textLight, marginBottom: 8 },
  metaBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  metaBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  metaValue: { fontSize: 15, fontWeight: '600', color: Colors.text },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.error, textAlign: 'center', marginBottom: 20 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.primary, marginTop: 10 },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  imageCard: {
  backgroundColor: Colors.white,
  borderRadius: 20,
  padding: 20,
  marginHorizontal: 20,
  marginBottom: 16,
  shadowColor: Colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
},
packageImage: {
  width: '100%',
  height: 200,
  borderRadius: 12,
  marginTop: 10,
},
receivedCard: {
  backgroundColor: Colors.white,
  borderRadius: 20,
  padding: 20,
  marginHorizontal: 20,
  marginBottom: 20,
  shadowColor: Colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
  alignItems: 'center',
},
cancelledBox: {
  backgroundColor: "#FFE8E8",
  padding: 15,
  borderRadius: 10,
  marginTop: 15,
  borderWidth: 1,
  borderColor: "#FFB3B3",
  alignItems: "center",
},

cancelledText: {
  color: "#B00000",
  fontSize: 15,
  fontWeight: "600",
  marginBottom: 10,
  textAlign: "center",
},

refundButton: {
  backgroundColor: Colors.primary,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 10,
},

refundButtonText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
},

receivedInfo: {
  fontSize: 14,
  color: Colors.textLight,
  textAlign: 'center',
  marginBottom: 12,
},
receivedButton: {
  backgroundColor: Colors.primary,
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 24,
},
receivedButtonText: {
  fontSize: 15,
  fontWeight: '600',
  color: Colors.white,
},
disputeButton: {
  backgroundColor: '#F44336',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 24,
  marginTop: 10,
},
disputeButtonText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#fff',
  textAlign: 'center',
},
modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.4)',
},
modalContainer: {
  backgroundColor: '#fff',
  width: '85%',
  borderRadius: 16,
  padding: 20,
  elevation: 10,
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 8,
  color: Colors.text,
},
modalInfo: {
  fontSize: 13,
  color: Colors.textLight,
  marginBottom: 12,
},
textArea: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 10,
  height: 100,
  padding: 10,
  textAlignVertical: 'top',
  marginBottom: 16,
},
modalActions: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 10,
},
modalButton: {
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 16,
},
cancelButton: {
  backgroundColor: '#ccc',
},
submitButton: {
  backgroundColor: Colors.primary,
},
modalButtonText: {
  color: '#fff',
  fontWeight: '600',
},
disputeInfoContainer: {
   backgroundColor: '#fff',
   padding: 18,
   borderRadius: 16,
   marginTop: 20,
   marginHorizontal: 10,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.1,
   shadowRadius: 6,
   elevation: 3,
 },
 disputeInfoTitle: {
   fontSize: 18,
   fontWeight: '700',
   color: '#1E293B',
   marginBottom: 12,
   textAlign: 'center',
 },
 disputeInfoBox: {
   backgroundColor: '#F8FAFC',
   borderRadius: 12,
   paddingVertical: 10,
   paddingHorizontal: 14,
   marginBottom: 10,
   borderWidth: 1,
   borderColor: '#E2E8F0',
 },
 statusRow: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
 },
 disputeLabel: {
   fontSize: 15,
   fontWeight: '600',
   color: '#334155',
 },
 disputeStatus: {
   fontSize: 14,
   fontWeight: '700',
   paddingVertical: 4,
   paddingHorizontal: 10,
   borderRadius: 12,
   textAlign: 'center',
   overflow: 'hidden',
 },
 disputeStatusOpen: {
   backgroundColor: '#FEF3C7',
   color: '#92400E',
 },
 disputeStatusResolved: {
   backgroundColor: '#DCFCE7',
   color: '#166534',
 },
 disputeStatusRejected: {
   backgroundColor: '#FEE2E2',
   color: '#991B1B',
 },
 section: {
   marginVertical: 8,
 },
 disputeReasonLabel: {
   fontSize: 15,
   fontWeight: '600',
   color: '#1E293B',
   marginBottom: 4,
 },
 disputeReasonText: {
   fontSize: 14,
   color: '#475569',
   backgroundColor: '#F1F5F9',
   padding: 10,
   borderRadius: 10,
   lineHeight: 20,
 },
 datesContainer: {
   marginTop: 12,
   borderTopWidth: 1,
   borderTopColor: '#E2E8F0',
   paddingTop: 10,
 },
 disputeDate: {
   fontSize: 13,
   color: '#64748B',
   marginTop: 2,
 },
});
