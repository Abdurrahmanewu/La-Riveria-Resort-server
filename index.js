const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();

const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jdfs3t2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`; // Connection URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // All Collections
    const packageCollection = client
      .db("La-Riveria-Resort-DB")
      .collection("packages");
    const bookingCollection = client
      .db("La-Riveria-Resort-DB")
      .collection("bookings");
    const reviewsCollection = client
      .db("La-Riveria-Resort-DB")
      .collection("reviews");

    // Packages API

    app.get("/packages", async (req, res) => {
      const result = await packageCollection.find().toArray();
      res.send(result);
    });

    app.get("/packages/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await packageCollection.findOne(query);
      res.send(result);
    });

    // Booking API

    app.get("/bookings", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } else {
        const result = await bookingCollection.find().toArray();
        res.send(result);
      }
    });

    app.post("/bookings", async (req, res) => {
      const bookingItem = req.body;
      const result = await bookingCollection.insertOne(bookingItem);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // Reviews API
    app.get("/reviews", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
        const result = await reviewsCollection.find(query).toArray();
        res.send(result);
      } else {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      }
    });
    app.post("/reviews", async (req, res) => {
      const reviewItem = req.body;
      const result = await reviewsCollection.insertOne(reviewItem);
      res.send(result);
    });
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("La Riveria Resort's server is Running");
});
app.listen(port, () => {
  console.log(`La Riveria Resort's Server is running on port ${port}`);
});
