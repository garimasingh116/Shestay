if(process.env.NODE_ENV !="production"){
  require("dotenv").config()
}
require('dotenv').config()
console.log(process.env.SECRET)
const express=require("express");
const app=express();
app.use(express.urlencoded({ extended: true }));

const mongoose=require("mongoose");
const Listing=require("./models/listing.js")
const path=require("path");
const methodOverride=require("method-override")
const ejsMate=require("ejs-mate");
const ExpressError=require("./utils/ExpressError")
const Reviews=require("./models/review.js");
const session=require("express-session");
const MongoStore = require('connect-mongo');
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
const listingcontroller=require("./controllers/listing.js")



// const MONGO_URL="mongodb://127.0.0.1:27017/shestay";
const dburl=process.env.ATLAS_DB
async function main() {
  await mongoose.connect(dburl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true,
  });
}
main().then(() =>{
    console.log("connected with db");

}).catch((err)=>{
    console.log(err);
})

    const store = MongoStore.create({
      mongoUrl: dburl,
      mongoOptions: {
        tls: true,
      },
      crypto: {
        secret: process.env.SECRET,
      },
      touchAfter: 24 * 3600,
    });


store.on("error",()=>{
  console.log("error",err);
})
const sessionOptions={
  store,
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    exprires:Date.now()+7*24*60*60*1000,
    maxAge:7*24*60*60*1000,
    httpOnly:true,
  }
}
// app.get("/",(req,res)=>{
//     res.send("hello..garima")
// })
app.use(session(sessionOptions));
app.use(flash())
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
});


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"))
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.listen(8080,()=>{
    console.log("server is running on 8080")
});
// app.get("/testListings", async (req, res) => {
//   try {
//     const sampleListing = new Listing({
//       title: "SheStay Safe Villa",
//       description: "A peaceful and secure stay for solo women travelers.",
//       image: "", // triggers default image via setter
//       price: 1500,
//       location: "South Delhi",
//       country: "India",
//       isWomenOnly: true,
//       hostGender: "female",
//       hasSecureLock: true,
//       emergencySupport: true,
//       safetyRating: 4.8
//     });

//     await sampleListing.save();
//     res.send("Sample SheStay listing created successfully!");
//   } catch (err) {
//     console.error("Error saving listing:", err);
//     res.status(500).send("Failed to create listing.");
//   }
// });
//index route
app.get("/", (req, res) => {
  res.redirect("/listings");
});


app.get("/listings",listingcontroller.index);
app.get("/signup",(req,res)=>{
  res.render("user/signup");
})
app.post("/signup",async(req,res)=>{
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


app.get("/listings/:id", async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id).populate({ path:"reviews",
    populate:{
      path:"author",
    }

  }).populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  console.log(listing);
  res.render("listings/show", { listing });
});

// app.get("/demouser",async(req,res)=>{
//   let fakeUser=new User({
//     email:"student@gmail.com",
//     username:"delta-student"
//   });
//   let registerUser=await User.register(fakeUser,"helloworld");
//   res.send(registerUser);
// })
//create route

  
app.use(express.urlencoded({ extended: true })); // Must come before routes

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
// app.all("*",(req,res,next)=>{
//   next(new ExpressError(404,"page not found"));
// })
//reviews
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
// app.use((err,req,res,next)=>{
//   let {statusCode,message}=err;
//   res.status(statusCode).send(message);
// })
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





