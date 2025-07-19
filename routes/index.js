const express=require("express");
const app=express();
const session=require("express-session")
const flash=require("express-flash")


app.listen(8000,(req,res)=>{
    console.log("hii there");
})
app.use(session({secret:"mysupersecretstring",resave:false,saveUninitialized:true}));
// app.get("/",(req,res)=>{
//     res.send("hii working");
// })
app.use(flash());
app.get("/request",(req,res)=>{
    let {name="neha"}=req.query;
    req.session.name=name;
    res.redirect("/hello");
})
app.get("/hello",(req,res)=>{
    res.send(`hello ${req.session.name}`);
})