import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "bhanu123",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 7; // Update this to an existing user ID, e.g., 7 or 8

async function checkVisited() {
  try {
    const result = await db.query(
      "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
      [currentUserId]
    );
    let countries = [];
    result.rows.forEach((country) => {
      countries.push(country.country_code);
    });
    return countries;
  } catch (err) {
    console.error("Error checking visited countries:", err);
    return [];
  }
}

async function getCurrentUser() {
  try {
    const result = await db.query("SELECT * FROM users");
    const users = result.rows;
    const user = users.find((user) => user.id == currentUserId);
    if (!user) {
      console.error(`User with ID ${currentUserId} not found`);
    }
    return user;
  } catch (err) {
    console.error("Error getting current user:", err);
    return undefined;
  }
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return res.status(500).send("Current user not found.");
  }
  
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: await getAllUsers(),
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return res.status(500).send("Current user not found.");
  }

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    if (data) {
      const countryCode = data.country_code;
      try {
        await db.query(
          "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
        res.redirect("/");
      } catch (err) {
        console.error("Error inserting visited country:", err);
        res.status(500).send("Error adding visited country.");
      }
    } else {
      res.status(404).send("Country not found.");
    }
  } catch (err) {
    console.error("Error querying country:", err);
    res.status(500).send("Error processing country request.");
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    );

    const id = result.rows[0].id;
    currentUserId = id;

    res.redirect("/");
  } catch (err) {
    console.error("Error creating new user:", err);
    res.status(500).send("Error creating new user.");
  }
});

app.post("/initialize", async (req, res) => {
  try {
    const result = await db.query("SELECT COUNT(*) FROM users");
    if (parseInt(result.rows[0].count) === 0) {
      await db.query("INSERT INTO users (name, color) VALUES ('Bhawini', 'teal')");
      
    }
    res.send("Database initialized");
  } catch (err) {
    console.error("Error initializing database:", err);
    res.status(500).send("Error initializing database.");
  }
});

async function getAllUsers() {
  try {
    const result = await db.query("SELECT * FROM users");
    return result.rows;
  } catch (err) {
    console.error("Error getting all users:", err);
    return [];
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
