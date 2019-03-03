const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db");
const app = express();
const saltShaker = require("randomstring").generate;
require("./scripts/build");
const io = require("socket.io")(app.listen(3000, () => console.log("server started")));

app.use("/", express.static("build"));
app.get("*", (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});

let ALL_USERS = {};
let ALL_LISTS = {};

/**
 * Handles client-server communications.
 */
io.sockets.on("connection", socket => {
  //Unique ID for each socket connection, stored in ALL_USERS
  let id = Math.random();
  socket.id = id;
  ALL_USERS[id] = {
    socket,
  };

  /**
   * Controls user creation of their own lists.
   */
  socket.on("connect-list", async (key = "") => {
    let list;

    //Lock the user into this list specifically.
    lockToList(socket);
    addAppend(socket, list);

    //Reuse list reference if possible; if not, make a new one. Uses ALL_LISTS
    if (ALL_LISTS.hasOwnProperty(key)) {
      ALL_LISTS[key].users.push(id);
      list = ALL_LISTS[key];
    } else {
      let dbConnection = await db.AuthTodo(key);
      if (!dbConnection) return socket.emit("connect-list reject");
      list = {
        key: key,
        db: thisDb,
        appendContent: function(content) {
          this.db.appendContent(content);
          this.sendContent(content);
        },
        users: [id],
        sendContent,
        getContent
      };
      ALL_LISTS[key] = list;
    }
    //Broadcast the current contents of the list.
    list.getContent(id);

  });
  /**
   * Controls user creation of their own lists. Allows for deletion, editing and appending. Name creation is not yet supported.
   */
  socket.on("create-list", async (name) => {

    let list = {
      key: saltShaker(),
      name: name,
      contents: [],
      users: [id],
      sendContent,
      getContent
    };

    lockToList(socket);
    addAppend(socket, list,false);

    list.db = await db.TodoList(list);
    ALL_LISTS[list.key] = list;

    /**
     * Update content in the database and for all active users.
     */
    list.setContent = async function(content) {
      await this.db.setContent(content);
      this.sendContent(content);
      list.db.setContent(content);
    };

    /**
     * Delete item.
     * @param index {Number} - The index in the array of the todo to delete.
     */
    socket.on("delete-item", (index) => {
      if (!index && index > list.contents.length) return;
      list.contents = list.contents.splice(0, index).concat(index < list.contents.length ? list.contents.splice(index + 1) : []);
      list.setContent(list.contents);
    });

    /**
     * Overwrite item in the list.
     * @param index {Number} - The index in the array of the todo to edit.
     * @param contents {string} - The stringified version of the updated version of the element.
     */
    socket.on("edit-item", (index, contents = "{}") => {
      list.contents[index] = JSON.parse(contents);
      list.setContent(list.contents);
    });

    socket.emit("list-key", list.key);
  });

  socket.on("disconnect", () => {
    delete ALL_USERS[id];
  });
});

/**
 * Broadcast a given piece of content to all users.
 * @param content {Array} - The todo list to send.
 */
function sendContent(content) {
  for (i in this.users) {
    let user = this.users[i];
    if (ALL_USERS[user]) {
      ALL_USERS[user].socket.emit("list-content", JSON.stringify(content));
    }
  }
}

/**
 * Retrieve content from the database and send it to a list of users.
 * @param users {Array} - The spreaded array of users.
 */
async function getContent(...users) {
  let content = await this.db.getContent();
  for (i in users) {
    let user = users[i];
    if (ALL_USERS[user]) {
      ALL_USERS[user].socket.emit("list-content", content);
    }
  }
}

/**
 * Create append functionality for a user.
 * @param socket {Object} - The socket object to add append listeners to.
 * @param list {Object} - The todo list object whose editing functionalities will be used.
 * @param reducedPrivileges {boolean} - If the socket should have limited editing priveleges.
 */
function addAppend(socket, list,reducedPrivileges=true) {

  socket.on("append-item", (contents = "{}") => {
    list.contents.push(JSON.parse(contents));
    list.setContent(list.contents);
  });

  if(!reducedPrivileges) return;

  /**
   * Edit an item with reduced privileges, specifically only being able to edit blank todos.
   * @param id {Number} - The index of the todo to edit.
   * @param contents {string} - The stringified version of the todo object.
   */
  socket.on("edit-item", (id, contents = "{}") => {
    contents = JSON.parse(contents);
    let otherContents = list.contents[id];
    for (i of ["text", "urgency", "time", "color"]) {
      if (otherContents[i] === "") continue;
      return;
    }
    list.contents[id] = contents;
    list.db.setContent(list.contents);
    list.sendContent(list.contents);
  });
}

/**
 * Disables the creation or connection of/to todos, tying the current user to the current list.
 * @param socket {Object} - The socket object to bind.
 */
function lockToList(socket) {
  socket.on("connect-list", () => socket.emit("connect-list reject"));
  socket.on("create-list", () => socket.emit("create-list reject"));
}
