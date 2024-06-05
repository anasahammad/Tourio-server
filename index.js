const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000
const dotenv = require('dotenv');
const nodemailer = require("nodemailer");
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


//email sending 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: "smtp.gmail.email",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.TRANSPORT_EMAIL,
    pass: process.env.TRANSPORT_PASS,
  },
});

//send email to the guide
app.post('/contact', async (req, res) => {
  const { touristEmail, guideEmail, message } = req.body;

  const mailOptions = {
    from: touristEmail,
    to: guideEmail,
    subject: 'Message from Tourist',
    text: message
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).send({ message: 'Error sending email' });
  }
});

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
    const bookingCollection = db.collection('bookings')
    const wishlistCollection = db.collection('wishlists')
   



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

    //get individual tour guide for profile
    app.get('/tour-guide/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email : email}
      const result = await userCollection.findOne(query)
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


    // Save bookings on the database 
    app.post('/booking', async(req, res)=>{
      const newBooking = req.body;
      const query = { bookingId: newBooking.bookingId, touristEmail: newBooking.touristEmail };
      const isExist = await bookingCollection.findOne(query)
      if(isExist) return res.status(409).send({message: "You have Already Booked this Tour"})
      const result = await bookingCollection.insertOne(newBooking)
      res.send(result)
    })


    //save wishlist on db
    app.post('/wishlists', async(req, res)=>{
      const wishlist = req.body;
     const query = {wishlistId: wishlist.wishlistId , touristEmail : wishlist.touristEmail }
     const isExist = await wishlistCollection.findOne(query)
     if(isExist) {
       return res.status(409).send({message : "Already added to your wishlist"})
     }
      const result = await wishlistCollection.insertOne(wishlist)
      res.send(result)
    })

    //get a specific tourist wishlist
    app.get('/wishlist/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {touristEmail : email}
      const result = await wishlistCollection.find(query).toArray()
      res.send(result)
    })
 
    //delete api for remove wishlist for a tourist
    app.delete('/wish/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await wishlistCollection.deleteOne(query)
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
