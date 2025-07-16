import express from "express";
import { Login, Logout, Signup } from "../routeController/authController.js";
import isLogin from "../middleware/isLogin.js";

const router = express.Router();

router.post('/login' , Login)
router.post('/signup' , Signup)
router.post('logout' , isLogin , Logout)

export default router;