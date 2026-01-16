import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Image,
  Platform,
  Linking,
  Modal
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";
import { backendomain } from "@/utils/backendDomain";
import { StripeProvider, CardField, useStripe } from "@stripe/stripe-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';

const PAYMENT_INTENT_URL = `${backendomain.backendomain}/api/payment/create-intent`;
const PAYSTACK_INIT_URL = `${backendomain.backendomain}/api/payment/initialize`;
const REQUEST_PACKAGE_URL = `${backendomain.backendomain}/api/baggo/RequestPackage`;
const ESCROW_ADD_URL = `${backendomain.backendomain}/api/baggo/add-to-escrow`;

export default function PaymentScreen() {
  const router = useRouter();
  const { confirmPayment } = useStripe();

  const {
  travellerName,
  travellerEmail,
  amount,
  travelerId,
  tripId,
  packageId,
  insurance,
  insuranceCost,
  image: imageParam,
} = useLocalSearchParams();




  const [cardDetails, setCardDetails] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentProvider, setPaymentProvider] = useState("stripe");
  const [paystackUrl, setPaystackUrl] = useState(null);
  const [imageState, setImageState] = useState(imageParam ?? null);
  const [userStatus, setUserStatus] = useState(null);
  const [kycModalVisible, setKycModalVisible] = useState(false);
  const [userReferral, setUserReferral] = useState(null);
  const [hasUsedReferralDiscount, setHasUsedReferralDiscount] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("€");
  const [userData, setUserData] = useState(null);


  const amountNum = parseFloat(amount) || 0;
const insuranceNum = insuranceCost ? parseFloat(insuranceCost) : 0;
let baseAmount = insurance === "yes" ? amountNum + insuranceNum : amountNum;

// 🟢 Apply referral discount if user qualifies
const discount = userReferral && !hasUsedReferralDiscount ? 0.03 * baseAmount : 0;
const finalAmount = baseAmount - discount;


  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const res = await axios.get(`${backendomain.backendomain}/api/baggo/Profile`, {
          withCredentials: true,
        });

        const user = res.data?.data?.findUser;
        setUserData(user);
        console.log("🧾 User profile fetched:", user); // log full user object
            console.log("🔹 hasUsedReferralDiscount:", user?.hasUsedReferralDiscount);
        setUserStatus(user?.status || "pending");
        setUserReferral(user?.referredBy || null);
        setHasUsedReferralDiscount(user?.hasUsedReferralDiscount || false);
      } catch (err) {
        console.error("Error fetching user KYC status:", err);
        setUserStatus("pending");
      }
    };

    fetchUserStatus();
  }, []);

