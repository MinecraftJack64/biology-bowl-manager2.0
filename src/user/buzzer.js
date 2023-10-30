var socket = io('http://localhost:3000/', {
	transports: ["websocket", "polling"],
});
var room = document.getElementById("room").innerText.trim();
var name = document.getElementById("name").innerText.trim();
var buzzbtn = document.getElementById("buzzbtn");
var form = document.getElementById("answer-input");
var deletedFlag = false;
var canBuzz = true;
var lock_status = false;
var pre_lock_state = "Click to buzz!";

form.addEventListener("submit", (event) => {
	event.preventDefault();
});

if (window.history.replaceState) {
	window.history.replaceState(null, null, window.location.href);
}

socket.on("connect", () => {
	socket.emit("joinroom", {
		id: room,
		name,
		user: socket.id,
	});
});//When SOcket io connects to the server, join the buzzin room

function buzzfunc() {
	if (canBuzz) {
		if (document.getElementById("ans").value != "") {
			socket.emit("buzzed", {
				id: room,
				name,
				user: socket.id,
				val: document.getElementById("ans").value,
			});//Send the buzz dsignal with an answer

			document.getElementById("ans").value = "";
		} else {
			socket.emit("buzzed", {
				id: room,
				name,
				user: socket.id,
			});//Send the buzz signal without an answer
		}

		buzzbtn.className = "btn btn-warning btn-block font-weight-bold mb-3";
		buzzbtn.innerText = "Buzzed!";
		canBuzz = false;//Hard coded way to stop buzzing
	}
}

buzzbtn.addEventListener("click", (e) => {
	e.preventDefault();
	buzzfunc();//trigger buzzing
});

document.body.onkeyup = function (e) {
	if (
		e.keyCode == 32 &&
		document.getElementById("kbshortcut").checked == true &&
		document.activeElement.nodeName.toLowerCase() != "input"
	) {
		buzzfunc();//Buzz when space key released and enabled
	}
};

socket.on("new", (event) => {
	size = event.size - 1;
	document.getElementById("size").innerText = size;

	if (document.getElementById("nousermsg")) {
		document.getElementById("nousermsg").classList.remove("d-inline-flex");
		document.getElementById("nousermsg").classList.add("d-none");
	}

	var li = document.createElement("li");
	li.className =
		"player list-group-item d-inline-flex align-items-center justify-content-center";
	li.id = event.user;
	li.innerHTML = `<span>${sanitizeHTML(event.name)}</span>`;
	document.getElementById("players").appendChild(li);
});//Adds a user to the buzzer room list

socket.on("newbuzz", (event) => {
	if (document.getElementById("nobuzzmsg")) {
		document.getElementById("nobuzzmsg").classList.remove("d-inline-flex");
		document.getElementById("nobuzzmsg").classList.add("d-none");
	}

	var li = document.createElement("li");
	li.className =
		"buzzer list-group-item d-inline-flex align-items-center justify-content-center";
	li.id = "buzz" + event.user;
	li.innerHTML = `<span>${sanitizeHTML(event.name)}</span>`;

	document.getElementById("buzzers").appendChild(li);
});//When a user buzzes in, add them to the list

socket.on("remove_buzz", (event) => {
	document.getElementById("buzz" + event.user).remove();

	if (document.getElementsByClassName("buzzer").length <= 0) {
		document.getElementById("nobuzzmsg").classList.remove("d-none");
		document.getElementById("nobuzzmsg").classList.add("d-inline-flex");
	}
});//Remove a user from the list when they are removed from the buzzer list

socket.on("buzzcleared", (event) => {
	pre_lock_state = "Click to buzz!";
	if (!lock_status) {
		buzzbtn.className = "btn btn-danger btn-block font-weight-bold mb-3";
		pre_lock_state = buzzbtn.innerText;
		canBuzz = true;
	}
});//Clear the user buzzer

socket.on("lock_buzz", (event) => {
	pre_lock_state = buzzbtn.innerText;
	buzzbtn.className = "btn btn-warning btn-block font-weight-bold mb-3";
	buzzbtn.innerText = "Buzzer locked!";
	canBuzz = false;
	lock_status = true;
});//Lock the buzzer

