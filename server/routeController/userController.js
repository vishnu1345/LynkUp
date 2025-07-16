import User from "../schema/userSchema.js"


export const getAllUsers = async (req , res)=>{
    const currentUserId = req.user?._conditions?._id;

    if(!currentUserId){
        return res.status(401).json({success : false , message : "Unauthorized "})
    }

    try {
        const users = await User.find({_id:{ $ne : currentUserId} } , "profilepic email username"); // ne means excluding our id show rest of the users details 
        res.status(200).send({success : true , users});
    } catch (error) {
        res.status(500).send({ success: false, message: "error" });
        console.log(error);
    }
}