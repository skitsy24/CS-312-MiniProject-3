import express from "express";

const app = express();
const port = 3000;

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

const posts = [];
let nextId = 1;


app.get("/", (req, res) => {
  res.render("index", { posts: posts});
});

app.post("/posts", (req, res) => {
    const newPost = {
        id: nextId,
        author: req.body.author,
        title: req.body.title,
        content: req.body.content,
        createdAt: new Date()
    };
    posts.push(newPost);

    nextId++;
    
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