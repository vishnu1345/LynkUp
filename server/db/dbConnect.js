import mongoose from "mongoose";

const dbConnect = async ()=>{
    try{
    await mongoose.connect(process.env.MONGOOSE_CONNECTION),
        console.log("db connected");
    }
    catch(erro){
        console.log(error);
    }
}

export default dbConnect;