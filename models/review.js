const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  
  // REVIEW TEXT
  comment: {
    type: String,
    required: true,
    trim: true
  },

  // STAR RATING
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },

  // SAFETY EXPERIENCE
  feltSafe: {
    type: Boolean,
    default: true
  },

  // SOLO WOMEN SAFETY
  safeForSoloWomen: {
    type: Boolean,
    default: true
  },

  // LATE NIGHT EXPERIENCE
  lateNightExperience: {
    type: String,
    trim: true
  },

  // CLEANLINESS EXPERIENCE
  cleanlinessRating: {
    type: Number,
    min: 1,
    max: 5
  },

  // HOST BEHAVIOUR
  hostBehavior: {
    type: String,
    enum: ["excellent", "good", "average", "poor"]
  },

  // SECURITY EXPERIENCE
  securityExperience: {
    type: String,
    trim: true
  },

  // WOULD RECOMMEND TO WOMEN
  wouldRecommendToWomen: {
    type: Boolean,
    default: true
  },

  // TAGS FOR AI + FILTERING
  safetyTags: [
    {
      type: String
    }
  ],

  // REVIEW AUTHOR
  author: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  // CREATED DATE
  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Review", reviewSchema);