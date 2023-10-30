new ClipboardJS("#copyshare");
var socket = io({
	transports: ["websocket", "polling"],
});
var room = document.getElementById("room").innerText.trim();
var size = 0;
var players = [];
var buzzers = [];
var clearAll = document.getElementById("clearall");

var sound = new Howl({
	src: ["/audio/buzz.mp3"],
});

if (window.history.replaceState) {
	window.history.replaceState(null, null, window.location.href);
}

function left() {
	socket.emit("hostleft", { room: room });
}

function deleteUser(user, room) {
	socket.emit("deleteuser", {
		id: user,
		room,
	});

	document.getElementById(user).remove();
	if (document.getElementById("buzz" + user) != null) {
		document.getElementById("buzz" + user).remove();
	}

	for (i = 0; i < players.length; i++) {
		if (players[i].id == user) {
			players.splice(i, 1);
		}
	}

	for (i = 0; i < buzzers.length; i++) {
		if (buzzers[i].id == user) {
			buzzers.splice(i, 1);
		}
	}

	if (document.getElementsByClassName("player").length <= 0) {
		document.getElementById("nousermsg").classList.remove("d-none");
		document.getElementById("nousermsg").classList.add("d-inline-flex");
	}
}

function deleteBuzz(user, room) {
	socket.emit("deletebuzz", {
		id: user,
		room,
	});

	document.getElementById("buzz" + user).remove();

	for (i = 0; i < buzzers.length; i++) {
		if (buzzers[i].id == user) {
			buzzers.splice(i, 1);
		}
	}

	if (document.getElementsByClassName("buzzer").length <= 0) {
		document.getElementById("nobuzzmsg").classList.remove("d-none");
		document.getElementById("nobuzzmsg").classList.add("d-inline-flex");
	}
}

function copied() {
	document.querySelector("#copyfield").innerText = "Copied!";
	setTimeout(() => {
		document.querySelector("#copyfield").innerText = "Copy invite link!";
	}, 2000);
}

socket.emit("joinroomhost", {
	id: room,
});

socket.on("new", (event) => {
	size = event.size - 1;
	document.getElementById("size").innerText = size;

	if (document.getElementById("nousermsg")) {
		document.getElementById("nousermsg").classList.remove("d-inline-flex");
		document.getElementById("nousermsg").classList.add("d-none");
	}

	players.push({ name: sanitizeHTML(event.name), id: event.user });

	var li = document.createElement("li");
	li.className = "player list-group-item d-inline-flex align-items-center";
	li.id = event.user;
	li.innerHTML =
		`<span>${sanitizeHTML(
			event.name
		)}</span><button onclick="deleteUser('` +
		event.user +
		`'` +
		", '" +
		event.room +
		`')" class="btn btn-primary text-center ml-auto p-0" type="button" style="background: rgba(148,168,190,0);border-color: rgba(255,255,255,0);margin: -10px;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" class="bi bi-x-circle-fill" style="color: rgb(6,6,6);font-size: 25px;">
	<path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
</svg></button>`;
	document.getElementById("players").appendChild(li);
});

document.querySelector("input[name=lock]").addEventListener("change", () => {
	if (document.querySelector("input[name=lock]").checked) {
		socket.emit("lock_on", {
			room,
		});
	} else {
		socket.emit("lock_off", {
			room,
		});
	}
});

socket.on("newbuzz", (event) => {
	if (document.getElementById("soundcheck").checked == true) {
		if (!sound.playing()) {
			sound.play();
		}
	}

	if (document.getElementById("nobuzzmsg")) {
		document.getElementById("nobuzzmsg").classList.remove("d-inline-flex");
		document.getElementById("nobuzzmsg").classList.add("d-none");
	}

	buzzers.push({ name: sanitizeHTML(event.name), id: event.user });

	var li = document.createElement("li");
	li.className = "buzzer list-group-item d-inline-flex align-items-center";
	li.id = "buzz" + event.user;

	if (event.val != undefined) {
		li.innerHTML =
			`<span>${sanitizeHTML(event.name)} | <kbd>${sanitizeHTML(
				event.val
			)}</kbd></span><button onclick="deleteBuzz('` +
			event.user +
			`'` +
			", '" +
			event.room +
			`')" class="btn btn-primary text-center ml-auto p-0" type="button" style="background: rgba(148,168,190,0);border-color: rgba(255,255,255,0);margin: -10px;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" class="bi bi-x-circle-fill" style="color: rgb(6,6,6);font-size: 25px;">
	<path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
</svg></button>`;
	} else {
		li.innerHTML =
			`<span>${sanitizeHTML(
				event.name
			)}</span><button onclick="deleteBuzz('` +
			event.user +
			`'` +
			", '" +
			event.room +
			`')" class="btn btn-primary text-center ml-auto p-0" type="button" style="background: rgba(148,168,190,0);border-color: rgba(255,255,255,0);margin: -10px;"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" class="bi bi-x-circle-fill" style="color: rgb(6,6,6);font-size: 25px;">
	<path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
</svg></button>`;
	}

	document.getElementById("buzzers").appendChild(li);
});

clearAll.addEventListener("click", (e) => {
	e.preventDefault();

	socket.emit("allcleared", {
		room,
	});

	buzzers = [];

	var buzzgroup = document.getElementById("buzzers");
	buzzgroup.innerHTML = `<li id="nobuzzmsg"
	class="list-group-item d-inline-flex align-items-center justify-content-center">
	<span>No buzzes yet.</span></li>`;
});

socket.on("send_list", (event) => {
	var locked;
	if (document.querySelector("input[name=lock]").checked) {
		locked = true;
	} else {
		locked = false;
	}

	socket.emit("list_sent", { players, buzzers, locked, user: event.user });
});

socket.on("update_size", (event) => {
	size = event.size - 1;
	document.getElementById("size").innerText = size;
});

socket.on("user_disconnect", (event) => {
	if (document.getElementById(event.user) != null) {
		document.getElementById(event.user).remove();
	}

	if (document.getElementById("buzz" + event.user) != null) {
		document.getElementById("buzz" + event.user).remove();
	}

	for (i = 0; i < players.length; i++) {
		if (players[i].id == event.user) {
			players.splice(i, 1);
		}
	}

	for (i = 0; i < buzzers.length; i++) {
		if (buzzers[i].id == event.user) {
			buzzers.splice(i, 1);
		}
	}

	if (document.getElementsByClassName("player").length <= 0) {
		document.getElementById("nousermsg").classList.remove("d-none");
		document.getElementById("nousermsg").classList.add("d-inline-flex");
	}

	if (document.getElementsByClassName("buzzer").length <= 0) {
		document.getElementById("nobuzzmsg").classList.remove("d-none");
		document.getElementById("nobuzzmsg").classList.add("d-inline-flex");
	}
});

function sanitizeHTML(text) {
	var element = document.createElement("div");
	element.innerText = text;
	return element.innerHTML;
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
