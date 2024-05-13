const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middlewares--------
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hjxwn6k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const servicesCollection = client.db("fixitFix").collection("services");
    const bookedCollection = client.db("fixitFix").collection("booked");
    app.get("/services", async (req, res) => {
      const filter = req?.query?.sort;
      const search = req?.query?.search;
      console.log(filter,search);
      const query = {};
      let sort = {};
      if(filter === "views") {
        sort = { views: -1 };
      }
      if(filter === "booked") {
        sort = { booked: -1 };
      }
      if (search) {
        query.name = {
          $regex: search,
          $options: "i"
        };
      } 
      
      const cursor = servicesCollection.find(query).sort(sort);
      const services = await cursor.toArray();
      res.send(services);
    })

    app.get("/service/manage/:email", async (req,res) => {
      const email = req.params.email;
      console.log(email);
      const query = { 
        userEmail: email
       };
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    })

    app.patch("/service/:id", async (req, res) => {
      const id = req.params.id;
      const views = req?.query?.views;
      // console.log(views);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          views
        },
      };
      const result = await servicesCollection.updateOne(query, updateDoc);
      res.send(result);
    })
    app.post("/service", async (req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      // console.log(result);
      res.send(result);
    })
    app.post("/booked", async (req, res) => {
      const booked = req.body;
      const result = await bookedCollection.insertOne(booked);
      // console.log(result);
      res.send(result);
    })
    app.patch("/service/booked/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { booked: 1 },
      };
      const result = await servicesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.use(express.json());

app.get("/", (req, res) => {
  res.send("Fixit-Fix server is running ......");
});

app.listen(port, () => {
  console.log(`Fixit-Fix server is running on port : ${port}`);
});
