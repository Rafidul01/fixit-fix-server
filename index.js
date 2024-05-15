const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

//middlewares--------
app.use(
  cors({
    origin: [
      // "http://localhost:5173",
      "https://fixit-fix.web.app",
      "https://fixit-fix.firebaseapp.com"


    ],
    credentials: true, // it is very important for send cookie to client
  })
);
app.use(cookieParser());
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

const logger = async (req, res, next) => {
  console.log("called: ", req.method, req.url);
  next();
};
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("tok tok token from middleware: ", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.error(err);
      return res.status(401).send({ message: "Unauthorized" });
    }
    console.log("value in the token : ", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      // create a token for user
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });

      // send cookie to client by http only
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //logout 
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    const servicesCollection = client.db("fixitFix").collection("services");
    const bookedCollection = client.db("fixitFix").collection("booked");
    app.get("/services",  async (req, res) => {
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

    app.get("/service/manage/:email",logger , verifyToken, async (req,res) => {
      const email = req.params.email;
      console.log(email);
      const query = { 
        userEmail: email
       };
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get("/service/booked/:email",logger , verifyToken, async (req,res) => {
      const email = req.params.email;
      console.log(email);
      const query = { 
        purchaseEmail: email
       };
      const cursor = bookedCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get("/service/toDo/:email",logger , verifyToken, async (req,res) => {
      const email = req.params.email;
      console.log(email);
      const query = { 
        providerEmail: email
       };
      const cursor = bookedCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get("/services/:id",logger,verifyToken,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    })

    app.patch("/service/status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.query?.status;
      console.log(status);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status
        },
      };
      const result = await bookedCollection.updateOne(query, updateDoc);
      res.send(result);
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

    app.put("/service/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateService = req.body;
      const service = {
        $set: updateService,
      };
      const result = await servicesCollection.updateOne(filter,service,);
      res.send(result);
    });


    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
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
