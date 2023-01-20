const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

app.use(express.json());
mongoose.set("strictQuery", false);

mongoose.connect(process.env.MONGODB_URI);

app.use(userRoutes);
app.use(offerRoutes);

app.listen(process.env.PORT, () => {
  console.log("SERVER IS RUNNING 🏃");
});
