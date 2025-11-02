const Event = require("../models/Event");
const slugify = require("slugify");
const { mapLocationName } = require('../utils/locationHelper'); // import helper

// 🧩 Tạo sự kiện mới
exports.createEvent = async (req, res, next) => {
  try {
    const payload = req.body;
    payload.createdBy = req.user?.id; // đảm bảo có user đăng nhập

    // 🧩 Sinh slug tự động (vd: dem-nhac-hoi-abc-1a2b)
    payload.slug =
      payload.slug ||
      slugify(payload.name || "event", { lower: true, strict: true }) +
        "-" +
        Date.now().toString(36).slice(-4);

    // 🖼️ Xử lý file upload
    if (req.files?.coverImage?.[0])
      payload.coverImage = `/uploads/${req.files.coverImage[0].filename}`;

    if (req.files?.seatMap?.[0])
      payload.seatMapUrl = `/uploads/${req.files.seatMap[0].filename}`;

    if (req.files?.gallery)
      payload.gallery = req.files.gallery.map(
        (file) => `/uploads/${file.filename}`
      );

    if (req.files?.organizerLogo?.[0]) {
      payload.organizerLogo = `/uploads/${req.files.organizerLogo[0].filename}`;
    }

    // 🎫 Parse danh sách vé (ticketTypes)
    if (payload.ticketTypes && typeof payload.ticketTypes === "string") {
      try {
        payload.ticketTypes = JSON.parse(payload.ticketTypes);
      } catch {
        return res.status(400).json({ message: "Invalid ticketTypes JSON" });
      }
    }

    // 💳 Parse paymentInfo nếu là JSON string
    if (payload.paymentInfo && typeof payload.paymentInfo === "string") {
      try {
        payload.paymentInfo = JSON.parse(payload.paymentInfo);
      } catch {
        return res.status(400).json({ message: "Invalid paymentInfo JSON" });
      }
    }

    // 📍 Parse location JSON
if (payload.location && typeof payload.location === "string") {
  try {
    payload.location = JSON.parse(payload.location);
  } catch {
    return res.status(400).json({ message: "Invalid location JSON" });
  }
}

    const event = await Event.create(payload);
    res.status(201).json({ message: "Event created successfully", event });
  } catch (err) {
    console.error("❌ Create Event Error:", err);
    next(err);
  }
};

// 🧩 Cập nhật sự kiện
exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    payload.updatedAt = Date.now();

    // 🖼️ Cập nhật file mới nếu có
    if (req.files?.coverImage?.[0])
      payload.coverImage = `/uploads/${req.files.coverImage[0].filename}`;

    if (req.files?.seatMap?.[0])
      payload.seatMapUrl = `/uploads/${req.files.seatMap[0].filename}`;

    if (req.files?.gallery)
      payload.gallery = req.files.gallery.map((f) => `/uploads/${f.filename}`);

    if (req.files?.organizerLogo?.[0]) {
      payload.organizerLogo = `/uploads/${req.files.organizerLogo[0].filename}`;
    }
    // 🎫 Parse JSON cho ticketTypes & paymentInfo
    if (payload.ticketTypes && typeof payload.ticketTypes === "string") {
      try {
        payload.ticketTypes = JSON.parse(payload.ticketTypes);
      } catch {
        return res.status(400).json({ message: "Invalid ticketTypes JSON" });
      }
    }

    if (payload.paymentInfo && typeof payload.paymentInfo === "string") {
      try {
        payload.paymentInfo = JSON.parse(payload.paymentInfo);
      } catch {
        return res.status(400).json({ message: "Invalid paymentInfo JSON" });
      }
    }

    // 📍 Parse location JSON
if (payload.location && typeof payload.location === "string") {
  try {
    payload.location = JSON.parse(payload.location);
  } catch {
    return res.status(400).json({ message: "Invalid location JSON" });
  }
}
    const event = await Event.findByIdAndUpdate(id, payload, { new: true });
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event updated successfully", event });
  } catch (err) {
    console.error("❌ Update Event Error:", err);
    next(err);
  }
};

// 🧩 Xóa sự kiện
exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Delete Event Error:", err);
    next(err);
  }
};

// 🧩 Lấy danh sách sự kiện (public)
exports.getEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    let filter = { privacy: "public" };
    const includePrivate = req.query.includePrivate === 'true';
    if (includePrivate && req.user?.role === 'admin') filter = {};

    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) filter.name = new RegExp(req.query.q, "i");
    if (req.query.mode) filter.mode = req.query.mode;

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .populate("category", "name slug")
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit);

    // map location trước khi trả
    const eventsWithLocationName = events.map(e => {
      const obj = e.toObject();
      obj.location = mapLocationName(obj.location);
      return obj;
    });

    res.json({ events: eventsWithLocationName, meta: { total, page, limit } });
  } catch (err) {
    console.error("❌ Get Events Error:", err);
    next(err);
  }
};


// 🧩 Lấy chi tiết sự kiện
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate("category", "name slug");
    if (!event) return res.status(404).json({ message: "Not found" });

    if (event.privacy === "private") {
      if (!req.user) return res.status(403).json({ message: "Forbidden" });
      const isAdmin = req.user.role === "admin";
      const isCreator = req.user.id === String(event.createdBy);
      if (!isAdmin && !isCreator) return res.status(403).json({ message: "Forbidden" });
    }

    const eventObj = event.toObject();
    eventObj.location = mapLocationName(eventObj.location);

    res.json({ event: eventObj });
  } catch (err) {
    console.error("❌ Get Event Error:", err);
    next(err);
  }
};
