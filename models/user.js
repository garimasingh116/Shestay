const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");
const userSchema=new Schema({
    email:{
        type:String,
        required:true
    }
})
userSchema.plugin(passportLocalMongoose); //plugin modify the schema by adding methods and feilds

module.exports = mongoose.model('User', userSchema);