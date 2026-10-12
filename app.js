import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

const db = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

const app = express();
const port = 3000;

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

// middleware to require login for editing
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/signin");
    }

    next();
}

app.get("/signup", (req, res) => {
    res.render("signup", { error: null, userId: "", name: "" });
});

app.post("/signup", async (req, res) => {
    const userId = req.body.user_id;
    const name = req.body.name;
    const password = req.body.password;

    const result = await db.query(
        "SELECT * FROM users WHERE user_id = $1",
        [userId]
    );

    if (result.rows.length > 0) {
        return res.render("signup", {
            error: "That user ID is already taken.", userId, name
        });
    }

    await db.query(
        "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
        [userId, password, name]
    );

    res.redirect("/signin");
});

app.get("/signin", (req, res) => {
    res.render("signin", { error: null });
});

app.post("/signin", async (req, res) => {
    const userId = req.body.user_id;
    const password = req.body.password;

    const result = await db.query(
        "SELECT * FROM users WHERE user_id = $1 AND password = $2",
        [userId, password]
    );

    if (result.rows.length === 0) {
        return res.render("signin", {
            error: "Incorrect user ID or password."
        });
    }

    const user = result.rows[0];
    req.session.user = {
        userId: user.user_id,
        name: user.name
    };

    res.redirect("/");
});

app.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

app.get("/", async (req, res) => {
    const result = await db.query("SELECT * FROM blogs");   

    res.render("index", {
        posts: result.rows,
        currentUser: req.session.user || null
    });
});

app.post("/posts", async (req, res) => {
    if (!req.session.user) return res.redirect("/signin");

    const title = req.body.title;
    const body = req.body.content;

    const creatorUserId = req.session.user.userId;
    const creatorName = req.session.user.name;

    await db.query(
        `INSERT INTO blogs
        (creator_name, creator_user_id, title, body, date_created)
        VALUES ($1, $2, $3, $4, NOW())`,
        [creatorName, creatorUserId, title, body]
    );

    res.redirect("/");

});

app.get("/posts/:id/edit", requireLogin, async (req, res) => {
    const id = req.params.id;

    const result = await db.query(
        `SELECT * FROM blogs
         WHERE blog_id = $1 AND creator_user_id = $2`,
        [id, req.session.user.userId]
    );

    if (result.rows.length === 0) {
        return res.status(403).send("You cannot edit this post.");
    }

    res.render("edit", { post: result.rows[0] });
});

app.post("/posts/:id/edit", requireLogin, async (req, res) => {
    const id = req.params.id;

    const result = await db.query(
        `UPDATE blogs
         SET title = $1, body = $2
         WHERE blog_id = $3 AND creator_user_id = $4`,
        [
            req.body.title,
            req.body.content,
            id,
            req.session.user.userId
        ]
    );

    if (result.rowCount === 0) {
        return res.status(403).send("You cannot edit this post.");
    }

    res.redirect("/");
});

app.post("/posts/:id/delete", requireLogin, async (req, res) => {
    const id = req.params.id;

    const result = await db.query(
        `DELETE FROM blogs
         WHERE blog_id = $1 AND creator_user_id = $2`,
        [id, req.session.user.userId]
    );

    if (result.rowCount === 0) {
        return res.status(403).send("You cannot delete this post.");
    }

    res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
