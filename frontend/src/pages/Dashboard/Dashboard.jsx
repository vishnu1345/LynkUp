import React, { useEffect, useRef, useState } from "react";
import { useUser } from "../../context/UserContextApi";
import { useNavigate } from "react-router-dom";
import { FaBars, FaDoorClosed, FaMicrophone, FaMicrophoneSlash, FaPhoneAlt, FaPhoneSlash, FaTimes, FaVideo, FaVideoSlash } from "react-icons/fa";
import apiClient from "../../apiClient";
import SocketContext from "../socket/SocketContext";
import Peer from 'simple-peer';


function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const hasJoined = useRef(false);
  const connectionRef = useRef();
  const receiverVideo = useRef();
  const myVideo = useRef();
  const [stream, setStream] = useState();
  const [me, setMe] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showReceiverDetailPopup, setShowReceiverDetailPopup] = useState(false);
  const [showReceiverDetails, setShowReceiverDetails] = useState(null);

  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const [callRejecedPopup, setCallRejecedPopup] = useState(false);
  const [callRejectedUser, setCallRejectedUser] = useState(null);

  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)

  const socket = SocketContext.getSocket();
  console.log(socket);

  useEffect(() => {
    if (user && socket && !hasJoined.current) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    }

    socket.on("me", (id) => setMe(id));

    socket.on("online-users", (onlineUser) => {
      setOnlineUsers(onlineUser);
    });

    socket.on("callToUser" , (data)=>{
        setReceivingCall(true);
        setCaller(data);
        setCallerSignal(data.signal)
    })

    socket.on("call-ended" , (data)=>{
        console.log("call ended by" , data.name);
        endCallCleanup();
    })

    socket.on("callRejected" , (data)=>{
        setCallRejecedPopup(true);
        setCallRejectedUser(data);
    })

    return () => {
      socket.off("me");
      socket.off("online-users");
      socket.off("callToUser");
      socket.off("call-ended");
      socket.off("callRejected");
    };
  }, [user, socket]);

  // console.log(onlineUsers);
  console.log("getting call from" , caller);
  

  const isOnlineUser = (userId) => onlineUsers.some((u) => u.userId === userId);

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


  const startCall = async ()=>{
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
          myVideo.current.muted = true;
          myVideo.current.volume = 0;
        }

        currentStream
          .getAudioTracks()
          .forEach((track) => (track.enabled = true));
        
        setCallRejecedPopup(false);
        setIsSidebarOpen(false);
        setSelectedUser(showReceiverDetails._id);
        // console.log("calling to", showReceiverDetails._id);

        const peer = new Peer({
          initiator: true, // this user starts a call
          trickle: false, // prevents trickling of ICE candidates , ensuring a single signal exchange
          stream: currentStream, // attach a local video stream
        });

        // ✅ Handle the "signal" event (this occurs when the WebRTC handshake is initiated)
        peer.on("signal" , (data)=>{
            console.log("call to user with signal");
            socket.emit("callToUser", {
              // Emit a "callToUser" event to the server with necessary call details
              callToUserId: showReceiverDetails._id,
              signalData: data,
              from: me,
              name: user.username,
              email: user.email,
              profilepic: user.profilepic,
            });
        })

        peer.on("stream" , (receiverStream)=>{
            if(receiverVideo.current){
              receiverVideo.current.srcObject = receiverStream;
              receiverVideo.current.muted = false;
              receiverVideo.current.volume = 1.0;
            }
        })

        socket.once("callAccepted", (data)=>{
          setCallAccepted(true);
          setCallRejecedPopup(false);
          setCaller(data.from);
          peer.signal(data.signal);
        })
        // storing peer connection reference to manage later(like ending call)
        connectionRef.current = peer;
        setShowReceiverDetailPopup(false);
      } catch (error) {
        console.log("error accessing media device" , error);
      }
  }

  const handelacceptCall = async ()=>{
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }

        currentStream
          .getAudioTracks()
          .forEach((track) => (track.enabled = true));
        

        setCallAccepted(true);
        setReceivingCall(true);
        setIsSidebarOpen(false);

        const peer = new Peer({
          initiator: false, // this user does not start call 
          trickle: false, 
          stream: currentStream, 
        });

        peer.on("signal" , (data)=>{
          socket.emit("answeredCall" , {
            signal : data,
            from : me,
            to : caller.from
          })
        })

        peer.on("stream" , (receiverStream)=>{
          if(receiverVideo.current){
            receiverVideo.current.srcObject = receiverStream;
            receiverVideo.current.muted = false;
            receiverVideo.current.volume = 1.0;
          }
        })

        if(callerSignal) peer.signal(callerSignal);

        connectionRef.current = peer;

      } catch (error) {
        console.log("error accessing media device", error);
      }
  }

  const handelendCall = ()=>{
    socket.emit("call-ended" , {
      to: caller.from || selectedUser._id,
      name : user.username
    })
    endCallCleanup();
}

  const handelrejectCall = ()=>{
      setReceivingCall(false);
      setCallAccepted(false);

      socket.emit("reject-call" , {
          to : caller.from,
          name : user.username,
          profilepic : user.profilepic
      })
  }

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const endCallCleanup = ()=>{
    if(stream){
      stream.getTracks().forEach((track)=>track.stop());
    }
      if(receiverVideo.current){
        receiverVideo.current.srcObject = null;
      }
      if(myVideo.current){
        myVideo.current.srcObject = null;
      }

      connectionRef.current.destroy();

      setStream(null);
      setReceivingCall(null);
      setCallAccepted(null);
      setSelectedUser(null);
      setTimeout(()=>{
        window.location.reload();
      } , 100)
    
  }

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

  // matchMedia;
  const handelSelectedUser = (user) => {
    console.log("selected user ", user);
    const selected = filteredUsers.find((user) => user._id === user._id);
    setSelectedUser(user._id);
    setShowReceiverDetails(user);
    setShowReceiverDetailPopup(true);
  };

  

  console.log("receiver video" , receiverVideo)
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
              onClick={() => handelSelectedUser(user)}
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

          {selectedUser || receivingCall || callAccepted ? (
            <div className="relative w-full h-screen bg-black flex items-center justify-center">
              <video
                ref={receiverVideo}
                autoPlay
                className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
              />
              <div className="absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={myVideo}
                  autoPlay
                  playsInline
                  className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg"
                />
              </div>
              <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
                <button
                  type="button"
                  className="md:hidden text-2xl text-white cursor-pointer"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <FaBars />
                </button>
                {caller?.username || "Caller"}
              </div>

              {/* Call Controls */}
              <div className="absolute bottom-4 w-full flex justify-center gap-4">
                <button
                  type="button"
                  className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer"
                  onClick={handelendCall}
                >
                  <FaPhoneSlash size={24} />
                </button>
                {/* 🎤 Toggle Mic */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                    isMicOn ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {isMicOn ? (
                    <FaMicrophone size={24} />
                  ) : (
                    <FaMicrophoneSlash size={24} />
                  )}
                </button>

                {/* 📹 Toggle Video */}
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                    isCamOn ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {isCamOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Welcome */}

              <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
                <div className="w-20 h-20">{/* 👋 */}</div>
                <div>
                  <h1 className="text-4xl font-extrabold bg-gradient-to-br from-blue-400 to-purple-300 text-transparent bg-clip-text">
                    Hey {user?.username || "Guest"}! 👋
                  </h1>
                  <p className="text-lg text-gray-300 mt-2">
                    Ready to <strong>connect with friends instantly?</strong>
                    Just <strong>select a user</strong> and start your video
                    call! 🎥✨
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
          )}

          {showReceiverDetailPopup && showReceiverDetails && (
            <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <div className="flex flex-col items-center">
                  <p className="text-black text-xl mb-2">User Details</p>
                  <img
                    src={
                      showReceiverDetails.profilepic || "/default-avatar.png"
                    }
                    alt="User"
                    className="w-20 h-20 rounded-full border-4 border-blue-500"
                  />
                  <h3 className="text-lg font-bold mt-3 text-black">
                    {showReceiverDetails.username}
                  </h3>
                  <p className="text-sm text-gray-500 text-black">
                    {showReceiverDetails.email}
                  </p>

                  <div className="flex gap-4 mt-5 ">
                    <button
                      onClick={() => {
                        setSelectedUser(showReceiverDetails._id);
                        startCall(); // function that handles media and calling
                        setShowReceiverDetailPopup(false);
                      }}
                      className="bg-green-600 text-white px-4 py-1 rounded-lg w-28 flex items-center gap-2 justify-center cursor-pointer"
                    >
                      Call <FaPhoneAlt />
                    </button>
                    <button
                      onClick={() => setShowReceiverDetailPopup(false)}
                      className="bg-gray-400 text-white px-4 py-1 rounded-lg w-28 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {receivingCall && !callAccepted && (
            <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <div className="flex flex-col items-center">
                  <p className="text-black text-xl mb-2">Call From...</p>
                  <img
                    src={caller?.profilepic || "/default-avatar.png"}
                    alt="Caller"
                    className="w-20 h-20 rounded-full border-4 border-green-500"
                  />
                  <h3 className="text-lg font-bold mt-3 text-black">
                    {caller?.name}
                  </h3>
                  <p className="text-sm text-gray-500 text-black">
                    {caller?.email}
                  </p>
                  <div className="flex gap-4 mt-5">
                    <button
                      type="button"
                      onClick={handelacceptCall}
                      className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                    >
                      Accept <FaPhoneAlt />
                    </button>
                    <button
                      type="button"
                      onClick={handelrejectCall}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                    >
                      Reject <FaPhoneSlash />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {callRejecedPopup && callRejectedUser && (
            <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <div className="flex flex-col items-center">
                  <p className="text-black text-xl mb-2">
                    Call Rejected From...
                  </p>
                  <img
                    src={callRejectedUser.profilepic || "/default-avatar.png"}
                    alt="Caller"
                    className="w-20 h-20 rounded-full border-4 border-green-500"
                  />
                  <h3 className="text-lg font-bold mt-3 text-black">
                    {callRejectedUser.name}
                  </h3>
                  <div className="flex gap-4 mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        startCall();
                      }}
                      className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                    >
                      Call Again <FaPhoneAlt />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // endCallCleanup();
                        setCallRejecedPopup(false);
                        setShowReceiverDetailPopup(false);
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                    >
                      Back <FaPhoneSlash />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
