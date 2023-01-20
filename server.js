const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");

const app = express();
app.use(express.json());
mongoose.set("strictQuery", false);

mongoose.connect("mongodb://localhost/vinted");

app.use(userRoutes);
app.use(offerRoutes);

app.listen(3000, () => {
  console.log("SERVER IS RUNNING 🏃");
});
