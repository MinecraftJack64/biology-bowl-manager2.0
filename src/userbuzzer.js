let room = document.getElementById("var-room").innerHTML;
let password = document.getElementById("var-password").innerHTML;
let namee = document.getElementById("var-name").innerHTML;
let statmsg = document.getElementById("statmsg");
var socket = io(window.location.href.replace("/user", ""), {
	transports: ["websocket", "polling"],
});
function updateNameList(){
	var userdisp = document.getElementById("userlisttest");
	userdisp.innerHTML = USERS.join("<br>");
}
function updateBuzzerList(){
	var buzzerdisp = document.getElementById("buzzerlisttest");
	buzzerdisp.innerHTML = BUZZERS.join("<br>");
}
var USERS = [];
var BUZZERS = [];
function catchUp(catchup){
    USERS = catchup.users;
    BUZZERS = catchup.buzzers;
    updateNameList();
	updateBuzzerList();
}
socket.on("connect", () => {
	console.log("Conected");
	if(password){
		socket.emit("joinroom", {
			room: room,
			user: socket.id,
			name: namee,
			password: password,
		}, (res)=>{
			console.log(res.message);
			catchUp(res.catchup);
			if(res.status=="ok"){
				USERS.push(namee);
				updateNameList();
			}
		});
	}else{
		socket.emit("joinroom", {
			room: room,
			user: socket.id,
			name: namee
		}, (res)=>{
			console.log(res.message);
			catchUp(res.catchup);
			if(res.status=="ok"){
				USERS.push(namee);
				updateNameList();
			}
		});
	}
});
socket.on("newuser", (user)=>{
    USERS.push(user.name);
	updateNameList();
});
socket.on("deluser", (user)=>{
    USERS.splice(USERS.indexOf(user.user), 1);
	BUZZERS.splice(BUZZERS.indexOf(user.user), 1);
    updateNameList();
	updateBuzzerList();
});
socket.on("hostdisconnect", ()=>{
    console.log("Host disconnected");
    statmsg.innerHTML = "HOST DISCONNECTED";
});
socket.on("hostreconnect", ()=>{
    console.log("Host reconnected");
    statmsg.innerHTML = "HOST RECONNECTED";
});
socket.on("received", (message)=>{
	console.log(message);
});
socket.on("newbuzzer", (buzzer)=>{
	console.log("newbuzzer: "+buzzer.name);
	BUZZERS.push(buzzer.name);
	updateBuzzerList();
});
var buzzmsgs = {
	error: "ERROR",
	locked: "LOCKED",
	buzz: "Buzz",
	buzzed: "Buzzed",
}
var currstate = "buzz";
var buzzlocked = false;
function setbuzzerstate(){
	var buzzerstate = document.getElementById("buzzbtn");
	let str;
	if(buzzlocked){
		str = "locked";
	}else{
		str = currstate;
	}
	buzzerstate.className = str;
	buzzerstate.innerHTML = buzzmsgs[str];
}
socket.on("buzzlocked", (state)=>{
	buzzlocked=state.lock;
	setbuzzerstate();
});
function buzz(){
	socket.emit("buzz", {
		room: room,
		password: password,
		user: socket.id,
		answer: document.getElementById("answer").value
	}, (res)=>{
		currstate = res.buzzerstate;
		setbuzzerstate();
		console.log(res.message);
	});
}
socket.on("clearbuzzer", ()=>{
	BUZZERS = [];
	updateBuzzerList();
	currstate = "buzz";
	setbuzzerstate();
});
socket.on("disconnect", () => {
	console.log("I was rejected");
	statmsg.innerHTML = "KICKED BY HOST OR DISCONNECTED";
});