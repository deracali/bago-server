import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Platform ,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useState, useEffect, useRef  } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { MapPin, Weight } from 'lucide-react-native';
import axios from 'axios';
import { backendomain } from '@/utils/backendDomain';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from 'expo-file-system';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from 'expo-location';


const API_BASE_URL = `${backendomain.backendomain}/api/baggo`;

export default function SendPackageScreen() {
  const router = useRouter();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [fromCountry, setFromCountry] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [toCity, setToCity] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // single image state
  const [image, setImage] = useState<string | null>(null)
;
  const [imagePreview, setImagePreview] = useState<string | null>(null)
;

  // ---- modal + countries state ----
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectingField, setSelectingField] = useState<'from' | 'to' | null>(null);
  const [countries, setCountries] = useState<{ name: string; flag?: string }[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countrySearch, setCountrySearch] = useState('');

  const [showCityModal, setShowCityModal] = useState(false);
  const [selectingCityField, setSelectingCityField] = useState<'from' | 'to' | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);

  const [receiverCountryCode, setReceiverCountryCode] = useState('');
  const [receiverFlag, setReceiverFlag] = useState('');


  const RAPID_API_KEY = '764ae3a2d0msh0d44a93e665c289p104415jsn9a0e1853cc6e';


  // add next to other states
  const [value, setValue] = useState(''); // package monetary value as string

  // request gallery permission
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "You need to allow gallery access to pick an image.");
      }
    })();
  }, []);

  // fetch countries once
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);
        const res = await axios.get('https://restcountries.com/v3.1/all?fields=name,flags');
        const formatted = res.data
          .map((c: any) => ({
            name: c?.name?.common || '',
            flag: c?.flags?.png || c?.flags?.svg || null,
          }))
          .filter((c: any) => c.name)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCountries(formatted);
      } catch (err) {
        console.error('Country fetch error', err);
        Alert.alert('Error', 'Could not fetch countries.');
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);


  const openCountryModal = (field: 'from' | 'to') => {
    setSelectingField(field);
    setCountrySearch('');
    setShowCountryModal(true);
  };

  const handleSelectCountry = async (countryName: string) => {
    if (selectingField === 'from') setFromCountry(countryName);
    else if (selectingField === 'to') setToCountry(countryName);
    else {
      // receiver phone selection
      const info = await fetchCountryInfo(countryName);
      setReceiverCountryCode(info.code);
      setReceiverFlag(info.flag);
    }

    setShowCountryModal(false);
    setSelectingField(null);
  };



  const fetchCountryInfo = async (countryName: string) => {
    try {
      const res = await axios.get(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true&fields=idd,flags,cca2`
      );
      // fullText=true ensures an exact match
      const data = res.data?.[0];
      return {
        code: data?.idd?.root && data?.idd?.suffixes?.length
          ? `${data.idd.root}${data.idd.suffixes[0]}`
          : '',
        flag: data?.flags?.png || data?.flags?.svg || null,
        iso: data?.cca2 || '',
      };
    } catch (err) {
      console.error('Error fetching country info:', err);
      return { code: '', flag: null, iso: '' };
    }
  };



  const fetchCities = async (countryName: string) => {
    try {
      setLoadingCities(true);

      // Get ISO2 code
      const codeRes = await axios.get(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true&fields=cca2`
      );

      let countryCode = codeRes.data?.[0]?.cca2?.toUpperCase();

      if (!countryCode) {
        console.warn('No country code found for', countryName);
        return [];
      }

      // Fetch cities from GeoDB
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
        console.warn(`No cities found for ${countryName} in GeoDB`);
        // Fallback: allow user to manually type city
        return [];
      }

      return cityList;
    } catch (err: any) {
      console.error('Error fetching cities for', countryName, err?.response?.data || err);

      // ENTITY_NOT_FOUND = country not in GeoDB → allow manual input
      if (err?.response?.data?.errors?.[0]?.code === 'ENTITY_NOT_FOUND') {
        console.warn(`${countryName} not supported in GeoDB, fallback to manual city input`);
        return [];
      }

      Alert.alert('Error', `Unable to fetch cities for ${countryName}`);
      return [];
    } finally {
      setLoadingCities(false);
    }
  };


const openCityModal = async (field: 'from' | 'to') => {
  const country = field === 'from' ? fromCountry : toCountry;
  if (!country) {
    Alert.alert('Select Country First', 'Please choose a country before selecting a city.');
    return;
  }

  setSelectingCityField(field);
  setShowCityModal(true);
  setCitySearch('');
  setCities([]); // clear old data
  setLoadingCities(true);

  const fetchedCities = await fetchCities(country);
  setCities(fetchedCities);
  setLoadingCities(false);
};



