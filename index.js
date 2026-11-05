import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const port = 5000;

/** Next.js app that issues the JWT (better-auth) and serves /api/auth/jwks. */
const APP_URL = (process.env.BETTER_AUTH_URL ?? `${process.env.CLIENT_URL}`).replace(
  /\/+$/,
  ""
);
/** Must match the HTTPOnly cookie set by `POST /api/auth/jwt` in the Next app. */
const JWT_COOKIE_NAME = "studiospace_jwt";

const JWKS = createRemoteJWKSet(new URL("/api/auth/jwks", APP_URL));

// The browser only sends the HTTPOnly JWT cookie when the allowed origin is
// echoed back (never "*") and credentials are enabled.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const EXTRA_ORIGINS = (process.env.APP_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server) is always allowed.
      if (!origin) return callback(null, true);
      if (LOCAL_ORIGIN.test(origin) || EXTRA_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace");
const studioCollection = db.collection("studio");
const bookingCollection = db.collection("booking");


/** Reads the JWT from `Authorization: Bearer` or the HTTPOnly cookie. */
function readToken(req) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    const bearer = header.slice("bearer ".length).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === JWT_COOKIE_NAME) {
      const raw = value.join("=");
      return raw ? decodeURIComponent(raw) : null;
    }
  }
  return null;
}

/**
 * Verifies the better-auth JWT on protected routes.
 *
 * The browser sends it as the HTTPOnly cookie set by the Next app; server-side
 * callers (and curl/Postman) can send `Authorization: Bearer <jwt>`.
 * Missing, tampered, or expired tokens are rejected with 401.
 */
export const verifyToken = async (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: APP_URL,
      audience: APP_URL,
    });

    if (!payload?.sub || !payload.email) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    // Downstream handlers can trust this instead of the request body.
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      image: payload.image ?? null,
    };

    return next();
  } catch (err) {
    console.error("JWT verification failed:", err.code ?? err.message);
    return res.status(401).send({ message: "Unauthorized" });
  }
};

// Allowed lifecycle values for a booking's status
const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

// validate :id — allows both MongoDB ObjectIds (24 hex chars) and the
// older booking documents whose _id is a studio slug (e.g. "the-art-attic")
app.param("id", (req, res, next, id) => {
  if (!/^(?:[a-f\d]{24}|[\w-]+)$/i.test(id)) {
    return res.status(400).send({ message: `Invalid id: ${id}` });
  }
  next();
});

// fields the edit form is allowed to change (never _id)
const EDITABLE_FIELDS = [
  "title",
  "category",
  "city",
  "hourlyRate",
  "securityDeposit",
  "address",
  "maxCapacity",
  "image",
  "gallery",
  "amenities",
  "overview",
];

/* ---------- CREATE ---------- */
app.post("/add-studio", verifyToken, async (req, res) => {
  try {
    const result = await studioCollection.insertOne(req.body);
    res.send(result);
  } catch (err) {
    console.error("POST /add-studio failed:", err);
    res.status(500).send({ message: "Failed to add studio", error: err.message });
  }
});

/* ---------- READ ALL ---------- */
app.get("/studio-explore", async (req, res) => {
  try {
    const result = await studioCollection.find().toArray();
    res.send(result);
  } catch (err) {
    console.error("GET /studio-explore failed:", err);
    res.status(500).send({ message: "Failed to fetch studios", error: err.message });
  }
});

/* ---------- READ ONE ---------- */
app.get("/studio-explore/:id", 
 verifyToken, 
  async (req, res) => {
  try {
    const result = await studioCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!result) {
      return res.status(404).send({ message: "Studio not found" });
    }
    res.send(result);
  } catch (err) {
    console.error("GET /studio-explore/:id failed:", err);
    res.status(500).send({ message: "Failed to fetch studio", error: err.message });
  }
});

/* ---------- UPDATE (Edit) ---------- */
app.patch("/studio-explore/:id", verifyToken, async (req, res) => {
  try {
    const updateData = Object.fromEntries(
      Object.entries(req.body ?? {}).filter(([key]) =>
        EDITABLE_FIELDS.includes(key)
      )
    );

    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({ message: "No valid fields to update" });
    }

    const result = await studioCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Studio not found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("PATCH /studio-explore/:id failed:", err);
    res.status(500).send({ message: "Failed to update studio", error: err.message });
  }
});

/* ---------- DELETE ---------- */
app.delete("/studio-explore/:id", verifyToken, async (req, res) => {
  try {
    const result = await studioCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Studio not found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("DELETE /studio-explore/:id failed:", err);
    res.status(500).send({ message: "Failed to delete studio", error: err.message });
  }
});

/* ---------- BOOKINGS ---------- */

// Create a booking (called from BookingCard)
app.post("/booking", verifyToken, async (req, res) => {
  try {
    // Every new reservation starts as Pending unless a valid status is sent.
    const data = {
      ...req.body,
      status: BOOKING_STATUSES.includes(req.body?.status)
        ? req.body.status
        : "Pending",
    };
    const result = await bookingCollection.insertOne(data);
    res.send(result);
  } catch (err) {
    console.error("POST /booking failed:", err);
    res.status(500).send({ message: "Failed to save booking", error: err.message });
  }
});

app.get('/my-booking/:email', async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection.find({ email:email}).toArray();
  res.send(result);
})

// Read bookings — pass ?email=... to get one user's bookings
app.get("/booking", async (req, res) => {
  try {
    const { email } = req.query;
    const filter = email ? { email } : {};
    const result = await bookingCollection.find(filter).toArray();
    res.send(result);
  } catch (err) {
    console.error("GET /booking failed:", err);
    res.status(500).send({ message: "Failed to fetch bookings", error: err.message });
  }
});

// Cancel (delete) a booking — accepts generated ObjectIds
// and the older booking ids that are plain studio slugs
app.delete("/booking/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = /^[a-f\d]{24}$/i.test(id)
      ? { _id: new ObjectId(id) }
      : { _id: id };

    const result = await bookingCollection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Booking not found" });
    }
    res.status(200).send(result);
  } catch (err) {
    console.error("DELETE /booking/:id failed:", err);
    res.status(500).send({ message: "Failed to cancel booking", error: err.message });
  }
});

// Update a booking's status (e.g. Cancel / Cancel Booking)
app.patch("/booking/:id", verifyToken, async (req, res) => {
  try {
    const status = req.body?.status;
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).send({ message: `Invalid status: ${status}` });
    }

    const id = req.params.id;
    const filter = /^[a-f\d]{24}$/i.test(id)
      ? { _id: new ObjectId(id) }
      : { _id: id };

    const result = await bookingCollection.updateOne(filter, {
      $set: { status },
    });

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Booking not found" });
    }
    res.status(200).send(result);
  } catch (err) {
    console.error("PATCH /booking/:id failed:", err);
    res.status(500).send({ message: "Failed to update booking", error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app;