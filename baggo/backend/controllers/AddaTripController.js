import Trip from '../models/tripScheme.js'; // Corrected path (lowercase 'models')

// ✅ Add a new trip
export const AddAtrip = async (req, res, next) => {
  if (!req.user) {
   return res.status(401).json({ message: "User not authenticated" });
 }
  const userid = req.user.id;
  const { fromLocation, toLocation, departureDate, arrivalDate, availableKg, travelMeans } = req.body;

  try {
    // ✅ Validate required fields
    if (!fromLocation || !toLocation || !departureDate || !arrivalDate || !availableKg || !travelMeans) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Create the new trip
    const trip = new Trip({
      user: userid,
      fromLocation,
      toLocation,
      departureDate: new Date(departureDate),
      arrivalDate: new Date(arrivalDate), // <-- added here
      availableKg: parseFloat(availableKg),
      travelMeans: travelMeans.trim().toLowerCase(),
      status: "active",
    });

    await trip.save();

    // ✅ Send back clean response
    res.status(201).json({
      message: "Trip created successfully",
      trip: {
        id: trip._id,
        fromLocation: trip.fromLocation,
        toLocation: trip.toLocation,
        departureDate: trip.departureDate,
        arrivalDate: trip.arrivalDate, // <-- added here
        availableKg: trip.availableKg,
        travelMeans: trip.travelMeans,
        status: trip.status,
        createdAt: trip.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Get user's trips
export const MyTrips = async (req, res) => {
  try {
    const userId = req.user._id;

    // Include reviews in the query
    const trips = await Trip.find({ user: userId }).select(
      '_id fromLocation toLocation departureDate arrivalDate availableKg travelMeans status request reviews'
    ).populate('reviews.user', 'name email'); // optional: populate reviewer info

    const formattedTrips = trips.map((trip) => {
      // Calculate average rating
      const totalReviews = trip.reviews.length;
      const averageRating = totalReviews > 0
        ? trip.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      return {
        id: trip._id,
        userId: trip.user,
        fromLocation: trip.fromLocation,
        toLocation: trip.toLocation,
        departureDate: trip.departureDate,
        arrivalDate: trip.arrivalDate,
        availableKg: trip.availableKg,
        travelMeans: trip.travelMeans,
        status: trip.status,
        request: trip.request,
        reviews: trip.reviews,           // full reviews array
        totalReviews,                    // number of reviews
        averageRating: parseFloat(averageRating.toFixed(2)), // rounded to 2 decimals
      };
    });

    res.status(200).json({
      message: 'Trips retrieved successfully',
      trips: formattedTrips,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};




export const UpdateTrip = async (req, res, next) => {
  const userId = req.user.id;
  const tripId = req.params.id;
  const { fromLocation, toLocation, departureDate, arrivalDate, availableKg, pricePerKg, travelMeans } = req.body;

  try {
    // ✅ Validate required fields
    if (!fromLocation || !toLocation || !departureDate || !arrivalDate || !availableKg || !travelMeans) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Find the trip and ensure it belongs to the user
    const trip = await Trip.findOne({ _id: tripId, user: userId });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ✅ Update fields
    trip.fromLocation = fromLocation;
    trip.toLocation = toLocation;
    trip.departureDate = departureDate; // keep ISO string
    trip.arrivalDate = arrivalDate;     // keep ISO string
    trip.availableKg = parseFloat(availableKg);
    if (pricePerKg) trip.pricePerKg = parseFloat(pricePerKg); // optional
    trip.travelMeans = travelMeans.trim().toLowerCase();

    await trip.save();

    // ✅ Return updated trip
    res.status(200).json({
      message: "Trip updated successfully",
      trip: {
        id: trip._id,
        fromLocation: trip.fromLocation,
        toLocation: trip.toLocation,
        departureDate: trip.departureDate,
        arrivalDate: trip.arrivalDate,
        availableKg: trip.availableKg,
        pricePerKg: trip.pricePerKg,
        travelMeans: trip.travelMeans,
        status: trip.status,
        updatedAt: trip.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};




export const AddReviewToTrip = async (req, res, next) => {
  const userId = req.user.id;
  const tripId = req.params.tripId;
  const { rating, comment } = req.body;

  try {
    // Validate input
    if (rating == null || rating < 0 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 0 and 5" });
    }

    // Find the trip
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Always add a new review
    trip.reviews.push({
      user: userId,
      rating,
      comment,
      date: new Date(),
    });

    await trip.save();

    res.status(200).json({
      message: "Review added successfully",
      reviews: trip.reviews,
    });
  } catch (error) {
    next(error);
  }
};
