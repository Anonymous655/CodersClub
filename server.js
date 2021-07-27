const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const connectDB = require("./config/db")

// connect db
connectDB()

app.use(express.json({extended: false}))

app.get("/", (req, res) => {res.send("API running")})
// Define Routes
app.use("/api/users", require("./routes/api/users"))
app.use("/api/profile", require("./routes/api/profiles"))
app.use("/api/auth", require("./routes/api/auth"))
app.use("/api/posts", require("./routes/api/posts"))





app.listen(PORT, () => {console.log(`Server started at port ${PORT}`)});
