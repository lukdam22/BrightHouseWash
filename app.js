//set up the server
const express = require( "express" );
const logger = require("morgan");
const db = require('./db/db_connection');
const app = express();
const port = 8080;

// define middleware that logs all incoming requests
app.use(logger("dev"));

// define a route for the default home page
app.get( "/", ( req, res ) => {
    res.sendFile( __dirname + "/views/index.html" );
} );

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

// define a route for the item detail page
const read_item_sql = `
    SELECT 
        id, item, quantity, description 
    FROM
        stuff
    WHERE
        id = ?
`
app.get( "/stuff/item/:id", ( req, res ) => {
    db.query(read_item_sql, [req.params.id], (error, results) => {
        if (error)
            res.status(500).send(error); //Internal Server Error
        else if (results.length == 0)
            res.status(404).send(`No item found with id = "${req.params.id}"` ); // NOT FOUND
        else
            res.send(results[0]); // results is still an array
    });
    // res.sendFile( __dirname + "/views/item.html" );
});

// start the server
app.listen( port, () => {
    console.log(`App server listening on ${ port }. (Go to http://localhost:${ port })` );
} );