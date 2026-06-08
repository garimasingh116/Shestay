
const mongoose = require("mongoose");
const review = require("./review");
const schema = mongoose.Schema;
const User = require("./user");
const calculateSafetyScore =
require("../utils/safetyscore");
const listingSchema = new schema({
  title: {
    type: String,
    required: true
  },

  description: String,

  image: {
    url: String,
    filename: String,
  },

  price: Number,

  location: String,
  country: String,

  // WOMEN-CENTRIC FEATURES
  isWomenOnly: {
    type: Boolean,
    default: false
  },

  hostGender: {
    type: String,
    enum: ["male", "female", "other"]
  },

  femaleStaffAvailable: {
    type: Boolean,
    default: false
  },

  // SECURITY
  hasSecureLock: {
    type: Boolean,
    default: true
  },

  hasCCTV: {
    type: Boolean,
    default: false
  },

  security24x7: {
    type: Boolean,
    default: false
  },

  gatedProperty: {
    type: Boolean,
    default: false
  },

  emergencySupport: {
    type: Boolean,
    default: false
  },

  // NIGHT SAFETY
  lateNightCheckin: {
    type: Boolean,
    default: false
  },

  wellLitArea: {
    type: Boolean,
    default: false
  },

  cabAvailabilityNight: {
    type: Boolean,
    default: false
  },

  // LOCATION SAFETY
  nearbyPoliceStation: {
    type: Boolean,
    default: false
  },

  publicTransportNearby: {
    type: Boolean,
    default: false
  },

  // AI SAFETY SCORE
  safetyRating: {
  type: Number,
  default: 0
},

  // TAGS FOR RAG
  safetyTags: [String],

  reviews: [
    {
      type: schema.Types.ObjectId,
      ref: "Review",
    }
  ],

  owner: {
    type: schema.Types.ObjectId,
    ref: "User",
  }
});
// schema here ...



listingSchema.pre("save", function(next){

  this.safetyRating =
    calculateSafetyScore(this);

  next();

});

const Listing =
mongoose.model("Listing", listingSchema);

module.exports = Listing;