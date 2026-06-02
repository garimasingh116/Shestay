const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({

  listing:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Listing",
    required:true
  },

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },

  amount:{
    type:Number,
    required:true
  },

  paymentId:{
    type:String,
    required:true,
    unique:true
  },

  orderId:{
    type:String,
    required:true
  },

  status:{
    type:String,
    enum:["pending","paid","failed"],
    default:"paid"
  }

},{
  timestamps:true
});

module.exports =
mongoose.model("Booking", bookingSchema);