const request = require("supertest");
const app = require("../server");
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Auth routes", () => {
  let testConnection;

  beforeAll(async () => {
    testConnection = await mongoose.connect(process.env.MONGODB_URI_TEST, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await mongoose.connection.dropDatabase();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "newuser",
        password: "newpassword",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Inscription réussie");

      const user = await User.findOne({ username: "newuser" });
      expect(user).not.toBeNull();
      expect(await bcrypt.compare("newpassword", user.password)).toBe(true);
    });

    it("should return 400 if user already exists", async () => {
      const user = new User({
        username: "existinguser",
        password: "existingpassword",
      });
      await user.save();

      const res = await request(app).post("/api/auth/register").send({
        username: "existinguser",
        password: "newpassword",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Cet utilisateur existe déjà");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should log in a user with valid credentials", async () => {
      const password = "testpassword";
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username: "testuser",
        password: hashedPassword,
        role: "user",
      });
      await user.save();

      const res = await request(app).post("/api/auth/login").send({
        username: "testuser",
        password: "testpassword",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();

      const decodedToken = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decodedToken.userId).toBe(user._id.toString());
      expect(decodedToken.role).toBe(user.role);
    });

    it("should return 400 if username is invalid", async () => {
      const res = await request(app).post("/api/auth/login").send({
        username: "invaliduser",
        password: "testpassword",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Identifiants invalides");
    });

    it("should return 400 if password is invalid", async () => {
      const user = new User({
        username: "testuser",
        password: "testpassword",
      });
      await user.save();

      const res = await request(app).post("/api/auth/login").send({
        username: "testuser",
        password: "invalidpassword",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Identifiants invalides");
    });
  });
});
