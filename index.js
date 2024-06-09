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


//middleWare
const verifyToken = async (req, res, next)=>{
    const token = req?.cookies.token;
    console.log(token);
    if(!token) {
      return res.status(401).send({message: 'unauthorized access'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
      if(err){
        return res.status(401).send({message: 'unauthorized'})
      }
      req.user = decoded
      next()
    })
}

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
    const storyCollection = db.collection('storys')
    const reviewCollection = db.collection('reviews')
   



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


    //verify the admin route
    const verifyAdmin = async (req, res, next)=>{
     const user = req.user;
     const query = {email : user?.email}
     const result = await userCollection.findOne(query)
     if(!result || result.role !== 'admin'){
      return res.status(401).send({message: 'unauthorized access'})
     }
     next()
    }
    //verify the admin route
    const verifyGuide = async (req, res, next)=>{
     const user = req.user;
     const query = {email : user?.email}
     const result = await userCollection.findOne(query)
     if(!result || result.role !== 'guide'){
      return res.status(401).send({message: 'unauthorized access'})
     }
     next()
    }

    // ---------------------User Collection APies ----------------------
    
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
    app.get('/users', verifyToken, verifyAdmin,  async(req, res)=>{
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const search = req?.query.search;
      const filter = req?.query.filter;

      
      let query = {}

      if(search){

        query =  {
          $or : [
           { email : {$regex : search, $options: 'i'}},
           {name : {$regex : search, $options: 'i'}}
          ]
        }
        
      }

      if(filter){
        query.role = filter
      } 
      
      const result = await userCollection.find(query).skip((page -1) * size).limit(size).toArray()
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
    
    //update tourGuide profile
    app.put('/tour-guide-profile/:email', async(req, res)=>{
      const email = req.params.email;
      const updatedInfo = req.body;
      const query = {email : email}
      const options = {upsert: true}
      const updatedDoc = {
        $set : {
          ...updatedInfo,
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc, options)
      res.send(result)
    })

     //****************************************Review Collection Api****************** */

     app.post('/review', async(req, res)=>{
      const review = req.body;
      const result = await reviewCollection.insertOne(review)
      res.send(result)
    })

    app.get('/reviews/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {guideEmail : email}
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
    })

    // ----------------------------All package collection api------------

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
    // app.get('/pack/:type', async(req, res)=>{
    //   const type = req.params.type;
    //   const query = {tourTypes: type }
    //   const result = await packageCollection.findOne(query)
    //   res.send(result)
    // })

    
   
    //-------------------------------All booking collection api------------
 
    // Save bookings on the database 
    app.post('/booking', async(req, res)=>{
      const newBooking = req.body;
      const query = { bookingId: newBooking.bookingId, touristEmail: newBooking.touristEmail };
      const isExist = await bookingCollection.findOne(query)
      if(isExist) return res.status(409).send({message: "You have Already Booked this Tour"})
      const result = await bookingCollection.insertOne(newBooking)
      res.send(result)
    })


    //get a booking for a specific tourist
    app.get('/booking/:email', verifyToken, async(req, res)=>{

      // if(req?.query.email !== req?.user.email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const email = req.params.email;
      const query = {touristEmail : email}
      const result = await bookingCollection.find(query).skip((page -1) * size).limit(size).toArray()
      res.send(result)
    })

    //cancel or delete a booking for a specific user
    app.delete('/delete-booking/:id', verifyToken, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })
    //get all assign tours for a specific guide
    app.get('/assign-tours/:email', verifyToken, verifyGuide, async(req, res)=>{
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const email = req.params.email;
      const query = {guideEmail: email}
      const result = await bookingCollection.find(query).skip((page - 1) * size).limit(size).toArray()
      res.send(result)
    })

    //change the status of a booking from in review 
    app.patch('/update-status/:id', async(req, res)=>{
      const id = req.params.id;
      
      const status = req.body.status;
     
      const query = {bookingId : id}
     
      const updatedDoc = {
        $set: {status},
      }

      const result = await bookingCollection.updateOne(query, updatedDoc)
      res.send(result)
    })
    //----------------------------All Wishlist collection  Api------------

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
    app.get('/wishlist/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      const query = {touristEmail : email}

      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const result = await wishlistCollection.find(query).skip((page - 1) * size).limit(size).toArray()
      res.send(result)
    })
 
    //delete api for remove wishlist for a tourist
    app.delete('/wish/:id', verifyToken, async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await wishlistCollection.deleteOne(query)
      res.send(result)
    })


    // -----------------------Story Collection Apis--------------------

    //post a story on db
    app.post('/story', async(req, res)=>{
      const newStory = req.body;
      const result = await storyCollection.insertOne(newStory)
      res.send(result)
    })

    //get all stories
    app.get('/stories', async(req, res)=>{
      const result = await storyCollection.find().toArray()
      res.send(result)
    })

    //get a specific story details
    app.get('/story/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await storyCollection.findOne(query)
      res.send(result)
    })

    // *************************************Pagination*****************************

    //pagination: user count 
    app.get('/user-count', async(req, res)=>{
      const count = await userCollection.estimatedDocumentCount()
      res.send({count})
       
    })

    //pagination: bookings count
    app.get('/booking-count/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email : email}
      const count = await bookingCollection.estimatedDocumentCount(query)
      res.send({count})
    })

    //pagination: wishlist count
    app.get('/wishlist-count/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email : email}
      const count = await wishlistCollection.estimatedDocumentCount(query)
      res.send({count})
    })

    //pagination: assign tour count
    app.get('/tour-count/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email : email}
      const count = await bookingCollection.estimatedDocumentCount(query)
      res.send({count})
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
