const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app = express();
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvmax46.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const menuCollection = client.db("bistroDb").collection('menu');
    const reviewsCollection = client.db("bistroDb").collection('reviews');
    const cartCollection = client.db("bistroDb").collection('cart');

    const usersCollection = client.db("bistroDb").collection('users');

    // middleware


    // verify token
    const verifyToken = (req, res, next)=>{
      console.log('inside verify token', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'Forbidden Access'});
      }

      const token = req.headers.authorization.split(' ')[1];
     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) =>{
      if(error){
        return res.status(401).send({message: 'Forbidden Access'});
      }
      req.decoded = decoded;
      next();
     })   
    }

    // verify admin
    const verifyAdmin = async(req, res, next) =>{
      const email = req.decoded.email;
      const query = {email : email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return  res.status(403).send({message: 'Forbidden Access'});
      }
      next();
    }



    // jwt related Api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send({token})
    })


    // user related Api
    app.get('/users',verifyToken, verifyAdmin,  async(req, res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'unAuthorized access'})
      }

      const query ={email: email};
      const user = await usersCollection.findOne(query);
      
      let admin = false;
      if(user){
        admin = user?.role ==='admin'
      }
      res.send(admin)

    })


    app.post('/users', async(req, res)=>{
      const user = req.body;
      // insert email if user does not exist
      const query ={email: user.email};
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'User Already Exists', insertedId: null})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin,  async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })

    // making Admin api
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc ={
        $set:{
          role: 'admin',
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);

    })



    // Menu related Api
    app.get('/menu', async(req, res)=>{
        const cursor = menuCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/reviews', async(req, res)=>{
        const cursor = reviewsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    // cart collection : insert a cart
    app.post('/carts', async(req, res)=>{
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })

    // get all cart data
    app.get('/carts', async(req, res)=>{
      const email = req.query.email;
      const query = {email: email}
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    // delete a cart item
    app.delete('/carts/:id', async(req,res)=>{
      const id = req.params.id;
      const query ={_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Final bistro boss is running!')
})

app.listen(port, () => {
  console.log(`Final bistro boss is running on port ${port}`)
})