// controllers/eventController.js
const Event = require("../models/Event");
const slugify = require("slugify");
const { mapLocationName } = require("../utils/locationHelper");
const cloudinary = require("../config/cloudinary");

async function uploadToCloudinary(fileBuffer, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      })
      .end(fileBuffer);
  });
}

exports.createEvent = async (req, res, next) => {
  try {
    const payload = req.body;
    payload.createdBy = req.user?.id;

    payload.slug =
      payload.slug ||
      slugify(payload.name || "event", { lower: true, strict: true }) +
        "-" +
        Date.now().toString(36).slice(-4);

    // ======================
    // UPLOAD CLOUDINARY
    // ======================
    if (req.files?.coverImage?.[0]) {
      payload.coverImage = await uploadToCloudinary(
        req.files.coverImage[0].buffer,
        "events/cover"
      );
    }

    if (req.files?.seatMap?.[0]) {
      payload.seatMapUrl = await uploadToCloudinary(
        req.files.seatMap[0].buffer,
        "events/seatmap"
      );
    }

    if (req.files?.gallery) {
      payload.gallery = [];
      for (let img of req.files.gallery) {
        const link = await uploadToCloudinary(img.buffer, "events/gallery");
        payload.gallery.push(link);
      }
    }

    if (req.files?.organizerLogo?.[0]) {
      payload.organizerLogo = await uploadToCloudinary(
        req.files.organizerLogo[0].buffer,
        "events/logo"
      );
    }

    // Parse JSON fields
    if (payload.ticketTypes && typeof payload.ticketTypes === "string")
      payload.ticketTypes = JSON.parse(payload.ticketTypes);

    if (payload.location && typeof payload.location === "string")
      payload.location = JSON.parse(payload.location);

    const event = await Event.create(payload);

    res.status(201).json({ message: "Event created successfully", event });
  } catch (err) {
    console.error("Create Event Error:", err);
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    payload.updatedAt = Date.now();

    // CLOUDINARY UPLOAD
    if (req.files?.coverImage?.[0]) {
      payload.coverImage = await uploadToCloudinary(
        req.files.coverImage[0].buffer,
        "events/cover"
      );
    }

    if (req.files?.seatMap?.[0]) {
      payload.seatMapUrl = await uploadToCloudinary(
        req.files.seatMap[0].buffer,
        "events/seatmap"
      );
    }

    if (req.files?.gallery) {
      payload.gallery = [];
      for (let img of req.files.gallery) {
        const link = await uploadToCloudinary(img.buffer, "events/gallery");
        payload.gallery.push(link);
      }
    }

    if (req.files?.organizerLogo?.[0]) {
      payload.organizerLogo = await uploadToCloudinary(
        req.files.organizerLogo[0].buffer,
        "events/logo"
      );
    }

    if (payload.ticketTypes && typeof payload.ticketTypes === "string")
      payload.ticketTypes = JSON.parse(payload.ticketTypes);

    if (payload.location && typeof payload.location === "string")
      payload.location = JSON.parse(payload.location);

    const event = await Event.findByIdAndUpdate(id, payload, { new: true });
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event updated successfully", event });
  } catch (err) {
    console.error("Update Event Error:", err);
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Event.findByIdAndDelete(id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Event Error:", err);
    next(err);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    let filter = { privacy: "public" };
    const includePrivate = req.query.includePrivate === "true";

    if (includePrivate && req.user?.role === "admin") filter = {};

    if (req.query.category) {
      const Category = require("../models/Category");
      const categoryDoc = await Category.findOne({ slug: req.query.category });
      if (categoryDoc) filter.category = categoryDoc._id;
      else return res.json({ events: [], meta: { total: 0, page, limit } });
    }

    if (req.query.q) filter.name = new RegExp(req.query.q, "i");
    if (req.query.mode) filter.mode = req.query.mode;

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .populate("category", "name slug")
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit);

    const eventsWithLocationName = events.map((e) => {
      const obj = e.toObject();
      obj.location = mapLocationName(obj.location);
      return obj;
    });

    res.json({ events: eventsWithLocationName, meta: { total, page, limit } });
  } catch (err) {
    console.error("Get Events Error:", err);
    next(err);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate("category", "name slug");
    if (!event) return res.status(404).json({ message: "Not found" });

    if (event.privacy === "private") {
      if (!req.user) return res.status(403).json({ message: "Forbidden" });
      const isAdmin = req.user.role === "admin";
      const isCreator = req.user.id === String(event.createdBy);
      if (!isAdmin && !isCreator)
        return res.status(403).json({ message: "Forbidden" });
    }

    const eventObj = event.toObject();
    eventObj.location = mapLocationName(eventObj.location);

    res.json({ event: eventObj });
  } catch (err) {
    console.error("Get Event Error:", err);
    next(err);
  }
};