const handleSelectCity = (cityName: string) => {
  if (selectingCityField === 'from') setFromCity(cityName);
  else if (selectingCityField === 'to') setToCity(cityName);
  setShowCityModal(false);
  setSelectingCityField(null);
};


  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // pick a single image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow access to choose photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      const selectedImage = result.assets[0];
      const base64Data = `data:image/jpeg;base64,${selectedImage.base64}`;

      setImage(base64Data);
      setImagePreview(selectedImage.uri);

      await AsyncStorage.setItem('packageImage', base64Data);

    } catch (err) {
      console.error("Image pick error:", err);
    }
  };


  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };


  useEffect(() => {
    const detectUserCountry = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.warn('Location permission denied');
          await setFallbackCountry();
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const geo = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        const countryName = geo?.[0]?.country;

        if (!countryName) {
          console.warn('Country not detected');
          await setFallbackCountry();
          return;
        }

        const info = await fetchCountryInfo(countryName);
        setReceiverCountryCode(info.code);
        setReceiverFlag(info.flag);

        console.log(`🌍 Auto-detected country: ${countryName}`);
      } catch (error) {
        console.error('Location detection failed:', error);
        await setFallbackCountry();
      }
    };

    const setFallbackCountry = async () => {
      // ✅ Change this to your primary market
      const fallback = await fetchCountryInfo('Nigeria');
      setReceiverCountryCode(fallback.code);
      setReceiverFlag(fallback.flag);
    };

    detectUserCountry();
  }, []);



  const handleContinue = async () => {
    if (step === 1 && fromCountry && fromCity && toCountry && toCity) {
      setStep(2);
      return;
    }

    if (
      step === 2 &&
      packageWeight &&
      receiverName &&
      receiverPhone &&
      description
    ) {
      setIsLoading(true);

      try {
        // ✅ Step 1: Fetch pricing data
        const { data } = await axios.get(`${backendomain.backendomain}/api/prices/get`);
        const prices = data.prices || data;

        // Normalize for matching
        const normalize = (str) => str?.trim().toLowerCase();

        // Find price
        const matchedPrice =
          prices.find((p) => {
            const from = normalize(p.from);
            const to = normalize(p.to);
            return (
              (from.includes(normalize(fromCity)) ||
                from.includes(normalize(fromCountry))) &&
              (to.includes(normalize(toCity)) ||
                to.includes(normalize(toCountry)))
            );
          }) ||
          prices.find((p) => {
            const from = normalize(p.from);
            const to = normalize(p.to);
            return (
              (from.includes(normalize(toCity)) ||
                from.includes(normalize(toCountry))) &&
              (to.includes(normalize(fromCity)) ||
                to.includes(normalize(fromCountry)))
            );
          });

        if (!matchedPrice) {
          Alert.alert(
            "No Route Found",
            `No price found for ${fromCity} → ${toCity}. You can still search for travelers.`
          );
        }

        const weightNum = parseFloat(packageWeight);
        const amount = Number(matchedPrice.pricePerKg) * weightNum;

        // ✅ FIX: Create FormData for image upload
        const formData = new FormData();

        formData.append("fromCountry", fromCountry);
        formData.append("fromCity", fromCity);
        formData.append("toCountry", toCountry);
        formData.append("toCity", toCity);
        formData.append("packageWeight", weightNum);
        formData.append("receiverName", receiverName);
        formData.append("receiverPhone", receiverPhone);
        formData.append("description", description);
        formData.append("value", parseFloat(value) || 0);

        if (image) {
          formData.append("image", {
            uri: image,
            name: "package.jpg",
            type: "image/jpeg",
          });
        }

        // 🔥 REAL file upload here
        const response = await axios.post(
          `${backendomain.backendomain}/api/baggo/createPackage`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          }
        );

        const packageId = response.data.package?._id;

        // Store preview for later (optional)
        if (image) {
          await AsyncStorage.setItem("packageImage", image);
        } else {
          await AsyncStorage.removeItem("packageImage");
        }

        router.push({
          pathname: "/search-travelers",
          params: {
            fromCountry,
            fromCity,
            toCountry,
            toCity,
            packageWeight: weightNum,
            receiverName,
            receiverPhone,
            description,
            value,
            image,
            packageId,
            amount: amount.toFixed(2),
          },
        });
      } catch (error) {
        console.error("❌ Error creating package:", error);
        Alert.alert(
          "Error",
          error.response?.data?.message ||
            "Failed to create package. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert("Validation", "Please fill all required fields.");
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Package</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]} />
        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
      </View>

      <ScrollView
  ref={scrollRef}
  style={styles.content}
  showsVerticalScrollIndicator={false}
  onContentSizeChange={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
>

        {step === 1 ? (
          <View>
            <Text style={styles.stepTitle}>Where are you sending from?</Text>
            <Text style={styles.stepSubtitle}>Enter origin location</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Origin Country</Text>

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => openCountryModal('from')}
                activeOpacity={0.8}
              >
                <MapPin size={20} color={Colors.textLight} />
                <Text style={styles.input}>{fromCountry || 'Enter country'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
    <Text style={styles.label}>Origin City</Text>
    <TouchableOpacity
      style={styles.inputContainer}
      onPress={() => openCityModal('from')}
      activeOpacity={0.8}
    >
      <MapPin size={20} color={Colors.textLight} />
      <Text style={styles.input}>{fromCity || 'Select city'}</Text>
    </TouchableOpacity>
  </View>

            <View style={styles.divider} />

            <Text style={styles.stepTitle}>Where are you sending to?</Text>
            <Text style={styles.stepSubtitle}>Enter destination location</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Destination Country</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => openCountryModal('to')}
                activeOpacity={0.8}
              >
                <MapPin size={20} color={Colors.textLight} />
                <Text style={styles.input}>{toCountry || 'Enter country'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
    <Text style={styles.label}>Destination City</Text>
    <TouchableOpacity
      style={styles.inputContainer}
      onPress={() => openCityModal('to')}
      activeOpacity={0.8}
    >
      <MapPin size={20} color={Colors.textLight} />
      <Text style={styles.input}>{toCity || 'Select city'}</Text>
    </TouchableOpacity>
  </View>
          </View>
        ) : (
          <View>
            <Text style={styles.stepTitle}>Package Details</Text>
            <Text style={styles.stepSubtitle}>Tell us about your package</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Package Weight</Text>
              <View style={styles.weightInput}>
                <Weight size={20} color={Colors.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter weight"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={packageWeight}
                  onChangeText={setPackageWeight}
                />
                <Text style={styles.unit}>kg</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Receiver Name</Text>
              <View style={styles.weightInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textMuted}
                  value={receiverName}
                  onChangeText={setReceiverName}
                />
              </View>
            </View>



            <View style={styles.section}>
    <Text style={styles.label}>Receiver Phone</Text>
    <View style={[styles.weightInput, { flexDirection: 'row', alignItems: 'center' }]}>

      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}
        onPress={() => {
          setSelectingField(null); // make sure no "from/to" conflict
          setShowCountryModal(true);
        }}
      >
        {receiverFlag ? (
          <Image source={{ uri: receiverFlag }} style={{ width: 32, height: 22, borderRadius: 4, marginRight: 6 }} />
        ) : (
          <View style={{ width: 32, height: 22, borderRadius: 4, backgroundColor: Colors.border, marginRight: 6 }} />
        )}
        <Text style={{ fontSize: 15, color: Colors.text }}>
          {receiverCountryCode || '+'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={[
          styles.input,
          {
            flex: 1,
            color: Colors.text,
          },
        ]}
        placeholder="000 000 0000"
        placeholderTextColor={Colors.textMuted}
        keyboardType="phone-pad"
        value={receiverPhone}
        onChangeText={setReceiverPhone}
        underlineColorAndroid="transparent"
      />


    </View>
  </View>



            <View style={styles.section}>
  <Text style={styles.label}>Package Value (€)</Text>
  <View style={styles.weightInput}>
    <TextInput
      style={styles.input}
      placeholder="Enter package value"
      placeholderTextColor={Colors.textMuted}
      keyboardType="decimal-pad"
      value={value}
      onChangeText={setValue}
    />
  </View>
</View>


            <View style={styles.section}>
              <Text style={styles.label}>Package Description</Text>
              <View style={[styles.weightInput, { height: 80, alignItems: 'flex-start' }]}>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="What's in the package?"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>



            {/* IMAGE UPLOAD SECTION (single image) */}
            <View style={styles.section}>
      <Text style={styles.label}>Package Photo (optional)</Text>
      <Text style={{ marginBottom: 8, color: Colors.textLight }}>
        Add one photo of the package
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "center" }}>
        <TouchableOpacity
          onPress={pickImage}
          style={[
            styles.inputContainer,
            { width: 120, height: 120, justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: Colors.primary, fontWeight: "700" }}>
            {imagePreview ? "Change" : "Add Photo"}
          </Text>
        </TouchableOpacity>

        {imagePreview ? (
          <View style={{ marginRight: 12 }}>
            <Image
              source={{ uri: imagePreview }}
              style={{ width: 120, height: 120, borderRadius: 12 }}
            />
            <TouchableOpacity
              onPress={removeImage}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                backgroundColor: "rgba(0,0,0,0.6)",
                width: 28,
                height: 28,
                borderRadius: 14,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>×</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>


            <View style={styles.routeCard}>
              <View style={styles.routeRow}>
                <MapPin size={18} color={Colors.primary} />
                <Text style={styles.routeText}>
                  {fromCity}, {fromCountry}
                </Text>
              </View>
              <Text style={styles.routeArrow}>↓</Text>
              <View style={styles.routeRow}>
                <MapPin size={18} color={Colors.secondary} />
                <Text style={styles.routeText}>
                  {toCity}, {toCountry}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Country modal */}
      <Modal visible={showCountryModal} animationType="slide" onRequestClose={() => setShowCountryModal(false)}>
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>Select Country</Text>

          <View style={modalStyles.searchBox}>
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search country..."
              placeholderTextColor={Colors.textMuted}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />
          </View>

          {loadingCountries ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity style={modalStyles.modalItem} onPress={() => handleSelectCountry(item.name)}>
                  {item.flag ? (
                    <Image source={{ uri: item.flag }} style={{ width: 32, height: 22, borderRadius: 4, marginRight: 12 }} />
                  ) : null}
                  <Text style={modalStyles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity onPress={() => setShowCountryModal(false)} style={modalStyles.closeButton}>
            <Text style={modalStyles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>


      {/* City Modal */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>Select City</Text>

          <View style={modalStyles.searchBox}>
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search city..."
              placeholderTextColor={Colors.textMuted}
              value={citySearch}
              onChangeText={setCitySearch}
            />
          </View>

          {loadingCities ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : cities.length > 0 ? (
            <FlatList
              data={cities.filter((city) =>
                city.toLowerCase().includes(citySearch.toLowerCase())
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.modalItem}
                  onPress={() => handleSelectCity(item)}
                >
                  <Text style={modalStyles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: Colors.secondary,
                    alignItems: 'center',
                  }}
                  onPress={() => setCities([])} // clear list to show manual input
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    Can't find my city?
                  </Text>
                </TouchableOpacity>
              }
            />
          ) : (
            // 🧠 Show manual city input if no city found or user chose "Can't find my city"
            <View style={{ marginTop: 20 }}>
              <Text style={[modalStyles.modalItemText, { marginBottom: 8 }]}>
                Enter your city manually
              </Text>
              <TextInput
                style={[
                  modalStyles.searchInput,
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
                  alignItems: 'center',
                }}
                onPress={() => {
                  if (selectingCityField === 'from') setFromCity(citySearch.trim());
                  else if (selectingCityField === 'to') setToCity(citySearch.trim());
                  setShowCityModal(false);
                  setSelectingCityField(null);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Use this city</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setShowCityModal(false)}
            style={[modalStyles.closeButton, { marginTop: 20 }]}
          >
            <Text style={modalStyles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>



      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (step === 1 && (!fromCountry || !fromCity || !toCountry || !toCity)) ||
            (step === 2 && (!packageWeight || !receiverName || !receiverPhone || !description))
              ? styles.continueButtonDisabled
              : {},
          ]}
          onPress={handleContinue}
          disabled={
            isLoading ||
            (step === 1 && (!fromCountry || !fromCity || !toCountry || !toCity)) ||
            (step === 2 && (!packageWeight || !receiverName || !receiverPhone || !description))
          }
        >
          <Text style={styles.continueButtonText}>
            {step === 1 ? 'Continue' : isLoading ? 'Creating...' : 'Search Travelers'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* modalStyles & styles copied from your original file (unchanged) */
const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  searchBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 15,
    color: Colors.text,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 12,
  },
  closeText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});

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
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: Colors.white,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textLight,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  unit: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 32,
  },
  weightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  routeArrow: {
    fontSize: 20,
    color: Colors.textLight,
    marginVertical: 8,
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
