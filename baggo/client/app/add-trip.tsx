import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Platform
} from "react-native";
import { Image } from "react-native";
import { useState, useEffect,useRef  } from "react";
import { useRouter } from "expo-router";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import axios from "axios";
import { Colors } from "@/constants/Colors";
import { MapPin, Calendar, Weight, Plane, Bus,Train, Car, Ship, MoreHorizontal } from "lucide-react-native";
import { backendomain } from "@/utils/backendDomain";

const RAPID_API_KEY = "764ae3a2d0msh0d44a93e665c289p104415jsn9a0e1853cc6e";

export default function AddTripScreen() {
  const router = useRouter();
  const [fromCountry, setFromCountry] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [toCity, setToCity] = useState("");
  const [availableKg, setAvailableKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [travelMeans, settravelMeans] = useState(""); // "Air" or "Land"
  const [departureDate, setDepartureDate] = useState("");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [arrivalDate, setArrivalDate] = useState("");
  const [isArrivalDatePickerVisible, setArrivalDatePickerVisibility] = useState(false);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);


  // --- Modal State ---
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectingField, setSelectingField] = useState(null);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  useEffect(() => {
    fetchCountries();
    checkKycStatus();
  }, []);

  // replace your current checkKycStatus function with this
  const checkKycStatus = async () => {
    try {
      const res = await axios.get(`${backendomain.backendomain}/api/baggo/Profile`, {
        withCredentials: true,
      });

      // PaymentScreen reads: res.data?.data?.findUser?.status
      const status = res.data?.data?.findUser?.status;
      console.log("AddTrip: fetched KYC status:", status);

      // convert to boolean exactly as PaymentScreen expects
      setIsKycVerified(status === "verified");
    } catch (err) {
      console.error("AddTrip: error checking KYC:", err);
      setIsKycVerified(false); // fail-safe: treat as not verified
    }
  };


  const fetchCountries = async () => {
    try {
      const res = await axios.get("https://restcountries.com/v3.1/all?fields=name,flags");
      const formatted = res.data
        .map((c) => ({
          name: c?.name?.common || "",
          flag: c?.flags?.png || null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCountries(formatted);
    } catch {
      Alert.alert("Error", "Could not fetch countries");
    }
  };

  const fetchCities = async (countryName: string) => {
    try {
      setLoadingCities(true);

      // Get ISO2 code
      const codeRes = await axios.get(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true&fields=cca2`
      );

      const countryCode = codeRes.data?.[0]?.cca2?.toUpperCase();
      if (!countryCode) {
        console.warn('No ISO code found for', countryName);
        return [];
      }

      // Fetch cities
      const response = await axios.get(
        `https://wft-geo-db.p.rapidapi.com/v1/geo/cities`,
        {
          headers: {
            'X-RapidAPI-Key': RAPID_API_KEY,
            'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
          },
          params: {
            countryIds: countryCode,
            limit: 10,
            sort: '-population',
          },
        }
      );

      const cityList = response.data?.data?.map((c) => c.name) || [];
      if (cityList.length === 0) {
        console.warn(`No cities found for ${countryName}`);
        return [];
      }

      return cityList;
    } catch (err: any) {
      console.error('City fetch error:', err?.response?.status, err?.message);

      // ✅ Handle 403 or any API limit/network failure
      if (err?.response?.status === 403) {
        console.warn('RapidAPI quota or access denied. Falling back to manual input.');
        return [];
      }

      if (err?.response?.data?.errors?.[0]?.code === 'ENTITY_NOT_FOUND') {
        console.warn('Country not found in GeoDB, fallback to manual entry.');
        return [];
      }

      return [];
    } finally {
      setLoadingCities(false);
    }
  };

  const openCountryModal = (field) => {
    setSelectingField(field);
    setCountrySearch("");
    setShowCountryModal(true);
  };
  const cityInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (cities.length === 0 && showCityModal) {
      setTimeout(() => cityInputRef.current?.focus(), 300);
    }
  }, [cities, showCityModal]);

  const openCityModal = async (field) => {
    const country = field === "from" ? fromCountry : toCountry;
    if (!country) {
      Alert.alert("Select Country First", "Please choose a country before selecting a city.");
      return;
    }
    setSelectingField(field);
    setShowCityModal(true);
    setLoadingCities(true);
    const cityList = await fetchCities(country);
    setCities(cityList);
    setLoadingCities(false);
  };

  const handleSelectCountry = (countryName) => {
    if (selectingField === "from") setFromCountry(countryName);
    if (selectingField === "to") setToCountry(countryName);
    setShowCountryModal(false);
  };

  const handleSelectCity = (cityName) => {
    if (selectingField === "from") setFromCity(cityName);
    if (selectingField === "to") setToCity(cityName);
    setShowCityModal(false);
  };

  const handleConfirmDate = (date) => {
    const formatted = date.toISOString().split("T")[0];
    setDepartureDate(formatted);
    setDatePickerVisibility(false);
  };

  const handleSubmit = async () => {
    // 1. Validation
    if (!fromCountry || !fromCity || !toCountry || !toCity || !departureDate || !arrivalDate || !availableKg || !travelMeans) {
      setError("All fields are required");
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!isKycVerified) {
      setShowKycModal(true);
      return;
    }

    setLoading(true);
    setError(""); // Clear previous errors

    // ✅ Prepare payload
    const payload = {
      fromLocation: `${fromCity}, ${fromCountry}`,
      toLocation: `${toCity}, ${toCountry}`,
      departureDate,
      arrivalDate,
      availableKg: parseFloat(availableKg),
      travelMeans: travelMeans.toLowerCase(),
    };

    console.log("AddTrip: Submitting payload:", payload);

    try {
      const response = await axios.post(
        `${backendomain.backendomain}/api/baggo/AddAtrip`,
        payload,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log("AddTrip: Response received:", response.data);

      if (response.status === 200 || response.status === 201) {
        Alert.alert("Success", "Trip created successfully!");
        router.back();
      }
    } catch (err: any) {
      console.error("AddTrip: Submission error object:", err);

      // Detailed logging
      if (err.response) {
        console.error("AddTrip: Error response data:", err.response.data);
        console.error("AddTrip: Error response status:", err.response.status);
        console.error("AddTrip: Error response headers:", err.response.headers);
      } else if (err.request) {
        console.error("AddTrip: No response received, request made:", err.request);
      } else {
        console.error("AddTrip: Axios error message:", err.message);
      }

      const errorMessage = err.response?.data?.message || "Failed to create trip. Please try again.";
      setError(errorMessage);
      Alert.alert("Submission Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };



  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Trip</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Create New Trip</Text>
        <Text style={styles.subtitle}>Share your travel plans and earn money by carrying packages</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* From Section */}
        <Text style={styles.label}>From Country</Text>
        <TouchableOpacity style={styles.inputContainer} onPress={() => openCountryModal("from")}>
          <MapPin size={20} color={Colors.textLight} />
          <Text style={styles.input}>{fromCountry || "Select Country"}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>From City</Text>
        <TouchableOpacity style={styles.inputContainer} onPress={() => openCityModal("from")}>
          <MapPin size={20} color={Colors.textLight} />
          <Text style={styles.input}>{fromCity || "Select City"}</Text>
        </TouchableOpacity>

        {/* To Section */}
        <Text style={styles.label}>To Country</Text>
        <TouchableOpacity style={styles.inputContainer} onPress={() => openCountryModal("to")}>
          <MapPin size={20} color={Colors.textLight} />
          <Text style={styles.input}>{toCountry || "Select Country"}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>To City</Text>
        <TouchableOpacity style={styles.inputContainer} onPress={() => openCityModal("to")}>
          <MapPin size={20} color={Colors.textLight} />
          <Text style={styles.input}>{toCity || "Select City"}</Text>
        </TouchableOpacity>

        {/* Travel Mode */}
        <Text style={styles.label}>Travel Method</Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.modeContainer}
  >
    <TouchableOpacity
      style={[styles.modeButton, travelMeans === "airplane" && styles.modeButtonActive]}
      onPress={() => settravelMeans("airplane")}
    >
      <Plane size={18} color={travelMeans === "airplane" ? Colors.white : Colors.textLight} />
      <Text style={[styles.modeText, { color: travelMeans === "airplane" ? Colors.white : Colors.text }]}>
        Airplane
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.modeButton, travelMeans === "bus" && styles.modeButtonActive]}
      onPress={() => settravelMeans("bus")}
    >
      <Bus size={18} color={travelMeans === "bus" ? Colors.white : Colors.textLight} />
      <Text style={[styles.modeText, { color: travelMeans === "bus" ? Colors.white : Colors.text }]}>
        Bus
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.modeButton, travelMeans === "train" && styles.modeButtonActive]}
      onPress={() => settravelMeans("train")}
    >
      <Train size={18} color={travelMeans === "train" ? Colors.white : Colors.textLight} />
      <Text style={[styles.modeText, { color: travelMeans === "train" ? Colors.white : Colors.text }]}>
        Train
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.modeButton, travelMeans === "car" && styles.modeButtonActive]}
      onPress={() => settravelMeans("car")}
    >
      <Car size={18} color={travelMeans === "car" ? Colors.white : Colors.textLight} />
      <Text style={[styles.modeText, { color: travelMeans === "car" ? Colors.white : Colors.text }]}>
        Car
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.modeButton, travelMeans === "ship" && styles.modeButtonActive]}
      onPress={() => settravelMeans("ship")}
    >
      <Ship size={18} color={travelMeans === "ship" ? Colors.white : Colors.textLight} />
      <Text style={[styles.modeText, { color: travelMeans === "ship" ? Colors.white : Colors.text }]}>
        Ship
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.modeButton, travelMeans === "other" && styles.modeButtonActive]}
      onPress={() => settravelMeans("other")}
    >
      <MoreHorizontal size={18} color={travelMeans === "other" ? Colors.white : Colors.textLight} />
      <Text style={[styles.modeText, { color: travelMeans === "other" ? Colors.white : Colors.text }]}>
        Other
      </Text>
    </TouchableOpacity>
  </ScrollView>




        {/* Date Picker */}
        <Text style={styles.label}>Departure Date</Text>
        <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerVisibility(true)}>
          <Calendar size={20} color={Colors.textLight} />
          <Text style={styles.input}>{departureDate || "Select Departure Date"}</Text>
        </TouchableOpacity>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisibility(false)}
          minimumDate={new Date()}
        />

        {/* Arrival Date */}
