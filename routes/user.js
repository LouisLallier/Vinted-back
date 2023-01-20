const express = require("express");
const router = express.Router();
const User = require("../models/User");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

router.post("/user/signup", async (req, res) => {
  try {
    const { email, username, password, newsletter } = req.body;
    const userCheck = await User.findOne({ email: email });

    if (userCheck) {
      return res.status(400).json({ message: "This Email already exist !" });
    }

    const salt = uid2(16);
    const hash = SHA256(salt + password).toString(encBase64);
    const token = uid2(32);

    const newUser = new User({
      email: email,
      account: {
        username: username,
      },
      newsletter: newsletter,
      token: token,
      salt: salt,
      hash: hash,
    });
    await newUser.save();

    const response = {
      _id: newUser._id,
      account: newUser.account,
      token: newUser.token,
    };
    res.status(200).json(response);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.post("/user/login", async (req, res) => {
  const { email, password } = req.body;
  const userCheck = await User.findOne({ email: email });
  if (!userCheck) {
    return res.status(400).json({
      message: "This Email does not exist in our website",
    });
  }
  const hashCheck = SHA256(userCheck.salt + password).toString(encBase64);
  if (userCheck.hash === hashCheck) {
    res.status(200).json({
      _id: userCheck.id,
      token: userCheck.token,
      account: userCheck.account,
    });
  }
});

module.exports = router;
