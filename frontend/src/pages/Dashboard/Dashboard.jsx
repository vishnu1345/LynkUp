import React, { useEffect, useRef, useState } from 'react'
import { useUser } from '../../context/UserContextApi';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaDoorClosed, FaTimes } from 'react-icons/fa';
import apiClient from '../../apiClient';
import SocketContext from '../socket/SocketContext';

function Dashboard() {
    const { user, updateUser } = useUser();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);

    const hasJoined = useRef(false);
    const [me, setMe] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([])

    const socket = SocketContext.getSocket();
    console.log(
      socket
    );
    
    useEffect(() => {
      if(user && socket && !hasJoined.current){
        socket.emit("join" , {id:user._id , name : user.username})
        hasJoined.current = true;
      }
    
      socket.on("me" , (id)=>setMe(id));

      socket.on("online-users" , (onlineUser)=>{
          setOnlineUsers(onlineUser);
      });

      return ()=>{
        socket.off("me");
        socket.off("online-users");
      }
    }, [user , socket])
    
    console.log(onlineUsers);

    const isOnlineUser = (userId) => onlineUsers.some((u)=>u.userId === userId);

    const allusers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/user");
        if (response.data.success !== false) {
          setUsers(response.data.users);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      allusers();
    }, []);

    const filteredUsers = users.filter(
      (u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLogout = async () => {

      try {
        await apiClient.post("/auth/logout");
        socket.off("disconnect");
        socket.disconnect();
        SocketContext.setSocket();
        updateUser(null);
        localStorage.removeItem("userData");
        navigate("/login");
      } catch (error) {
        console.error("Logout failed", error);
      }
    };

matchMedia
    const handelSelectedUser = (userId)=>{
        const selected = filteredUsers.find((user) => user._id === userId);
       setSelectedUser(userId);
    }
  return (
    <div className="flex min-h-screen bg-gray-100">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-64 h-full p-4 space-y-4 fixed z-20 transition-transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
        />

        {/* User List */}
        <ul className="space-y-4 overflow-y-auto">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                selectedUser === user._id
                  ? "bg-green-600"
                  : "bg-gradient-to-r from-purple-600 to-blue-400"
              }`}
              onClick={() => handelSelectedUser(user._id)}
            >
              <div className="relative">
                <img
                  src={user.profilepic || "/default-avatar.png"}
                  alt={`${user.username}'s profile`}
                  className="w-10 h-10 rounded-full border border-white"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.username}</span>
                <span className="text-xs text-gray-400 truncate w-32">
                  {user.email}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Logout */}
        {user && (
          <div
            onClick={handleLogout}
            className="absolute bottom-2 left-4 right-4 flex items-center gap-2 bg-red-400 px-4 py-1 cursor-pointer rounded-lg"
          >
            <FaDoorClosed />
            Logout
          </div>
        )}
      </aside>
      <div className="bg-gradient-to-br from-blue-400 to-purple-300 w-1000">
        <div className="flex-1 p-6 md:ml-72 text-white ">
          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            className="md:hidden text-2xl text-black mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          {/* Welcome */}
          <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="w-20 h-20">{/* 👋 */}</div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-br from-blue-400 to-purple-300 text-transparent bg-clip-text">
                Hey {user?.username || "Guest"}! 👋
              </h1>
              <p className="text-lg text-gray-300 mt-2">
                Ready to <strong>connect with friends instantly?</strong>
                Just <strong>select a user</strong> and start your video call!
                🎥✨
              </p>
            </div>
          </div>

          {/* Instructions */}
          {/* <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm">
          <h2 className="text-lg font-semibold mb-2">
            💡 How to Start a Video Call?
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-400">
            <li>📌 Open the sidebar to see online users.</li>
            <li>🔍 Use the search bar to find a specific person.</li>
            <li>🎥 Click on a user to start a video call instantly!</li>
          </ul>
        </div> */}
        </div>
      </div>
    </div>
  );
}

export default Dashboard