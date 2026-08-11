const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    let mongoUri = config.MONGO_URI;

    // Dev convenience: spin up an in-memory MongoDB when no URI is provided
    if (process.env.USE_MEMORY_DB === 'true' || !mongoUri) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log('Using in-memory MongoDB at', mongoUri);
    }

    const db = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB!');

    return db;
  } catch (err) {
    console.error(err.message);
    process.exit(-1);
  }
};

module.exports = connectDB;
