import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
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



  // 🧭 Detect country to select payment gateway
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        console.log("🌍 IP Country:", data.country_name, data.country_code);

        const paystackCountries = ["NG", "GH", "ZA", "KE"];

        if (paystackCountries.includes(data.country_code)) {
          setPaymentProvider("paystack");

          // ✅ Set local currency
          switch (data.country_code) {
            case "NG":
              setCurrencySymbol("₦");
              break;
            case "GH":
              setCurrencySymbol("₵");
              break;
            case "KE":
              setCurrencySymbol("KSh");
              break;
            case "ZA":
              setCurrencySymbol("R");
              break;
            default:
              setCurrencySymbol("$");
          }
        } else {
          setPaymentProvider("stripe");
          // ✅ Use Euro for EU, $ for US/others
          if (["FR", "DE", "IT", "ES", "NL", "PT", "IE"].includes(data.country_code)) {
            setCurrencySymbol("€");
          } else if (data.country_code === "GB") {
            setCurrencySymbol("£");
          } else {
            setCurrencySymbol("$");
          }
        }
      } catch (err) {
        console.warn("Could not detect country:", err);
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
          if (stored) setImageState(stored);
        } catch (err) {
          console.warn("Could not load packageImage", err);
        }
      }
    })();
  }, [imageParam]);



  // ✅ Update request payment
  const updatePaymentStatus = async ({ requestId, method, stripePaymentIntentId, paystackReference }) => {
    if (!requestId) return;

    try {
      await axios.put(
        `${backendomain.backendomain}/api/request/${requestId}/payment`,
        {
          method,
          stripePaymentIntentId,
          paystackReference,
          status: "paid",
        },
        { withCredentials: true }
      );
      console.log("✅ Request payment updated successfully");
    } catch (err) {
      console.error("❌ Failed to update request payment:", err.response?.data || err.message);
    }
  };



  // 🧾 Handle Stripe Payment
  const handleStripePayment = async () => {
    if (!cardDetails?.complete) {
      setPaymentError("Please enter valid card details");
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await axios.post(PAYMENT_INTENT_URL, {
        amount: finalAmount,
        travellerName,
        travellerEmail,
      });

      const { clientSecret, paymentIntentId } = response.data.data;

      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
        paymentMethodData: {
          billingDetails: {
            email: travellerEmail,
            name: travellerName
          }
        },
      });

      if (error) throw new Error(error.message);

      if (paymentIntent.status === "Succeeded" || paymentIntent.status === "succeeded") {

        Alert.alert("✅ Payment Successful", "Your payment was completed.");

        // ✅ 1. Send package request and get request ID
        const requestId = await handleRequestPackage();

        // ✅ 2. Update payment info for that request
        if (requestId) {
          await updatePaymentStatus({ requestId, method: "stripe", stripePaymentIntentId: paymentIntentId });
        }

        router.replace("/success-page");
      } else {
        Alert.alert("⚠️ Payment status:", paymentIntent.status);
      }
    } catch (error) {
      console.error("❌ Payment Error:", error);
      Alert.alert("Payment Failed", error.message || "Something went wrong.");
    } finally {
      setPaymentLoading(false);
    }
  };


  // 💰 Handle Paystack Payment
  const handlePaystackPayment = async () => {
    try {
      setPaymentLoading(true);
      const res = await axios.post(PAYSTACK_INIT_URL, {
        amount: finalAmount,
        email: travellerEmail,
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
    const payload = {
      travelerId,
      packageId,
      tripId,
      amount: finalAmount,
      insurance,
      insuranceCost: insurance === "yes" ? insuranceNum : 0,
      image: imageState ?? null,
    };

    const res = await axios.post(REQUEST_PACKAGE_URL, payload, { withCredentials: true });
    console.log("✅ Package Request Response:", res.data);

    await handleAddToEscrow();
    await AsyncStorage.removeItem("packageImage");

    console.log("✅ Booking completed successfully.");

    // ✅ Return the newly created request ID
    return res.data?.data?._id;
  } catch (error) {
    console.error("❌ Package request failed:", error);
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

  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;



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

          // Extract reference from URL
          const reference = url.split("reference=")[1].split("&")[0];
          console.log("Paystack payment reference:", reference);


          try {
            // Verify payment on backend
            const verifyRes = await axios.get(
              `${backendomain.backendomain}/api/payment/verify/${reference}`
            );

            if (verifyRes.data.status) {
              Alert.alert("✅ Payment Successful", "Your Paystack payment was successful.");

              // 1️⃣ Send package request and get request ID
              const requestId = await handleRequestPackage();

              // 2️⃣ Update payment info for that request in backend
              if (requestId) {
                await updatePaymentStatus({ requestId, method: "paystack", paystackReference: reference });
              }

              router.replace("/success-page");
            } else {
              router.replace("/failed-page");
            }
          } catch (err) {
            console.error("❌ Verification error:", err.response?.data || err.message);
            Alert.alert("❌ Error", "Could not verify payment.");
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
            <Text style={styles.headerAmount}>{currencySymbol}{finalAmount.toFixed(2)}</Text>
            <Text style={styles.headerSubtitle}>Pay Invoice</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.summaryText}>Email: {travellerEmail}</Text>
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

  content: { flex: 1, paddingHorizontal: 16 },
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
