const sqlite3 = require('sqlite3-promise');
const db = new sqlite3.Database('./db.sqlite3');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

db.run('CREATE TABLE IF NOT EXISTS lists (name TEXT, authHash TEXT, hash TEXT, content TEXT)');

module.exports = db;
/**
 * Describes the TodoList class.
 * @constructor
 * @param list {Object} - The properties of the list, of the shape {name, key, content}
 * @param whatToClone {string} - The key of another list to copy.
 */
async function TodoList(list, whatToClone) {
  let hash = list.hash || "";
  let authHash = list.adminHash || "";

  /**
   * Writes the todo list to the database. Only to be used when creating databases from scratch.
   */
  async function init() {
    let whichContent = JSON.stringify(list.content);
    if (whatToClone) {
      let currentData = await db.allAsync("SELECT content,hash FROM lists");
      if (currentData) {
        for (row of currentData) {
          if (await bcrypt.compare(whatToClone, row.hash)) {
            console.log("setting whichContent to ", row.content);
            whichContent = row.content;
            list.content = JSON.parse(whichContent);
          }
        }
      }
    }
    let allMatches = await db.getAsync("SELECT name FROM lists WHERE hash = ? OR authHash = ?", hash, authHash);
    if (!allMatches) {
      await db.runAsync("INSERT INTO lists VALUES (?,?,?,?)", list.name, authHash || "", hash, whichContent);
    }
  }

  /**
   * Update content in the database.
   * @param content {Object} - The new todo list.
   */
  async function setContent(content) {
    await db.runAsync("UPDATE lists SET content = ? WHERE hash = ? OR authHash = ?;", JSON.stringify(content), hash, authHash);
  }

  async function editItem(id, content) {
    let currentContent = await getContent();
    currentContent = JSON.parse(currentContent);
    let proposedContent = currentContent;
    proposedContent[id] = content;
    if (authHash !== "") {
      setContent(proposedContent);
    } else {
      for (i of ["text", "urgency", "time", "color", "due"]) {
        if (currentContents[i] === "" || currentContents[i] === undefined) continue;
        return false;
      }
      setContent(proposedContent);
    }
    return proposedContent;
  }

  /**
   * Append a todo to the list.
   * @param content {string} - The stringified version of the todo to append.
   */
  async function appendContent(newContent) {
    content = await db.getAsync("SELECT content FROM lists WHERE hash = ? OR authHash = ? LIMIT 1", hash, authHash);
    console.log("first, content is", content);
    newContent = JSON.stringify(JSON.parse(content.content).concat([JSON.parse(newContent)]));
    console.log("then, content is", newContent);
    db.runAsync("UPDATE lists SET content = ? WHERE hash = ? OR authHash = ?", newContent, hash, authHash);
  }

  //Personalizes the sendContent function for the specific todo list.
  let getContent;
  if (authHash !== "") {
    getContent = async () => await sendContent(authHash, true);
  } else if (hash !== "") {
    getContent = async () => await sendContent(hash, false);
  }

  await init();

  return {
    setContent,
    getContent,
    appendContent,
    editItem,
    init
  };
}

/**
 * Describes the AuthTodo class that is invited via share link to a todo list.
 * @constructor
 * @param key {string} - The key in the share link that is used to authorize.
 * @param admin {boolean} - If the key will be used to check for admin privileges.
 */
function AuthTodo(key, admin = false) {
  //This is an async Promise b/c of database reading
  return new Promise(async (resolve, reject) => {
    let hash, todo, counter;
    let allStuff = await db.allAsync("SELECT name FROM lists");
    counter = allStuff.length;

    //Check to see if the key matches up with a todo list
    await db.eachAsync("SELECT * FROM lists", async (err, row) => {
      if (hash && todo) return;
      //If trying to login as admin, then uses admin
      let authHash = await bcrypt.compare(key, admin ? row.authHash : row.hash);
      //Hash is either the admin hash or the viewer hash
      hash = hash || (authHash ? (admin ? row.authHash : row.hash) : null);
      counter--;
      if (hash && !todo) {
        todo = await TodoList({
          content: row.content,
          [admin ? "adminHash" : "hash"]: (admin ? row.authHash : row.hash)
        });
        resolve(todo);
      } else if (!hash) {
        if (counter === 0) reject();
      }
    });
  });
}

/**
 * Return the entire todo list found with a certain hash. Returns undefined if the hash is incorrect.
 * @param hash {string} - The hashed key by which to identify the todo list.
 * @param admin {boolean} - If the user is auth'ed as an admin or not.
 */
async function sendContent(hash, admin = false) {
  let whichName = admin ? "authHash" : "hash";
  let allContent = await db.allAsync("SELECT " + whichName + " from lists");
  let content = await db.getAsync(`SELECT content FROM lists WHERE ${whichName}= ? LIMIT 1`, hash);
  if (!content) return undefined;
  return content.content;
}

module.exports = {
  TodoList,
  AuthTodo
};
