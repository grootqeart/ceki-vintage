const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    let mongoUri = config.MONGO_URI;

    // In production the in-memory fallback below is never what you want: it
    // boots fine, so nothing looks wrong, but every account is wiped on each
    // restart. Fail with an explicit message instead -- without this the
    // symptom is a bare "Cannot find module 'mongodb-memory-server'" (the
    // package is a devDependency and isn't installed in production), which
    // says nothing about the actual mistake.
    if (!mongoUri && config.NODE_ENV === 'production') {
      throw new Error(
        'MONGO_URI is not set. Refusing to start in production without a real database ' +
          '-- set MONGO_URI to your MongoDB connection string (see DEPLOY.md).',
      );
    }

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
