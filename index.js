import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();
const port = 5000;

app.use(cors());
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

// validate :id for every route that has it
app.param("id", (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
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
app.post("/add-studio", async (req, res) => {
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
app.get("/studio-explore/:id", async (req, res) => {
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
app.patch("/studio-explore/:id", async (req, res) => {
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
app.delete("/studio-explore/:id", async (req, res) => {
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
app.post("/booking", async (req, res) => {
  try {
    const data = req.body;
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

// Cancel (delete) a booking
app.delete("/booking/:id", async (req, res) => {
  try {
    const result = await bookingCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Booking not found" });
    }
    res.status(200).send(result);
  } catch (err) {
    console.error("DELETE /booking/:id failed:", err);
    res.status(500).send({ message: "Failed to cancel booking", error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
