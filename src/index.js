const express = require("express");
const { createServer } = require("http");
const sock = require("socket.io");
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const httpServer = createServer(app);
const io = sock(httpServer, { /* options */ });

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

var rooms = {};

io.on("connection", (socket) => {
    console.log("a user has connected");
    function deleteuser(info){
        let ntr = rooms[info.room].users[info.user].name;
        io.to(info.room).emit("deluser", {user: ntr});
        //remove user from userlist and buzzerlist
        let ul = rooms[info.room].userlist;
        if(ul.includes(ntr))
            ul.splice(ul.indexOf(ntr), 1);
        let bl = rooms[info.room].buzzerlist;
        if(bl.includes(ntr))
            bl.splice(bl.indexOf(ntr), 1);
        delete rooms[info.room].users[info.user];
        delete rooms[info.room].buzzers[info.user];
    }
    socket.on("disconnecting", () => {
        let rms = socket.rooms;
        if(rms.size<2){
            return;
        }
        //set rm to second value in rms
        let rm = rms.values();
        rm.next();
        rm = rm.next().value;
        console.log(rm);
        console.log(rms);
        console.log(rooms);
        //check if socket is user or host
        if(rooms[rm].host.id==socket.id){
            //alert other users of host disconnect
            socket.to(rm).emit("hostdisconnect");
            rooms[rm].hostonline = false;
        }else{
            deleteuser({room: rm, user: socket.id});
            /*let ntr = rooms[rm].users[socket.id].name;
            io.to(rm).emit("deluser", {user: ntr});
            //remove user from userlist and buzzerlist
            let ul = rooms[rm].userlist;
            if(ul.includes(ntr))
                ul.splice(ul.indexOf(ntr), 1);
            let bl = rooms[rm].buzzerlist;
            if(bl.includes(ntr))
                bl.splice(bl.indexOf(ntr), 1);
            delete rooms[rm].users[socket.id];
            delete rooms[rm].buzzers[socket.id];*/
        }
        //Delete room if host is offline and no users in users
        if(!rooms[rm].hostonline&&Object.keys(rooms[rm].users).length==0){
            delete rooms[rm];
            io.to(rm).emit("roomdeleted");
            console.log("Room "+rm+" has been deleted");
        }
        //alert other users and host of disconnected user
    });
    socket.on("disconnect", () => {
        console.log("a user has disconnected");
    });
    socket.on("joinroom", (info, callback)=>{
        console.log(info);
        console.log("has attempted to join the room");
        if(rooms[info.room]){
            if(rooms[info.room].joinlock){//make sure room is not locked
                callback({
                    status: "error",
                    message: "room is locked"
                });
                return;
            }else if(rooms[info.room].password&&rooms[info.room].password!=info.password){//make sure password is correct
                callback({
                    status: "error",
                    message: "incorrect password"
                });
                return;
            }else if(rooms[info.room].userlist.includes(info.name)){//make sure name is unique
                callback({
                    status: "error",
                    message: "name already taken"
                });
                return;
            }
            rooms[info.room].users[info.user] = {name:info.name};//Add user
            socket.join(info.room);
        }else{
            callback({
                status: "error",
                message: "room does not exist"
            });
            return;
        }
        callback({
            status: "ok",
            message: "you have joined the room",
            catchup: {users: rooms[info.room].userlist, buzzers: rooms[info.room].buzzerlist}
        });
        //alert other users of new user
        socket.to(info.room).emit("newuser", {name:info.name, user:info.user});
        //update userlist and buzzerlist
        rooms[info.room].userlist.push(info.name);
    });
    socket.on("buzz", (info, callback)=>{
        //check if room exists and password is correct if room has one
        if(rooms[info.room]){
            if(rooms[info.room].password&&rooms[info.room].password!=info.password){
                callback({
                    status: "error",
                    message: "incorrect password",
                    buzzerstate: "error"
                });
                return;
            }
            //check if buzzer is locked
            if(rooms[info.room].buzzlock){
                callback({
                    status: "error",
                    message: "buzzers are locked",
                    buzzerstate: "locked"
                });
                return;
            }
            //check if user is in room
            if(rooms[info.room].users[info.user]){
                //check if user is already in buzzerlist
                info.name = rooms[info.room].users[info.user].name;
                if(rooms[info.room].buzzerlist.includes(info.name)){
                    callback({
                        status: "error",
                        message: "you have already buzzed",
                        buzzerstate: "buzzed"
                    });
                    return;
                }
                //add user to buzzerlist and buzzer object
                if(info.answer)
                    rooms[info.room].buzzers[info.user] = {name:info.name, answer:info.answer};
                else
                    rooms[info.room].buzzers[info.user] = {name:info.name};
                rooms[info.room].buzzerlist.push(info.name);
                //alert users of new buzzer
                if(info.answer){//don't show answer to other users
                    io.to(info.room).except(rooms[info.room].host.id).emit("newbuzzer", {name:info.name});
                    io.to(rooms[info.room].host.id).emit("newbuzzer", {name:info.name, answer:info.answer});
                    console.log("buzz with answer");
                }else{
                    io.to(info.room).emit("newbuzzer", {name:info.name});
                    console.log("buzz without answer");
                }
                callback({
                    status: "ok",
                    message: "you have buzzed",
                    buzzerstate: "buzzed"
                });
                return;
            }else{
                callback({
                    status: "error",
                    message: "you are not in the room",
                    buzzerstate: "error"
                });
                return;
            }
        }else{
            callback({
                status: "error",
                message: "room does not exist",
                buzzerstate: "error"
            });
            return;
        }
    });
    socket.on('createroom', (info, callback)=>{
        console.log(info);
        console.log("has attempted to create a room");
        if(!rooms[info.room]){
            if(info.password){
                rooms[info.room] = {
                    users: {},
                    buzzers: {},
                    userlist: [],
                    buzzerlist: [],
                    buzzlock: false,
                    host: {
                        id: socket.id,
                        secret: info.secret
                    },
                    hostonline: true,
                    password: info.password,
                    joinlock: false
                };
            }else{
                rooms[info.room] = {
                    users: {},
                    buzzers: {},
                    userlist: [],
                    buzzerlist: [],
                    buzzlock: false,
                    host: {
                        id: socket.id,
                        secret: info.secret
                    },
                    hostonline: true,
                    joinlock: false
                };
            }
        }else{
            if((rooms[info.room].password&&rooms[info.room].password==info.password)||!rooms[info.room].password){
                if(rooms[info.room].hostonline){
                    callback({
                        status: "error",
                        message: "room already exists"
                    });
                    return;
                }
                //if room host secret equals info.secret, join host into room and set the id to the new one
                if(rooms[info.room].host.secret==info.secret){
                    socket.join(info.room);
                    callback({catchup: {users: rooms[info.room].users, userlist: rooms[info.room].userlist, buzzers: rooms[info.room].buzzers, buzzerlist: rooms[info.room].buzzerlist}});
                    socket.to(info.room).emit("hostreconnect");
                    rooms[info.room].host.id = socket.id;
                }
                return;
            }
            callback({
                status: "error",
                message: "room already exists"
            });
            return;
        }
        socket.join(info.room);
        callback({
            status: "ok",
            message: "you have created the room"
        });
    });
    socket.on("clearbuzz", (info, callback)=>{
        if(rooms[info.room]){
            if(rooms[info.room].host.id==socket.id){
                //Make sure secret and password are correct
                if(rooms[info.room].password&&rooms[info.room].password!=info.password){
                    callback({
                        status: "error",
                        message: "incorrect password"
                    });
                    return;
                }
                if(rooms[info.room].host.secret!=info.secret){
                    callback({
                        status: "error",
                        message: "incorrect secret"
                    });
                    return;
                }
                rooms[info.room].buzzers = {};
                rooms[info.room].buzzerlist = [];
                io.to(info.room).emit("clearbuzzer");
                callback({
                    status: "ok",
                    message: "buzzers cleared"
                });
                return;
            }else{
                callback({
                    status: "error",
                    message: "you are not the host"
                });
                return;
            }
        }else{
            callback({
                status: "error",
                message: "room does not exist"
            });
            return;
        }
    });
    socket.on("lockroom", (info, callback)=>{
        if(rooms[info.room]){
            if(rooms[info.room].host.id==socket.id){
                //Make sure secret and password are correct
                if(rooms[info.room].password&&rooms[info.room].password!=info.password){
                    callback({
                        status: "error",
                        message: "incorrect password"
                    });
                    return;
                }
                if(rooms[info.room].host.secret!=info.secret){
                    callback({
                        status: "error",
                        message: "incorrect secret"
                    });
                    return;
                }
                rooms[info.room].joinlock = info.lock;
                callback({
                    status: "ok",
                    message: "room locked/unlocked"
                });
                return;
            }else{
                callback({
                    status: "error",
                    message: "you are not the host"
                });
                return;
            }
        }else{
            callback({
                status: "error",
                message: "room does not exist"
            });
            return;
        }
    });
    socket.on("lockbuzz", (info, callback)=>{
        if(rooms[info.room]){
            if(rooms[info.room].host.id==socket.id){
                //Make sure secret and password are correct
                if(rooms[info.room].password&&rooms[info.room].password!=info.password){
                    callback({
                        status: "error",
                        message: "incorrect password"
                    });
                    return;
                }
                if(rooms[info.room].host.secret!=info.secret){
                    callback({
                        status: "error",
                        message: "incorrect secret"
                    });
                    return;
                }
                rooms[info.room].buzzlock = info.lock;
                callback({
                    status: "ok",
                    message: "buzzers locked/unlocked"
                });
                socket.to(info.room).emit("buzzlocked", {lock: info.lock});
                return;
            }else{
                callback({
                    status: "error",
                    message: "you are not the host"
                });
                return;
            }
        }else{
            callback({
                status: "error",
                message: "room does not exist"
            });
            return;
        }
    });
    socket.on("kickuser", (info, callback)=>{
        if(rooms[info.room]){
            if(rooms[info.room].host.id==socket.id){
                //Make sure secret and password are correct
                if(rooms[info.room].password&&rooms[info.room].password!=info.password){
                    callback({
                        status: "error",
                        message: "incorrect password"
                    });
                    return;
                }
                if(rooms[info.room].host.secret!=info.secret){
                    callback({
                        status: "error",
                        message: "incorrect secret"
                    });
                    return;
                }
                if(rooms[info.room].users[info.user]){
                    //deleteuser(info);
                    console.log("Attempt to kick "+info.user+" from "+info.room+" by "+socket.id)
                    console.log(io.sockets.sockets.keys());
                    io.sockets.sockets.get(info.user).disconnect();
                    callback({
                        status: "ok",
                        message: "user kicked"
                    });
                    return;
                }else{
                    callback({
                        status: "error",
                        message: "user not in room"
                    });
                    return;
                }
            }else{
                callback({
                    status: "error",
                    message: "you are not the host"
                });
                return;
            }
        }else{
            callback({
                status: "error",
                message: "room does not exist"
            });
            return;
        }
    });
});

