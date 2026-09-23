const API_URL = "https://mathew-car-hire-backend.onrender.com";

// ===============================
// LOAD CARS
// ===============================

async function loadCars() {
    try {
        const response = await fetch(`${API_URL}/cars`);

        if (!response.ok) {
            throw new Error("Failed to load cars");
        }

        const cars = await response.json();

        displayCars(cars);
        populateCarSelect(cars);

    } catch (error) {
        console.error("Error loading cars:", error);

        const container =
            document.getElementById("cars-container");

        if (container) {
            container.innerHTML =
                "<p>Unable to load cars.</p>";
        }
    }
}

// ===============================
// DISPLAY CARS
// ===============================

function displayCars(cars) {

    const container =
        document.getElementById("cars-container");

    if (!container) return;

    container.innerHTML = "";

    cars.forEach(car => {

        const carCard =
            document.createElement("div");

        carCard.className = "car-card";

        carCard.innerHTML = `
            <img
                src="${car.image || ""}"
                alt="${car.name}"
            >

            <h3>${car.name}</h3>

            <p>Category: ${car.category}</p>

            <p>
                <strong>
                    KES ${Number(
                        car.pricePerDay
                    ).toLocaleString()}
                </strong>
                per day
            </p>

            <p>
                Status:
                ${car.available
                    ? "Available"
                    : "Unavailable"}
            </p>

            ${
                car.available
                    ? `
                        <button
                            onclick="bookCar(${car.id})"
                        >
                            Book Now
                        </button>
                    `
                    : `
                        <button disabled>
                            Unavailable
                        </button>
                    `
            }
        `;

        container.appendChild(carCard);
    });
}

// ===============================
// POPULATE BOOKING SELECT
// ===============================

function populateCarSelect(cars) {

    const select =
        document.getElementById("carId");

    if (!select) return;

    select.innerHTML =
        `<option value="">Select a car</option>`;

    cars.forEach(car => {

        if (car.available) {

            const option =
                document.createElement("option");

            option.value = car.id;

            option.textContent =
                `${car.name} - KES ${Number(
                    car.pricePerDay
                ).toLocaleString()}/day`;

            select.appendChild(option);
        }
    });
}

// ===============================
// BOOK CAR BUTTON
// ===============================

function bookCar(carId) {

    const select =
        document.getElementById("carId");

    if (select) {
        select.value = carId;
    }

    document
        .getElementById("booking")
        ?.scrollIntoView({
            behavior: "smooth"
        });
}

// ===============================
// SUBMIT BOOKING
// ===============================

async function submitBooking(event) {

    event.preventDefault();

    const message =
        document.getElementById(
            "booking-message"
        );

    const carId =
        document.getElementById(
            "carId"
        ).value;

    const fullName =
        document.getElementById(
            "fullName"
        ).value.trim();

    const phone =
        document.getElementById(
            "phone"
        ).value.trim();

    const email =
        document.getElementById(
            "email"
        ).value.trim();

    const pickupDate =
        document.getElementById(
            "pickupDate"
        ).value;

    const returnDate =
        document.getElementById(
            "returnDate"
        ).value;

    if (
        !carId ||
        !fullName ||
        !phone ||
        !email ||
        !pickupDate ||
        !returnDate
    ) {
        message.textContent =
            "Please fill in all fields.";

        return;
    }

    if (
        new Date(returnDate) <
        new Date(pickupDate)
    ) {
        message.textContent =
            "Return date cannot be before pickup date.";

        return;
    }

    message.textContent =
        "Submitting booking...";

    try {

        const response =
            await fetch(
                `${API_URL}/bookings`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        carId: Number(carId),
                        fullName: fullName,
                        phone: phone,
                        email: email,
                        pickupDate: pickupDate,
                        returnDate: returnDate
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.message ||
                "Booking failed."
            );
        }

        message.textContent =
            "Booking submitted successfully! We will contact you soon.";

        document
            .getElementById(
                "booking-form"
            )
            .reset();

    } catch (error) {

        console.error(
            "Booking error:",
            error
        );

        message.textContent =
            error.message ||
            "Failed to submit booking.";
    }
}

// ===============================
// START
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCars();

        const form =
            document.getElementById(
                "booking-form"
            );

        if (form) {
            form.addEventListener(
                "submit",
                submitBooking
            );
        }
    }
);