const mongoose=require("mongoose");
const initdata=require("./data.js");
const Listing=require("../models/listing.js")

const MONGO_URL="mongodb://127.0.0.1:27017/shestay";
async function main() {
    await mongoose.connect(MONGO_URL);
}
main().then(() =>{
    console.log("connected with db");

}).catch((err)=>{
    console.log(err);
})
const initDb=async()=>{
   await Listing.deleteMany({});
   initdata.data=initdata.data.map((obj)=>({...obj,owner:"686bfc3d0552343d66dc58ee"}))
   await Listing.insertMany(initdata.data);
   console.log("data was initialized")

}
initDb();