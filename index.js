const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const SSLCommerzPayment = require("sslcommerz-lts");

const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ClientSession,
} = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jdfs3t2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`; // Connection URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const store_id = "lariv685b8c49d3e77";
const store_passwd = "lariv685b8c49d3e77@ssl";
const is_live = false; //true for live, false for sandbox

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
    const finalBookingsCollection = client
      .db("La-Riveria-Resort-DB")
      .collection("finalBookings");

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
    // Payment API

    const transactionId = new ObjectId().toString();
    app.post("/payments", async (req, res) => {
      // console.log(req.body.totalPrice);
      const paymentData = await req.body;
      const data = {
        total_amount: paymentData?.totalPrice,
        currency: "BDT",
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `http://localhost:5001/payments/success/${transactionId}`,
        fail_url: `http://localhost:5001/payments/fail/${transactionId}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: paymentData?.mail.email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const finalOrdersData = {
          paymentData: paymentData,
          transactionId: transactionId,
          paidStatus: false,
        };

        const result = finalBookingsCollection.insertOne(finalOrdersData);
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/payments/success/:tranId", async (req, res) => {
        const result = await finalBookingsCollection.updateOne(
          { transactionId: req.params.tranId },
          {
            $set: {
              paidStatus: true,
            },
          }
        );

        if (result.modifiedCount > 0) {
          const finalBooking = await finalBookingsCollection.findOne({
            transactionId,
          });

          const userEmail = finalBooking?.paymentData?.mail?.email;

          if (userEmail) {
            const deleteResult = await bookingCollection.deleteMany({
              email: userEmail,
            });
          }

          res.redirect(
            `http://localhost:5173/dashboard/payments/success/${req.params.tranId}`
          );
        }
        // console.log(req.params.tranId);
      });

      app.post("/payments/fail/:tranId", async (req, res) => {
        const result = await finalBookingsCollection.deleteOne({
          transactionId: req.params.tranId,
        });
        if (result.deletedCount > 0) {
          res.redirect(
            `http://localhost:5173/dashboard/payments/fail/${req.params.tranId}`
          );
        }
        console.log(req.params.tranId);
      });

      // console.log(paymentData);
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
