const provinces = require('../data/provinces.json'); // dữ liệu địa phương

function mapLocationName(location) {
  if (!location) return null;

  const prov = provinces.find(p => p.Id === location.province);
  const dist = prov?.Districts.find(d => d.Id === location.district);
  const ward = dist?.Wards.find(w => w.Id === location.ward);

  return {
    name: location.name,
    province: prov?.Name || location.province,
    district: dist?.Name || location.district,
    ward: ward?.Name || location.ward,
    addressDetail: location.addressDetail,
  };
}

module.exports = { mapLocationName };
