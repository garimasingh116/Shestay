const mongoose = require("mongoose");
const review = require("./review");
const schema = mongoose.Schema;
const User=require("./user")

const listingSchema = new schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  image: {
    url:String,
    filename:String,
  },
  price: Number,
  location: String,
  country: String,

  //  Minimal SheStay Fields
  isWomenOnly: {
    type: Boolean,
    default: false
  },
  hostGender: {
    type: String,
    enum: ["male", "female", "other"]
  },
  hasSecureLock: {
    type: Boolean,
    default: true
  },
  emergencySupport: {
    type: Boolean,
    default: false
  },
  safetyRating: {
    type: Number,
    min: 1,
    max: 5
  },
  reviews:[
    {
      type:schema.Types.ObjectId,
      ref:"Review",
    }
  ],
  owner:{
    type:schema.Types.ObjectId,
    ref:"User",

  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
