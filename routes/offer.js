const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");
const Offer = require("../models/Offer");
const stripe = require("stripe")(
  "sk_test_51MbSLiC5fuR6mfthGYWDTxOXE4ehomQGmwupZwKhxbpgAi6BO0PS1L9SE82t8x3jdfLDkneDmOJ8YGgiSf9owhpf00IoFF17ZD"
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const {
        product_name,
        product_description,
        product_price,
        marque,
        taille,
        etat,
        couleur,
        emplacement,
      } = req.body;
      const user = req.user;

      const newOffer = new Offer({
        product_name,
        product_description,
        product_price,
        product_details: [
          { MARQUE: marque },
          { TAILLE: taille },
          { ETAT: etat },
          { COULEUR: couleur },
          { EMPLACEMENT: emplacement },
        ],
        owner: user,
      });
      await newOffer.save();
      res.status(200).json(newOffer);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
);

router.put(
  "/offer/update",
  isAuthenticated,
  fileUpload(),
  async (req, res, next) => {
    try {
      const {
        id,
        product_name,
        product_description,
        product_price,
        product_details,
      } = req.body;
      const offerToUpdate = await Offer.findById(id);
      if (product_name) {
        offerToUpdate.product_name = product_name;
      }
      if (product_description) {
        offerToUpdate.product_description = product_description;
      }
      if (offerToUpdate) {
        offerToUpdate.product_price = product_price;
      }

      if (product_details) {
        if (!product_details.isArray) {
          offerToUpdate.product_details = [JSON.parse(product_details)];
        } else {
          offerToUpdate.product_details = product_details.map((item) =>
            JSON.parse(item)
          );
        }
      } else {
        offerToUpdate.product_details = [];
      }

      offerToUpdate.markModified("product_details");
      if (req.files) {
        const pict = req.files.pict;
        if (pict) {
          await cloudinary.uploader.destroy(
            offerToUpdate.product_image.public_id,
            function (error, result) {
              console.log("file upload", result, error);
            }
          );
          await cloudinary.uploader.upload(convertToBase64(pict), {
            folder: `/Vinted/offers/${offerToUpdate.owner}`,
          });
        }
      }
      await offerToUpdate.save();
      res.status(200).json(offerToUpdate);
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: e.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    const filters = {};

    if (title) {
      filters.product_name = new RegExp(title, "i");
    }
    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
    }
    if (priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = Number(priceMax);
      } else {
        filters.product_price = { $lte: Number(priceMax) };
      }
    }

    const sortFilter = {};
    if (sort === "price-asc") {
      sortFilter.product_price = "asc";
    } else if (sort === "price-desc") {
      sortFilter.product_price = "desc";
    }

    const limit = 5;
    let pageRequired = 1;
    if (page) pageRequired = Number(page);
    const skip = (pageRequired - 1) * limit;
    const offers = await Offer.find(filters)
      .sort(sortFilter)
      .skip(skip)
      .limit(limit)
      .populate("owner", "account");

    const count = await Offer.countDocuments(filters);

    const response = {
      count: count,
      offers: offers,
    };

    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    console.log(req.params);
    const offer = await Offer.findById(req.params.id).populate(
      "owner",
      "account"
    );
    res.json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/pay", async (req, res) => {
  // Réception du token créer via l'API Stripe depuis le Frontend
  const stripeToken = req.body.stripeToken;
  // Créer la transaction
  const response = await stripe.charges.create({
    amount: 2000,
    currency: "eur",
    description: "La description de l'objet acheté",
    // On envoie ici le token
    source: stripeToken,
  });
  console.log(response.status);

  // TODO
  // Sauvegarder la transaction dans une BDD MongoDB

  res.json(response);
});

module.exports = router;
