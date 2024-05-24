const request = require("supertest");
const app = require("../server");
const Quotes = require("../models/quotes");
const User = require("../models/users");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Quotes routes", () => {
  let testConnection;
  let token;
  let adminToken;
  let userAdmin;
  let userNormal;

  beforeAll(async () => {
    testConnection = await mongoose.connect(process.env.MONGODB_URI_TEST, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await mongoose.connection.dropDatabase();
  });

  beforeEach(async () => {
    const user = new User({
      username: "testuser",
      password: "testpassword",
      role: "user",
    });
    await user.save();
    userNormal = user;

    const adminUser = new User({
      username: "adminuser",
      password: "adminpassword",
      role: "admin",
    });
    await adminUser.save();
    userAdmin = adminUser;

    token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET
    );
    adminToken = jwt.sign(
      { userId: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await Quotes.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("GET /api/quotes", () => {
    it("should return an array of quotes", async () => {
      const res = await request(app).get("/api/quotes");
      expect(res.statusCode).toBe(200);
      expect(res.body.quotes).toBeInstanceOf(Array);
    });

    it("should return quotes matching the search query", async () => {
      const quote1 = new Quotes({
        content: "Test quote 1",
        author: "Test author 1",
        user: userAdmin._id,
      });
      await quote1.save();

      const quote2 = new Quotes({
        content: "Test quote 2",
        author: "Test author 2",
        user: userAdmin._id,
      });
      await quote2.save();

      const res = await request(app).get("/api/quotes?search=quote 1");
      expect(res.statusCode).toBe(200);
      expect(res.body.quotes).toHaveLength(1);
      expect(res.body.quotes[0].content).toBe("Test quote 1");
    });
  });

  describe("GET /api/quotes/:id", () => {
    it("should return a quote by ID", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userAdmin._id,
      });
      await quote.save();

      const res = await request(app).get(`/api/quotes/${quote._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.content).toBe("Test quote");
    });

    it("should return 404 if quote is not found", async () => {
      const res = await request(app).get(
        "/api/quotes/123456789012123456789012"
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/quotes", () => {
    it("should create a new quote", async () => {
      const res = await request(app)
        .post("/api/quotes")
        .set("Authorization", token)
        .send({
          content: "New quote",
          author: "New author",
          user: userNormal._id,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.content).toBe("New quote");
      expect(res.body.author).toBe("New author");

      quoteId = res.body._id;
    });

    it("should return 401 if user is not authenticated", async () => {
      const res = await request(app).post("/api/quotes").send({
        content: "New quote",
        author: "New author",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("PUT /api/quotes/:id", () => {
    it("should update a quote", async () => {
      const quote = await request(app)
        .post("/api/quotes")
        .set("Authorization", token)
        .send({
          content: "New quote",
          author: "New author",
          user: userAdmin._id,
        });

      const res = await request(app)
        .put(`/api/quotes/${quote.body._id}`)
        .set("Authorization", token)
        .send({
          content: "Updated quote",
          author: "Updated author",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.content).toBe("Updated quote");
      expect(res.body.author).toBe("Updated author");
    });

    it("should return 401 if user is not authorized", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
      });

      const res = await request(app)
        .put(`/api/quotes/${quote._id}`)
        .set("Authorization", adminToken)
        .send({
          content: "Updated quote",
          author: "Updated author",
        });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/quotes/:id", () => {
    it("should delete a quote", async () => {
      const quote = await request(app)
        .post("/api/quotes")
        .set("Authorization", token)
        .send({
          content: "New quote",
          author: "New author",
          user: userAdmin._id,
        });

      const res = await request(app)
        .delete(`/api/quotes/${quote.body._id}`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Citation supprimée avec succès");
    });

    it("should return 401 if user is not authorized", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userNormal._id,
      });
      await quote.save();

      const res = await request(app)
        .delete(`/api/quotes/${quote._id}`)
        .set("Authorization", adminToken);

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/quotes/:id/like", () => {
    it("should add a like to a quote", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userAdmin._id,
      });
      await quote.save();

      const res = await request(app)
        .post(`/api/quotes/${quote._id}/like`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.likes).toContain(userNormal._id.toString());
    });

    it("should return 400 if quote is already liked", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userAdmin._id,
      });
      await quote.save();

      const like1 = await request(app)
        .post(`/api/quotes/${quote._id}/like`)
        .set("Authorization", token);

      const like2 = await request(app)
        .post(`/api/quotes/${quote._id}/like`)
        .set("Authorization", token);

      expect(like2.statusCode).toBe(400);
    });
  });

  describe("POST /api/quotes/:id/dislike", () => {
    it("should add a dislike to a quote", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userAdmin._id,
      });
      await quote.save();

      const res = await request(app)
        .post(`/api/quotes/${quote._id}/dislike`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.dislikes).toContain(userNormal._id.toString());
    });

    it("should return 400 if quote is already disliked", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userAdmin._id,
      });
      await quote.save();

      const dislike1 = await request(app)
        .post(`/api/quotes/${quote._id}/dislike`)
        .set("Authorization", token);

      const dislike2 = await request(app)
        .post(`/api/quotes/${quote._id}/dislike`)
        .set("Authorization", token);

      expect(dislike2.statusCode).toBe(400);
    });
  });

  describe("PUT /api/quotes/:id/verify", () => {
    it("should verify a quote", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userNormal._id,
      });
      await quote.save();

      const res = await request(app)
        .put(`/api/quotes/${quote._id}/verify`)
        .set("Authorization", adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.isVerified).toBe(true);
    });

    it("should return 403 if user is not an admin", async () => {
      const quote = new Quotes({
        content: "Test quote",
        author: "Test author",
        user: userNormal._id,
      });
      await quote.save();

      const res = await request(app)
        .put(`/api/quotes/${quote._id}/verify`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(403);
    });
  });
});