<Text style={styles.label}>Arrival Date</Text>
<TouchableOpacity style={styles.inputContainer} onPress={() => setArrivalDatePickerVisibility(true)}>
  <Calendar size={20} color={Colors.textLight} />
  <Text style={styles.input}>{arrivalDate || "Select Arrival Date"}</Text>
</TouchableOpacity>

<DateTimePickerModal
  isVisible={isArrivalDatePickerVisible}
  mode="date"
  onConfirm={(date) => {
    const formatted = date.toISOString().split("T")[0];
    setArrivalDate(formatted);
    setArrivalDatePickerVisibility(false);
  }}
  onCancel={() => setArrivalDatePickerVisibility(false)}
  minimumDate={new Date(departureDate || new Date())}
/>


        {/* Available Space */}
        <Text style={styles.label}>Available Luggage Space (kg)</Text>
        <View style={styles.inputContainer}>
          <Weight size={20} color={Colors.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Enter available weight"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={availableKg}
            onChangeText={setAvailableKg}
          />
        </View>



        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Create Trip</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Country Modal */}
      <Modal visible={showCountryModal} animationType="slide">
        <View style={styles.modalContainerModal}>
          <TextInput
            placeholder="Search country..."
            value={countrySearch}
            onChangeText={setCountrySearch}
            style={styles.searchInput}
          />
          <FlatList
    data={filteredCountries}
    keyExtractor={(item) => item.name}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={styles.modalItem}
        onPress={() => handleSelectCountry(item.name)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {item.flag && (
            <Image
              source={{ uri: item.flag }}
              style={{ width: 24, height: 16, borderRadius: 2 }}
              resizeMode="cover"
            />
          )}
          <Text style={styles.modalText}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    )}
  />

  <TouchableOpacity
    style={styles.closeButton}
    onPress={() => setShowCountryModal(false)} // ✅ correct one
  >
    <Text style={styles.closeButtonText}>Close</Text>
  </TouchableOpacity>


        </View>
      </Modal>

      {/* City Modal */}
      <Modal visible={showCityModal} animationType="slide">
        <View style={styles.modalContainerModal}>
        {loadingCities ? (
       <ActivityIndicator size="large" color={Colors.primary} />
     ) : cities.length > 0 ? (
       <>
         <TextInput
           placeholder="Search city..."
           value={citySearch}
           onChangeText={setCitySearch}
           style={styles.searchInput}
         />
         <FlatList
           data={cities.filter((city) =>
             city.toLowerCase().includes(citySearch.toLowerCase())
           )}
           keyExtractor={(item) => item}
           renderItem={({ item }) => (
             <TouchableOpacity
               style={styles.modalItem}
               onPress={() => handleSelectCity(item)}
             >
               <Text style={styles.modalText}>{item}</Text>
             </TouchableOpacity>
           )}
           ListFooterComponent={
             <TouchableOpacity
               style={{
                 marginTop: 10,
                 padding: 12,
                 borderRadius: 10,
                 backgroundColor: Colors.secondary,
                 alignItems: "center",
               }}
               onPress={() => setCities([])} // switch to manual entry
             >
               <Text style={{ color: "#fff", fontWeight: "600" }}>
                 Can't find my city?
               </Text>
             </TouchableOpacity>
           }
         />
       </>
     ) : (
       // 🧠 Manual entry when city list empty
       <View style={{ marginTop: 20 }}>
         <Text style={[styles.modalText, { marginBottom: 8 }]}>
           Enter your city manually
         </Text>
         <TextInput
           ref={cityInputRef}
           style={[
             styles.searchInput,
             {
               backgroundColor: Colors.white,
               borderRadius: 10,
               paddingHorizontal: 12,
               height: 48,
               borderWidth: 1,
               borderColor: Colors.border,
             },
           ]}
           placeholder="Type your city name..."
           placeholderTextColor={Colors.textMuted}
           value={citySearch}
           onChangeText={setCitySearch}
         />
         <TouchableOpacity
           style={{
             marginTop: 16,
             backgroundColor: Colors.primary,
             padding: 14,
             borderRadius: 10,
             alignItems: "center",
           }}
           onPress={() => {
             if (selectingField === "from") setFromCity(citySearch.trim());
             else if (selectingField === "to") setToCity(citySearch.trim());
             setShowCityModal(false);
             setSelectingField(null);
           }}
         >
           <Text style={{ color: "#fff", fontWeight: "600" }}>Use this city</Text>
         </TouchableOpacity>
       </View>
     )}

          <TouchableOpacity
    style={styles.closeButton}
    onPress={() => setShowCityModal(false)}
  >
    <Text style={styles.closeButtonText}>Close</Text>
  </TouchableOpacity>

        </View>
      </Modal>

      {/* KYC Modal */}
      <Modal
        visible={showKycModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKycModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerKyc}>
            <Text style={styles.modalTitle}>KYC Verification Required</Text>
            <Text style={styles.modalMessage}>
              You need to verify your identity before creating a trip.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowKycModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalVerifyButton]}
                onPress={() => {
                  setShowKycModal(false);
                  router.push("/kyc-verification"); // or "/kyc-verification" depending on your route
                }}
              >
                <Text style={styles.modalVerifyText}>Go to KYC</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40 },
  backIcon: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 6 },
  subtitle: { color: Colors.textLight, marginBottom: 24 },
  label: { fontWeight: "600", color: Colors.text, marginTop: 18, marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  modeContainer: { flexDirection: "row", gap: 12 },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeText: { marginLeft: 8, fontWeight: "500" },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: Colors.error, textAlign: "center", marginVertical: 8 },
modalContainerModal:  {
  flex: 1,
  padding: 20,
  backgroundColor: Colors.background,
  paddingTop: 50, // 👈 pushes the modal content down
  borderTopLeftRadius: 25,
  borderTopRightRadius: 25,
},

  searchInput: {
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalText: { fontSize: 16 },
  closeButton: {
  backgroundColor: Colors.primary || "#5240E8", // 💜 button background
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 20,
  alignSelf: "center", // centers the button in modal
  width: "50%", // optional, can adjust
},
closeButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
  textAlign: "center",
},
modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
modalContainerKyc: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: "#f1f1f1",
  },
  modalVerifyButton: {
    backgroundColor: Colors.primary,
  },
  modalCancelText: {
    color: "#333",
    fontWeight: "600",
  },
  modalVerifyText: {
    color: "#fff",
    fontWeight: "600",
  },
});
const modalStyles = {
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#5240E8',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#E53E3E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
};
