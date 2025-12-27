import express from 'express';
import { edit, getUser, logout,useReferralDiscount, signIn,verifyEmail,createDelivery,forgotPassword,resendOtp,verifyOtp,resetPassword, signUp,sendToEscrow,releaseFromEscrow,addToEscrow,handleCancelledRequestEscrow, getWallet,withdrawFunds,addFunds,uploadOrUpdateImage } from '../controllers/userController.js';
import { AddAtrip, MyTrips, UpdateTrip, AddReviewToTrip } from '../controllers/AddaTripController.js';
import { isAuthenticated } from '../Auth/UserAuthentication.js';
import { getTravelers } from '../controllers/getTravelers.js';
import { Profile } from '../controllers/Profile.js';
import { getKyc, KycVerifications } from '../controllers/KycVerificationsController.js';
import { createPackage } from '../controllers/PackageController.js';
import { getNotifications,getCompletedRequests,getDisputes,updatePaymentStatus, updateDispute,getRequests, uploadRequestImage,confirmReceivedBySender, markAllNotificationsAsRead, markNotificationAsRead, RequestPackage, raiseDispute, updateRequestDates, updateRequestStatus } from '../controllers/RequestController.js';
import { recentOrder } from '../controllers/getRecentRequest.js';
import { getConversations, getMessages } from '../controllers/MessageController.js';
import { GetDetials } from '../controllers/GetProductDetails.js';
import {
  requestRefund,
  approveRefund,
  rejectRefund,
  getAllRefunds,
  getRefundByRequestId
} from "../controllers/refundController.js";
import fileUpload from 'express-fileupload';



const userRouter = express.Router();


userRouter.use(
  fileUpload({
    useTempFiles: false,       // keep in memory buffer (ok for small files)
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  })
);

userRouter.post('/signup', signUp);
userRouter.post('/signin', signIn);
userRouter.get('/verify-email',verifyEmail );
userRouter.post("/coupon",isAuthenticated,createDelivery);
userRouter.post('/user/image',isAuthenticated, uploadOrUpdateImage);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/verify-otp', verifyOtp);
userRouter.post('/reset-password', resetPassword);
userRouter.post("/resend-otp", resendOtp);
userRouter.post('/AddAtrip', AddAtrip)
userRouter.post('/:tripId/reviews', isAuthenticated, AddReviewToTrip);
userRouter.get("/MyTrips", isAuthenticated,  MyTrips )
userRouter.get("/getuser", isAuthenticated,  getUser)
userRouter.get("/getTravelers", getTravelers)
userRouter.get("/Profile",  isAuthenticated, Profile)
userRouter.get("/logout",  logout )
userRouter.put("/edit", isAuthenticated, edit)
userRouter.put("/Trip/:id", isAuthenticated, UpdateTrip);

userRouter.post("/request/refund", requestRefund);
userRouter.put("/approve/:id", approveRefund);
userRouter.put("/reject/:id", rejectRefund);
userRouter.get("/get-refund", getAllRefunds);
userRouter.get("/request/:requestId", getRefundByRequestId);


userRouter.post("/KycVerifications", isAuthenticated,  KycVerifications)
userRouter.get("/getKyc", isAuthenticated,  getKyc)
userRouter.post('/use-referral-discount', useReferralDiscount);

userRouter.post('/request/:requestId/raise-dispute', raiseDispute);
userRouter.put("/request/:requestId/payment", updatePaymentStatus);

// userRouter.get("/getWalletBalance", isAuthenticated,  getWalletBalance)
userRouter.post("/createPackage", isAuthenticated,  createPackage)
userRouter.post("/RequestPackage", isAuthenticated, RequestPackage)
userRouter.get("/recentOrder", isAuthenticated, recentOrder)
userRouter.get("/getRequests/:tripId", isAuthenticated, getRequests)
userRouter.get("/disputes", getDisputes);
userRouter.put("/disputes/:id", updateDispute);
userRouter.get('/completed/:userId', getCompletedRequests);
userRouter.put("/updateRequestStatus/:requestId", isAuthenticated, updateRequestStatus)
userRouter.put('/request/:requestId/image', isAuthenticated, uploadRequestImage);
userRouter.put('/request/:requestId/confirm-received', isAuthenticated, confirmReceivedBySender);

// 💰 Wallet & Payments
userRouter.get('/getWallet', isAuthenticated, getWallet);
userRouter.get('/getWalletBalance', isAuthenticated, withdrawFunds);
userRouter.get('/processPayment', isAuthenticated, addFunds);
userRouter.post('/send-to-escrow', isAuthenticated, sendToEscrow);
userRouter.post('/release-from-escrow', isAuthenticated, releaseFromEscrow);
userRouter.post('/add-to-escrow',addToEscrow);
userRouter.post("/remove-cancelled-escrow", handleCancelledRequestEscrow);



userRouter.get('/conversations', isAuthenticated, getConversations);
userRouter.get('/conversations/:conversationId/messages', isAuthenticated, getMessages);
userRouter.get("/getNotifications", isAuthenticated, getNotifications)
userRouter.put("/markNotificationAsRead/:notificationId", isAuthenticated, markNotificationAsRead)
userRouter.get("/GetDetails/:requestId", isAuthenticated, GetDetials)
userRouter.put("/markAllNotificationsAsRead", isAuthenticated, markAllNotificationsAsRead)
// userRouter.get("/processPayment", isAuthenticated,  processPayment)
userRouter.put("/updateRequestDates/:requestId",   isAuthenticated ,updateRequestDates)
export default userRouter;
