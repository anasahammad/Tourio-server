const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}


app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.goboxhh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const db = client.db('tourGuide')
    const packageCollection = db.collection('packages')
    const userCollection = db.collection('users')
   



     // auth related api
     app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })


    //save user on the collection
  app.put('/user', async(req, res)=>{
    const user = req.body
    const query = {email : user.email}
    const isExist = await userCollection.findOne(query)
    if(isExist) {
      if(user.status === 'requested'){
        const updateDoc = {
            $set: {
              status : user?.status
            }
        }
        const result = await userCollection.updateOne(query, updateDoc)
        res.send(result)
      } 
      else{
        return res.send(isExist)
      }
    }
      const options = {upsert : true}
    const updateDoc = {
      $set: {
        ...user,
      }
    }
    const result = await userCollection.updateOne(query, updateDoc, options)
    res.send(result)
  })


  
    //get all users
    app.get('/users', async(req, res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    //get specific user
    app.get('/user/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email: email}
      const result = await userCollection.findOne(query)
      res.send(result)
    })

    //change  role
    app.patch('/users/update/:email', async(req, res)=>{
      const email = req.params.email;
      const user = req.body;
      console.log(user, email);
      const query = {email : email}
      const updatedDoc = {
        $set: {
          ...user, 
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc)
      res.send(result)
    })
   

    //get all tour guid
    app.get('/tour-guides', async(req, res)=>{
      const query = {role : 'guide'}
      const result = await userCollection.find(query).toArray()
      res.send(result)
    })
    //post package
    app.post('/package', async(req, res)=>{
      const package = req.body;
      const result = await packageCollection.insertOne(package)
      res.send(result)
    })

    app.get('/packages', async(req, res)=>{
      const result = await packageCollection.find().toArray()
      res.send(result)
    })

    //get single package with id
    app.get('/package/:id', async(req, res)=>{
      const id= req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await packageCollection.findOne(query)
      res.send(result)
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async(req, res)=>{
    res.send('Tour Guide is Coming')
})
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
