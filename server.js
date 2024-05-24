const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const quotesRouter = require("./routes/quotes");
const authRouter = require("./routes/auth");
const commentsRouter = require("./routes/comments");
const config = require("./config/database");

dotenv.config();

const app = express();

app.use(express.json());
const env = process.env.NODE_ENV || "development";
mongoose
  .connect(config[env].url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connecté à MongoDB"))
  .catch((err) => console.error("Erreur de connexion à MongoDB", err));

const port = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Serveur démarré sur le port ${port}`);
  });
}

app.use("/api/quotes", quotesRouter);
app.use("/api/auth", authRouter);
app.use("/api/comments", commentsRouter);

module.exports = app;
