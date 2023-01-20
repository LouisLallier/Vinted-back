const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");
const Offer = require("../models/Offer");
const { debugLog } = require("express-fileupload/lib/utilities");

cloudinary.config({
  cloud_name: "dpeyhfmjh",
  api_key: "912523765999686",
  api_secret: "t9buLY0DMKAcgYzlCsEFwwv1t3E",
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

      // const picture = await cloudinary.uploader.upload(
      //   convertToBase64(req.files.pict),
      //   {
      //     folder: `/Vinted/offers/${user._id}`,
      //   }
      // );

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
        //product_image: picture,
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
    // title=pantalon&priceMax=200&priceMin=20&sort=price-asc&page=3

    const { title, priceMin, priceMax, sort, page } = req.query;
    // const title = req.query.title;
    // console.log(title);

    const filters = {};
    if (title) {
      filters.product_name = new RegExp(title, "i");
    }

    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
    }

    // console.log(filters);

    if (priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = Number(priceMax);
      } else {
        filters.product_price = { $lte: Number(priceMax) };
      }
    }

    // console.log(filters);

    const sortFilter = {};

    if (sort === "price-asc") {
      sortFilter.product_price = "asc"; // ou 1 ou "ascending"
    } else if (sort === "price-desc") {
      sortFilter.product_price = "desc"; // ou -1 ou "descending"
    }

    // On peut aussi faire ça :

    // if (sort) {
    //   sortFilter.product_price = sort.replace("price-", "");
    // }

    const limit = 5;

    let pageRequired = 1;
    if (page) pageRequired = Number(page);

    //                        0*5   =0  1*5   =5  2*5   =10  3*5   =15
    // 5 résultats par page : 1 skip=0, 2 skip=5, 3 skip=10, 4 skip=15
    // 3 résultats par page : 1 skip=0, 2 skip=3, 3 skip=6, 4 skip=9

    const skip = (pageRequired - 1) * limit;

    const offers = await Offer.find(filters)
      .sort(sortFilter)
      .skip(skip)
      .limit(limit)
      .populate("owner", "account");
    // .select("product_price product_name");

    const count = await Offer.countDocuments(filters);

    const response = {
      count: count,
      offers: offers,
    };

    res.json(response);

    // const results = await Offer.find({
    //   product_name: /vert/i,
    //   product_price: { $gte: 20, $lte: 200 },
    // })
    //   .sort({ product_price: -1 || 1 })
    //   .select("product_name product_price");
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

module.exports = router;
