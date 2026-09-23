require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// ===============================
// ADMIN SETTINGS
// ===============================

const ADMIN_USERNAME =
    process.env.ADMIN_USERNAME || "admin";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "Mathew@123";

const ADMIN_TOKEN =
    process.env.ADMIN_TOKEN || "mathew-admin-token";

// ===============================
// ADMIN AUTHENTICATION
// ===============================

function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Admin authentication required."
        });
    }

    const token = authHeader.replace("Bearer ", "");

    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({
            message: "Invalid admin token."
        });
    }

    next();
}

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "Mathew Car Hire API is running"
    });
});

// ===============================
// GET ALL CARS
// ===============================

app.get("/cars", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("cars")
            .select("*")
            .order("id", { ascending: true });

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

// ===============================
// GET SINGLE CAR
// ===============================

app.get("/cars/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("cars")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
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

// ===============================
// ADD CAR
// ===============================

app.post("/cars", requireAdmin, async (req, res) => {
    try {
        const {
            name,
            category,
            pricePerDay,
            image
        } = req.body;

        if (!name || !category || !pricePerDay) {
            return res.status(400).json({
                message: "Please provide car details."
            });
        }

        const { data, error } = await supabase
            .from("cars")
            .insert({
                name: name,
                category: category,
                price_per_day: Number(pricePerDay),
                available: true,
                image: image || null
            })
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

// ===============================
// CREATE BOOKING
// ===============================

app.post("/bookings", async (req, res) => {
    try {
        const {
            carId,
            fullName,
            phone,
            email,
            pickupDate,
            returnDate
        } = req.body;

        if (
            !carId ||
            !fullName ||
            !phone ||
            !email ||
            !pickupDate ||
            !returnDate
        ) {
            return res.status(400).json({
                message:
                    "Please provide all booking information."
            });
        }

        const { data: car, error: carError } =
            await supabase
                .from("cars")
                .select("*")
                .eq("id", Number(carId))
                .single();

        if (carError || !car) {
            return res.status(404).json({
                message:
                    "Selected car was not found."
            });
        }

        if (!car.available) {
            return res.status(400).json({
                message:
                    "This car is currently unavailable."
            });
        }

        const { data: booking, error } =
            await supabase
                .from("bookings")
                .insert({
                    car_id: car.id,
                    car_name: car.name,
                    full_name: fullName,
                    phone: phone,
                    email: email,
                    pickup_date: pickupDate,
                    return_date: returnDate,
                    status: "Pending"
                })
                .select()
                .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message:
                "Booking submitted successfully.",
            booking: booking
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message:
                "Failed to create booking."
        });
    }
});

// ===============================
// GET ALL BOOKINGS
// ADMIN ONLY
// ===============================

app.get(
    "/bookings",
    requireAdmin,
    async (req, res) => {
        try {
            const { data, error } =
                await supabase
                    .from("bookings")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );

            if (error) {
                throw error;
            }

            const bookings = data.map(
                booking => ({
                    id: booking.id,
                    carId: booking.car_id,
                    carName: booking.car_name,
                    fullName: booking.full_name,
                    phone: booking.phone,
                    email: booking.email,
                    pickupDate:
                        booking.pickup_date,
                    returnDate:
                        booking.return_date,
                    status:
                        booking.status,
                    createdAt:
                        booking.created_at
                })
            );

            res.json(bookings);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message:
                    "Failed to load bookings."
            });
        }
    }
);

// ===============================
// GET SINGLE BOOKING
// ADMIN ONLY
// ===============================

app.get(
    "/bookings/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                Number(req.params.id);

            const { data, error } =
                await supabase
                    .from("bookings")
                    .select("*")
                    .eq("id", id)
                    .single();

            if (error || !data) {
                return res.status(404).json({
                    message:
                        "Booking not found."
                });
            }

            res.json(data);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message:
                    "Failed to load booking."
            });
        }
    }
);

// ===============================
// UPDATE BOOKING STATUS
// ADMIN ONLY
// ===============================

app.patch(
    "/bookings/:id/status",
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                Number(req.params.id);

            const { status } =
                req.body;

            const allowedStatuses = [
                "Pending",
                "Approved",
                "Rejected",
                "Completed"
            ];

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid booking status."
                });
            }

            const { data, error } =
                await supabase
                    .from("bookings")
                    .update({
                        status: status
                    })
                    .eq("id", id)
                    .select()
                    .single();

            if (error || !data) {
                return res.status(404).json({
                    message:
                        "Booking not found."
                });
            }

            res.json({
                message:
                    "Booking status updated.",
                booking: data
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message:
                    "Failed to update booking."
            });
        }
    }
);

// ===============================
// ADMIN LOGIN
// ===============================

app.post(
    "/admin/login",
    (req, res) => {

        const {
            username,
            password
        } = req.body;

        if (
            username ===
                ADMIN_USERNAME &&
            password ===
                ADMIN_PASSWORD
        ) {
            return res.json({
                message:
                    "Login successful",
                token:
                    ADMIN_TOKEN
            });
        }

        res.status(401).json({
            message:
                "Invalid username or password."
        });
    }
);

// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    () => {
        console.log(
            `Server running on port ${PORT}`
        );
    }
);