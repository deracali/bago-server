import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { MapPin, Calendar, Weight, Star, Plane, Shield, ChevronRight } from 'lucide-react-native';
import axios from 'axios';
import { backendomain } from '@/utils/backendDomain';
import { Car, Bus, Train } from 'lucide-react-native';


const API_BASE_URL = `${backendomain.backendomain}/api/baggo`;

export default function SearchTravelersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fromCountry, fromCity, toCountry, toCity, packageWeight, packageId, amount, image } = params;

  const [insurance, setInsurance] = useState(false);
  const [trips, setTrips] = useState([]);
  const [matchedTrips, setMatchedTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const weightNum = parseFloat((packageWeight as string).replace(/[^\d.]/g, '')) || 0;
  const amountNum = parseFloat(amount) || 0;
const insuranceCost = amountNum * 0.030; // 0.03% of amount


const travelMeansIcons = {
  plane: Plane,
  car: Car,
  bus: Bus,
  train: Train,
};

  useEffect(() => {
    const fetchTravelers = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/getTravelers`, {
          withCredentials: true,
        });

        const { findUsers, gettravelers } = response.data.data;

        // Map users to a lookup object
        const userMap = findUsers.reduce((acc, user) => {
          acc[user._id] = user;
          return acc;
        }, {});

        // Enrich trips with user data
        const enrichedTrips = gettravelers.map((trip) => ({
    ...trip,
    user: userMap[trip.user] || { _id: trip.user }, // fallback to ID itself
  }));


        // Filter active trips
        const activeTrips = enrichedTrips.filter((trip) => trip.status === 'active');

        // Match trips to the package's route and weight
        const normalize = (str) => str?.trim().toLowerCase();

  const matched = activeTrips.filter((trip) => {
    const from = normalize(trip.fromLocation);
    const to = normalize(trip.toLocation);

    const fromMatch =
      from.includes(normalize(fromCity)) || from.includes(normalize(fromCountry));
    const toMatch =
      to.includes(normalize(toCity)) || to.includes(normalize(toCountry));

    return fromMatch && toMatch && trip.availableKg >= weightNum;
  });


        setTrips(activeTrips);
        setMatchedTrips(matched);
      } catch (error) {
        console.error('Error fetching travelers:', error);
        const errorMessage =
          error.response?.data?.message || 'Failed to fetch travelers. Please try again.';
        Alert.alert('Error', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTravelers();
  }, [fromCity, fromCountry, toCity, toCountry, weightNum]);

  const handleSelectTraveler = async (tripId, travelerId, amount) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/RequestPackage`,
        {
          travelerId,
          packageId,
          tripId,
          amount, // ✅ send amount here
          insurance: insurance ? 'yes' : 'no',
          insuranceCost: insuranceCost.toFixed(2),
        },
        { withCredentials: true }
      );

      Alert.alert('Success', 'You have successfully sent the request', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      console.error('Error creating request:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to create request. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Travelers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <MapPin size={18} color={Colors.primary} />
            <Text style={styles.routeText}>
              {fromCity}, {fromCountry}
            </Text>
          </View>
          <Text style={styles.routeArrow}>→</Text>
          <View style={styles.routeRow}>
            <MapPin size={18} color={Colors.secondary} />
            <Text style={styles.routeText}>
              {toCity}, {toCountry}
            </Text>
          </View>
        </View>

        <View style={styles.insuranceCard}>
          <View style={styles.insuranceIcon}>
            <Shield size={24} color={Colors.primary} />
          </View>
          <View style={styles.insuranceContent}>
            <Text style={styles.insuranceTitle}>Package Insurance</Text>
            <Text style={styles.insuranceSubtitle}>
              3% per kg • Total: {insuranceCost.toFixed(2)}
            </Text>
            <Text style={styles.insuranceDesc}>
              Protect your package against loss or damage during transit
            </Text>
          </View>
          <Switch
            value={insurance}
            onValueChange={setInsurance}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {isLoading ? 'Loading...' : `${matchedTrips.length} Travelers Match Your Route`}
        </Text>

        {isLoading ? (
          <Text style={styles.loadingText}>Fetching travelers...</Text>
        ) : matchedTrips.length === 0 ? (
          <Text style={styles.noResultsText}>
            No travelers found for this route, but here are other available travelers
          </Text>
        ) : null}

        {trips.length > 0 ? (
          trips.map((trip) => (
            // <TouchableOpacity
            //   key={trip._id}
            //   style={[
            //     styles.tripCard,
            //     matchedTrips.includes(trip) ? styles.matchedTripCard : styles.nonMatchedTripCard,
            //   ]}
            //   onPress={() => handleSelectTraveler(trip._id, trip.user._id)}
            // >
            <TouchableOpacity
              key={trip._id}
              style={[
                styles.tripCard,
                matchedTrips.includes(trip)
                  ? styles.matchedTripCard
                  : styles.nonMatchedTripCard,
              ]}
              
    onPress={() =>
      router.push({
        pathname: '/payment',
        params: {
          travellerName: trip.user?.firstName || 'Traveler',
          travellerEmail: trip.user?.email || 'unknown@example.com',
          amount: amount,
          travelerId: trip.user?._id, // ✅ Pass only the string ID
          tripId: trip._id,
          packageId,
          insurance: insurance ? 'yes' : 'no',
          insuranceCost: insuranceCost.toFixed(2),
          image: image || null,
        },
      })
    }
    >

    <View style={styles.tripHeader}>
  <View style={styles.travelerInfo}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>
        {trip.user?.firstName?.charAt(0).toUpperCase() || 'T'}
      </Text>
    </View>
    <View style={styles.travelerDetails}>
      <Text style={styles.travelerName}>
        {trip.user?.firstName || 'Traveler'}
      </Text>
      <View style={styles.ratingRow}>
        <Star size={12} color={Colors.gold} fill={Colors.gold} />
        <Text style={styles.ratingText}>
          {(trip.user?.average_rating || 0).toFixed(1)}
        </Text>
        <Text style={styles.tripCount}>
          • {trip.user?.total_trips || 0} trips
        </Text>
        {trip.user?.kyc_verified && (
          <Text style={styles.verified}>• ✓ Verified</Text>
        )}
      </View>
    </View>
  </View>

  <View style={styles.modeIcon}>
    {(() => {
      // Select the correct icon, default to Plane if missing
      const IconComponent = travelMeansIcons[trip.travelMeans?.toLowerCase()] || Plane;
      return <IconComponent size={18} color={Colors.primary} />;
    })()}
  </View>
</View>

      <View style={styles.tripRoute}>
        <MapPin size={16} color={Colors.textLight} />
        <Text style={styles.tripRouteText} numberOfLines={1}>
          {trip.fromLocation} → {trip.toLocation}
        </Text>
      </View>

      <View style={styles.tripMeta}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Colors.textLight} />
          <Text style={styles.metaText}>
            {new Date(trip.departureDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Weight size={14} color={Colors.textLight} />
          <Text style={styles.metaText}>{trip.availableKg} kg available</Text>
        </View>
        <View style={styles.metaItem}>

          <Text style={styles.metaText}>Mode: {trip.travelMeans}</Text>
        </View>
      </View>
    </TouchableOpacity>

          ))
        ) : (
          <Text style={styles.noResultsText}>No travelers available at the moment.</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  routeArrow: {
    fontSize: 16,
    color: Colors.textLight,
    marginHorizontal: 8,
  },
  insuranceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insuranceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insuranceContent: {
    flex: 1,
    marginRight: 12,
  },
  insuranceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  insuranceSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  insuranceDesc: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  matchedTripCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  nonMatchedTripCard: {
    opacity: 0.8,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  travelerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  travelerDetails: {
    flex: 1,
  },
  travelerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  tripCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  verified: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tripRouteText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  priceContainer: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});
