```javascript
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: SUPABASE_URL or SUPABASE_KEY is missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);


// ===============================
// FORMAT CAR FOR FRONTEND
// ===============================

function formatCar(car) {
    return {
        id: car.id,
        name: car.name,
        category: car.category,
        pricePerDay: Number(car.price_per_day || 0),
        available: Boolean(car.available),
        image: car.image || ""
    };
}


// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "Mathew Car Hire API is running",
        database: "Supabase"
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
            console.error("GET CARS ERROR:", error);
            return res.status(500).json({
                error: error.message
            });
        }

        res.json(data.map(formatCar));

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to load cars"
        });
    }
});


// ===============================
// ADD CAR
// ===============================

app.post("/cars", async (req, res) => {
    try {
        const {
            name,
            category,
            pricePerDay,
            available,
            image
        } = req.body;

        const newCar = {
            name: name,
            category: category,
            price_per_day: Number(pricePerDay),
            available: available !== false,
            image: image || ""
        };

        const { data, error } = await supabase
            .from("cars")
            .insert([newCar])
            .select()
            .single();

        if (error) {
            console.error("ADD CAR ERROR:", error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.status(201).json(formatCar(data));

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to add car"
        });
    }
});


// ===============================
// UPDATE CAR
// ===============================

app.put("/cars/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const {
            name,
            category,
            pricePerDay,
            available,
            image
        } = req.body;

        const updates = {};

        if (name !== undefined) {
            updates.name = name;
        }

        if (category !== undefined) {
            updates.category = category;
        }

        if (pricePerDay !== undefined) {
            updates.price_per_day = Number(pricePerDay);
        }

        if (available !== undefined) {
            updates.available = Boolean(available);
        }

        if (image !== undefined) {
            updates.image = image;
        }

        const { data, error } = await supabase
            .from("cars")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("UPDATE CAR ERROR:", error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.json(formatCar(data));

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to update car"
        });
    }
});


// ===============================
// DELETE CAR
// ===============================

app.delete("/cars/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("cars")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.error("DELETE CAR ERROR:", error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.json({
            message: "Car deleted successfully",
            car: data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to delete car"
        });
    }
});


// ===============================
// GET BOOKINGS
// ===============================

app.get("/bookings", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .order("created-at", { ascending: false });

        if (error) {
            console.error("GET BOOKINGS ERROR:", error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.json(data);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to load bookings"
        });
    }
});


// ===============================
// ADD BOOKING
// ===============================

app.post("/bookings", async (req, res) => {
    try {
        const {
            "car-id": carId,
            "car-name": carName,
            fullname,
            phone,
            email,
            "pick-up date": pickupDate,
            "return date": returnDate,
            status
        } = req.body;

        const booking = {
            "car-id": carId,
            "car-name": carName,
            fullname: fullname,
            phone: phone,
            email: email || "",
            "pick-up date": pickupDate || "",
            "return date": returnDate || "",
            status: status || "Pending",
            "created-at": new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("bookings")
            .insert([booking])
            .select()
            .single();

        if (error) {
            console.error("ADD BOOKING ERROR:", error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.status(201).json(data);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to create booking"
        });
    }
});


// ===============================
// DELETE BOOKING
// ===============================

app.delete("/bookings/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("bookings")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.error("DELETE BOOKING ERROR:", error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.json({
            message: "Booking deleted successfully",
            booking: data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to delete booking"
        });
    }
});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
    console.log(`Mathew Car Hire backend running on port ${PORT}`);
});
```