const safeEmail = userData?.email || travellerEmail;

  const markReferralUsed = async (userId) => {
    if (!userId) {
      console.warn("⚠️ markReferralUsed: missing userId");
      return;
    }

    if (!userReferral || hasUsedReferralDiscount) return;

    try {
      const res = await axios.post(
        `${backendomain.backendomain}/api/baggo/use-referral-discount`,
        { userId },
        { withCredentials: true }
      );

      if (res.status === 200) {
        console.log("Referral discount marked as used");
        setHasUsedReferralDiscount(true);
      }
    } catch (err) {
      console.error("markReferralUsed error:", err.response?.data || err.message);
    }
  };



  // 🧭 Detect country to select payment gateway
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // 1. Request Permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn("Permission to access location was denied. Using defaults.");
          setPaymentProvider("stripe");
          setCurrencySymbol("€");
          return;
        }

        // 2. Get Current Position
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });

        // 3. Reverse Geocode to get the Country Code
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const countryCode = reverseGeocode[0].isoCountryCode; // e.g., "NG", "US", "GB"
          console.log("🌍 Detected Country Code:", countryCode);

          const paystackCountries = ["NG", "GH", "ZA", "KE"];

          if (paystackCountries.includes(countryCode)) {
            setPaymentProvider("paystack");
            switch (countryCode) {
              case "NG": setCurrencySymbol("₦"); break;
              case "GH": setCurrencySymbol("₵"); break;
              case "KE": setCurrencySymbol("KSh"); break;
              case "ZA": setCurrencySymbol("R"); break;
              default: setCurrencySymbol("$");
            }
          } else {
            setPaymentProvider("stripe");
            // Currency Logic for Stripe
            if (["FR", "DE", "IT", "ES", "NL", "PT", "IE"].includes(countryCode)) {
              setCurrencySymbol("€");
            } else if (countryCode === "GB") {
              setCurrencySymbol("£");
            } else {
              setCurrencySymbol("$");
            }
          }
        }
      } catch (err) {
        console.warn("Location detection failed:", err);
        // Fallback
        setPaymentProvider("stripe");
        setCurrencySymbol("€");
      }
    };

    detectCountry();
  }, []);


  
  // Load image from AsyncStorage if not passed
  useEffect(() => {
    (async () => {
      if (!imageParam) {
        try {
          const stored = await AsyncStorage.getItem("packageImage");
          console.log("📸 Retrieved stored image from AsyncStorage:", stored);
          if (stored) setImageState(stored);
        } catch (err) {
          console.warn("Could not load packageImage", err);
        }
      }
    })();
  }, [imageParam]);


  const publishableKey = "pk_test_51SIm5dLIu6dEtqiBkoXpgTb0PtWIKaDs7E5rRowKkQWAK6YsDXAq2pq9UFLhR2DdWfyxSA5jfEzO80gLraJYi6ec002FAQHMe8";


  // ✅ Update request payment
  const updatePaymentStatus = async ({ requestId, method, status }) => {
    if (!requestId) {
      console.warn("⚠️ Missing requestId, cannot update payment status");
      return;
    }

    if (!method) {
      console.warn("⚠️ Missing payment method");
    }

    if (!status) {
      console.warn("⚠️ Missing payment status");
    }

    try {
      const res = await axios.put(
        `${backendomain.backendomain}/api/baggo/request/${requestId}/payment`,
        {
          paymentInfo: {
            requestId,
            method,
            status, // "paid" or "failed"
          },
        },
        { withCredentials: true }
      );

      if (res.status === 200) {
        console.log("✅ Request payment updated successfully:", res.data);
      } else {
        console.warn("⚠️ Unexpected response status:", res.status, res.data);
      }
    } catch (err) {
      console.error("❌ Failed to update request payment:", err.response?.data || err.message);
    }
  };


  // 🧾 Handle Stripe Payment
  const handleStripePayment = async () => {
    console.log('💡 handleStripePayment called');

    if (!cardDetails?.complete) {
      console.warn('⚠️ Card details incomplete');
      setPaymentError("Please enter valid card details");
      return;
    }

    setPaymentLoading(true);

    try {
      console.log('💡 Sending POST request to create payment intent:', PAYMENT_INTENT_URL, { amount: finalAmount, travellerName, travellerEmail });

      const response = await axios.post(PAYMENT_INTENT_URL, {
        amount: finalAmount,
        travellerName,
        travellerEmail: safeEmail,
      });

      console.log('💡 Payment intent response:', response.data);

      const { clientSecret } = response.data.data;
      console.log('💡 Received clientSecret from backend:', clientSecret);

      // Check if clientSecret is valid
      if (!clientSecret || !clientSecret.startsWith("pi_") || !clientSecret.includes("_secret_")) {
        throw new Error("Invalid clientSecret received from backend");
      }

      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
        paymentMethodData: {
          billingDetails: { email: safeEmail, name: travellerName },
        },
      });

      console.log('💡 Stripe confirmPayment result:', { error, paymentIntent });

      if (error) throw new Error(error.message);

      const requestId = await handleRequestPackage();
      console.log('💡 requestId after handleRequestPackage:', requestId);

      if (paymentIntent.status?.toLowerCase() === "succeeded") {
    console.log('✅ Payment succeeded');
    Alert.alert("✅ Payment Successful", "Your payment was completed.");

    if (requestId) {
      console.log('💡 Updating payment status to paid');
      await updatePaymentStatus({ requestId, method: "stripe", status: "paid" });

      // --- mark referral used if applicable ---
      if (userReferral && !hasUsedReferralDiscount) {
        await markReferralUsed(userData?._id);
      }
    }

    router.replace("/success-page");
  } else {
    console.warn('⚠️ Payment not succeeded:', paymentIntent.status);
    Alert.alert("⚠️ Payment status:", paymentIntent.status);

    if (requestId) {
      console.log('💡 Updating payment status to failed');
      await updatePaymentStatus({ requestId, method: "stripe", status: "failed" });
    }
  }


    } catch (error) {
      console.error("❌ Payment Error:", error);
      Alert.alert("Payment Failed", error.message || "Something went wrong.");
    } finally {
      setPaymentLoading(false);
      console.log('💡 Payment loading set to false');
    }
  };


  // 💰 Handle Paystack Payment
  const handlePaystackPayment = async () => {
    if (!userData?.email && !travellerEmail) {
      Alert.alert("Error", "User email not available. Cannot proceed with Paystack payment.");
      return;
    }

    try {
      setPaymentLoading(true);


      const res = await axios.post(PAYSTACK_INIT_URL, {
        amount: Number(finalAmount),
        email: safeEmail,
      });

      const authUrl = res.data?.data?.authorization_url;
      if (!authUrl) throw new Error("Could not get Paystack payment URL.");

      setPaystackUrl(authUrl);
    } catch (error) {
      console.error("❌ Paystack init failed:", error.response?.data || error.message);
      Alert.alert("Error", "Unable to start Paystack payment.");
    } finally {
      setPaymentLoading(false);
    }
  };


  const handleStripePress = () => {
  if (userStatus !== "verified") {
    setKycModalVisible(true);
    return;
  }
  handleStripePayment(); // existing function
};


