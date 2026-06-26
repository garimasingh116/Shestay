if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });

const { RedisStore } = require("connect-redis");
const redisClient = require("./utils/redis");

const ExpressError = require("./utils/ExpressError");

const Listing = require("./models/listing.js");
const Reviews = require("./models/review.js");
const User = require("./models/user.js");
const Booking = require("./models/booking");

const {
  isLoggedIn,
  saveRedirectUrl,
  isOwner,
  isAuthor,
} = require("./middleware.js");

const listingcontroller = require("./controllers/listing.js");

const razorpay = require("./utils/Rayzorpay.js");
const safetyScore = require("./utils/safetyscore.js");
const revewScore = require("./utils/reviewscore.js");
const askAgent = require("./agent");

// ================= DATABASE =================

const dburl = process.env.ATLAS_DB;

async function main() {
  await mongoose.connect(dburl);
}

main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

// ================= SESSION =================

let sessionOptions = {
  secret: process.env.SECRET,

  

  cookie: {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false, // true in production with HTTPS
  },
};

if (redisClient) {
  const store = new RedisStore({
    client: redisClient,
    prefix: "shestay:",
    ttl: 86400,
  });

  sessionOptions.store = store;
}

// ================= VIEW ENGINE =================

app.engine("ejs", ejsMate);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride("_method"));

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.use(session(sessionOptions));

app.use(flash());

// ================= PASSPORT =================

app.use(passport.initialize());

app.use(passport.session());

passport.use(
  new LocalStrategy(
    User.authenticate()
  )
);

passport.serializeUser( //what to store in session
  User.serializeUser()
);

passport.deserializeUser(
  User.deserializeUser()
);

// ================= GLOBAL VARIABLES =================

app.use((req, res, next) => {
  res.locals.success =
    req.flash("success");

  res.locals.error =
    req.flash("error");

  res.locals.currUser =
    req.user;

  next();
});

// ================= SERVER =================

app.listen(8080, () => {
  console.log(
    "Server is running on port 8080"
  );
});
app.post("/ai/search", async(req,res)=>{

  try{

  
    const { query } = req.body;

   
    const answer =
  await askAgent(
    query,
    req.user._id
  );

    console.log("ANSWER:", answer);

    res.json({
      answer
    });

  }
  catch(err){

    console.log(err);

    res.status(500).json({
      answer:"Backend crashed"
    });

  }

});




app.get("/listings", async (req, res) => {

  let filter = {};

  if (req.query.womenOnly) {
    filter.isWomenOnly = true;
  }

  if (req.query.femaleHost) {
    filter.hostGender = "female";
  }

  if (req.query.cctv) {
    filter.hasCCTV = true;
  }

  if (req.query.security24x7) {
    filter.security24x7 = true;
  }

  if (req.query.lateNightCheckin) {
    filter.lateNightCheckin = true;
  }

  if (req.query.wellLitArea) {
    filter.wellLitArea = true;
  }

  if (req.query.safetyRating) {
    filter.safetyRating = {
      $gte: Number(req.query.safetyRating)
    };
  }

  const allListing = await Listing.find(filter);

  res.render("listings/index", {
    allListing
  });

});

app.get("/signup",(req,res)=>{
  res.render("user/signup");
})
app.post("/signup",async(req,res,next)=>{
  try{
  let {username,email,password}=req.body;
 const newUser= new User({email,username});
 const registeredUser=await User.register(newUser,password);
 console.log(registeredUser);
 req.login(registeredUser,(err)=>{
  if(err){
    return next(err);
  }
  req.flash("success","welcome to shestay!");
 res.redirect("/listings");
 })
 
  }catch(e){
    req.flash("error",e.message);
    res.redirect("/signup");

  }

})



//new route
app.get("/listings/new",isLoggedIn,(req,res)=>{
  
  res.render("listings/new");
})
//show route
app.get("/ai",(req,res)=>{
  res.render("listings/ai");
})



