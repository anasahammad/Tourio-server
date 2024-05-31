const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000
const dotenv = require('dotenv');
dotenv.config();

app.use(cors());
app.use(express.json());


app.get('/', async(req, res)=>{
    res.send('Tour Guide is Comming')
})
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
