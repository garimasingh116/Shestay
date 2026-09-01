if(process.env.NODE_ENV !== "production"){
  require("dotenv").config();
}
const analyzeReview = require("./utils/reviewanalyzer");
const express=require("express");
const app=express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const razorpay=require("./utils/Rayzorpay.js");
const Booking = require("./models/booking");
const {


    askAgentStream

} = require("./agent");
const Conversation =
require("./models/conversation");
const generateAIReviewSummary =
require("./utils/aisum.js");

const mongoose=require("mongoose");
const Listing=require("./models/listing.js")
const path=require("path");
const methodOverride=require("method-override")
const ejsMate=require("ejs-mate");

const Reviews=require("./models/review.js");

const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");
const {isLoggedIn}=require("./middleware.js")
const {saveRedirectUrl}=require("./middleware.js")
const multer  = require('multer')
const {storage}=require("./cloudConfig.js")
const upload = multer({ storage })
const {isOwner,isAuthor}=require("./middleware.js")

const session=require("express-session")

const { RedisStore } = require("connect-redis");

const redisClient =
  require("./utils/redis");



// const MONGO_URL="mongodb://127.0.0.1:27017/shestay";
const dburl=process.env.ATLAS_DB

async function main() {


  
  await mongoose.connect(dburl);
}
main().then(() =>{
    console.log("connected with db");

}).catch((err)=>{
    console.log(err);
})


  let sessionOptions = {
  secret: process.env.SECRET,
  resave: false, //do not save the session in session id if nothing has chnaged
  saveUninitialized: false, //For example, a user visits your website but hasn't logged in or stored anything in their session.
  cookie: {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
   
    httpOnly: true, //Prevents browser JavaScript from accessing the cookie.
    
  },
};

if (redisClient) {
  const store = new RedisStore({
    client: redisClient,
    prefix: "shestay:",
    ttl: 86400,
  }); //rediscclient->redisstore->use that particular client to store session data in redis, prefix is used to identify the session data in redis, ttl is time to live for the session data in seconds
  //redisclient is connection between redisstore and redis client

  sessionOptions.store = store;
}
//redisClient is the object that knows how to communicate with Redis.



app.use(session(sessionOptions));//user login->session created ->session id in browser and session infoo in redis
app.use(flash())
app.use(passport.initialize()); //initialize the passport
app.use(passport.session());//use the express session
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());  //store the id
passport.deserializeUser(User.deserializeUser());//get the id and find the user in db
app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next(); //res.locals contains variables that are available to the views rendered during that request.
});
const chattingStream =
require("./queryStream");
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"))
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.listen(8080,()=>{
    console.log("server is running on 8080")
});
app.post("/ai/stream",isLoggedIn, async (req, res) => {

    try {
    
        console.log("STREAM ROUTE HIT");

        const {

            query,

            conversationId

        } = req.body;

        if (!conversationId) {

            return res.status(400).json({

                error: "conversationId is required"

            });

        }

        // Load selected conversation

        let conversation =
            await Conversation.findById(conversationId);

        if (!conversation) {

            return res.status(404).json({

                error: "Conversation not found"

            });

        }

        // Security check

        if (
            conversation.user.toString() !== //mongodb objectid
            req.user._id.toString()
        ) {

            return res.status(403).json({

                error: "Unauthorized"

            });

        }

        // Save user message

        conversation.messages.push({

            role: "user",

            content: query

        });

        // Streaming headers

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        res.setHeader(
            "Transfer-Encoding",
            "chunked"
        );

        if (res.flushHeaders) {

            res.flushHeaders();

        }

        let fullAnswer = "";
       

        const answer = await askAgentStream(
          

            query,

            req.user._id,

            conversation.messages,

            (token) => {
               console.log("TOKEN RECEIVED:", token);

                if (!token) return;

                fullAnswer += token;
                console.log("Writing token to response...");

                res.write(token);

            }

        );


        // Non-streaming tools

        if (!fullAnswer && answer) {

            if (typeof answer === "string") {

                fullAnswer = answer;

            } else {

                fullAnswer = JSON.stringify(answer);

            }

            res.write(fullAnswer);

        }

        if (!fullAnswer.trim()) {

            fullAnswer = "No response generated.";

        }

        // Save assistant reply

        conversation.messages.push({

            role: "assistant",

            content: fullAnswer

        });

        await conversation.save();
        

        res.end();


    }

    catch (err) {

        console.log(err);

        res.status(500).end();

    }

});
app.post("/ai/new-chat",isLoggedIn, async (req, res) => {

    const conversation =
        await Conversation.create({ //await javascript waits until the promise is resolved and then returns the value of the promise

            user: req.user._id,

            title: "New Chat",

            messages: []

        });

    res.json({

        conversationId: conversation._id

    });

});
app.get("/ai/conversations",isLoggedIn, async (req, res) => {

    const conversations =
        await Conversation.find({

            user: req.user._id

        })
        .sort({
            updatedAt: -1
        })
        .select("title updatedAt");

    res.json(conversations);

});
app.get("/ai/conversation/:id",isLoggedIn, async (req, res) => {

    const conversation =
        await Conversation.findById(req.params.id);

    if (!conversation) {

        return res.status(404).json({

            error: "Conversation not found"

        });

    }

    if (
        conversation.user.toString() !==
        req.user._id.toString()
    ) {

        return res.status(403).json({

            error: "Unauthorized"

        });

    }

    res.json(conversation);

});



