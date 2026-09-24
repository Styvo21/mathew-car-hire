require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("SUPABASE_URL or SUPABASE_SECRET_KEY is missing");
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==============================
// IMAGE UPLOAD
// ==============================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }

    }
});


// ==============================
// ADMIN AUTH
// ==============================

function requireAdmin(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const token = authHeader.replace("Bearer ", "");

    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({
            message: "Invalid admin token"
        });
    }

    next();
}


// ==============================
// HOME
// ==============================

app.get("/", (req, res) => {

    res.json({
        message: "Mathew Car Hire API is running"
    });

});


// ==============================
// ADMIN LOGIN
// ==============================

app.post("/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {

        return res.json({
            message: "Login successful",
            token: process.env.ADMIN_TOKEN
        });

    }

    res.status(401).json({
        message: "Invalid username or password"
    });

});


// ==============================
// UPLOAD IMAGE
// ==============================

app.post(
    "/upload-image",
    requireAdmin,
    upload.single("image"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: "Please select an image."
                });
            }

            const extension =
                req.file.originalname
                    .split(".")
                    .pop()
                    .toLowerCase();

            const fileName =
                `car-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 10)}.${extension}`;

            const filePath = `cars/${fileName}`;

            const { error } = await supabase
                .storage
                .from("car-images")
                .upload(
                    filePath,
                    req.file.buffer,
                    {
                        contentType: req.file.mimetype,
                        cacheControl: "3600",
                        upsert: false
                    }
                );

            if (error) {
                console.error(error);

                return res.status(500).json({
                    message: "Failed to upload image.",
                    error: error.message
                });
            }

            const { data } =
                supabase
                    .storage
                    .from("car-images")
                    .getPublicUrl(filePath);

            res.json({
                message: "Image uploaded successfully.",
                imageUrl: data.publicUrl
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: error.message || "Image upload failed."
            });

        }

    }
);


// ==============================
// GET CARS
// ==============================

app.get("/cars", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("cars")
            .select("*")
            .order("id", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        const cars = data.map(car => ({
            id: car.id,
            name: car.name,
            category: car.category,
            pricePerDay: car.price_per_day,
            available: car.available,
            image: car.image
        }));

        res.json(cars);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to load cars."
        });

    }

});


// ==============================
// GET ONE CAR
// ==============================

app.get("/cars/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("cars")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                message: "Car not found."
            });
        }

        res.json({
            id: data.id,
            name: data.name,
            category: data.category,
            pricePerDay: data.price_per_day,
            available: data.available,
            image: data.image
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to load car."
        });

    }

});


// ==============================
// ADD CAR
// ==============================

app.post("/cars", requireAdmin, async (req, res) => {

    try {

        const {
            name,
            category,
            pricePerDay,
            available,
            image
        } = req.body;

        if (!name || !category || !pricePerDay) {
            return res.status(400).json({
                message: "Please provide all car details."
            });
        }

        const { data, error } = await supabase
            .from("cars")
            .insert([{
                name: name,
                category: category,
                price_per_day: Number(pricePerDay),
                available: available !== false,
                image: image || null
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: "Car added successfully.",
            car: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to add car."
        });

    }

});


// ==============================
// EDIT CAR
// ==============================

app.patch("/cars/:id", requireAdmin, async (req, res) => {

    try {

        const id = Number(req.params.id);

        const {
            name,
            category,
            pricePerDay,
            available,
            image
        } = req.body;

        if (!name || !category || !pricePerDay) {
            return res.status(400).json({
                message: "Please provide all car details."
            });
        }

        const updateData = {
            name: name,
            category: category,
            price_per_day: Number(pricePerDay),
            available: available !== false
        };

        if (image !== undefined) {
            updateData.image = image;
        }

        const { data, error } = await supabase
            .from("cars")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                message: "Car not found."
            });
        }

        res.json({
            message: "Car updated successfully.",
            car: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to update car."
        });

    }

});


// ==============================
// DELETE CAR
// ==============================

app.delete("/cars/:id", requireAdmin, async (req, res) => {

    try {

        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("cars")
            .delete()
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                message: "Car not found."
            });
        }

        res.json({
            message: "Car deleted successfully.",
            car: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to delete car."
        });

    }

});


// ==============================
// CREATE BOOKING
// ==============================

app.post("/bookings", async (req, res) => {

    try {

        const {
            carId,
            carName,
            fullName,
            phone,
            email,
            pickupDate,
            returnDate
        } = req.body;

        if (
            !carId ||
            !carName ||
            !fullName ||
            !phone ||
            !email ||
            !pickupDate ||
            !returnDate
        ) {

            return res.status(400).json({
                message: "Please fill in all booking details."
            });

        }

        const { data, error } = await supabase
            .from("bookings")
            .insert([{
                car_id: Number(carId),
                car_name: carName,
                full_name: fullName,
                phone: phone,
                email: email,
                pickup_date: pickupDate,
                return_date: returnDate,
                status: "pending"
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: "Booking submitted successfully.",
            booking: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to create booking."
        });

    }

});


// ==============================
// GET BOOKINGS
// ==============================

app.get("/bookings", requireAdmin, async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to load bookings."
        });

    }

});


// ==============================
// UPDATE BOOKING STATUS
// ==============================

app.patch(
    "/bookings/:id/status",
    requireAdmin,
    async (req, res) => {

        try {

            const id = Number(req.params.id);
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    message: "Status is required."
                });
            }

            const { data, error } = await supabase
                .from("bookings")
                .update({
                    status: status
                })
                .eq("id", id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                return res.status(404).json({
                    message: "Booking not found."
                });
            }

            res.json({
                message: "Booking status updated.",
                booking: data
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Failed to update booking."
            });

        }

    }
);


// ==============================
// ERROR HANDLER
// ==============================

app.use((error, req, res, next) => {

    console.error(error);

    if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                message: "Image is too large. Maximum size is 5MB."
            });

        }

    }

    res.status(500).json({
        message: error.message || "Server error."
    });

});


// ==============================
// START
// ==============================

app.listen(PORT, () => {

    console.log(
        `Mathew Car Hire API running on port ${PORT}`
    );

});