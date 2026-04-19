import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_CONNECTION;

let client;
let clientPromise;

if (!uri) {
  // Do not throw during module import; export a rejected promise so callers
  // that `await` the clientPromise can catch the error and return JSON
  // responses instead of letting the server render an HTML error page.
  clientPromise = Promise.reject(
    new Error("Please add the MONGODB_CONNECTION environment variable to .env")
  );
} else {
  if (process.env.NODE_ENV === "development") {
    if (!globalThis._mongoClientPromise) {
      client = new MongoClient(uri);
      globalThis._mongoClientPromise = client.connect();
    }
    clientPromise = globalThis._mongoClientPromise;
  } else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

export default clientPromise;