// app.get("/listings", async (req, res) => {

//   let filter = {};

//   if (req.query.womenOnly) {
//     filter.isWomenOnly = true;
//   }

//   if (req.query.femaleHost) {
//     filter.hostGender = "female";
//   }

//   if (req.query.cctv) {
//     filter.hasCCTV = true;
//   }

//   if (req.query.security24x7) {
//     filter.security24x7 = true;
//   }

//   if (req.query.lateNightCheckin) {
//     filter.lateNightCheckin = true;
//   }

//   if (req.query.wellLitArea) {
//     filter.wellLitArea = true;
//   }

//   if (req.query.safetyRating) {
//     filter.safetyRating = {
//       $gte: Number(req.query.safetyRating)
//     };
//   }

//   const allListing = await Listing.find(filter);

//   res.render("listings/index", {
//     allListing
//   });

// });
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

  // Create a unique key for each filter combination
  const cacheKey = `listings:${JSON.stringify(filter)}`;

  let cachedData = null;

  if (redisClient) {
    cachedData = await redisClient.get(cacheKey);
  }

  let allListing;

  if (cachedData) {
    console.log("FROM REDIS");

    allListing = JSON.parse(cachedData);

  } else {
    console.log("FROM MONGODB");

    allListing = await Listing.find(filter);

    if (redisClient) {
      await redisClient.set(
        cacheKey,
        JSON.stringify(allListing),
        {
          EX: 300
        }
      );
    }
  }

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

  res.render("listings/show", {
    listing
  });
});


  

app.post("/listings",isLoggedIn,
  upload.single("listing[image]"), async (req, res, next) => {
  try {
     
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
   
 

// let listing= await Listing.findByIdAndUpdate(id,{...req.body.listing});//spread operator generally used for 
 let listing = await Listing.findByIdAndUpdate(id, req.body.listing);
if(typeof req.file!=="undefined"){
let url=req.file.path;
    let filename=req.file.filename;
    
listing.image={url,filename}

await listing.save();
  await redisClient.del(`listing:${id}`);
}
 res.redirect(`/listings/${id}`);
})
//delete
app.delete("/listings/:id",isLoggedIn,
  isOwner,async(req,res)=>{
  let {id}=req.params;
 let deletedlisting=await Listing.findByIdAndDelete(id);
 await redisClient.del(`listing:${id}`);
 req.flash("success"," listing deleted!")
 console.log(deletedlisting);
 res.redirect("/listings");
})

app.post(
  "/listings/:id/reviews",
  isLoggedIn,
  async (req, res) => {
    try {
      console.log("Review submission received:");
      const listing = await Listing.findById(req.params.id);

      
      const ai = await analyzeReview(req.body.review.comment);

      
      const newReview = new Reviews({
        comment: req.body.review.comment,
        rating: req.body.review.rating,

        feltSafe: ai.feltSafe,
        safeForSoloWomen: ai.safeForSoloWomen,

        hostBehavior: ai.hostBehavior,
        securityExperience: ai.securityExperience,
        lateNightExperience: ai.lateNightExperience,

        wouldRecommendToWomen: ai.wouldRecommendToWomen,
        safetyTags: ai.safetyTags
      });

      newReview.author = req.user._id;

      listing.reviews.push(newReview);

      await newReview.save();
      
     const summary = await generateAIReviewSummary(listing._id);

listing.aiReviewSummary = summary;

await listing.save();
      if (redisClient) {
    await redisClient.del(`listing:${listing._id}`);
}

      res.redirect(`/listings/${listing._id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error analyzing review.");
    }
  }
);
app.delete("/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isAuthor,
  async(req,res)=>{
  let{id,reviewId}=req.params;
 await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}})
 await Reviews.findByIdAndDelete(reviewId);
 await redisClient.del(`listing:${id}`);
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
