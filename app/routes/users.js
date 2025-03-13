var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
require('dotenv').config();


// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error de conexión:', err));





const userSchema = new Schema({
  name : { type : String, required : true },
})



const User = model('User', userSchema);
/* GET users listing. */
router.get('/', async (req, res, next)=> {
  try {

    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).send(err);
  }
});


module.exports = router;
