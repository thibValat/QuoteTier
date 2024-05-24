const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const Quotes = require("../models/quotes");

// CRUD classiques
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 7;
  const skip = (page - 1) * limit;
  const searchQuery = req.query.search;
  const sortBy = req.query.sortBy || "createdAt";
  const verifiedQuotes =
    req.query.verified === "true" ? { isVerified: true } : undefined;

  try {
    let quotes;
    let totalQuotes;

    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      quotes = await Quotes.find({
        $or: [{ content: regex }, { author: regex }],
        ...verifiedQuotes,
      })
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit);
      totalQuotes = await Quotes.countDocuments({
        $or: [{ content: regex }, { author: regex }],
        ...verifiedQuotes,
      });
    } else {
      quotes = await Quotes.find({ ...verifiedQuotes })
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit);
      totalQuotes = await Quotes.countDocuments();
    }

    res.json({
      quotes,
      totalPages: Math.ceil(totalQuotes / limit),
      totalQuotes,
      currentPage: page,
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des citations", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const quote = await Quotes.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Citation non trouvée" });
    }
    res.json(quote);
  } catch (err) {
    console.error("Erreur lors de la récupération de la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const { content, author } = req.body;

  try {
    const newQuote = new Quotes({
      content,
      author,
      user: req.user.userId,
    });

    const savedQuote = await newQuote.save();
    res.json(savedQuote);
  } catch (err) {
    console.error("Erreur lors de la création de la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { content, author } = req.body;

  try {
    const quote = await Quotes.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Citation non trouvée" });
    }

    if (quote.user.toString() !== req.user.userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    quote.content = content;
    quote.author = author;

    const updatedQuote = await quote.save();
    res.json(updatedQuote);
  } catch (err) {
    console.error("Erreur lors de la modification de la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const quote = await Quotes.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Citation non trouvée" });
    }

    if (quote.user.toString() !== req.user.userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    await quote.deleteOne();
    res.json({ message: "Citation supprimée avec succès" });
  } catch (err) {
    console.error("Erreur lors de la suppression de la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Interractions sociales
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const quote = await Quotes.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Citation non trouvée" });
    }

    if (quote.likes.includes(req.user.userId))
      quote.likes = quote.likes.filter(
        (userId) => userId.toString() !== req.user.userId
      );
    else quote.likes.push(req.user.userId);

    quote.dislikes = quote.dislikes.filter(
      (userId) => userId.toString() !== req.user.userId
    );

    await quote.save();
    res.json(quote);
  } catch (err) {
    console.error("Erreur lors de l'ajout du like à la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:id/dislike", authMiddleware, async (req, res) => {
  try {
    const quote = await Quotes.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Citation non trouvée" });
    }

    if (quote.dislikes.includes(req.user.userId))
      quote.dislikes = quote.dislikes.filter(
        (userId) => userId.toString() !== req.user.userId
      );
    else quote.dislikes.push(req.user.userId);

    quote.likes = quote.likes.filter(
      (userId) => userId.toString() !== req.user.userId
    );

    await quote.save();
    res.json(quote);
  } catch (err) {
    console.error("Erreur lors de l'ajout du dislike à la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//route admin
router.put("/:id/verify", authMiddleware, async (req, res) => {
  try {
    const quote = await Quotes.findById(req.params.id).populate("user");
    if (!quote) {
      return res.status(404).json({ error: "Citation non trouvée" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès non autorisé" });
    }

    quote.isVerified = !quote.isVerified;
    await quote.save();

    res.json(quote);
  } catch (err) {
    console.error("Erreur lors de la vérification de la citation", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
