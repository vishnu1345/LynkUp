import express from "express";
import dotenv from "dotenv";
import dbConnect from "./db/dbConnect.js";
import cors from "cors";
import cookieParser from "cookie-parser";


import authRoute from "./routes/authroute.js";
import userRoute from "./routes/userroute.js"


import {createServer} from "http";
import {Server} from "socket.io";


dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

const server = createServer(app);

app.get("/", (req, res) => {
  res.send("hello there");
});


const allowedOrigins = [process.env.CLIENT_URL];


app.use(cors({
    origin : function(origin , callback){
        if(!origin || allowedOrigins.includes(origin)){
            callback(null , true); // allow the req if its from allowed region
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






(async ()=>{
    try{
      await dbConnect();
      console.log("connected to db");

      const io = new Server(server, {
        pingTimeout: 60000,
        cors: {
          origin: allowedOrigins[0],
          methods: ["GET", "POST"],
        },
      });

      console.log("socket.io initialized successfully");

      let onlineUser = [];

      // Handle WebSocket (Socket.io) connections
      io.on("connection", (socket) => {
        console.log(`Info - new connection ${socket.id}`);

        //  Emit an event to send the socket ID to the connected user
        socket.emit("me", socket.id);

        //  User joins the chat system
        socket.on("join", (user) => {
          if (!user || !user.id) {
            console.log("warning - invalid user data on join");
            return;
          }

          socket.join(user.id);

          const existingUser = onlineUser.find((u) => u.userId === user.id);

          if (existingUser) {
            existingUser.socketId = socket.id;
          } else {
            //  Add new user to online users list
            onlineUser.push({
              userId: user.id,
              name: user.name,
              socketId: socket.id,
            });
          }

          io.emit("online-users", onlineUser); // Broadcast updated online users list
        });

        socket.on("callToUser" , (data)=>{
            // console.log("incoming call from" , data);
            const call = onlineUser.find((user)=>user.userId === data.callToUserId);
            if(!call){
                socket.emit("userUnavailable" , {message :`${call?.name} is offline`});
            }
            
            // emit an event to receiver socket 
            io.to(call.socketId).emit("callToUser", {
                signal : data.signalData,
                from : data.from,
                name : data.name,
                email : data.email,
                profilepic : data.profilepic
            });
        })

        socket.on("answeredCall" , (data)=>{
            io.to(data.to).emit("callAccepted" , {
                signal : data.signal,
                from : data.from
            })
        });

        socket.on("call-ended" , (data)=>{
            io.to(data.to).emit("call-ended" , {
                name : data.name,
                
            })
        })

        socket.on("reject-call" , (data)=>{
            io.to(data.to).emit("callRejected" , {
                name : data.name,
                profilepic : data.profilepic,

            })
        })

        socket.on("disconnect", () => {
          const user = onlineUser.find((u) => u.socketId === socket.id); // Find the disconnected user

          //  Remove user from the online users list
          onlineUser = onlineUser.filter((user) => user.socketId !== socket.id);

          //  Broadcast updated online users list
          io.emit("online-users", onlineUser);

          //  Notify others that the user has disconnected
          socket.broadcast.emit("disconnectUser", { disUser: socket.id });

          console.log(`[INFO] Disconnected: ${socket.id}`);
        });
      });

      server.listen(PORT, () => {
        console.log(`server running on port ${PORT}`);
      });
    }
    catch(error){
        console.log(error);
    }
})();

