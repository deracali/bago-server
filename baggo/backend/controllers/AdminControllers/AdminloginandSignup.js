import Admin from "../../models/adminScheme.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Admin Signup
export const AdminSignup = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new admin
        const newAdmin = new Admin({
            username,
            password: hashedPassword
        });

        // Save admin to database
        await newAdmin.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: newAdmin._id, username: newAdmin.username },
            process.env.ADMIN_SECRET_KEY,
            { expiresIn: '1d' }
        );


         console.log("Admin created successfully:", token );
        // Set cookie
res.cookie('adminToken', token, {
    httpOnly: true,  
    secure: process.env.NODE_ENV === 'production', // ONLY true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
});


        res.status(201).json({
            message: "Admin created successfully",
            token,
            admin: {
                id: newAdmin._id,
                username: newAdmin.username
            }
        });

    } catch (error) {
        next(error);
    }
};

// Admin Login
export const AdminLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Find admin
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, username: admin.username },
            process.env.ADMIN_SECRET_KEY,
            { expiresIn: '1d' }
        );

        // Set cookie
     res.cookie('adminToken', token, {
    httpOnly: true,  
    secure: process.env.NODE_ENV === 'production', // ONLY true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
});


        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                username: admin.username
            }
        });

    } catch (error) {
        next(error);
    }
};