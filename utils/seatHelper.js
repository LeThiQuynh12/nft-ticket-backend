const Seat = require("../models/Seat");

async function syncEventSeats(event) {
  const eventId = event._id;
  const validSeats = [];

  for (const ticketType of event.ticketTypes) {
    for (const section of ticketType.sections) {
      const seatNumbers = section.seats || [];

      const normalizedSeats = seatNumbers.map((seat) =>
        String(seat).trim().toUpperCase()
      );

      if (new Set(normalizedSeats).size !== normalizedSeats.length) {
        throw new Error(
          `Mã ghế bị trùng trong khu ${section.name}`
        );
      }

      for (const seatNumber of normalizedSeats) {
        validSeats.push({
          eventId,
          ticketTypeId: ticketType._id,
          sectionId: section._id,
          seatNumber,
        });
      }
    }
  }

  const existingSeats = await Seat.find({ eventId });

  const validKeys = new Set(
    validSeats.map(
      (seat) =>
        `${seat.ticketTypeId}_${seat.sectionId}_${seat.seatNumber}`
    )
  );

  // Không cho xóa ghế đã bán hoặc đang giữ chỗ.
  for (const oldSeat of existingSeats) {
    const key =
      `${oldSeat.ticketTypeId}_${oldSeat.sectionId}_${oldSeat.seatNumber}`;

    if (
      !validKeys.has(key) &&
      oldSeat.status !== "available"
    ) {
      throw new Error(
        `Không thể xóa ghế ${oldSeat.seatNumber} vì ghế đã được đặt hoặc đang giữ chỗ`
      );
    }
  }

  // Chỉ xóa những ghế available không còn trong cấu hình.
  const obsoleteIds = existingSeats
    .filter((seat) => {
      const key =
        `${seat.ticketTypeId}_${seat.sectionId}_${seat.seatNumber}`;

      return !validKeys.has(key) && seat.status === "available";
    })
    .map((seat) => seat._id);

  if (obsoleteIds.length) {
    await Seat.deleteMany({
      _id: { $in: obsoleteIds },
      status: "available",
    });
  }

  // Thêm những ghế chưa tồn tại.
  const existingKeys = new Set(
    existingSeats.map(
      (seat) =>
        `${seat.ticketTypeId}_${seat.sectionId}_${seat.seatNumber}`
    )
  );

  const newSeats = validSeats.filter(
    (seat) =>
      !existingKeys.has(
        `${seat.ticketTypeId}_${seat.sectionId}_${seat.seatNumber}`
      )
  );

  if (newSeats.length) {
    await Seat.insertMany(newSeats, { ordered: true });
  }
}

module.exports = { syncEventSeats };