app.get('/', (req, res)=>{
    //send back user/index.html
    console.log("hello");
    res.sendFile(__dirname + "/index.html");
});

app.get('/user', (req, res)=>{
    //send back user/index.html
    console.log("hello");
    res.sendFile(__dirname + "/user.html");
});

app.get('/userbuzzer.js', (req, res)=>{
    //send back user/index.html
    console.log("hello");
    res.sendFile(__dirname + "/userbuzzer.js");
});

app.get('/hostbuzzer.js', (req, res)=>{
    //send back user/index.html
    console.log("hello");
    res.sendFile(__dirname + "/hostbuzzer.js");
});

app.post('/host', (req, res)=>{
    console.log("HOST: "+req.body);
    res.render("host.html", {room: req.body.room, password: req.body.password, secret: req.body.secret});
});

app.post('/user', (req, res)=>{
    console.log("USER: "+req.body);
    res.render("user.html", {room: req.body.room, password: req.body.password, name: req.body.name});
});
httpServer.listen(3000, () => {console.log("server is now listening")});

//Right now, the buzzer system is able to create rooms with or without passwords, allow users to join, display a list of users to everyone, and remove users who have disconnected. Hosts that disconnect are also able to reconnect by creating the room with the same password, name, and secret(a secondary password specifically for hosts to reconnect).
//The next step is to implement the buzzer system itself. Allow hosts to lock the room, allow users to buzz in, and allow hosts to clear or lock the buzzers.
//In the future, maybe add a team system, where hosts can create teams and users can join teams, or allow the system to randomly assign teams. When one user on a team buzzes in, the entire team is unable to buzz in until the host clears the buzzers.
//Add a feature where hosts can kick users out of the room and delete the room.
//Maybe add a feature where hosts can allow users to buzz in multiple times, but only the first buzz counts.
//Maybe also add a built-in point system for users or teams
//10/28/2023
//Host needs to be able to catchUp after reconnecting
//Buzzers work as intended