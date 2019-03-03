const sqlite3 = require('sqlite3-promise');
const db = new sqlite3.Database('./db.sqlite3');
const bcrypt = require('bcrypt');

db.run('CREATE TABLE IF NOT EXISTS lists (name TEXT, hash TEXT, content TEXT)');

module.exports = db;
/**
 * Describes the TodoList class.
 * @constructor
 * @param list {Object} - The properties of the list, of the shape {name, key, content}
 */
async function TodoList(list) {
  let hash = await bcrypt.hash(list.key, 1);
  db.runAsync("INSERT INTO lists VALUES (?,?,?)", list.name, hash, JSON.stringify(list.content));

  /**
   * Update content in the database.
   */
  async function setContent(content) {
    await db.runAsync("UPDATE lists SET content = ? WHERE hash = ?;", JSON.stringify(content), hash);
  }

  //Personalizes the sendContent function for the specific todo list.
  let getContent = async () => await sendContent(hash);

  return {
    setContent,
    getContent
  };
}

/**
 * Describes the AuthTodo class that is invited via share link to a todo list.
 * @constructor
 * @param key {string} - The key in the share link that is used to authorize.
 */
function AuthTodo(key) {
  //This is an async Promise b/c of database reading
  return new Promise(async (resolve, reject) => {
    let hash, matchedLists, counter;
    let allStuff = await db.allAsync("SELECT name FROM lists");
    counter = allStuff.length;

    await db.eachAsync("SELECT * FROM lists", async (err, row) => {
      if (hash && matchedLists) return;
      let authHash = await bcrypt.compare(key, row.hash);
      hash = hash || (authHash ? row.hash : null);
      if (hash && !matchedLists) {
        matchedLists = {
          name: row.name,
          content: row.content
        };
        resolve(
          Object.assign({
            appendContent,
            getContent
          }, matchedLists));
      } else if (!hash) {
        if (counter === 0) reject();
      }
    });

    /**
     * Append a todo to the list.
     * @param content {string} - The stringified version of the todo to append.
     */
    async function appendContent(content) {
      content = await db.getAsync("SELECT content FROM lists WHERE hash = ? LIMIT 1", hash);
      content = JSON.stringify(JSON.parse(content).concat(JSON.parse(content)));
      db.runAsync("UPDATE lists SET content = ? WHERE hash = ?", content, hash);
    }

    //Personalizes the sendContent function to this AuthTodo.
    let getContent = async () => await sendContent(hash);

  });
}

/**
 * Return the entire todo list found with a certain hash. Returns undefined if the hash is incorrect.
 * @param hash {string} - The hashed key by which to identify the todo list.
 */
async function sendContent(hash) {
  let content = await db.getAsync("SELECT content FROM lists WHERE hash = ? LIMIT 1", hash);
  if (!content) return undefined;
  return content.content;
}

module.exports = {
  TodoList,
  AuthTodo
};
