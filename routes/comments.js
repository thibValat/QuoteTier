const express = require("express");
const router = express.Router();
const Comments = require("../models/comments");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, async (req, res) => {
  const { content, quoteId } = req.body;

  try {
    const newComment = new Comments({
      content,
      user: req.user.userId,
      quote: quoteId,
    });

    const savedComment = await newComment.save();
    res.json(savedComment);
  } catch (err) {
    console.error("Erreur lors de la création du commentaire", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:quoteId", async (req, res) => {
  try {
    const comments = await Comments.find({
      quote: req.params.quoteId,
    }).populate("user");
    res.json(comments);
  } catch (err) {
    console.error("Erreur lors de la récupération des commentaires", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
