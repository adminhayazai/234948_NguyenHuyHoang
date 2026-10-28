
require("dotenv").config();

// Khắc phục lỗi DNS SRV trên Windows
const dns = require("node:dns");

if (process.platform === "win32") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map(url => url.trim())
    : true
}));

app.use(express.json());

// MongoDB Schema
const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    publisher: {
      type: String,
      required: true,
      trim: true
    },
    publishYear: {
      type: Number,
      required: true,
      min: 0,
      max: 2100,
      validate: Number.isInteger
    },
    isbn: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger
    },
    description: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema, "books");

const fields = [
  "bookId",
  "title",
  "author",
  "category",
  "publisher",
  "publishYear",
  "isbn",
  "quantity",
  "description"
];

function getBookData(body) {
  const data = {};

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /health
app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "OK" : "DATABASE_DISCONNECTED",
    service: "Book Management API",
    database: connected ? "Connected" : "Disconnected"
  });
});

// GET /api/books - Danh sách và tìm kiếm
app.get("/api/books", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();

    const safeSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const filter = search
      ? {
          $or: [
            { title: { $regex: safeSearch, $options: "i" } },
            { author: { $regex: safeSearch, $options: "i" } },
            { category: { $regex: safeSearch, $options: "i" } }
          ]
        }
      : {};

    const books = await Book.find(filter)
      .sort({ createdAt: -1 });

    res.json(books);
  } catch (error) {
    next(error);
  }
});

// GET /api/books/:id - Chi tiết sách
app.get("/api/books/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "ID không hợp lệ"
      });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách"
      });
    }

    res.json(book);
  } catch (error) {
    next(error);
  }
});

// POST /api/books - Thêm sách
app.post("/api/books", async (req, res, next) => {
  try {
    const data = getBookData(req.body);
    const book = await Book.create(data);

    res.status(201).json({
      message: "Thêm sách thành công",
      book
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/books/:id - Cập nhật sách
app.put("/api/books/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "ID không hợp lệ"
      });
    }

    const data = getBookData(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "Không có dữ liệu cập nhật"
      });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      {
        new: true,
        runValidators: true
      }
    );

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách"
      });
    }

    res.json({
      message: "Cập nhật sách thành công",
      book
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/books/:id - Xóa sách
app.delete("/api/books/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "ID không hợp lệ"
      });
    }

    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách"
      });
    }

    res.json({
      message: "Xóa sách thành công"
    });
  } catch (error) {
    next(error);
  }
});

// Xử lý lỗi
app.use((error, req, res, next) => {
  console.error("API Error:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      message: "Mã sách bookId đã tồn tại"
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Dữ liệu sách không hợp lệ",
      errors: Object.values(error.errors).map(e => e.message)
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ"
    });
  }

  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      message: "Dữ liệu JSON không hợp lệ"
    });
  }

  res.status(500).json({
    message: "Lỗi máy chủ hoặc kết nối cơ sở dữ liệu"
  });
});

// Kết nối MongoDB Atlas
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Chưa cấu hình MONGODB_URI");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Atlas connected!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
