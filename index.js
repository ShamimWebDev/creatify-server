const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.lwmsv9d.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");

    const db = client.db("model-bd");
    const artworksCollection = db.collection("models");

    // ==========================
    // GET all public artworks (Explore Artworks Page)
    app.get("/api/artworks", async (req, res) => {
      try {
        const { search, category } = req.query;
        let query = { visibility: "public" };

        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { artistName: { $regex: search, $options: "i" } },
          ];
        }

        if (category) {
          query.category = category;
        }

        const artworks = await artworksCollection
          .find(query)
          .sort({ createdAt: -1 }) // most recent first
          .toArray();

        res.status(200).json(artworks);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch artworks" });
      }
    });

    // ==========================
    // GET single artwork details*
    app.get("/api/artworks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const artwork = await artworksCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!artwork)
          return res.status(404).json({ error: "Artwork not found" });
        res.status(200).json(artwork);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch artwork" });
      }
    });
    // ==========================
    // POST new artwork (Add Artwork Page - Private)
    app.post("/api/artworks", async (req, res) => {
      try {
        const artwork = {
          ...req.body,
          createdAt: new Date(),
          likes: 0,
          favorites: [],
        };
        const result = await artworksCollection.insertOne(artwork);
        res.status(201).json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add artwork" });
      }
    });

    // ==========================
    // PATCH like an artwork
    app.patch("/api/artworks/:id/like", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await artworksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { likes: 1 } }
        );
        res.status(200).json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to like artwork" });
      }
    });
    
// ==========================
    // PATCH add/remove favorite
    app.patch("/api/artworks/:id/favorite", async (req, res) => {
      try {
        const id = req.params.id;
        const { userEmail, action } = req.body; // action: "add" or "remove"
        let update;
        if (action === "add") {
          update = { $addToSet: { favorites: userEmail } };
        } else {
          update = { $pull: { favorites: userEmail } };
        }

        const result = await artworksCollection.updateOne(
          { _id: new ObjectId(id) },
          update
        );
        res.status(200).json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update favorites" });
      }
    });

     // ==========================
    // PUT update artwork (Private - user can update their own)
    app.put("/api/artworks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const result = await artworksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.status(200).json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update artwork" });
      }
    });
    
  } finally {
    // client.close()  // don't close if server is running
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World! Server is running");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
