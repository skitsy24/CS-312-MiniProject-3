import express from "express";
import pg from "pg";
import dotenv from "dotenv";

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

const posts = [];

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
            error: "That user ID is already taken."
        });
    }

    await db.query(
        "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
        [userId, password, name]
    );

    res.redirect("/signin");
});



app.get("/", async (req, res) => {
    const result = await db.query("SELECT * FROM blogs");   

    console.log(result.rows);

    res.render("index", { posts: result.rows});
});

app.post("/posts", async (req, res) => {

    const title = req.body.title;
    const body = req.body.content;

    // temp, no login yet
    const creatorUserId = "ohyeah?";
    const creatorName = "Steve Lacy";

    await db.query(
        `INSERT INTO blogs
        (creator_name, creator_user_id, title, body, date_created)
        VALUES ($1, $2, $3, $4, NOW())`,
        [creatorName, creatorUserId, title, body]
    );

    res.redirect("/");

});

app.get("/posts/:id/edit", (req, res) => {
    // convert id to number
    const id = Number(req.params.id);
    // find post object in posts array
    const post = posts.find(post => post.id === id);
    // render edit page of that post
    res.render("edit", { post: post });
})

app.post("/posts/:id/edit", (req, res) => {
    // convert id to number
    const id = Number(req.params.id);
    // find post object in posts array
    const post = posts.find(post => post.id === id);
    // save new changes
    post.author = req.body.author;
    post.title = req.body.title;
    post.content = req.body.content;

    res.redirect("/");

})

app.post("/posts/:id/delete", (req, res) => {
    const id = Number(req.params.id);
    // findIndex finds index of element in array that matches the condition
    // in this case, matching id
    const postIndex = posts.findIndex(post => post.id === id);
    // removes that post
    posts.splice(postIndex, 1);

    res.redirect("/");
})
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
