const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "events";

    // phân loại folder theo loại ảnh
    if (file.fieldname === "organizerLogo") folder = "organizers";
    if (file.fieldname === "gallery") folder = "event_gallery";

    return {
      folder,
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

const upload = multer({ storage });

module.exports = upload;
