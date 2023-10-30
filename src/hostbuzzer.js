let room = document.getElementById("var-room").innerHTML;
let password = document.getElementById("var-password").innerHTML;
let secret = document.getElementById("var-secret").innerHTML;
let statmsg = document.getElementById("statmsg");
var socket = io(wondow.location.href.replace("/host",""), {
	transports: ["websocket", "polling"],
});
function updateNameList(){
	var userdisp = document.getElementById("userlisttest");
	userdisp.innerHTML = USERS.join("<br>");
}
function updateBuzzerList(){
	var buzzerdisp = document.getElementById("buzzerlisttest");
	buzzerdisp.innerHTML = BUZZERSTRS.join("<br>");
}
var USERS = [];
var BUZZERSREAL = [];
var BUZZERSTRS = [];
function catchUp(catchup){
    USERS = catchup.userlist;
    updateNameList();
	console.log(catchup)
	for(let k in catchup.users){
		var user = {user: k, name: catchup.users[k].name};
		let li = document.createElement("li");
		let sp = document.createElement("span");
		sp.innerHTML = user.name;
		var kickbtn = document.createElement("button");
		kickbtn.className = "btn btn-danger btn-sm";
		kickbtn.innerText = "Kick";
		kickbtn.onclick = function(){
			socket.emit("kickuser", {
				room: room,
				password: password,
				secret: secret,
				user: user.user
			}, (res)=>{
				console.log(res.message);
			});
		};
		li.appendChild(sp);
		li.appendChild(kickbtn);
		document.getElementById("userlist").appendChild(li);
	}
	for(let k in catchup.buzzers){
		var user = {answer: catchup.buzzers[k].answer, name: catchup.buzzers[k].name};
		if(user.answer){
			BUZZERSTRS.push(user.name+" (Answer: "+user.answer+")");
		}else{
			BUZZERSTRS.push(user.name);
		}
		BUZZERSREAL.push(user);
	}
	updateBuzzerList();
}
socket.on("connect", () => {
	console.log("Conected");
	if(password){
		socket.emit("createroom", {
			room: room,
			secret: secret,
			password: password
		}, (res)=>{
			console.log(res.message);
			catchUp(res.catchup);
		});
	}else{
		socket.emit("createroom", {
			room: room,
			secret: secret
		}, (res)=>{
			console.log(res.message);
			catchUp(res.catchup);
		});
	}
});
socket.on("newuser", (user)=>{
    USERS.push(user.name);
	updateNameList();
	//Add a new button next to each user for the host to kick them out
	let li = document.createElement("li");
	let sp = document.createElement("span");
	sp.innerHTML = user.name;
	var kickbtn = document.createElement("button");
	kickbtn.className = "btn btn-danger btn-sm";
	kickbtn.innerText = "Kick";
	kickbtn.onclick = function(){
		socket.emit("kickuser", {
			room: room,
			password: password,
			secret: secret,
			user: user.user
		}, (res)=>{
			console.log(res.message);
		});
	};
	li.appendChild(sp);
	li.appendChild(kickbtn);
	document.getElementById("userlist").appendChild(li);
});
socket.on("deluser", (user)=>{
    USERS.splice(USERS.indexOf(user.user), 1);
	console.log(user.user)
	for(var i=0; i<BUZZERSREAL.length; i++){
		if(BUZZERSREAL[i].name==user.user){
			BUZZERSREAL.splice(i, 1);
			BUZZERSTRS.splice(i, 1);
		}
	}
    updateNameList();
	updateBuzzerList();
	for(var x of document.getElementById("userlist").children){
		if(x.children[0].innerHTML==user.user){
			x.remove();
		}
	}
});
socket.on("newbuzzer", (user)=>{
	console.log("newbuzzer: "+user.name);
	if(user.answer){
		BUZZERSTRS.push(user.name+" (Answer: "+user.answer+")");
	}else{
		BUZZERSTRS.push(user.name);
	}
	BUZZERSREAL.push(user);
	updateBuzzerList();
});
function clearBuzz(){
	socket.emit("clearbuzz", {
		room: room,
		password: password,
		secret: secret
	}, (res)=>{
		console.log(res.message);
	});
}
function roomLock(){
	socket.emit("lockroom", {
		room: room,
		password: password,
		secret: secret,
		lock: document.getElementById("lockroom").checked
	}, (res)=>{
		console.log(res.message);
	});
}
function buzzerLock(){
	socket.emit("lockbuzz", {
		room: room,
		password: password,
		secret: secret,
		lock: document.getElementById("lockbuzzer").checked
	}, (res)=>{
		console.log(res.message);
	});
}
socket.on("clearbuzzer", ()=>{
	BUZZERSTRS = [];
	BUZZERSREAL = [];
	updateBuzzerList();
});
socket.on("received", (message)=>{
	console.log(message);
});