socket.on("unlock_buzz", (event) => {
	if (pre_lock_state == "Click to buzz!") {
		buzzbtn.className = "btn btn-danger btn-block font-weight-bold mb-3";
		buzzbtn.innerText = "Click to buzz!";
		canBuzz = true;
		lock_status = false;
	} else if (pre_lock_state == "Buzzed!") {
		buzzbtn.className = "btn btn-warning btn-block font-weight-bold mb-3";
		buzzbtn.innerText = "Buzzed!";
		canBuzz = false;
		lock_status = false;
	}
});//Unlock the buzzer

socket.on("remove_all", (event) => {
	var buzzgroup = document.getElementById("buzzers");
	buzzgroup.innerHTML = `<li id="nobuzzmsg"
	class="list-group-item d-inline-flex align-items-center justify-content-center">
	<span>No buzzes yet.</span></li>`;

	pre_lock_state = "Click to buzz!";

	if (!lock_status) {
		buzzbtn.className = "btn btn-danger btn-block font-weight-bold mb-3";
		buzzbtn.innerText = "Click to buzz!";
		canBuzz = true;
	}
});//Remove all from the list of members who buzzed in

socket.on("receive_list", (event) => {
	for (i = 0; i < event.players.length; i++) {
		var li = document.createElement("li");
		li.className =
			"player list-group-item d-inline-flex align-items-center justify-content-center";
		li.id = event.players[i].id;
		li.innerHTML = `<span>${event.players[i].name}</span>`;
		document.getElementById("players").appendChild(li);
	}

	if (event.buzzers.length > 0) {
		document.getElementById("nobuzzmsg").classList.remove("d-inline-flex");
		document.getElementById("nobuzzmsg").classList.add("d-none");
	}

	for (i = 0; i < event.buzzers.length; i++) {
		var li = document.createElement("li");
		li.className =
			"buzzer list-group-item d-inline-flex align-items-center justify-content-center";
		li.id = "buzz" + event.buzzers[i].id;
		li.innerHTML = `<span>${event.buzzers[i].name}</span>`;
		document.getElementById("buzzers").appendChild(li);
	}

	if (event.locked) {
		buzzbtn.className = "btn btn-warning btn-block font-weight-bold mb-3";
		buzzbtn.innerText = "Buzzer locked!";
		canBuzz = false;
		lock_status = true;
	}
});//Obtain list of existing users and buzzers if user just joined

socket.on("room_deleted", () => {
	deletedFlag = true;
	window.location.href = "/deleted";
});//If the room is deleted, redirect to the deleted page

socket.on("remove_player", (event) => {
	document.getElementById(event.user).remove();

	if (document.getElementById("buzz" + event.user) != null) {
		document.getElementById("buzz" + event.user).remove();
	}

	if (document.getElementsByClassName("buzzer").length <= 0) {
		document.getElementById("nobuzzmsg").classList.remove("d-none");
		document.getElementById("nobuzzmsg").classList.add("d-inline-flex");
	}
});//remove a player from the list

socket.on("user_disconnect", (event) => {
	if (document.getElementById(event.user) != null) {
		document.getElementById(event.user).remove();
	}

	if (document.getElementById("buzz" + event.user) != null) {
		document.getElementById("buzz" + event.user).remove();
	}

	if (document.getElementsByClassName("buzzer").length <= 0) {
		document.getElementById("nobuzzmsg").classList.remove("d-none");
		document.getElementById("nobuzzmsg").classList.add("d-inline-flex");
	}
});//remove a player from the player list and buzzer list

socket.on("kicked_out", () => {
	window.location.href = "/kicked";
});//If the user is kicked out, redirect to the kicked page

socket.on("update_size", (event) => {
	size = event.size - 1;
	document.getElementById("size").innerText = size;
});//Update the size of the room?

function sanitizeHTML(text) {
	var element = document.createElement("div");
	element.innerText = text;
	return element.innerHTML;
}

function disconnected() {
	if (!deletedFlag) {
		socket.emit("disconnected", { user: socket.id, room });
	}
}

var dc_msg = document.getElementById("dc_msg");
var reconnect_msg = document.getElementById("reconnect_msg");

setInterval(() => {
	if (!navigator.onLine) {
		dc_msg.classList = "alert alert-danger mb-3 text-center";
	} else if (
		navigator.onLine &&
		dc_msg.classList == "alert alert-danger mb-3 text-center"
	) {
		dc_msg.classList = "alert alert-danger mb-3 text-center d-none";
		reconnect_msg.classList = "alert alert-success mb-3 text-center";
		setTimeout(() => {
			reconnect_msg.classList =
				"alert alert-success mb-3 text-center d-none";
		}, 2000);
	}
}, 1000);