const handlePaystackPress = () => {
  if (userStatus !== "verified") {
    setKycModalVisible(true);
    return;
  }
  handlePaystackPayment(); // existing function
};

// 🧩 Request package after successful payment
const handleRequestPackage = async () => {
  try {
    let imageUri = imageState;

    // Convert base64 to file only if it's base64
    if (imageState && imageState.startsWith("data:image")) {
      const fileUri = `${FileSystem.cacheDirectory}package_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        imageState.replace(/^data:image\/\w+;base64,/, ""),
        { encoding: "base64" }
      );
      imageUri = fileUri;
      console.log("📸 Converted base64 image to file URI:", imageUri);
    }

    const formData = new FormData();

    if (imageUri) {
      formData.append("image", {
        uri: imageUri,
        name: `package_${Date.now()}.jpg`,
        type: "image/jpeg",
      });
    }

    formData.append("travelerId", travelerId);
    formData.append("packageId", packageId);
    formData.append("tripId", tripId);
    formData.append("amount", finalAmount.toString());
    formData.append("insurance", insurance);
    formData.append(
      "insuranceCost",
      insurance === "yes" ? insuranceNum.toString() : "0"
    );

    for (let pair of formData._parts) {
      console.log(`📦 ${pair[0]} =>`, pair[1]);
    }

    const res = await axios.post(REQUEST_PACKAGE_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    });

    console.log("✅ Package Request Response:", res.data);

    await handleAddToEscrow();
    await AsyncStorage.removeItem("packageImage");

    return res.data?.request?._id;
  } catch (error) {
    console.log(
      "❌ Package request failed:",
      error.response?.data || error.message
    );
    Alert.alert("Error", "Could not complete booking.");
    return null;
  }
};

  const handleAddToEscrow = async () => {
    try {
      await axios.post(
        ESCROW_ADD_URL,
        { userId: travelerId, amount: Number(finalAmount) },
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("❌ Error adding to escrow:", error.message);
    }
  };



  // 🖥️ Paystack WebView handler with verification
  if (paystackUrl) {
    return (
      <WebView
      source={{ uri: paystackUrl }}
      onNavigationStateChange={async (navState) => {
        const url = navState.url;

        // ✅ User completed payment
        if (url.includes("reference=")) {
          setPaystackUrl(null);
          const reference = url.split("reference=")[1].split("&")[0];
          console.log("Paystack payment reference:", reference);

          try {
            const verifyRes = await axios.get(
              `${backendomain.backendomain}/api/payment/verify/${reference}`
            );

            const requestId = await handleRequestPackage();

            if (requestId) {
  if (verifyRes.data.status) {
    Alert.alert("✅ Payment Successful", "Your Paystack payment was successful.");

    await updatePaymentStatus({
      requestId,
      method: "paystack",
      status: "paid",
    });

    // --- mark referral used if applicable ---
    if (userReferral && !hasUsedReferralDiscount) {
      await markReferralUsed(userData?._id);
    }

    router.replace("/success-page");
  } else {
    await updatePaymentStatus({
      requestId,
      method: "paystack",
      status: "failed",
    });

    router.replace("/failed-page");
  }
}

          } catch (err) {
            console.error("❌ Verification error:", err.response?.data || err.message);
            Alert.alert("❌ Error", "Could not verify payment.");

            if (requestId) {
              await updatePaymentStatus({
                requestId,
                method: "paystack",
                status: "failed",
              });
            }
          }
        }

        // ✅ User closed WebView manually
        if (url.includes("paystack.com/close")) {
          setPaystackUrl(null);
          Alert.alert("❌ Payment Cancelled", "You closed the payment window.");
        }
      }}
    />



    );
  }


  return (
    <>
    <StripeProvider
    publishableKey={publishableKey}
      merchantIdentifier="merchant.identifier"
      urlScheme="your-url-scheme"
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
          <Text style={styles.headerAmount}>
  {currencySymbol}
  {Number(finalAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
</Text>

            <Text style={styles.headerSubtitle}>Pay Invoice</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
  >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Image Preview */}
          {imageState && (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageState }} style={styles.image} resizeMode="cover" />
            </View>
          )}

          {/* Traveller Info */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Traveller Info</Text>
            <Text style={styles.summaryText}>Name: {travellerName}</Text>
            <Text style={styles.summaryText}>Email: {safeEmail}</Text>

            <Text style={styles.summaryText}>
          Amount: {currencySymbol}{Number(amount).toLocaleString('en-US')}
        </Text>

            <Text style={styles.summaryText}>Insurance: {insurance}</Text>
            {insuranceCost && (
    <Text style={styles.summaryText}>
      Insurance Cost: {currencySymbol}{insuranceCost}
    </Text>
  )}
  {userReferral && !hasUsedReferralDiscount && (
    <Text style={[styles.summaryText, { color: Colors.primary }]}>
      Referral Discount Applied: -3% ({currencySymbol}{discount.toFixed(2)})
    </Text>
  )}

          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, paymentProvider === "stripe" && styles.activeTab]}
              onPress={() => setPaymentProvider("stripe")}
            >
              <Text
                style={[
                  styles.tabText,
                  paymentProvider === "stripe" && styles.activeTabText,
                ]}
              >
                Credit Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, paymentProvider === "paystack" && styles.activeTab]}
              onPress={() => setPaymentProvider("paystack")}
            >
              <Text
                style={[
                  styles.tabText,
                  paymentProvider === "paystack" && styles.activeTabText,
                ]}
              >
                Other
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Section */}
          <View style={styles.paymentSection}>
    {paymentProvider === "stripe" ? (
      <>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: "4242 4242 4242 4242" }}
          cardStyle={{
    backgroundColor: "#FFFFFF",
    textColor: "#000000",
    borderColor: "#d9d9d9",
    borderWidth: 1,
    borderRadius: 10,
  }}
          style={styles.cardField}
          onCardChange={(details) => setCardDetails(details)}
        />
        {paymentError && <Text style={styles.errorText}>{paymentError}</Text>}

        <TouchableOpacity
          style={[styles.payButton, paymentLoading && styles.buttonDisabled]}
          onPress={handleStripePress}
          disabled={paymentLoading}
        >
          {paymentLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
  Pay {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</Text>

          )}
        </TouchableOpacity>
      </>
    ) : (
      <TouchableOpacity
        style={[styles.payButton, paymentLoading && styles.buttonDisabled]}
        onPress={handlePaystackPress}
        disabled={paymentLoading}
      >
        {paymentLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>Pay with Paystack</Text>
        )}
      </TouchableOpacity>
    )}
  </View>

        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </StripeProvider>
    <Modal
  visible={kycModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setKycModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>KYC Verification Required</Text>
      <Text style={styles.modalMessage}>
        You must complete your KYC verification before making payments.
      </Text>

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.modalCancelButton]}
          onPress={() => setKycModalVisible(false)}
        >
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.modalVerifyButton]}
          onPress={() => {
            setKycModalVisible(false);
            router.push("/kyc-verification");
          }}
        >
          <Text style={styles.modalVerifyText}>Go to KYC</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
</>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  backIcon: { fontSize: 24, color: "#fff" },
  headerCenter: { alignItems: "center" },
  headerAmount: { fontSize: 26, color: "#fff", fontWeight: "bold" },
  headerSubtitle: { fontSize: 14, color: "#e0f7f4", marginTop: 2 },

  content: {
    paddingHorizontal: 16,
  },

  imageWrapper: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "center",
    width: "100%",
    height: 160,
  },
  image: { width: "100%", height: "100%" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: "#e5e7eb",
  },
  modalVerifyButton: {
    backgroundColor: Colors.primary,
  },
  modalCancelText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  modalVerifyText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  summaryTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  summaryText: { fontSize: 14, color: "#777", marginBottom: 4 },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#e6f2f2",
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTab: { backgroundColor: "#fff", elevation: 2 },
  tabText: { color: "#555", fontWeight: "500" },
  activeTabText: { color: Colors.primary, fontWeight: "600" },

  paymentSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  cardField: {
    height: 50,
    width: "100%",
    marginVertical: 10,
  },
  cardStyle: {
    backgroundColor: "#fff",
    textColor: "#000",
    borderColor: "#d9d9d9",
    borderWidth: 1,
    borderRadius: 10,
  },

  payButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  payButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  buttonDisabled: { opacity: 0.6 },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: "center",
    marginTop: 8,
  },
});
