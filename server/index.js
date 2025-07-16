import express from "express";
import dotenv from "dotenv";
import dbConnect from "./db/dbConnect.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./routes/authroute.js";
import userRoute from "./routes/userroute.js"

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("hello there");
});


const allowedOrigins = [""];

app.use(cors({
    origin : function(origin , callack){
        if(!origin || allowedOrigins.includes(origin)){
            callack(null , true); // allow the req if its from allowed region
        }
        else{
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials : true,
    methods : ['GET' , 'POST' , 'PUT' , 'DELETE'],
}));

// middlewares for handling json req and cookies 
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth' , authRoute);
app.use('/api/user' , userRoute);

// (async ()=>{
//     try{
        
        app.listen(PORT, async () => {
            await dbConnect();
          console.log(`server running on port ${PORT}`);
        });
//     }
//     catch(error){
//         console.log(error);
//     }
// })

