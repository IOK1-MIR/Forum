const mongoose = require('mongoose');
const { MONGO_URI } = process.env;
const User = require('../models/user'); // Importamos el modelo de Usuario

if (!MONGO_URI) {
  console.error('Missing required environment variable: MONGO_URI');
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Aseguramos que el proceso salga en caso de error
  }
};
mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err}`);
  process.exit(1);
});

module.exports = connectDB;