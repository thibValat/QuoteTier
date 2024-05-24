const request = require("supertest");
const app = require("../server");
const Comments = require("../models/comments");
const User = require("../models/users");
const Quotes = require("../models/quotes");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Comments routes", () => {
  let testConnection;
  let token;
  let userNormal;
  let quote;

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

    quote = new Quotes({
      content: "Test quote",
      author: "Test author",
      user: userNormal._id,
    });
    await quote.save();

    token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await Comments.deleteMany({});
    await User.deleteMany({});
    await Quotes.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("POST /api/comments", () => {
    it("should create a new comment", async () => {
      const res = await request(app)
        .post("/api/comments")
        .set("Authorization", token)
        .send({
          content: "New comment",
          quoteId: quote._id,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.content).toBe("New comment");
      expect(res.body.user).toBe(userNormal._id.toString());
      expect(res.body.quote).toBe(quote._id.toString());
    });

    it("should return 401 if user is not authenticated", async () => {
      const res = await request(app).post("/api/comments").send({
        content: "New comment",
        quoteId: quote._id,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/comments/:quoteId", () => {
    it("should return comments for a specific quote", async () => {
      const comment1 = new Comments({
        content: "Comment 1",
        user: userNormal._id,
        quote: quote._id,
      });
      await comment1.save();

      const comment2 = new Comments({
        content: "Comment 2",
        user: userNormal._id,
        quote: quote._id,
      });
      await comment2.save();

      const res = await request(app).get(`/api/comments/${quote._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].content).toBe("Comment 1");
      expect(res.body[1].content).toBe("Comment 2");
    });

    it("should return an empty array if no comments are found for a quote", async () => {
      const res = await request(app).get(`/api/comments/${quote._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });
});
