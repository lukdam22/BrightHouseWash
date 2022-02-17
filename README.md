# Part 04: Connecting the Layers: Rendering templates with data

This tutorial follows after:
[Part 03: Database Layer: Database connection and first table set-up](https://github.com/atcs-wang/inventory-webapp-03-db-connection-setup/)

Technologies: [EJS (Embedded JavaScript templating)](https://ejs.co/)

In this tutorial, we will connect all three layers, making our server render the web app's pages with data from the database. 

## (4.1) The big picture:

[Two tutorials ago](https://github.com/atcs-wang/inventory-webapp-02-app-server-basics#making-a-simple-app-server-for-our-prototypes), we set up "routes" in `app.js` telling our Express web server to handle incoming HTTP requests from client browsers, and respond (with static HTML files). 

>```
>Browser --- request ---> App Server
>Browser <-- response --- App Server
>```

[Last tutorial](https://github.com/atcs-wang/inventory-webapp-03-db-connection-setup#read-the-table-step-44), we used NodeJS to connect and execute queries to our MySQL database, and the database would return data back. 

>```
>App Server --- query --> Database
>App Server <-- data ---- Database
>```


We will now combine those two concepts into a web server that generally follows the following pattern: 
1. The web server receives an HTTP request
2. The web server makes a relevant query to the database
3. The web server waits for the data to be returned
4. The web server uses the data to form and send the HTTP response. 

>```
> Browser --- request ---> App Server
>                          App Server --- query --> Database
>                          App Server <-- data ---- Database
> Browser <-- response --- App Server
>```

In step 4, the format of the response can vary: it could be raw data (like JSON) or fully formed HTML pages. 

In the first part of the tutorial, we'll just focus on making our server query the database upon HTTP request, and simply respond with that raw data. 

In the second part of the tutorial, we'll upgrade the reponse to HTML pages rendered dynamically with (that is, *containing*) that data.

## (4.2) Responding with raw data (JSON) [Part 1/2]: 

Before we can execute any database queries, we need `app.js` to `require()` the connection object we defined in `db/db_connection.js`. Add this line to the top of the file with the other `require` statements.

```js
const db = require('./db/db_connection');
```

### (4.2.1) Making the `/stuff` route respond with data
Currently the `/stuff` route looks like this:

```js
app.get( "/stuff", ( req, res ) => {
    res.sendFile( __dirname + "/views/stuff.html" );
} );
```
As it is, requests for `/stuff` are immediately responded to with the `stuff.html` prototype. 

The client is ostensibly interested in a summary list of all items in the `'stuff'` table in the database. This means the app server will need to execute the following SQL query upon request: 
```sql
SELECT 
    id, item, quantity
FROM
    inventory
```
*(also in `db/queries/crud/read_stuff_all.sql`)*


Replace the code for the `/stuff` route with this code instead:
```js
// define a route for the stuff inventory page
const read_stuff_all_sql = `
    SELECT 
        id, item, quantity
    FROM
        stuff
`
app.get( "/stuff", ( req, res ) => {
    db.query(read_stuff_all_sql, (error, results) => {
        if (error)
            res.status(500).send(error); //Internal Server Error
        else
            res.send(results);
    });
});
```

and run the server again:
```
> node app.js
```

and visit `localhost:8080/stuff` on your browser. Now, instead of an HTML page, you should see some plaintext with data from the database:

```
[ { "id": 1, "item": "Widgets", "quantity": 5 }, { "id": 2, "item": "Gizmos", "quantity": 100 }, { "id": 3, "item": "Thingamajig", "quantity": 12345 }, { "id": 4, "item": "Thingamabob", "quantity": 54321 } ]
```

Great! Let's break down the new code:
- **When does the app server respond now?** The route handler doesn't send a response right away anymore - first, it sends a query to the database, then waits for the query results via *another* handler callback function before responding. (Nested callback functions can be a bit disorienting at first.) 
- **How does the server know if the database executed the query successfully?**  Our database might be respond too slowly or fail to execute the query for a wide range of reasons (e.g. malformed SQL, network failure, database is busy/slow). The opening `if (error)` statement in the callback function is the standard way of checking this. In case of failure, the `error` parameter in the callback function will be some kind of error message object (a "truthy" value). Otherwise, `error` will be `undefined` (a "falsy" value). 
- **If the database does NOT return results successfully?** Our response should have an appropriate status code of `500 Internal Server Error`. It can be helpful (at least during development) to also report what went wrong, so we can send the error object too. The `res.status(500).send(error)` in the if block accomplishes this.
- **Otherwise, if the database DOES return results successfully?**  In the else block, `res.send(results)` will send a response with a default `200 OK` status code and a body containing the `results` serialized as JSON (JavaScript Object Notation). 

> If you'd like to see the error message response in play, temporarily change your database password in the `.env` file to force a error. Check both the server logs in the terminal and the browser's developer tools (Inspect -> Network) to confirm that the status code is indeed `500 Internal Server Error`.

### 4.2.2 Making the `/stuff/item` route respond with data

Currently the `/stuff/item` route looks like this:

```js
app.get( "/stuff", ( req, res ) => {
    res.sendFile( __dirname + "/views/stuff.html" );
} );
```

As it is, requests for `/stuff` are immediately responded to with the `item.html` prototype. 

The client is interested in data about a particular item in the stuff table. This could be any item, which are uniquely identified by the column `id`. 

This means the app server will need to execute the following SQL query upon request: 
```sql
SELECT 
    item, quantity, description 
FROM
    inventory
WHERE 
    id = ?
```
*(also in `db/queries/crud/read_item.sql`)*

where the `?` placeholder must be filled in with the appropriate id.

#### (4.2.2.1) Prepared statements with manual values

Let's assume for a minute (as the prototype does) that the client wants the first item in the table, with `id = 1`.

Replace the code for the `/stuff/item` route with this code instead:
```js
// define a route for the item detail page
const read_item_sql = `
    SELECT 
        item, quantity, description 
    FROM
        stuff
    WHERE
        id = ?
`
app.get( "/stuff/item", ( req, res ) => {
    db.query(read_item_sql, [1], (error, results) => {
        if (error)
            res.status(500).send(error); //Internal Server Error
        else
            res.send(results[0]); // results is still an array
    });
});
```

If you run your server again and navigate your browser to `localhost:8080/stuff/item`, you should receive data like this:
```
{"item":"Widgets","quantity":5,"description":"Widgets are cool! You can do ... so many... different things... with them..."}
```

Notice the route handler is very similar (for now) to the `/stuff` route from earlier. The only differences are:

1. To assign the placeholder `?` in the SQL a value of `1`, the second parameter of the `db.query()` method is passed an array containing `1`. This technique is known as a "prepared statement", and was demonstrated in `db/db_init.js` in the previous tutorial.
2. The response only sends the element in the first index of the results, not the entire results object. Results for a `SELECT` statement are always arrays, even if only one row is selected.


#### (4.2.2.2) URL parameters - allowing the client to specify prepared statement values.

Naturally, the client would like to see data for any of the items in the table, not just the one with `id = 1`. How can the client specify which item `id` they want? 

Imagine a route system where the information for item `1` is at the URL path `stuff/item/1`, item `2` is at `stuff/item/2`, and so on so forth. We call that `id` number embedded in the URL a **URL parameter**, and Express has a very easy way to utilize them.

Let's change the route path from
```js
app.get( "/stuff/item", ...
```
to 
```js
app.get( "/stuff/item/:id",
```
This makes the route apply to *any* URL path of the pattern `/stuff/item/:id`, where `:id` can be any (non-blank) value. 

The `:id` part declares a URL parameter `id`. In the route handler, all URL parameters are sub-properties of the `req.params` property. So `req.params.id` will contain the value of the `:id` part of the URL.

If you see where this is going, the next change is very natural: replace the `1` in the `db.query()`'s second parameter with `req.params.id`. Now, the SQL prepared statement will use the `id` parameter from the URL as the value of `id` in the query!

Together, the updated route and handler look like this:

```js
app.get( "/stuff/item/:id", ( req, res, next ) => {
    db.query(read_item_sql, [req.params.id], (error, results) => {
    ...
```

Test it by navigating your browser to `localhost:8080/stuff/item/1`, then replace the `1` with `2` and other numbers. You should see data for the various corresponding items. 

> Why are we using "prepared statements" instead of using concatenation or `string.replace` to construct the SQL query from the URL parameter? A malicious user could put anything at all in the URL parameter, including parts of or whole SQL statements, potentially causing the database to execute SQL statements the developers didn't intend to be run. 
>
>This is called an **SQL injection attack**, and are primarily used to gain unauthorized access to protected data. A [popular xkcd comic](https://xkcd.com/327/) gives a humorous hypothetical of what kind mayhem SQL injections could cause an unprotected system. 
>
>Although our app doesn't *yet* have any such authorization limits, it is wise to always use protective techniques like prepared statements or "escaping" values that prevent treating user-provided inputs like executable SQL.

#### (4.2.2.3) Send a 404 when item not found.

If you try a URL like `localhost:8080/stuff/item/BADID`, you'll see a blank page. Since no item with `id = BADID` exists, the query's `results` are an empty array, and `results[0]` is undefined. This isn't a database error (the query executed correctly) so a `500` status code is inappropriate, but since the data being requested wasn't found, a status code of `404 Not Found` should be sent along with a more informative message.

Update the callback code with a new "else if" clause:
```js
    if (error)
        res.status(500).send(error); //Internal Server Error
    else if (results.length == 0)
        res.status(404).send(`No item found with id = "${req.params.id}"` ); // NOT FOUND
    else
        res.send(results[0]); // results is still an array
```

Test the server again by navigating your browser to `localhost:8080/stuff/item/BADID` or any other invalid `:id` value. Confirm that the message is sent. 
> You can also confirm that both the server logs in the terminal and the browser's developer tools (Inspect -> Network) show the status code is indeed `404 Not Found`.
