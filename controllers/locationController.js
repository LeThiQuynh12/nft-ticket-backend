// backend/controllers/locationController.js
const provinces = require('../data/provinces.json');

exports.getProvinces = (req, res) => {
  res.json(provinces.map(p => ({ code: p.Id, name: p.Name })));
};

exports.getDistricts = (req, res) => {
  const { provinceCode } = req.params;
  const province = provinces.find(p => p.Id === provinceCode);
  if (!province) return res.status(404).json({ message: "Không tìm thấy tỉnh" });

  res.json(province.Districts.map(d => ({ code: d.Id, name: d.Name })));
};

exports.getWards = (req, res) => {
  const { districtCode } = req.params;

  let wards = [];
  for (const prov of provinces) {
    const district = prov.Districts.find(d => d.Id === districtCode);
    if (district) {
      wards = district.Wards.map(w => ({ code: w.Id, name: w.Name }));
      break;
    }
  }

  if (wards.length === 0) return res.status(404).json({ message: "Không tìm thấy quận" });
  res.json(wards);
};