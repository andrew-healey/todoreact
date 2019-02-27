const express=require("express");
const bodyParser=require("body-parser");
const app=express();
require("webpackRunner");
const io=require("socket.io")(app.listen(3000,()=>console.log("server started")));
app.use("/",express.static("/public"))
app.get("/",(req,res)=>{
  res.sendFile(__dirname+"/public/index.html");
});