app.get("/listings/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  const cacheKey = `listing:${id}`;

  let cachedData = null;

  if (redisClient) {
    cachedData = await redisClient.get(cacheKey);
  }

  let listing;

  if (cachedData) {
    console.log("FROM REDIS");
    listing = JSON.parse(cachedData);
  } else {
    console.log("FROM MONGODB");

    listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");

    if (!listing) {
      req.flash(
        "error",
        "Listing you requested does not exist!"
      );
      return res.redirect("/listings");
    }

    if (redisClient) {
      await redisClient.set(
        cacheKey,
        JSON.stringify(listing),
        {
          EX: 300,
        }
      );
    }
  }

  const total = listing.reviews.length;

  let safeCount = 0;
  let soloCount = 0;

  listing.reviews.forEach((review) => {
    if (review.feltSafe) safeCount++;
    if (review.safeForSoloWomen) soloCount++;
  });

  const safePercent = total
    ? Math.round((safeCount / total) * 100)
    : 0;

  const soloPercent = total
    ? Math.round((soloCount / total) * 100)
    : 0;

  const reviewScore = Math.round(
    (safePercent + soloPercent) / 2
  );

  res.render("listings/show", {
    listing,
    reviewScore,
    safePercent,
    soloPercent,
  });
});



  


app.post("/listings",isLoggedIn,
  upload.single("listing[image]"), async (req, res, next) => {
  try {
     // ← for debugging
    console.log("BODY RECEIVED:", req.body);
    let url=req.file.path;
    let filename=req.file.filename;
    

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image={url,filename}
    await newListing.save();

if (redisClient) {
  await redisClient.del("allListings");
}

req.flash("success", "new listing created!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
});

//edit
app.get("/listings/:id/edit",isLoggedIn,
  isOwner,async(req,res)=>{
  let {id}=req.params;
  const listing=await Listing.findById(id);
  if(!listing){
    req.flash("error"," listing you requested does not exit!");
    res.redirect("/listings");
  }
  let originalimage=listing.image.url
 originalimage= originalimage.replace("/upload","/upload/h_300,w_250,")
  res.render("listings/edit",{listing,originalimage})

})//update
app.put("/listings/:id",isLoggedIn,
  isOwner,
  upload.single("listing[image]"),
  async(req,res)=>{
    
    

  let {id}=req.params;
   
 

let listing= await Listing.findByIdAndUpdate(id,{...req.body.listing});
if(typeof req.file!=="undefined"){
let url=req.file.path;
    let filename=req.file.filename;
    
listing.image={url,filename}

await listing.save();
}
 res.redirect(`/listings/${id}`);
})
//delete
app.delete("/listings/:id",isLoggedIn,
  isOwner,async(req,res)=>{
  let {id}=req.params;
 let deletedlisting=await Listing.findByIdAndDelete(id);
 req.flash("success"," listing deleted!")
 console.log(deletedlisting);
 res.redirect("/listings");
})

app.post("/listings/:id/reviews",
  isLoggedIn,
  async(req,res)=>{
 let listing =await Listing.findById(req.params.id);
 let newReview=new Reviews(req.body.review);
 newReview.author=req.user._id;
 console.log(newReview);
 listing.reviews.push(newReview);
 await newReview.save();
 await listing.save();
 res.redirect("/listings");
})
//delete review
app.delete("/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isAuthor,
  async(req,res)=>{
  let{id,reviewId}=req.params;
  await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}})
 await Reviews.findByIdAndDelete(reviewId);
 res.redirect("/listings")

})

app.get("/login",(req,res)=>{
  res.render("user/login")
})

app.post("/login",saveRedirectUrl,
  passport.authenticate("local",{failureRedirect:'/login',failureFlash:true}),async(req,res)=>{
 
  req.flash("success","welcome to shestay");
  let redirectUrl=res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);

})


app.get("/logout",(req,res,next)=>{
  req.logout((err)=>{
    if(err){
     return next(err);
    }
    req.flash("success","you are logged out");
    res.redirect("/listings");
  })
})


app.post("/booking/success", async(req,res)=>{

  try{

    const {
      listingId,
      paymentId,
      orderId,
      amount
    } = req.body;

    const existingBooking =
      await Booking.findOne({
        paymentId
      });

    if(existingBooking){

      return res.json({
        success:true,
        message:"Booking already exists"
      });

    }

    const booking =
      new Booking({

        listing:listingId,

        user:req.user._id,

        amount,

        paymentId,

        orderId,

        status:"paid"

      });

    await booking.save();

    res.json({
      success:true
    });

  }
  catch(err){

    console.log(err);

    res.status(500).json({
      success:false
    });

  }

});
app.post("/create-order", async (req,res)=>{

  try{

    const amount = req.body.amount * 100;

    const order = await razorpay.orders.create({
      amount,
      currency:"INR"
    });

    console.log("ORDER CREATED:");
    console.log(order);

    res.json(order);

  }
  catch(err){

    console.log("RAZORPAY ERROR:");
    console.log(err);

    res.status(500).json({
      error: err.message
    });

  }

});
